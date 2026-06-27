/**
 * Firebase Callable Functions の呼び出しエラーを、利用者向けの日本語メッセージに変換する。
 *
 * Functions v2 は HttpsError 以外の例外を一律 `functions/internal`（message="internal"）に
 * 変換するため、画面に `internal` がそのまま出ないよう code ベースでマッピングする。
 * `failed-precondition` / `invalid-argument` は CF が利用者向けの message を返すため透過する。
 */

interface FunctionsLikeError {
  code?: unknown;
  message?: unknown;
}

/** FunctionsError 互換（code を持つオブジェクト）かどうか */
function isFunctionsError(err: unknown): err is FunctionsLikeError {
  return typeof err === 'object' && err !== null && 'code' in err;
}

/** CF が返した利用者向け message を採用してよいか（"internal" や空は除外） */
function usableMessage(message: unknown): string | null {
  if (typeof message !== 'string') return null;
  const trimmed = message.trim();
  if (!trimmed || trimmed === 'internal') return null;
  return trimmed;
}

/**
 * Functions 呼び出しエラー → 日本語メッセージ。
 * @param fallback 判別不能時の既定メッセージ
 */
export function firebaseFunctionsErrorMessage(
  err: unknown,
  fallback = '処理に失敗しました。時間をおいて再試行してください'
): string {
  if (isFunctionsError(err) && typeof err.code === 'string') {
    switch (err.code) {
      case 'functions/failed-precondition':
      case 'functions/invalid-argument':
        // CF が利用者向けの具体的メッセージを返す（上限到達・入力不正など）
        return usableMessage(err.message) ?? '入力内容を確認してください';
      case 'functions/unauthenticated':
        return 'セッションが切れました。再ログインしてください';
      case 'functions/permission-denied':
        return 'この操作を行う権限がありません';
      case 'functions/not-found':
        return 'ユーザー情報が見つかりません。再ログインしてください';
      case 'functions/resource-exhausted':
        return 'リクエストが多すぎます。時間をおいて再試行してください';
      case 'functions/internal':
      case 'functions/unknown':
        return 'サーバーで問題が発生しました。時間をおいて再試行してください';
      default:
        return usableMessage(err.message) ?? fallback;
    }
  }
  return usableMessage((err as FunctionsLikeError | null)?.message) ?? fallback;
}
