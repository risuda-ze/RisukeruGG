import { describe, expect, it } from 'vitest';
import {
  formatMemberMention,
  formatUserMention,
  pickExactUsernameMatch,
} from '../../../functions/src/discord/mentionFormat';

/**
 * Discord メンション解決の純粋関数（functions/src/discord/mentionFormat.ts）のテスト。
 * 検索 API は前方一致で複数返すため、完全一致で 1 件に絞れることを保証する。
 */
describe('pickExactUsernameMatch', () => {
  const results = [
    { user: { id: '100', username: 'risu' } },
    { user: { id: '200', username: 'risu_gg' } },
    { user: { id: '300', username: 'Risuke' } },
    {}, // user を持たない要素（想定外だが落ちないこと）
  ];

  it('ユーザー名が完全一致するメンバーの ID を返す', () => {
    expect(pickExactUsernameMatch(results, 'risu')).toBe('100');
    expect(pickExactUsernameMatch(results, 'risu_gg')).toBe('200');
  });

  it('前方一致だけの候補は採用しない', () => {
    expect(pickExactUsernameMatch(results, 'ris')).toBeNull();
  });

  it('大文字小文字と前後空白は無視する', () => {
    expect(pickExactUsernameMatch(results, ' RISUKE ')).toBe('300');
  });

  it('空文字・該当なしは null', () => {
    expect(pickExactUsernameMatch(results, '')).toBeNull();
    expect(pickExactUsernameMatch(results, 'nobody')).toBeNull();
    expect(pickExactUsernameMatch([], 'risu')).toBeNull();
  });
});

describe('formatUserMention / formatMemberMention', () => {
  it('ID があればメンション記法、なければ表示名', () => {
    expect(formatUserMention('123')).toBe('<@123>');
    expect(formatMemberMention({ displayName: 'りす', discordUserId: '123' })).toBe('<@123>');
    expect(formatMemberMention({ displayName: 'りす', discordUserId: null })).toBe('りす');
  });
});
