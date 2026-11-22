import { describe, expect, it } from 'vitest';

/** team/page.tsx のロール変更UI表示条件を純粋関数化 */
function canShowRoleControl(isMember: boolean, isMe: boolean): boolean {
  return isMember && !isMe;
}

describe('ロール変更UIの表示条件', () => {
  it('メンバーは他の所属者にロール変更UIを表示できる', () => {
    expect(canShowRoleControl(true, false)).toBe(true);
  });

  it('自分自身にはロール変更UIを表示しない', () => {
    expect(canShowRoleControl(true, true)).toBe(false);
  });

  it('スタッフにはロール変更UIを表示しない', () => {
    expect(canShowRoleControl(false, false)).toBe(false);
  });
});
