'use client';

/**
 * 利用規約・プライバシーポリシー改定の告知（ダッシュボード）。
 *
 * 利用規約第 10 条・プライバシーポリシー第 13 条の「重要な変更はサービス上で告知する」を
 * 満たすための軽量な告知枠。閉じた状態は改定日をキーに localStorage へ保存し、
 * 次の改定（LEGAL_REVISION_DATE の更新）で再び表示される。
 */

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/** 直近の改定日（terms / privacy-policy の LAST_UPDATED と揃える） */
export const LEGAL_REVISION_DATE = '2026-09-06';

const STORAGE_KEY = `legal-notice-dismissed:${LEGAL_REVISION_DATE}`;

// 同一タブ内では storage イベントが発火しないため、購読者へ手動で通知する
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/** 表示すべきか（閉じた記録がなければ true）。localStorage が使えない環境では常に表示する */
function getSnapshot(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
}

/** SSR 時は描画しない（hydration 差分を避ける） */
function getServerSnapshot(): boolean {
  return false;
}

function dismiss() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // 保存できなくても閉じる操作自体は成立させる（次回表示は許容）
  }
  listeners.forEach((l) => l());
}

export function LegalUpdateNotice() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!visible) return null;

  return (
    <Card accent="primary" className="flex items-start gap-3" role="status">
      <span className="mt-0.5 shrink-0 text-purple-l">
        <Icon name="info" size={20} />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-text">利用規約・プライバシーポリシーを改定しました</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
          機密情報の入力禁止と、Discord連携で送信される情報の取り扱いを明記しました。
          <Link href="/terms" className="ml-1 text-purple-l hover:underline">
            利用規約
          </Link>
          <span className="mx-1">/</span>
          <Link href="/privacy-policy" className="text-purple-l hover:underline">
            プライバシーポリシー
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="この告知を閉じる"
        className={cn(buttonVariants({ variant: 'subtle', size: 'icon-sm' }), 'shrink-0')}
      >
        <Icon name="close" size={18} />
      </button>
    </Card>
  );
}
