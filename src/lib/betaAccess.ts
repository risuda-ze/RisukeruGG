import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

/**
 * クローズドベータ入場制限（T11）のクライアント側判定ロジック。
 *
 * - ゲートの正は Firestore `app_config/beta { enabled }` と `beta_allowlist/{email}`
 *   （実際のアクセス拒否は firestore.rules が担保する）。
 * - このモジュールは待機画面の表示切替（クライアント判定）のみを担う。
 * - 判定は環境変数 `NEXT_PUBLIC_CLOSED_BETA === 'true'` のときだけ行う。
 */

/**
 * メールアドレスを allowlist ドキュメント ID 用に正規化する。
 * 前後の空白を除去し小文字化する（大文字・小文字ゆらぎによる不一致を防ぐ）。
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** クローズドベータのクライアント側表示切替が有効かどうか。 */
export function isClosedBetaEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CLOSED_BETA === 'true';
}

/** ベータゲートの判定結果 */
export type BetaAccessStatus =
  /** 制限が無効、または allowlist 在籍。通常どおり利用可 */
  | 'allowed'
  /** allowlist 外。待機画面を表示する */
  | 'waiting';

/**
 * ログイン済みユーザーがベータ利用を許可されているか判定する。
 *
 * - フラグ OFF（`NEXT_PUBLIC_CLOSED_BETA !== 'true'`）のときは常に `allowed`（素通り）。
 * - メールアドレスを持たないユーザーは判定できないため `waiting` とする。
 * - 自分の allowlist ドキュメント（`beta_allowlist/{正規化メール}`）を get して在籍を確認する。
 *   rules 上、自分のメールと一致する ID の get のみ許可されているため列挙はできない。
 *
 * @param email ログインユーザーのメールアドレス（null 許容）
 */
export async function evaluateBetaAccess(email: string | null | undefined): Promise<BetaAccessStatus> {
  // フラグ OFF なら制限しない（全ユーザー素通り）
  if (!isClosedBetaEnabled()) return 'allowed';

  // メールアドレスが無ければ allowlist と突合できないため待機扱い
  if (!email) return 'waiting';

  const allowlistId = normalizeEmail(email);
  const snap = await getDoc(doc(db, 'beta_allowlist', allowlistId));
  return snap.exists() ? 'allowed' : 'waiting';
}
