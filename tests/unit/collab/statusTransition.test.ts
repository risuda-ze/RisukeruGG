import { describe, it, expect } from 'vitest';
import type { CollabStatus } from '@/types/entities';

// ステータス遷移の許可ルール（仕様準拠）
const ALLOWED_TRANSITIONS: Record<CollabStatus, CollabStatus[]> = {
  draft: ['open', 'cancelled'],
  open: ['confirmed', 'expired', 'cancelled'],
  confirmed: ['open'],
  expired: [],
  cancelled: [],
};

function canTransition(from: CollabStatus, to: CollabStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

describe('CollabStatus 遷移ルール', () => {
  describe('draft から', () => {
    it('open に遷移できる', () => {
      expect(canTransition('draft', 'open')).toBe(true);
    });
    it('cancelled に遷移できる', () => {
      expect(canTransition('draft', 'cancelled')).toBe(true);
    });
    it('confirmed に直接遷移できない', () => {
      expect(canTransition('draft', 'confirmed')).toBe(false);
    });
    it('expired に直接遷移できない', () => {
      expect(canTransition('draft', 'expired')).toBe(false);
    });
  });

  describe('open から', () => {
    it('confirmed に遷移できる', () => {
      expect(canTransition('open', 'confirmed')).toBe(true);
    });
    it('expired に遷移できる（期限切れ）', () => {
      expect(canTransition('open', 'expired')).toBe(true);
    });
    it('cancelled に遷移できる', () => {
      expect(canTransition('open', 'cancelled')).toBe(true);
    });
    it('draft に戻れない', () => {
      expect(canTransition('open', 'draft')).toBe(false);
    });
  });

  describe('confirmed から', () => {
    it('open に戻れる（再調整）', () => {
      expect(canTransition('confirmed', 'open')).toBe(true);
    });
    it('cancelled に直接遷移できない', () => {
      expect(canTransition('confirmed', 'cancelled')).toBe(false);
    });
    it('expired に直接遷移できない', () => {
      expect(canTransition('confirmed', 'expired')).toBe(false);
    });
  });

  describe('終端ステータス', () => {
    it('expired からはどこにも遷移できない', () => {
      const allStatuses: CollabStatus[] = ['draft', 'open', 'confirmed', 'expired', 'cancelled'];
      allStatuses.forEach((to) => {
        expect(canTransition('expired', to)).toBe(false);
      });
    });
    it('cancelled からはどこにも遷移できない', () => {
      const allStatuses: CollabStatus[] = ['draft', 'open', 'confirmed', 'expired', 'cancelled'];
      allStatuses.forEach((to) => {
        expect(canTransition('cancelled', to)).toBe(false);
      });
    });
  });
});
