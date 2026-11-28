import { FieldValue } from 'firebase-admin/firestore';

/**
 * 共通フィールド（TE-018）の付与。Admin SDK 用（Discord Route・操作層のサーバー実装）。
 * スケジュール・タスク・コラボ・ブリーフ・工程への書き込みは必ずこれを通す。
 */

/** Discord 上の利用者の操作による書き込みの主体（個人は特定しない） */
export const DISCORD_ACTOR = 'discord-bot';

/** 更新時に付ける最終更新者・最終更新日時 */
export function updatedFields(actor: string) {
  return { updatedBy: actor, updatedAt: FieldValue.serverTimestamp() };
}

/** 作成時に付ける作成者・作成日時・最終更新者・最終更新日時 */
export function createdFields(actor: string) {
  return { createdBy: actor, createdAt: FieldValue.serverTimestamp(), ...updatedFields(actor) };
}
