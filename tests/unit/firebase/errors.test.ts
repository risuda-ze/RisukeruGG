import { describe, it, expect } from 'vitest';
import { firebaseFunctionsErrorMessage } from '@/lib/firebase/errors';

/** FunctionsError 互換オブジェクトを生成 */
function fnError(code: string, message = '') {
  return { code, message };
}

describe('firebaseFunctionsErrorMessage', () => {
  it('failed-precondition は CF の message を透過する', () => {
    const msg = 'LIGHTプランのコラボ作成上限（月3件）に達しました';
    expect(firebaseFunctionsErrorMessage(fnError('functions/failed-precondition', msg))).toBe(msg);
  });

  it('invalid-argument は CF の message を透過する', () => {
    const msg = '候補日程の形式が不正です（1件）';
    expect(firebaseFunctionsErrorMessage(fnError('functions/invalid-argument', msg))).toBe(msg);
  });

  it('unauthenticated は再ログイン案内を返す', () => {
    expect(firebaseFunctionsErrorMessage(fnError('functions/unauthenticated'))).toContain(
      '再ログイン'
    );
  });

  it('permission-denied は権限エラー文言を返す', () => {
    expect(firebaseFunctionsErrorMessage(fnError('functions/permission-denied'))).toContain('権限');
  });

  it('internal は "internal" を画面に出さず定型文に変換する', () => {
    const result = firebaseFunctionsErrorMessage(fnError('functions/internal', 'internal'));
    expect(result).not.toBe('internal');
    expect(result).toContain('サーバー');
  });

  it('未知の code はフォールバック文言を返す', () => {
    const result = firebaseFunctionsErrorMessage(fnError('functions/some-new-code'), 'fallbackです');
    expect(result).toBe('fallbackです');
  });

  it('Error インスタンスは message を採用する', () => {
    expect(firebaseFunctionsErrorMessage(new Error('ネットワークエラー'))).toBe('ネットワークエラー');
  });

  it('message が "internal" の素の値はフォールバックに置き換える', () => {
    const result = firebaseFunctionsErrorMessage({ message: 'internal' }, '作成に失敗しました');
    expect(result).toBe('作成に失敗しました');
  });
});
