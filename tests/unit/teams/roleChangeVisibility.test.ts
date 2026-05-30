import { describe, expect, it } from 'vitest';

/** team/page.tsx のロール変更UI表示条件を純粋関数化 */
function canShowRoleControl(isOperator: boolean, isMe: boolean): boolean {
  return isOperator && !isMe;
}

/** RoleChangeDialog.tsx の注意文表示条件を純粋関数化 */
function getRoleChangeNotices(newRole: 'operator' | 'member' | 'rom'): string[] {
  if (newRole === 'rom') {
    return ['ROM専になると、スケジュール・タスクの作成・編集ができなくなります。'];
  }

  return [];
}

describe('ロール変更UIの表示条件', () => {
  it('オペレーターは他のオペレーターにもロール変更UIを表示できる', () => {
    expect(canShowRoleControl(true, false)).toBe(true);
  });

  it('自分自身にはロール変更UIを表示しない', () => {
    expect(canShowRoleControl(true, true)).toBe(false);
  });

  it('非オペレーターにはロール変更UIを表示しない', () => {
    expect(canShowRoleControl(false, false)).toBe(false);
  });
});

describe('ロール変更ダイアログの注意文', () => {
  it('オペレーター昇格時に既存オペレーター強制降格の文言を表示しない', () => {
    expect(getRoleChangeNotices('operator')).toEqual([]);
  });

  it('ROM専への変更時のみ編集不可の注意文を表示する', () => {
    expect(getRoleChangeNotices('rom')).toEqual([
      'ROM専になると、スケジュール・タスクの作成・編集ができなくなります。',
    ]);
  });
});
