import { describe, expect, it } from 'vitest';

type JoinAction = { type: 'leave'; teamId: string } | { type: 'join'; teamCode: string };

/** TeamJoinForm の確認ダイアログ表示条件を純粋関数化 */
function shouldConfirmJoin(currentTeamId: string | null, teamIds: string[]): boolean {
  return Boolean(currentTeamId && teamIds.length > 0);
}

/** TeamJoinForm の参加実行順を純粋関数化 */
function buildJoinActions(
  currentTeamId: string | null,
  teamCode: string,
  leaveFirst: boolean
): JoinAction[] {
  const actions: JoinAction[] = [];

  if (leaveFirst && currentTeamId) {
    actions.push({ type: 'leave', teamId: currentTeamId });
  }

  actions.push({ type: 'join', teamCode: teamCode.toUpperCase() });
  return actions;
}

describe('TeamJoinForm の参加確認フロー', () => {
  describe('shouldConfirmJoin', () => {
    it('現在チームがある場合は参加前確認を表示する', () => {
      expect(shouldConfirmJoin('team-alpha', ['team-alpha'])).toBe(true);
    });

    it('所属先がない場合は参加前確認を表示しない', () => {
      expect(shouldConfirmJoin(null, [])).toBe(false);
    });

    it('currentTeamId がなく teamIds だけ残っていても確認を表示しない', () => {
      expect(shouldConfirmJoin(null, ['team-alpha'])).toBe(false);
    });
  });

  describe('buildJoinActions', () => {
    it('脱退して参加を選んだ場合は leave -> join の順で実行する', () => {
      expect(buildJoinActions('team-alpha', 'beta002', true)).toEqual([
        { type: 'leave', teamId: 'team-alpha' },
        { type: 'join', teamCode: 'BETA002' },
      ]);
    });

    it('そのまま参加を選んだ場合は join のみ実行する', () => {
      expect(buildJoinActions('team-alpha', 'beta002', false)).toEqual([
        { type: 'join', teamCode: 'BETA002' },
      ]);
    });

    it('所属先がない場合でも join のみ実行し、コードは大文字化する', () => {
      expect(buildJoinActions(null, 'alpha001', true)).toEqual([
        { type: 'join', teamCode: 'ALPHA001' },
      ]);
    });
  });
});
