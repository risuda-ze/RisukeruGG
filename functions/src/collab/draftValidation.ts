/**
 * コラボ下書き作成 CF（createCollabSessionDraft）の入力検証・正規化ロジック。
 *
 * フレームワーク非依存（firebase-admin / firebase-functions に依存しない）の純粋関数として
 * 切り出し、単体テスト可能にしている。CF 側はこれらの結果を見て HttpsError を投げる。
 */

/** クライアント CollabParticipant と同一形状 */
export interface ParticipantInput {
  id: string;
  name: string;
  type: 'member' | 'external';
}

/** ISO 文字列配列のパース結果。invalidIndices が空でなければ不正入力 */
export interface ParsedProposedDates {
  dates: Date[];
  invalidIndices: number[];
}

/**
 * ISO 文字列配列を Date[] にパースする。例外は投げず、不正な要素の位置を返す。
 * Firestore は Invalid Date を書き込もうとすると例外（→ internal）になるため、
 * 書き込み前にここで弾く。
 */
export function parseProposedDates(values: string[]): ParsedProposedDates {
  const dates: Date[] = [];
  const invalidIndices: number[] = [];

  values.forEach((value, index) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      invalidIndices.push(index);
    } else {
      dates.push(parsed);
    }
  });

  return { dates, invalidIndices };
}

/**
 * 参加者配列を `{ id, name, type }` に正規化する。
 * - id/name が文字列でない不正要素は除去する
 * - type は 'external' 以外を全て 'member' に寄せる（undefined 混入を防ぐ）
 *
 * Firestore は undefined 値を含むドキュメントを拒否する（→ internal）ため、
 * 余分なフィールドや undefined を確実に取り除く。
 */
export function normalizeParticipants(participants: ParticipantInput[]): ParticipantInput[] {
  if (!Array.isArray(participants)) return [];

  return participants
    .filter(
      (p): p is ParticipantInput =>
        !!p && typeof p.id === 'string' && typeof p.name === 'string'
    )
    .map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type === 'external' ? 'external' : 'member',
    }));
}
