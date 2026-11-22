'use client';

/**
 * LIGHT プランユーザー向け自社告知枠（PL-002）。
 *
 * 外部広告ネットワークは当面見送り、自社コンテンツの告知枠として運用する。
 * 第一弾は PARTY プランへのアップグレード訴求（広告なし・無制限）。
 * PARTY プラン相当（試用モード中を含む）は非表示。
 *
 * 枠の高さは固定し CLS を発生させない。デザインは docs/DESIGN.md のトークンに準拠する。
 */

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { trackEvent } from '@/lib/analytics';
import { isPartyPlan } from '@/lib/plan';
import type { PlanType } from '@/types/entities';
import { badgeVariants } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';

interface BannerAdProps {
  plan: PlanType;
}

export function BannerAd({ plan }: BannerAdProps) {
  // PARTY プラン相当（試用モード中を含む）は告知枠を表示しない
  if (isPartyPlan(plan)) return null;

  return (
    <Link
      href="/settings/profile"
      onClick={() => trackEvent('upgrade_cta_click', { source: 'banner_ad' })}
      aria-label="PARTYプランのお知らせ: 広告なし・無制限で使えます"
      className="flex h-16 w-full items-center gap-3 rounded-lg border border-border bg-card px-4 no-underline transition-colors duration-(--duration-fast) ease-out hover:border-border-strong"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: 'var(--surface-2)', color: 'var(--brand-2)' }}
      >
        <Icon name="auto_awesome" size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text">
          PARTYプランで広告も上限もゼロに
        </span>
        <span className="block truncate text-[12px] text-text-muted">
          チーム機能・全通知・無制限のフル機能を開放
        </span>
      </span>
      <span
        className={cn(badgeVariants({ variant: 'primary' }), 'shrink-0 max-[400px]:hidden')}
        aria-hidden="true"
      >
        詳しく見る
        <Icon name="chevron_right" size={14} />
      </span>
    </Link>
  );
}
