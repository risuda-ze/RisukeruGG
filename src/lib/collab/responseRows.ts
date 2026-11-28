import type { CollabComment, CollabParticipant } from '@/types/entities';

/** 「回答」の欄に出す回答の値。集計と同じ 3 種類だけを扱い、それ以外（未回答・maybe など）は null（表示は「—」） */
export type ResponseMark = 'ok' | 'ng' | 'pending' | null;

export interface CollabResponseRow {
  /** 回答者のキー（participantResponses のキー） */
  key: string;
  name: string;
  /** 候補日程ごとの回答（日時の昇順）。dateIndex は proposedDates の添字 */
  answers: { dateIndex: number; date: Date; mark: ResponseMark }[];
  /** この回答者の回答コメント（古い順） */
  comments: CollabComment[];
}

/**
 * 回答者のキーから表示名への解決。
 * キーは参加者の id、または名前の記号を `_` に置き換えたもの（respondToCollab と同じ置き換え）。
 * どちらにも無ければキーをそのまま返す。
 */
export function respondentNameResolver(participants: CollabParticipant[]): (key: string) => string {
  const keyToName = new Map<string, string>();
  for (const p of participants) {
    keyToName.set(p.id, p.name);
    keyToName.set(p.name.replace(/[.#$[\]/]/g, '_'), p.name);
  }
  return (key) => keyToName.get(key) ?? key;
}

/**
 * コラボ詳細の「回答」の欄の行を作る（回答者ごとに 1 行、回答者名の昇順）。
 * 回答コメントは authorId が回答者のキーと一致するものだけを拾う。
 * チーム内から投稿された既存のコメント（authorId が UID）は、どの行にも入らない。
 */
export function buildResponseRows(input: {
  participants: CollabParticipant[];
  proposedDates: Date[];
  participantResponses: Record<string, Record<string, string>>;
  comments: CollabComment[];
}): CollabResponseRow[] {
  const resolve = respondentNameResolver(input.participants);
  const dates = input.proposedDates
    .map((date, dateIndex) => ({ date, dateIndex }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return Object.entries(input.participantResponses)
    .map(([key, responses]) => ({
      key,
      name: resolve(key),
      answers: dates.map(({ date, dateIndex }) => {
        const value = responses[dateIndex.toString()];
        const mark: ResponseMark = value === 'ok' || value === 'ng' || value === 'pending' ? value : null;
        return { dateIndex, date, mark };
      }),
      comments: input.comments
        .filter((c) => c.authorId === key)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja') || a.key.localeCompare(b.key));
}
