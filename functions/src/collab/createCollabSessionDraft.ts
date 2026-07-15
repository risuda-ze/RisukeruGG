import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { logger } from 'firebase-functions/v2';
import { db, getAuthContext, requireOwnerOrEditor, getUserDoc } from '../lib/validateAuth';
import { withErrorBoundary } from '../lib/withErrorBoundary';
import { notifyDiscord } from '../discord/notifyDiscord';
import { assertActiveCollabLimit, assertCollabQuota, incrementCollabCount } from './lib';
import { parseProposedDates, normalizeParticipants } from './draftValidation';

/** クライアント側 CollabParticipant と同一形状 */
interface CollabParticipantInput {
  id: string;
  name: string;
  type: 'member' | 'external';
}

interface CreateCollabSessionDraftData {
  teamId: string;
  title: string;
  content?: string;
  participants: CollabParticipantInput[];
  proposedDates: string[]; // ISO 文字列
  icon?: string;
}

/** クライアント直接作成のコラボセッションは作成から30日で失効 */
const EXPIRES_IN_DAYS = 30;

/**
 * コラボ詳細画面「新規追加」用の作成 CF。
 * 作成時は常に open 状態で作成し、月次カウントに加算する。
 * クライアントからの直接 addDoc はセキュリティルールで禁止しており、作成はこの CF に集約する。
 * 共有リンク型の作成は createCollabSession を参照。
 *
 * ハンドラ全体を withErrorBoundary で包み、想定外例外がクライアントへ "internal" だけ
 * 渡る事態でもサーバーログに真因（teamId/uid/件数/スタック）が残るようにしている。
 */
export const createCollabSessionDraft = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<CreateCollabSessionDraftData>) => {
    const { teamId, title, content, participants, proposedDates, icon } = request.data;

    return withErrorBoundary(
      'createCollabSessionDraft',
      {
        teamId,
        uid: request.auth?.uid,
        proposedDatesCount: Array.isArray(proposedDates) ? proposedDates.length : 0,
        participantsCount: Array.isArray(participants) ? participants.length : 0,
      },
      async () => {
        // --- 基本バリデーション ---
        if (!teamId || !title) {
          throw new HttpsError('invalid-argument', '必須項目が不足しています');
        }
        if (!Array.isArray(participants) || participants.length === 0) {
          throw new HttpsError('invalid-argument', '参加者を1人以上指定してください');
        }
        if (!Array.isArray(proposedDates) || proposedDates.length === 0) {
          throw new HttpsError('invalid-argument', '候補日程を1件以上指定してください');
        }

        // --- 入力ハードニング（Firestore 書き込み前に不正値を弾く） ---
        const { dates: parsedDates, invalidIndices } = parseProposedDates(proposedDates);
        if (invalidIndices.length > 0) {
          throw new HttpsError(
            'invalid-argument',
            `候補日程の形式が不正です（${invalidIndices.length}件）`
          );
        }

        const normalizedParticipants = normalizeParticipants(participants);
        if (normalizedParticipants.length === 0) {
          throw new HttpsError('invalid-argument', '参加者の形式が不正です');
        }

        // --- 認証・権限 ---
        const ctx = await getAuthContext(request, teamId);
        requireOwnerOrEditor(ctx);

        const userData = await getUserDoc(ctx.uid);

        // 同時進行中（open）の上限チェック
        await assertActiveCollabLimit(teamId, userData);

        // 月次作成上限チェック
        assertCollabQuota(userData);

        // --- 作成 ---
        const sessionId = randomUUID();
        const now = FieldValue.serverTimestamp();
        const expiresAt = new Date(Date.now() + EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

        await db.runTransaction(async (tx) => {
          const sessionRef = db.doc(`teams/${teamId}/collabSessions/${sessionId}`);

          tx.set(sessionRef, {
            title,
            partnerName: '',
            status: 'open',
            content: content ?? '',
            participants: normalizedParticipants,
            proposedDates: parsedDates,
            participantResponses: {},
            comments: [],
            createdBy: ctx.uid,
            teamId,
            expiresAt,
            icon: icon ?? 'sports_esports',
            responses: null,
            confirmedDate: null,
            linkedScheduleId: null,
            createdAt: now,
          });

          incrementCollabCount(tx, ctx.uid, userData);
        });

        // Discord 通知（失敗してもコラボ作成本体を失敗させない）
        try {
          await notifyDiscord(teamId, 'notifyOnCollabCreate', () => ({
            title: '🤝 コラボ調整が作成されました',
            color: 0x5865f2,
            fields: [
              { name: 'タイトル', value: title, inline: true },
              { name: '参加者', value: `${normalizedParticipants.length}名`, inline: true },
              { name: '候補日程', value: `${parsedDates.length}件`, inline: true },
            ],
          }));
        } catch (err) {
          logger.warn('コラボ作成 Discord 通知に失敗しました', { teamId, err });
        }

        return { sessionId };
      }
    );
  }
);
