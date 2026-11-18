import { FirebaseError } from 'firebase/app';
import { GoogleAuthProvider, reauthenticateWithPopup, type User } from 'firebase/auth';

/** アプリが作成した副カレンダーとその予定だけを扱えるスコープ（SC-008-2） */
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';

/**
 * - denied: 同意を拒否した / ポップアップを閉じた
 * - account_mismatch: ログイン中と別の Google アカウントを選んだ
 * - popup_blocked: ブラウザがポップアップを止めた
 * - failed: それ以外
 */
export type CalendarAuthErrorReason = 'denied' | 'account_mismatch' | 'popup_blocked' | 'failed';

export class CalendarAuthError extends Error {
  constructor(public readonly reason: CalendarAuthErrorReason) {
    super(`Google Calendar authorization failed: ${reason}`);
    this.name = 'CalendarAuthError';
  }
}

const REASON_BY_CODE: Record<string, CalendarAuthErrorReason> = {
  'auth/popup-closed-by-user': 'denied',
  'auth/cancelled-popup-request': 'denied',
  'auth/user-cancelled': 'denied',
  'auth/user-mismatch': 'account_mismatch',
  'auth/popup-blocked': 'popup_blocked',
};

/**
 * 書き出し操作のときだけカレンダー権限を要求し、その場限りのアクセストークンを返す。
 * トークンはどこにも保存しない（US-005）。
 */
export async function requestCalendarAccessToken(user: User): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope(CALENDAR_SCOPE);
  if (user.email) provider.setCustomParameters({ login_hint: user.email });

  try {
    const result = await reauthenticateWithPopup(user, provider);
    const accessToken = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
    if (!accessToken) throw new CalendarAuthError('denied');
    return accessToken;
  } catch (error) {
    if (error instanceof CalendarAuthError) throw error;
    const reason = error instanceof FirebaseError ? REASON_BY_CODE[error.code] : undefined;
    throw new CalendarAuthError(reason ?? 'failed');
  }
}
