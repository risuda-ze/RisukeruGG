// 利用規約ページ（公開・認証不要）
// 個人開発のWebサービスとして標準的な利用規約を日本語で掲載する

import type { Metadata } from 'next';
import Link from 'next/link';
import packageJson from '../../../package.json';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = {
  title: '利用規約',
  description: 'リスケるGGの利用規約です。本サービスのご利用条件について定めています。',
};

// 利用規約の制定日・最終改定日
const EFFECTIVE_DATE = '2026年7月15日';
const LAST_UPDATED = '2026年7月15日';

export default function TermsPage() {
  return (
    /* ── 全画面ダークテーマ背景（プライバシーポリシーページと統一） ────── */
    <div className="min-h-screen bg-bg">
      {/* ── ページヘッダー ───────────────────────────────── */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* ロゴ + アプリ名 */}
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 56 56" fill="none" className="h-8 w-8 shrink-0">
              <rect width="56" height="56" rx="14" fill="var(--purple-d)" />
              <path
                d="M14 28c0-7.7 6.3-14 14-14s14 6.3 14 14-6.3 14-14 14-14-6.3-14-14Z"
                fill="var(--purple)"
                opacity=".3"
              />
              <rect x="22.5" y="20" width="3" height="10" rx="1.5" fill="var(--purple-l)" />
              <rect x="19" y="24" width="10" height="3" rx="1.5" fill="var(--purple-l)" />
              <circle cx="38" cy="23" r="2.5" fill="var(--amber)" />
              <circle cx="33" cy="31" r="2.5" fill="var(--amber)" />
            </svg>
            <span className="text-text font-semibold">リスケるGG</span>
          </div>
          {/* ログインに戻るリンク */}
          <Link
            href="/login"
            className="text-sm text-muted hover:text-purple-l transition-colors flex items-center gap-1"
          >
            <Icon name="chevron_right" size={16} className="rotate-180" />
            ログインに戻る
          </Link>
        </div>
      </header>

      {/* ── メインコンテンツ ─────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* タイトル */}
        <h1 className="text-2xl font-bold text-text mb-2">利用規約</h1>
        <p className="text-xs text-muted mb-10">
          制定日: {EFFECTIVE_DATE}　／　最終改定日: {LAST_UPDATED}
        </p>

        {/* はじめに */}
        <p className="text-sm text-muted leading-relaxed mb-10">
          本利用規約（以下「本規約」）は、リスケるGG運営（以下「当方」）が提供する配信者向けスケジュール管理アプリ「リスケるGG」（以下「本サービス」）の利用条件を定めるものです。ご利用にあたっては、本規約の全文をお読みいただき、内容に同意のうえご利用ください。本サービスにサインインした時点で、本規約に同意したものとみなします。
        </p>

        {/* ─── セクション 1: 適用 ─────────────────── */}
        <Section title="1. 適用">
          <p className="text-sm text-muted leading-relaxed mb-3">
            本規約は、本サービスの提供条件および本サービスの利用に関する当方と利用者との間の権利義務関係を定めることを目的とし、利用者と当方との間の本サービスの利用に関わる一切の関係に適用されます。
          </p>
          <p className="text-sm text-muted leading-relaxed">
            当方が本サービス上で個別に定める諸規定やガイドラインは、本規約の一部を構成するものとします。本規約の内容と個別規定の内容が異なる場合には、個別規定が優先して適用されるものとします。
          </p>
        </Section>

        {/* ─── セクション 2: 利用登録 ─────────────────── */}
        <Section title="2. 利用登録">
          <p className="text-sm text-muted leading-relaxed mb-3">
            本サービスの利用を希望する方は、本規約に同意のうえ、当方の定める方法により利用登録を行うものとします。利用登録は、Googleアカウントによる認証、またはメールアドレスとパスワードによる認証のいずれかにより行います。
          </p>
          <p className="text-sm text-muted leading-relaxed mb-3">
            当方は、利用登録の申請者に以下の事由があると判断した場合、利用登録を拒否することがあり、その理由については一切の開示義務を負わないものとします。
          </p>
          <ul className="list-disc list-inside text-sm text-muted space-y-2 ml-2">
            <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
            <li>本規約に違反したことがある者からの申請である場合</li>
            <li>その他、当方が利用登録を相当でないと判断した場合</li>
          </ul>
        </Section>

        {/* ─── セクション 3: アカウントの管理 ─────────────────── */}
        <Section title="3. アカウントの管理">
          <p className="text-sm text-muted leading-relaxed mb-3">
            利用者は、自己の責任において、本サービスのアカウント（認証情報を含む）を適切に管理するものとします。
          </p>
          <p className="text-sm text-muted leading-relaxed mb-3">
            利用者は、いかなる場合にも、アカウントを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。
          </p>
          <p className="text-sm text-muted leading-relaxed">
            アカウントの管理不十分、使用上の過誤、第三者の使用等によって利用者または第三者に生じた損害について、当方は当方の故意または重過失による場合を除き、責任を負わないものとします。
          </p>
        </Section>

        {/* ─── セクション 4: 料金および支払方法 ─────────────────── */}
        <Section title="4. 料金および支払方法">
          <p className="text-sm text-muted leading-relaxed mb-3">
            本サービスには、無料の「LIGHTプラン」と有料の「PARTYプラン」があります。PARTYプランの利用料金は
            <span className="text-text-2 font-medium">月額500円（税込／1アカウントあたり）</span>
            です。各プランの機能差については、本サービス内の料金案内をご確認ください。
          </p>
          <p className="text-sm text-muted leading-relaxed mb-3">
            PARTYプランへのお申し込みおよびお支払いは、現時点では当方が案内する外部の申込・決済手段を通じて行っていただきます。お申し込みの具体的な方法は、本サービス内の案内に従ってください。
          </p>
          <p className="text-sm text-muted leading-relaxed">
            利用料金の詳細および支払時期・支払方法については、「特定商取引法に基づく表記」もあわせてご確認ください。
          </p>
        </Section>

        {/* ─── セクション 5: 解約・返金 ─────────────────── */}
        <Section title="5. 解約・返金">
          <p className="text-sm text-muted leading-relaxed mb-3">
            利用者は、当方の定める方法によりいつでもPARTYプランを解約することができます。解約手続き完了後は、次回更新日以降の課金が停止されます。
          </p>
          <p className="text-sm text-muted leading-relaxed mb-3">
            解約後も、当該課金期間の満了日までは引き続きPARTYプランの機能をご利用いただけます。既にお支払いいただいた利用料金については、日割りでの返金を含め、原則として返金は行いません。
          </p>
          <p className="text-sm text-muted leading-relaxed">
            アカウントの削除は、本サービス内の設定画面から行うことができます。
          </p>
        </Section>

        {/* ─── セクション 6: 禁止事項 ─────────────────── */}
        <Section title="6. 禁止事項">
          <p className="text-sm text-muted leading-relaxed mb-3">
            利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。
          </p>
          <ul className="list-disc list-inside text-sm text-muted space-y-2 ml-2">
            <li>法令または公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>当方または第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為</li>
            <li>本サービスのサーバーやネットワークに過度の負荷をかける行為、不正アクセスを試みる行為</li>
            <li>本サービスの運営を妨害するおそれのある行為</li>
            <li>他の利用者に関する個人情報等を不正に収集または蓄積する行為</li>
            <li>他の利用者に成りすます行為、または不正な目的でアカウントを利用する行為</li>
            <li>反社会的勢力に対して直接または間接に利益を供与する行為</li>
            <li>その他、当方が不適切と判断する行為</li>
          </ul>
        </Section>

        {/* ─── セクション 7: コンテンツ・データの権利帰属 ─────────────────── */}
        <Section title="7. コンテンツ・データの権利帰属">
          <p className="text-sm text-muted leading-relaxed mb-3">
            利用者が本サービスに登録・作成したスケジュール、タスク、チーム情報、その他のデータ（以下「利用者コンテンツ」）に関する権利は、当該利用者または正当な権利者に帰属します。当方はこれらの権利を取得するものではありません。
          </p>
          <p className="text-sm text-muted leading-relaxed mb-3">
            当方は、本サービスの提供・維持・改善に必要な範囲において、利用者コンテンツを利用（保存・複製・表示・バックアップ等）することができるものとします。
          </p>
          <p className="text-sm text-muted leading-relaxed">
            本サービス自体（プログラム、デザイン、ロゴ、商標等）に関する知的財産権は、当方または正当な権利者に帰属します。本規約は、本サービスに関する当方の知的財産権を利用者に譲渡・許諾するものではありません。
          </p>
        </Section>

        {/* ─── セクション 8: サービスの提供の停止・変更・終了 ─────────────────── */}
        <Section title="8. サービスの提供の停止・変更・終了">
          <p className="text-sm text-muted leading-relaxed mb-3">
            当方は、以下のいずれかに該当する場合、利用者に事前に通知することなく、本サービスの全部または一部の提供を停止または中断することができるものとします。
          </p>
          <ul className="list-disc list-inside text-sm text-muted space-y-2 mb-3 ml-2">
            <li>本サービスにかかるシステムの保守点検または更新を行う場合</li>
            <li>地震、落雷、火災、停電、天災その他の不可抗力により本サービスの提供が困難となった場合</li>
            <li>本サービスが利用している外部サービス（Firebase、Vercel 等）に障害が生じた場合</li>
            <li>その他、当方が本サービスの提供が困難と判断した場合</li>
          </ul>
          <p className="text-sm text-muted leading-relaxed">
            当方は、当方の都合により本サービスの内容を変更し、または本サービスの提供を終了することができます。本サービスの提供を終了する場合、当方は利用者に対し、合理的な範囲で事前に告知するよう努めます。
          </p>
        </Section>

        {/* ─── セクション 9: 免責事項 ─────────────────── */}
        <Section title="9. 免責事項">
          <p className="text-sm text-muted leading-relaxed mb-3">
            本サービスは現状有姿で提供されるものであり、当方は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定目的への適合性、セキュリティ等に関する欠陥、エラーやバグ、権利侵害等を含みます）がないことを明示的にも黙示的にも保証するものではありません。
          </p>
          <p className="text-sm text-muted leading-relaxed mb-3">
            本サービスは公開試用段階を含む発展途上のサービスであり、データの消失や不具合が生じる可能性があります。利用者は、重要なデータについては自己の責任においてバックアップを行うものとします。
          </p>
          <p className="text-sm text-muted leading-relaxed">
            当方は、本サービスに起因して利用者に生じたあらゆる損害について、当方の故意または重過失による場合を除き、一切の責任を負いません。なお、消費者契約法その他の法令により当方の免責が認められない場合、当方は当該法令の定めに従い責任を負います。
          </p>
        </Section>

        {/* ─── セクション 10: 利用規約の変更 ─────────────────── */}
        <Section title="10. 利用規約の変更">
          <p className="text-sm text-muted leading-relaxed">
            当方は、必要と判断した場合には、利用者に通知することなくいつでも本規約を変更することができるものとします。重要な変更を行う場合は、アプリ内通知またはサービス上での告知により周知いたします。変更後の本規約は、本ページへの掲載をもって効力を生じるものとし、掲載後に利用者が本サービスを利用した場合、変更後の本規約に同意したものとみなします。
          </p>
        </Section>

        {/* ─── セクション 11: 準拠法・裁判管轄 ─────────────────── */}
        <Section title="11. 準拠法・裁判管轄">
          <p className="text-sm text-muted leading-relaxed">
            本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して当方と利用者との間で紛争が生じた場合には、当方の所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </Section>

        {/* ─── セクション 12: お問い合わせ窓口 ─────────────────── */}
        <Section title="12. お問い合わせ窓口">
          <p className="text-sm text-muted leading-relaxed mb-3">
            本規約に関するお問い合わせは、以下の窓口までご連絡ください。
          </p>
          <dl className="space-y-2 text-sm">
            <Row label="事業者名" value="リスケるGG運営" />
            <Row label="メール" value="pianshoul@gmail.com" />
            <Row
              label="その他の情報"
              value="運営責任者の氏名・所在地・連絡先電話番号は、お取引に関するお問い合わせについて、請求があった場合には遅滞なく開示いたします。"
            />
          </dl>
        </Section>

        {/* 制定日・バージョン */}
        <div className="mt-10 pt-6 border-t border-border text-xs text-muted space-y-1">
          <p>制定日: {EFFECTIVE_DATE}</p>
          <p>最終改定日: {LAST_UPDATED}</p>
          <p className="mt-2">リスケるGG v{packageJson.version}</p>
        </div>
      </main>

      {/* ── フッター ──────────────────────────────────────── */}
      <footer className="border-t border-border mt-10">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} リスケるGG. All rights reserved.
          </p>
          <Link href="/login" className="text-xs text-muted hover:text-purple-l transition-colors">
            ← ログインに戻る
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ── 共通ヘルパーコンポーネント ─────────────────────────── */

/** セクション見出し + コンテンツのラッパー */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-text mt-8 mb-4 border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** 定義リスト行（ラベル: 値） */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4">
      <dt className="text-muted shrink-0 sm:w-28">{label}</dt>
      <dd className="text-text-2">{value}</dd>
    </div>
  );
}
