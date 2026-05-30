import { describe, it, expect } from 'vitest';
import type { UserRole } from '@/types/entities';

/**
 * Sprint 008 leaveSpecificTeam / leaveTeam から抽出した純粋ロジック。
 * Firebase 依存なしでテスト可能にするため、ロジックをインライン定義する。
 * 実装の参照先: functions/src/teams/leaveSpecificTeam.ts
 */

/**
 * オペレーターがチームを脱退できるかどうかを判定する。
 * 現行実装では「ソロチーム」または「他にオペレーターがいる複数人チーム」で脱退可能。
 */
function canOperatorLeave(memberCount: number, otherOperatorCount: number): boolean {
  const isSolo = memberCount <= 1;
  return isSolo || otherOperatorCount > 0;
}

/** 脱退処理の結果型 */
type LeaveResult =
  | { action: 'delete_team' } // ソロチーム: チームドキュメントごと削除
  | { action: 'leave' } // 通常脱退
  | { action: 'error'; reason: string }; // 最後のオペレーター: 脱退不可

/**
 * ロール・メンバー数・他オペレーター数に応じた脱退処理を決定する純粋関数。
 * 011 仕様の複数オペレーター許可後の leaveSpecificTeam 判定ロジックを反映する。
 */
function resolveLeaveAction(
  role: UserRole,
  memberCount: number,
  otherOperatorCount: number
): LeaveResult {
  // 非オペレーター（member / rom）は常に通常脱退できる
  if (role !== 'operator') {
    return { action: 'leave' };
  }

  const isSolo = memberCount <= 1;

  if (isSolo) {
    return { action: 'delete_team' };
  }

  if (canOperatorLeave(memberCount, otherOperatorCount)) {
    return { action: 'leave' };
  }

  return { action: 'error', reason: '先に別のメンバーをオペレーターに指名してください' };
}

// ─── テストスイート ──────────────────────────────────────────

describe('チーム脱退ロジック', () => {
  describe('canOperatorLeave: オペレーター脱退可否の判定', () => {
    it('メンバー数1（ソロチーム）は脱退可能', () => {
      expect(canOperatorLeave(1, 0)).toBe(true);
    });

    it('メンバー数0（境界値）はソロ扱いで脱退可能', () => {
      // 防御的処理: Firestoreのカウント不整合でも脱退を許可する
      expect(canOperatorLeave(0, 0)).toBe(true);
    });

    it('複数メンバーでも他にオペレーターがいれば脱退可能', () => {
      expect(canOperatorLeave(3, 1)).toBe(true);
    });

    it('複数メンバーで自分が最後のオペレーターなら脱退不可', () => {
      expect(canOperatorLeave(3, 0)).toBe(false);
    });
  });

  describe('resolveLeaveAction: 脱退処理の決定', () => {
    describe('operator（オペレーター）', () => {
      it('ソロチーム（メンバー1名）: チーム削除して脱退', () => {
        const result = resolveLeaveAction('operator', 1, 0);
        expect(result.action).toBe('delete_team');
      });

      it('複数メンバーでも他にオペレーターがいれば通常脱退', () => {
        const result = resolveLeaveAction('operator', 3, 1);
        expect(result.action).toBe('leave');
      });

      it('複数メンバーで自分が最後のオペレーターなら脱退不可エラー', () => {
        const result = resolveLeaveAction('operator', 2, 0);
        expect(result.action).toBe('error');
        if (result.action === 'error') {
          expect(result.reason).toContain('オペレーター');
        }
      });

      it('大人数チームでも他にオペレーターがいれば通常脱退', () => {
        const result = resolveLeaveAction('operator', 10, 2);
        expect(result.action).toBe('leave');
      });

      it('大人数チームで最後のオペレーターなら脱退不可エラー', () => {
        const result = resolveLeaveAction('operator', 5, 0);
        expect(result.action).toBe('error');
      });

      it('境界値（メンバー0名）: チーム削除して脱退', () => {
        const result = resolveLeaveAction('operator', 0, 0);
        expect(result.action).toBe('delete_team');
      });
    });

    describe('member（メンバー）', () => {
      it('ソロ状態でも通常脱退できる', () => {
        const result = resolveLeaveAction('member', 1, 0);
        expect(result.action).toBe('leave');
      });

      it('複数メンバーでも通常脱退できる', () => {
        const result = resolveLeaveAction('member', 5, 0);
        expect(result.action).toBe('leave');
      });
    });

    describe('rom（ROM / 閲覧者）', () => {
      it('ソロ状態でも通常脱退できる', () => {
        const result = resolveLeaveAction('rom', 1, 0);
        expect(result.action).toBe('leave');
      });

      it('複数メンバーでも通常脱退できる', () => {
        const result = resolveLeaveAction('rom', 3, 0);
        expect(result.action).toBe('leave');
      });
    });
  });
});
