import { serverTimestamp } from 'firebase/firestore';
import { requireUid } from '@/lib/firebase/client';

/**
 * 共通フィールド（TE-018）の付与。クライアント SDK 用。
 * スケジュール・タスク・コラボ・ブリーフ・工程・進め方・カテゴリ・カンバン列への書き込みは必ずこれを通す。
 * actor を省略するとログイン中のユーザーの uid を使う。
 */

/** 更新時に付ける最終更新者・最終更新日時 */
export function updatedFields(actor: string = requireUid()) {
  return { updatedBy: actor, updatedAt: serverTimestamp() };
}

/** 作成時に付ける作成者・作成日時・最終更新者・最終更新日時 */
export function createdFields(actor: string = requireUid()) {
  return { createdBy: actor, createdAt: serverTimestamp(), ...updatedFields(actor) };
}
