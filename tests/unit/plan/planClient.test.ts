import { afterEach, describe, expect, it } from 'vitest';
import { getEffectivePlan, isFreePartyMode, isPartyPlan } from '@/lib/plan';

/**
 * クライアント側プラン判定（src/lib/plan.ts）のテスト。
 * 試用モードフラグ NEXT_PUBLIC_FREE_PARTY_MODE の ON/OFF × plan 値の組み合わせを網羅する。
 */
describe('src/lib/plan（クライアント側プラン判定）', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FREE_PARTY_MODE;
  });

  describe('フラグ OFF（通常運用）', () => {
    it('plan="party" は PARTY 扱い', () => {
      expect(isFreePartyMode()).toBe(false);
      expect(getEffectivePlan('party')).toBe('party');
      expect(isPartyPlan('party')).toBe(true);
    });

    it('plan="light" は LIGHT 扱い', () => {
      expect(getEffectivePlan('light')).toBe('light');
      expect(isPartyPlan('light')).toBe(false);
    });

    it('未設定（null / undefined）は LIGHT 扱い', () => {
      expect(getEffectivePlan(null)).toBe('light');
      expect(getEffectivePlan(undefined)).toBe('light');
      expect(isPartyPlan(null)).toBe(false);
      expect(isPartyPlan(undefined)).toBe(false);
    });
  });

  describe('フラグ ON（試用モード = "true"）', () => {
    it('plan 値に関わらず全て PARTY 扱いになる', () => {
      process.env.NEXT_PUBLIC_FREE_PARTY_MODE = 'true';
      expect(isFreePartyMode()).toBe(true);
      expect(getEffectivePlan('light')).toBe('party');
      expect(getEffectivePlan('party')).toBe('party');
      expect(getEffectivePlan(null)).toBe('party');
      expect(getEffectivePlan(undefined)).toBe('party');
      expect(isPartyPlan('light')).toBe(true);
      expect(isPartyPlan(null)).toBe(true);
    });
  });

  describe('フラグが "true" 以外の値', () => {
    it('"1" や "false" では試用モードは無効', () => {
      process.env.NEXT_PUBLIC_FREE_PARTY_MODE = '1';
      expect(isFreePartyMode()).toBe(false);
      expect(isPartyPlan('light')).toBe(false);

      process.env.NEXT_PUBLIC_FREE_PARTY_MODE = 'false';
      expect(isFreePartyMode()).toBe(false);
      expect(isPartyPlan('light')).toBe(false);
    });
  });
});
