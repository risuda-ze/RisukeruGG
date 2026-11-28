import { FieldValue } from 'firebase-admin/firestore';

/**
 * 共通フィールド（TE-018）の付与。Functions 用。
 * スケジュール・タスク・コラボ・ブリーフ・工程への書き込みは必ずこれを通す。
 * 例外: Discord 連携の ID の記録（ブリーフの `discord`、工程の `discordMessageId` だけを書く briefs/discordSync.ts）は
 * 内容の更新ではなく最終更新に数えないため、通さない（updatedBy / updatedAt を書かない）。
 */

/** 操作者がいない更新（トリガー・定期実行・未認証の外部参加者）の主体 */
export const SYSTEM_ACTOR = 'system';

/** 更新時に付ける最終更新者・最終更新日時 */
export function updatedFields(actor: string) {
  return { updatedBy: actor, updatedAt: FieldValue.serverTimestamp() };
}

/** 作成時に付ける作成者・作成日時・最終更新者・最終更新日時 */
export function createdFields(actor: string) {
  return { createdBy: actor, createdAt: FieldValue.serverTimestamp(), ...updatedFields(actor) };
}
