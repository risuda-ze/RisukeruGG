/* LIGHTプランユーザー向けバナー広告プレースホルダー */

import { isPartyPlan } from '@/lib/plan';
import type { PlanType } from '@/types/entities';

interface BannerAdProps {
  plan: PlanType;
}

export function BannerAd({ plan }: BannerAdProps) {
  // PARTY プラン相当（試用モード中を含む）は広告を表示しない
  if (isPartyPlan(plan)) return null;

  return (
    <div
      className="h-16 w-full rounded-[12px] border border-dashed border-border bg-surface/50"
      aria-label="広告スペース"
      role="complementary"
    />
  );
}
