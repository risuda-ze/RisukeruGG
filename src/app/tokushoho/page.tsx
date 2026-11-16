// 特定商取引法に基づく表記ページ（公開・認証不要）
// 有料サブスクリプション提供に伴い必要な法定表記を日本語で掲載する

import type { Metadata } from 'next';
import Link from 'next/link';
import packageJson from '../../../package.json';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記',
  description: 'リスケるGGの特定商取引法に基づく表記です。販売価格・支払方法・解約条件等を記載しています。',
};

// 特定商取引法に基づく表記の制定日・最終改定日
const EFFECTIVE_DATE = '2026年7月15日';
const LAST_UPDATED = '2026年7月15日';

export default function TokushohoPage() {
  return (
    /* ── 全画面ダークテーマ背景（プライバシーポリシーページと統一） ────── */
    <div className="min-h-screen bg-canvas">
      {/* ── ページヘッダー ───────────────────────────────── */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* ロゴ + アプリ名 */}
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 56 56" fill="none" className="h-8 w-8 shrink-0">
              <rect width="56" height="56" rx="14" fill="color-mix(in oklab, var(--primary) 35%, transparent)" />
              <path
                d="M14 28c0-7.7 6.3-14 14-14s14 6.3 14 14-6.3 14-14 14-14-6.3-14-14Z"
                fill="var(--primary)"
                opacity=".3"
              />
              <rect x="22.5" y="20" width="3" height="10" rx="1.5" fill="var(--brand-2)" />
              <rect x="19" y="24" width="10" height="3" rx="1.5" fill="var(--brand-2)" />
              <circle cx="38" cy="23" r="2.5" fill="var(--warning)" />
              <circle cx="33" cy="31" r="2.5" fill="var(--warning)" />
            </svg>
            <span className="text-text font-semibold">リスケるGG</span>
          </div>
          {/* ログインに戻るリンク */}
          <Link
            href="/login"
            className="text-sm text-text-muted hover:text-brand-2 transition-colors flex items-center gap-1"
          >
            <Icon name="chevron_right" size={16} className="rotate-180" />
            ログインに戻る
          </Link>
        </div>
      </header>

      {/* ── メインコンテンツ ─────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* タイトル */}
        <h1 className="text-2xl font-bold text-text mb-2">特定商取引法に基づく表記</h1>
        <p className="text-xs text-text-muted mb-10">
          制定日: {EFFECTIVE_DATE}　／　最終改定日: {LAST_UPDATED}
        </p>

        {/* はじめに */}
        <p className="text-sm text-text-muted leading-relaxed mb-10">
          「特定商取引に関する法律」第11条に基づき、配信者向けスケジュール管理アプリ「リスケるGG」（以下「本サービス」）の販売条件について、以下のとおり表示いたします。
        </p>

        {/* 表記本体 */}
        <div className="rounded-[12px] border border-border overflow-hidden">
          <dl>
            <TokuRow label="販売業者">リスケるGG運営</TokuRow>
            <TokuRow label="運営責任者">
              お取引に関するお問い合わせについて、請求があった場合には遅滞なく開示いたします。
            </TokuRow>
            <TokuRow label="所在地">
              お取引に関するお問い合わせについて、請求があった場合には遅滞なく開示いたします。
            </TokuRow>
            <TokuRow label="電話番号">
              お取引に関するお問い合わせについて、請求があった場合には遅滞なく開示いたします。
            </TokuRow>
            <TokuRow label="連絡先メールアドレス">pianshoul@gmail.com</TokuRow>
            <TokuRow label="販売価格">
              PARTYプラン: 月額500円（税込／1アカウントあたり）
              <br />
              LIGHTプランは無料でご利用いただけます。
            </TokuRow>
            <TokuRow label="商品代金以外の必要料金">
              本サービスの利用に必要なインターネット接続料金・通信料金等は、利用者のご負担となります。
            </TokuRow>
            <TokuRow label="支払方法">
              当方が案内する外部の申込・決済手段によりお支払いいただきます。具体的な方法は本サービス内の案内に従ってください。
            </TokuRow>
            <TokuRow label="支払時期">
              PARTYプランは月額制のサブスクリプションです。お申し込み時に初回のお支払いが発生し、以後は各更新日に自動的に課金されます。
            </TokuRow>
            <TokuRow label="サービスの提供時期">
              決済（お申し込み手続き）の完了後、直ちにPARTYプランの機能をご利用いただけます。
            </TokuRow>
            <TokuRow label="解約・キャンセルについて">
              PARTYプランは、当方の定める方法によりいつでも解約できます。解約手続き完了後は、次回更新日以降の課金が停止されます。当該課金期間の満了日まではPARTYプランの機能を引き続きご利用いただけます。既にお支払いいただいた利用料金については、日割りでの返金を含め、原則として返金は行いません。
            </TokuRow>
            <TokuRow label="動作環境">
              本サービスはWebブラウザ上で動作します。推奨環境は以下のとおりです。
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>PC: Google Chrome / Microsoft Edge / Mozilla Firefox（各最新版）</li>
                <li>スマートフォン: Android版 Google Chrome（最新版）</li>
              </ul>
              上記以外の環境では、一部の機能が正常に動作しない場合があります。
            </TokuRow>
          </dl>
        </div>

        {/* 制定日・バージョン */}
        <div className="mt-10 pt-6 border-t border-border text-xs text-text-muted space-y-1">
          <p>制定日: {EFFECTIVE_DATE}</p>
          <p>最終改定日: {LAST_UPDATED}</p>
          <p className="mt-2">リスケるGG v{packageJson.version}</p>
        </div>
      </main>

      {/* ── フッター ──────────────────────────────────────── */}
      <footer className="border-t border-border mt-10">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} リスケるGG. All rights reserved.
          </p>
          <Link href="/login" className="text-xs text-text-muted hover:text-brand-2 transition-colors">
            ← ログインに戻る
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ── 共通ヘルパーコンポーネント ─────────────────────────── */

/** 特商法表記の1行（ラベル: 内容） */
function TokuRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row border-b border-border last:border-b-0">
      <dt className="text-sm text-text-muted font-medium bg-surface px-4 py-3 shrink-0 sm:w-48 sm:border-r sm:border-border">
        {label}
      </dt>
      <dd className="text-sm text-text-2 leading-relaxed px-4 py-3 flex-1">{children}</dd>
    </div>
  );
}
