'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { trackEvent } from '@/lib/analytics';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LIGHT_PLAN_LIMITS } from '@/types/entities';
import { isPartyPlan, isFreePartyMode } from '@/lib/plan';
import { createStripeCheckoutSession, createStripePortalSession } from '@/lib/repositories/billing';

interface PlanStatusProps {
  monthlyTaskCount: number;
  monthlyCollabCount: number;
}

export function PlanStatus({ monthlyTaskCount, monthlyCollabCount }: PlanStatusProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const members = useAuthStore((s) => s.members);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser) return null;

  const myMember = members.find((m) => m.userId === currentUser.uid);
  const isLight = !isPartyPlan(myMember?.plan);
  // 試用モード中は課金導線を一切出さない（PL-011）。
  const showBilling = !isFreePartyMode();

  async function handleUpgrade() {
    setLoading(true);
    setError(null);
    try {
      trackEvent('upgrade_cta_click');
      const { data } = await createStripeCheckoutSession({});
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('決済ページの生成に失敗しました');
      }
    } catch {
      setError('決済ページの生成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleManageBilling() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await createStripePortalSession({});
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('支払い設定ページの生成に失敗しました');
      }
    } catch {
      setError('支払い設定ページの生成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant={isLight ? 'muted' : 'purple'}>{isLight ? 'LIGHT' : 'PARTY'}</Badge>
        <span className="text-sm text-text-muted">現在のプラン</span>
      </div>

      {isLight && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>タスク作成（月）</span>
            <span className="font-num">
              {monthlyTaskCount} / {LIGHT_PLAN_LIMITS.monthlyTasks}件
            </span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>コラボ日程（月）</span>
            <span className="font-num">
              {monthlyCollabCount} / {LIGHT_PLAN_LIMITS.monthlyCollabs}件
            </span>
          </div>
        </div>
      )}

      {showBilling && isLight && (
        <Button variant="amber" className="w-full" loading={loading} onClick={handleUpgrade}>
          PARTYプランにアップグレード
        </Button>
      )}

      {showBilling && !isLight && (
        <Button
          variant="secondary"
          className="w-full"
          loading={loading}
          onClick={handleManageBilling}
        >
          支払い設定（Customer Portal）
        </Button>
      )}

      {error && <p className="text-[12px] text-live">{error}</p>}
    </div>
  );
}
