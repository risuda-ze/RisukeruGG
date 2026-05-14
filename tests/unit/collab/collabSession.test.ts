import { describe, it, expect } from 'vitest';
import type { CollabSession } from '@/types/entities';

function buildSession(
  status: CollabSession['status'],
  expiresAt: Date,
  overrides?: Partial<CollabSession>
): CollabSession {
  return {
    id: 'session-1',
    title: 'テストコラボ',
    partnerName: 'テストさん',
    createdBy: 'user1',
    teamId: 'team1',
    proposedDates: [new Date('2026-06-01T10:00:00Z'), new Date('2026-06-02T10:00:00Z')],
    responses: null,
    expiresAt,
    status,
    confirmedDate: null,
    linkedScheduleId: null,
    createdAt: new Date('2026-05-01T00:00:00Z'),
    ...overrides,
  };
}

function canRespond(session: CollabSession, now = new Date()): boolean {
  return session.status === 'open' && session.expiresAt > now;
}

function canConfirm(session: CollabSession): boolean {
  return session.status === 'open';
}

describe('コラボセッション状態管理', () => {
  const futureDate = new Date('2099-01-01T00:00:00Z');
  const pastDate = new Date('2020-01-01T00:00:00Z');

  describe('open（期限内）', () => {
    it('回答可能', () => {
      const session = buildSession('open', futureDate);
      expect(canRespond(session)).toBe(true);
    });

    it('確定可能', () => {
      const session = buildSession('open', futureDate);
      expect(canConfirm(session)).toBe(true);
    });
  });

  describe('open（期限切れ）', () => {
    it('回答不可', () => {
      const session = buildSession('open', pastDate);
      expect(canRespond(session)).toBe(false);
    });

    it('確定はステータスがopenならUI上は可能（CFでバリデーション）', () => {
      const session = buildSession('open', pastDate);
      expect(canConfirm(session)).toBe(true);
    });
  });

  describe('confirmed', () => {
    it('回答不可', () => {
      const session = buildSession('confirmed', futureDate);
      expect(canRespond(session)).toBe(false);
    });

    it('確定不可', () => {
      const session = buildSession('confirmed', futureDate);
      expect(canConfirm(session)).toBe(false);
    });
  });

  describe('expired', () => {
    it('回答不可', () => {
      const session = buildSession('expired', pastDate);
      expect(canRespond(session)).toBe(false);
    });

    it('確定不可', () => {
      const session = buildSession('expired', futureDate);
      expect(canConfirm(session)).toBe(false);
    });
  });

  describe('cancelled', () => {
    it('回答不可', () => {
      const session = buildSession('cancelled', futureDate);
      expect(canRespond(session)).toBe(false);
    });

    it('確定不可', () => {
      const session = buildSession('cancelled', futureDate);
      expect(canConfirm(session)).toBe(false);
    });
  });

  describe('期限内/期限切れの判定', () => {
    it('期限が1秒後は期限内', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 1000);
      const session = buildSession('open', expiresAt);
      expect(canRespond(session, now)).toBe(true);
    });

    it('期限が1秒前は期限切れ', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() - 1000);
      const session = buildSession('open', expiresAt);
      expect(canRespond(session, now)).toBe(false);
    });
  });
});
