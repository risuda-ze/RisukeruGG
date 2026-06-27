import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { db, getAuthContext, requireOwnerOrEditor, getUserDoc } from '../lib/validateAuth';
import { withErrorBoundary } from '../lib/withErrorBoundary';
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
  status: 'draft' | 'open';
  content?: string;
  participants: CollabParticipantInput[];
  proposedDates: string[]; // ISO 文字列
  icon?: string;
}

/** クライアント直接作成のコラボセッションは作成から30日で失効 */
const EXPIRES_IN_DAYS = 30;

/**
 * コラボ詳細画面「新規追加」用の作成 CF（参加者型・draft/open モデル）。
 * クライアントからの直接 addDoc はセキュリティルールで禁止しており、作成はこの CF に集約する。
 * 共有リンク型の作成は createCollabSession を参照。
 *
 * ハンドラ全体を withErrorBoundary で包み、想定外例外がクライアントへ "internal" だけ
 * 渡る事態でもサーバーログに真因（teamId/uid/件数/スタック）が残るようにしている。
 */
export const createCollabSessionDraft = onCall(
  { region: 'asia-northeast1' },
  async (request: CallableRequest<CreateCollabSessionDraftData>) => {
    const { teamId, title, status, content, participants, proposedDates, icon } = request.data;

    return withErrorBoundary(
      'createCollabSessionDraft',
      {
        teamId,
        uid: request.auth?.uid,
        status,
        proposedDatesCount: Array.isArray(proposedDates) ? proposedDates.length : 0,
        participantsCount: Array.isArray(participants) ? participants.length : 0,
      },
      async () => {
        // --- 基本バリデーション ---
        if (!teamId || !title || !status) {
          throw new HttpsError('invalid-argument', '必須項目が不足しています');
        }
        if (status !== 'draft' && status !== 'open') {
          throw new HttpsError('invalid-argument', 'ステータスが不正です');
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

        // 同時進行中（draft/open）の上限。draft/open いずれの作成も進行中を増やすため対象。
        await assertActiveCollabLimit(teamId, userData);

        // 月次作成上限は公開(open)作成のみ対象。下書き(draft)はカウントしない。
        if (status === 'open') assertCollabQuota(userData);

        // --- 作成 ---
        const sessionId = randomUUID();
        const now = FieldValue.serverTimestamp();
        const expiresAt = new Date(Date.now() + EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);

        await db.runTransaction(async (tx) => {
          const sessionRef = db.doc(`teams/${teamId}/collabSessions/${sessionId}`);

          tx.set(sessionRef, {
            title,
            partnerName: '',
            status,
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

          if (status === 'open') incrementCollabCount(tx, ctx.uid, userData);
        });

        return { sessionId };
      }
    );
  }
);
