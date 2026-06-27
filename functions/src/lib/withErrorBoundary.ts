import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

/**
 * Callable Function のハンドラを例外境界で包む。
 *
 * - `HttpsError` はクライアントに意味のある code/message が渡るためそのまま再スロー。
 * - それ以外の想定外例外は、Firebase が一律 `internal`（message="internal"）に握り潰して
 *   しまい真因がクライアント・サーバーいずれにも残らない。これを防ぐため、ここで
 *   `logger.error` に context 付きで記録したうえで `HttpsError('internal', ...)` に変換する。
 *
 * これにより「画面には internal しか出ない」状況でも、サーバーログから原因を特定できる。
 *
 * @param operation ログ識別用の操作名（例: 'createCollabSessionDraft'）
 * @param context ログに残す非機微なメタ情報（uid/teamId/件数など。トークン等は渡さない）
 * @param fn 実処理
 */
export async function withErrorBoundary<T>(
  operation: string,
  context: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // 想定内エラーはそのまま透過
    if (err instanceof HttpsError) throw err;

    // 想定外エラーは真因をログに残してから internal へ変換
    logger.error(`${operation} failed`, {
      ...context,
      error:
        err instanceof Error
          ? { name: err.name, message: err.message, stack: err.stack }
          : String(err),
    });
    throw new HttpsError(
      'internal',
      'サーバーで問題が発生しました。時間をおいて再試行してください'
    );
  }
}
