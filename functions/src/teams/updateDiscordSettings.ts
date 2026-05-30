import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { db, getAuthContext, requireOperator } from '../lib/validateAuth';

interface UpdateDiscordSettingsData {
  teamId: string;
  webhookUrl: string;
  notifyOnCreate: boolean;
  notifyBefore1h: boolean;
  notifyBefore15min: boolean;
}

/**
 * チームの Discord 通知設定を更新する Callable Function。
 * データは teams/{teamId}/discord/config サブコレクションに保存する。
 * operator のみ実行可能（Firestore ルールでも制限済み）。
 */
export const updateDiscordSettings = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<UpdateDiscordSettingsData>) => {
    const { teamId, webhookUrl, notifyOnCreate, notifyBefore1h, notifyBefore15min } =
      request.data;

    if (!teamId) {
      throw new HttpsError('invalid-argument', 'teamId が必要です');
    }

    const ctx = await getAuthContext(request, teamId);
    requireOperator(ctx);

    // Webhook URL のバリデーション（空文字は許可 — 設定解除のユースケース）
    if (webhookUrl && !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      throw new HttpsError(
        'invalid-argument',
        'Webhook URL は https://discord.com/api/webhooks/ で始まる必要があります'
      );
    }

    // サブコレクション方式: teams/{teamId}/discord/config（ドキュメント ID は固定）
    await db.doc(`teams/${teamId}/discord/config`).set({
      webhookUrl: webhookUrl ?? '',
      notifyOnCreate: notifyOnCreate ?? false,
      notifyBefore1h: notifyBefore1h ?? false,
      notifyBefore15min: notifyBefore15min ?? false,
    });

    return { success: true };
  }
);
