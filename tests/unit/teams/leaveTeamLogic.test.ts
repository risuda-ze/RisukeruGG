import { describe, it, expect } from 'vitest';
import type { UserRole } from '@/types/entities';

/**
 * Sprint 008 leaveSpecificTeam / leaveTeam から抽出した純粋ロジック。
 * Firebase 依存なしでテスト可能にするため、ロジックをインライン定義する。
 * 実装の参照先: functions/src/teams/leaveSpecificTeam.ts
 */

/** オペレーターがチームを脱退できるかどうかを判定する */
function canOperatorLeave(memberCount: number): boolean {
  // メンバーが自分1人（またはそれ以下）のソロチームは削除して脱退できる
  return memberCount <= 1;
}

/** 脱退処理の結果型 */
type LeaveResult =
  | { action: 'delete_team' } // ソロチーム: チームドキュメントごと削除
  | { action: 'leave' } // 非オペレーター: 通常脱退
  | { action: 'error'; reason: string }; // 複数メンバーのオペレーター: 脱退不可

/**
 * ロール・メンバー数に応じた脱退処理を決定する純粋関数。
 * Sprint 008 で修正された leaveSpecificTeam の判定ロジックを反映する。
 */
function resolveLeaveAction(role: UserRole, memberCount: number): LeaveResult {
  // 非オペレーター（member / rom）は常に通常脱退できる
  if (role !== 'operator') {
    return { action: 'leave' };
  }

  // オペレーターはメンバー数によって処理が分岐する
  if (canOperatorLeave(memberCount)) {
    // ソロチームなのでチームごと削除して脱退
    return { action: 'delete_team' };
  }

  // 複数メンバーのチームはオペレーターが脱退できない
  return { action: 'error', reason: '先に所有権を移譲してください' };
}

// ─── テストスイート ──────────────────────────────────────────

describe('チーム脱退ロジック', () => {
  describe('canOperatorLeave: オペレーター脱退可否の判定', () => {
    it('メンバー数1（ソロチーム）は脱退可能', () => {
      expect(canOperatorLeave(1)).toBe(true);
    });

    it('メンバー数0（境界値）はソロ扱いで脱退可能', () => {
      // 防御的処理: Firestoreのカウント不整合でも脱退を許可する
      expect(canOperatorLeave(0)).toBe(true);
    });

    it('メンバー数2（複数）は脱退不可', () => {
      expect(canOperatorLeave(2)).toBe(false);
    });

    it('メンバー数10（大人数）は脱退不可', () => {
      expect(canOperatorLeave(10)).toBe(false);
    });
  });

  describe('resolveLeaveAction: 脱退処理の決定', () => {
    describe('operator（オペレーター）', () => {
      it('ソロチーム（メンバー1名）: チーム削除して脱退', () => {
        const result = resolveLeaveAction('operator', 1);
        expect(result.action).toBe('delete_team');
      });

      it('複数メンバー（2名）: 脱退不可エラー', () => {
        const result = resolveLeaveAction('operator', 2);
        expect(result.action).toBe('error');
        if (result.action === 'error') {
          expect(result.reason).toContain('所有権');
        }
      });

      it('複数メンバー（5名）: 脱退不可エラー', () => {
        const result = resolveLeaveAction('operator', 5);
        expect(result.action).toBe('error');
      });

      it('境界値（メンバー0名）: チーム削除して脱退', () => {
        const result = resolveLeaveAction('operator', 0);
        expect(result.action).toBe('delete_team');
      });
    });

    describe('member（メンバー）', () => {
      it('ソロ状態でも通常脱退できる', () => {
        const result = resolveLeaveAction('member', 1);
        expect(result.action).toBe('leave');
      });

      it('複数メンバーでも通常脱退できる', () => {
        const result = resolveLeaveAction('member', 5);
        expect(result.action).toBe('leave');
      });
    });

    describe('rom（ROM / 閲覧者）', () => {
      it('ソロ状態でも通常脱退できる', () => {
        const result = resolveLeaveAction('rom', 1);
        expect(result.action).toBe('leave');
      });

      it('複数メンバーでも通常脱退できる', () => {
        const result = resolveLeaveAction('rom', 3);
        expect(result.action).toBe('leave');
      });
    });
  });
});
