import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * クローズドベータ入場制限（T11）のクライアント側判定ロジックのテスト。
 *
 * - メール正規化（前後空白除去＋小文字化）
 * - フラグ判定（NEXT_PUBLIC_CLOSED_BETA）
 * - evaluateBetaAccess: フラグ OFF 素通り / メール無し待機 / allowlist 在籍判定
 *
 * Firestore への getDoc はモックし、allowlist の在籍/非在籍を制御する。
 */

// firebase/firestore の getDoc をモック（doc は識別のためそのまま返す）
const getDocMock = vi.fn();
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ collection, id }),
  getDoc: (...args: unknown[]) => getDocMock(...args),
}));

// Firebase クライアント初期化を避けるため db をダミー化
vi.mock('@/lib/firebase/client', () => ({ db: {} }));

import { normalizeEmail, isClosedBetaEnabled, evaluateBetaAccess } from '@/lib/betaAccess';

describe('normalizeEmail', () => {
  it('前後の空白を除去し小文字化する', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
  });

  it('既に正規化済みの文字列はそのまま', () => {
    expect(normalizeEmail('a@b.com')).toBe('a@b.com');
  });
});

describe('isClosedBetaEnabled', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_CLOSED_BETA;
  });

  it("'true' のとき有効", () => {
    process.env.NEXT_PUBLIC_CLOSED_BETA = 'true';
    expect(isClosedBetaEnabled()).toBe(true);
  });

  it('未設定のとき無効', () => {
    expect(isClosedBetaEnabled()).toBe(false);
  });

  it("'false' など 'true' 以外のとき無効", () => {
    process.env.NEXT_PUBLIC_CLOSED_BETA = 'false';
    expect(isClosedBetaEnabled()).toBe(false);
  });
});

describe('evaluateBetaAccess', () => {
  beforeEach(() => {
    getDocMock.mockReset();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_CLOSED_BETA;
  });

  it('フラグ OFF のときは Firestore を参照せず allowed（素通り）', async () => {
    const result = await evaluateBetaAccess('user@example.com');
    expect(result).toBe('allowed');
    expect(getDocMock).not.toHaveBeenCalled();
  });

  it('フラグ ON でメールが無いときは waiting', async () => {
    process.env.NEXT_PUBLIC_CLOSED_BETA = 'true';
    const result = await evaluateBetaAccess(null);
    expect(result).toBe('waiting');
    expect(getDocMock).not.toHaveBeenCalled();
  });

  it('フラグ ON で allowlist に在籍していれば allowed', async () => {
    process.env.NEXT_PUBLIC_CLOSED_BETA = 'true';
    getDocMock.mockResolvedValue({ exists: () => true });
    const result = await evaluateBetaAccess('User@Example.com');
    expect(result).toBe('allowed');
    // 正規化されたメールで allowlist ドキュメントを参照する
    expect(getDocMock).toHaveBeenCalledWith({ collection: 'beta_allowlist', id: 'user@example.com' });
  });

  it('フラグ ON で allowlist に非在籍なら waiting', async () => {
    process.env.NEXT_PUBLIC_CLOSED_BETA = 'true';
    getDocMock.mockResolvedValue({ exists: () => false });
    const result = await evaluateBetaAccess('outsider@example.com');
    expect(result).toBe('waiting');
  });
});
