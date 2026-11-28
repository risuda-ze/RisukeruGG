import type { CollabSession } from '@/types/entities';

type LocalEdits = Pick<CollabSession, 'title' | 'proposedDates'> &
  Required<Pick<CollabSession, 'participants' | 'participantResponses'>> & {
    content: string;
    icon: string;
  };

/**
 * コラボ詳細の保存内容を組み立てる（CO-032）。
 * participants / proposedDates / participantResponses は編集時に新しい配列・オブジェクトへ置き換わる
 * （初期値は session の参照そのまま）ため、参照比較で未編集のフィールドを書き込みから外す。
 * 回答者が書くのは proposedDates と participantResponses だけなので、どちらかを書くときだけ
 * 楽観的ロックが要る（needsLock）。
 */
export function buildCollabSavePayload(session: CollabSession, local: LocalEdits) {
  const payload: Partial<CollabSession> = {
    title: local.title.trim() || session.title,
    content: local.content,
    icon: local.icon,
  };
  if (local.participants !== session.participants) payload.participants = local.participants;
  if (local.proposedDates !== session.proposedDates) payload.proposedDates = local.proposedDates;
  if (local.participantResponses !== session.participantResponses) {
    payload.participantResponses = local.participantResponses;
  }
  const needsLock = 'proposedDates' in payload || 'participantResponses' in payload;
  return { payload, needsLock };
}
