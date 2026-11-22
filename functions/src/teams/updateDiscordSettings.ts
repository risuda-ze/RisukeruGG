import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, getAuthContext, requireMemberRole } from '../lib/validateAuth';

interface UpdateDiscordSettingsData {
  teamId: string;
  webhookUrl: string;
  notifyOnTaskCreate: boolean;
  notifyOnTaskUpdate: boolean;
  notifyOnCollabCreate: boolean;
  notifyOnCollabResponse: boolean;
  notifyBefore1h: boolean;
  notifyBefore15min: boolean;
}

/**
 * チームの Discord 通知設定を更新する Callable Function。
 * データは teams/{teamId}/discord/config サブコレクションに保存する。
 * メンバーのみ実行可能（Firestore ルールでも制限済み）。
 */
export const updateDiscordSettings = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<UpdateDiscordSettingsData>) => {
    const {
      teamId,
      webhookUrl,
      notifyOnTaskCreate,
      notifyOnTaskUpdate,
      notifyOnCollabCreate,
      notifyOnCollabResponse,
      notifyBefore1h,
      notifyBefore15min,
    } = request.data;

    if (!teamId) {
      throw new HttpsError('invalid-argument', 'teamId が必要です');
    }

    const ctx = await getAuthContext(request, teamId);
    requireMemberRole(ctx);

    // Webhook URL のバリデーション（空文字は許可 — 設定解除のユースケース）
    if (webhookUrl && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      throw new HttpsError(
        'invalid-argument',
        'Webhook URL は https://discord.com/api/webhooks/ で始まる必要があります'
      );
    }

    // サブコレクション方式: teams/{teamId}/discord/config（ドキュメント ID は固定）
    // merge: true で既存の guildId / channelId（Bot 連携情報）を保持する。
    // merge なしだと通知設定の更新だけで連携情報が消え、Bot が「未連携」になる。
    await db.doc(`teams/${teamId}/discord/config`).set(
      {
        webhookUrl: webhookUrl ?? '',
        notifyOnTaskCreate: notifyOnTaskCreate ?? true,
        notifyOnTaskUpdate: notifyOnTaskUpdate ?? true,
        notifyOnCollabCreate: notifyOnCollabCreate ?? true,
        notifyOnCollabResponse: notifyOnCollabResponse ?? true,
        notifyBefore1h: notifyBefore1h ?? true,
        notifyBefore15min: notifyBefore15min ?? true,
      },
      { merge: true }
    );

    return { success: true };
  }
);
