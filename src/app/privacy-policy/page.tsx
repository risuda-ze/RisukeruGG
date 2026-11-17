// プライバシーポリシーページ（公開・認証不要）
// 個人情報保護法（2022年改正）に準拠した日本語プライバシーポリシーを掲載する

import type { Metadata } from 'next';
import Link from 'next/link';
import packageJson from '../../../package.json';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = {
  // ルート layout の title テンプレート（%s | リスケるGG）により「プライバシーポリシー | リスケるGG」となる
  title: 'プライバシーポリシー',
  description: 'リスケるGGのプライバシーポリシーです。個人情報の取り扱いについて説明しています。',
  alternates: { canonical: '/privacy-policy' },
};

// プライバシーポリシーの制定日・最終改定日
const EFFECTIVE_DATE = '2026年7月15日';
// 2026-09-06 改定: Discord 連携で取得・送信する情報の明記、機密情報の取り扱いの節を追加
const LAST_UPDATED = '2026年9月6日';

export default function PrivacyPolicyPage() {
  return (
    /* ── 全画面ダークテーマ背景（ログインページと統一） ────── */
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
        <h1 className="text-2xl font-bold text-text mb-2">プライバシーポリシー</h1>
        <p className="text-xs text-text-muted mb-10">
          制定日: {EFFECTIVE_DATE}　／　最終改定日: {LAST_UPDATED}
        </p>

        {/* はじめに */}
        <p className="text-sm text-text-muted leading-relaxed mb-10">
          リスケるGG運営（以下「当方」）は、配信者向けスケジュール管理アプリ「リスケるGG」（以下「本サービス」）における利用者の個人情報の取り扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。
        </p>

        {/* ─── セクション 1: 事業者情報 ─────────────────── */}
        <Section title="1. 事業者情報">
          <dl className="space-y-2 text-sm">
            <Row label="名称" value="リスケるGG運営" />
            <Row
              label="運営責任者"
              value="お取引に関するお問い合わせについて、請求があった場合には遅滞なく開示いたします。"
            />
            <Row
              label="所在地"
              value="お取引に関するお問い合わせについて、請求があった場合には遅滞なく開示いたします。"
            />
            <Row label="お問い合わせ先" value="pianshoul@gmail.com" />
          </dl>
        </Section>

        {/* ─── セクション 2: 取得する個人情報 ──────────── */}
        <Section title="2. 取得する個人情報">
          <p className="text-sm text-text-muted mb-3">当方は、以下の個人情報を取得します。</p>

          <h3 className="text-sm font-semibold text-text mb-2">
            Googleアカウント連携時に取得する情報
          </h3>
          <ul className="list-disc list-inside text-sm text-text-muted space-y-1 mb-4 ml-2">
            <li>メールアドレス</li>
            <li>表示名（displayName）</li>
            <li>プロフィール画像URL</li>
            <li>GoogleアカウントID（Firebase UID）</li>
          </ul>

          <h3 className="text-sm font-semibold text-text mb-2">
            サービス利用中にユーザーが登録・作成する情報
          </h3>
          <ul className="list-disc list-inside text-sm text-text-muted space-y-1 mb-4 ml-2">
            <li>プロフィール画像（アップロード）</li>
            <li>チーム情報（チーム名・招待設定）</li>
            <li>配信スケジュール情報（タイトル・日時・カテゴリ・参加者）</li>
            <li>タスク情報（内容・担当者・進捗状態）</li>
            <li>ブリーフ情報（動画・配信の企画内容、工程、担当者、締切、工程ごとの入力項目）</li>
            <li>通知設定</li>
            <li>
              Discord ユーザー名およびユーザーID（Discord連携でメンションを受け取るために任意で登録するもの）
            </li>
            <li>
              Discord サーバーID、チャンネルID、Webhook URL（チームの Discord 連携設定。オペレーターのみが登録・閲覧）
            </li>
          </ul>

          <h3 className="text-sm font-semibold text-text mb-2">
            サービス利用時に自動取得する情報
          </h3>
          <ul className="list-disc list-inside text-sm text-text-muted space-y-1 ml-2">
            <li>IPアドレス（Vercelアクセスログ）</li>
            <li>ブラウザのUser-Agent</li>
            <li>アクセス日時</li>
          </ul>
        </Section>

        {/* ─── セクション 3: 利用目的 ────────────────────── */}
        <Section title="3. 利用目的">
          <p className="text-sm text-text-muted mb-3">
            取得した個人情報は、以下の目的で利用します。
          </p>
          <ol className="list-decimal list-inside text-sm text-text-muted space-y-2 ml-2">
            <li>本サービスの提供・維持・改善</li>
            <li>ユーザー認証および本人確認</li>
            <li>チーム機能・コラボ機能の提供</li>
            <li>通知およびメンション（Discord 連携経由）の配信</li>
            <li>利用状況の集計・分析によるサービス改善</li>
            <li>お問い合わせへの対応</li>
            <li>不正アクセスの検知・防止</li>
            <li>法令に基づく対応</li>
          </ol>
        </Section>

        {/* ─── セクション 4: 第三者への提供 ─────────────── */}
        <Section title="4. 第三者への提供">
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            当方は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
          </p>
          <ul className="list-disc list-inside text-sm text-text-muted space-y-2 ml-2">
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>人の生命・身体または財産の保護のために必要であり、本人の同意を得ることが困難な場合</li>
            <li>公衆衛生の向上または児童の健全な育成のために特に必要な場合</li>
            <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
          </ul>
        </Section>

        {/* ─── セクション 5: 委託先への提供 ─────────────── */}
        <Section title="5. 委託先への提供">
          <p className="text-sm text-text-muted leading-relaxed mb-4">
            当方は、本サービスの運営のために必要な業務の一部を以下の事業者に委託しており、業務に必要な範囲で個人情報を提供します。なお、これらは個人情報保護法上の「第三者提供」には該当しません。当方は委託先に対し、適切な安全管理措置を講じるよう監督します。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 text-text-muted font-medium">委託先</th>
                  <th className="text-left py-2 text-text-muted font-medium">委託内容</th>
                </tr>
              </thead>
              <tbody className="text-text-muted">
                <tr className="border-b border-border">
                  <td className="py-3 pr-4 align-top whitespace-nowrap">Google LLC（Firebase）</td>
                  <td className="py-3">ユーザー認証・データベース・ファイルストレージ・サーバーサイド処理</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 align-top whitespace-nowrap">Vercel Inc.</td>
                  <td className="py-3">Webサービスのホスティング・CDN配信</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* ─── セクション 6: 外国への個人情報の提供 ─────── */}
        <Section title="6. 外国への個人情報の提供">
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            上記委託先（Google LLC・Vercel Inc.）は米国に所在します。米国は、個人情報保護委員会が定める「十分な保護水準を確保している外国」（十分性認定）には該当しませんが、当方は各社との間でデータ処理契約（DPA）を締結し、個人情報の適切な保護措置を確保しています。
          </p>
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            また、Discord連携を有効にしたチームでは、「9. Discord連携における情報の送信」に記載する情報が、チームの設定に基づき米国に所在する Discord Inc. へ送信されます。
          </p>
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            各委託先・送信先のプライバシーポリシーは以下よりご確認いただけます。
          </p>
          <ul className="text-sm space-y-2 ml-2">
            <li>
              <a
                href="https://discord.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-2 hover:underline"
              >
                Discord Inc. プライバシーポリシー
              </a>
            </li>
            <li>
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-2 hover:underline"
              >
                Google LLC プライバシーポリシー
              </a>
            </li>
            <li>
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-2 hover:underline"
              >
                Vercel Inc. プライバシーポリシー
              </a>
            </li>
          </ul>
        </Section>

        {/* ─── セクション 7: Cookie・アクセス解析・広告配信 ──── */}
        <Section title="7. Cookie・アクセス解析・広告配信について">
          <h3 className="text-sm font-semibold text-text mb-2">認証のためのCookie</h3>
          <p className="text-sm text-text-muted leading-relaxed mb-4">
            本サービスは、ユーザー認証のために Firebase Authentication が発行する認証トークンをCookieまたはSession Storageに保存します。これらはサービスの提供に必要不可欠であり、ブラウザの設定で無効化した場合はサービスをご利用いただけなくなります。
          </p>

          <h3 className="text-sm font-semibold text-text mb-2">アクセス解析・エラー監視ツール</h3>
          <p className="text-sm text-text-muted leading-relaxed mb-4">
            本サービスは、サービスの利用状況の把握と品質改善のため、今後、Google が提供するアクセス解析ツール（Google Analytics / Firebase Analytics）やエラー監視ツール（Sentry 等）を利用する場合があります。これらのツールはCookie等を用いて利用者の利用状況（アクセス状況・端末情報・発生したエラー情報等）を収集することがありますが、これらの情報は個人を直接特定するものではありません。利用者は、ブラウザの設定やGoogleが提供するオプトアウト手段により、これらの情報収集を無効化することができます。
          </p>

          <h3 className="text-sm font-semibold text-text mb-2">第三者配信の広告について</h3>
          <p className="text-sm text-text-muted leading-relaxed">
            本サービスは、無料プラン（LIGHTプラン）において、今後、第三者配信の広告サービス（Google AdSense 等）を利用する場合があります。これらの広告配信事業者は、利用者の興味・関心に応じた広告を表示するため、Cookie等を用いて本サービスや他のサイトへのアクセス情報を取得することがあります。利用者は、広告設定ページ等を通じて、パーソナライズド広告（興味・関心に基づく広告）を無効にすることができます。第三者による情報の取り扱いについては、各事業者のプライバシーポリシーをご確認ください。なお、これらのツール・広告を導入する際は、本ポリシーを更新のうえ周知いたします。
          </p>
        </Section>

        {/* ─── セクション 8: 安全管理措置 ───────────────── */}
        <Section title="8. 安全管理措置">
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            当方は、個人情報の漏洩・滅失・毀損の防止その他の安全管理のために、以下の措置を講じています。
          </p>
          <ul className="list-disc list-inside text-sm text-text-muted space-y-2 ml-2">
            <li>Firebase Security Rules によるデータアクセス制御（チーム単位でのデータ分離）</li>
            <li>HTTPS通信の強制（すべての通信を暗号化）</li>
            <li>Firebase Cloud FunctionsでのサーバーサイドUser認証チェック</li>
            <li>Firebase Authenticationによる厳格なユーザー認証管理</li>
            <li>Firebase Storageへのアクセス制御ルール</li>
          </ul>
        </Section>

        {/* ─── セクション 9: Discord連携における情報の送信（2026-09-06 追加） ─── */}
        <Section title="9. Discord連携における情報の送信">
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            Discord連携を有効にしたチームでは、スケジュール、タスク、ブリーフの内容（タイトル、担当者名、締切、進捗等）が、チームが指定した Discord サーバーのチャンネルおよびスレッドへ送信されます。送信された情報は Discord Inc.（米国）が同社のプライバシーポリシーに基づき取り扱います。
          </p>
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            当方は、Discord 上での情報の閲覧、保存、拡散について管理を行わず、責任を負いません。Bot を導入する Discord サーバーの参加者、権限およびチャンネルの設定は、チームのオペレーターの責任で管理してください。
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            Discord連携の有効・無効および送信先の設定は、チームのオペレーターがいつでも変更できます。メンション用に登録した Discord ユーザー名・ユーザーIDは、利用者本人がいつでも削除でき、アカウント削除時にはメンバー情報とともに消去されます。当方は Discord のメッセージ本文やアカウントの認証情報を取得・保持しません。
          </p>
        </Section>

        {/* ─── セクション 10: 機密情報の取り扱い（2026-09-06 追加） ─── */}
        <Section title="10. 機密情報の取り扱い">
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            本サービスは機密情報の入力を想定しておらず、利用規約第6条においてパスワードその他の認証情報、決済情報、公的識別番号、第三者の個人情報、営業秘密その他の機密情報の入力を禁止しています。
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            利用者が本サービスに入力した内容の適切性は、利用者自身の責任において判断してください。禁止に反して入力された機密情報の取り扱いについては、
            <Link href="/terms" className="text-brand-2 hover:underline">
              利用規約第9条
            </Link>
            をご確認ください。
          </p>
        </Section>

        {/* ─── セクション 11: 個人情報に関するご請求 ─────── */}
        <Section title="11. 個人情報に関するご請求">
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            ユーザーは、当方が保有するご自身の個人情報について、以下の権利を有します（個人情報保護法第33条〜第38条）。
          </p>
          <ul className="list-disc list-inside text-sm text-text-muted space-y-2 mb-4 ml-2">
            <li>
              <span className="font-medium text-text-2">開示請求</span>（第33条）：保有個人データの開示を求める権利
            </li>
            <li>
              <span className="font-medium text-text-2">訂正・追加・削除請求</span>（第34条）：内容が事実でない場合に訂正等を求める権利
            </li>
            <li>
              <span className="font-medium text-text-2">利用停止・消去請求</span>（第35条）：不正な取得や目的外利用の場合に利用停止等を求める権利
            </li>
            <li>
              <span className="font-medium text-text-2">第三者提供の停止請求</span>（第37条）：第三者提供の停止を求める権利
            </li>
          </ul>
          <p className="text-sm text-text-muted leading-relaxed">
            ご請求は、下記「お問い合わせ窓口」までご連絡ください。本人確認を行ったうえで、法令の定める期間内に対応いたします。なお、アカウントの削除は本サービス内の設定画面からも行えます。
          </p>
        </Section>

        {/* ─── セクション 12: お問い合わせ窓口 ──────────── */}
        <Section title="12. お問い合わせ窓口">
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            個人情報の取り扱いに関するお問い合わせは、以下の窓口までご連絡ください。
          </p>
          <dl className="space-y-2 text-sm">
            <Row label="担当" value="リスケるGG運営 個人情報取扱窓口" />
            <Row label="メール" value="pianshoul@gmail.com" />
            <Row
              label="受付時間"
              value="メールにて随時受け付けております（返信までにお時間をいただく場合があります）。"
            />
          </dl>
        </Section>

        {/* ─── セクション 13: プライバシーポリシーの変更 ── */}
        <Section title="13. プライバシーポリシーの変更">
          <p className="text-sm text-text-muted leading-relaxed">
            当方は、法令の変更またはサービスの変更に伴い、本ポリシーを改定することがあります。重要な変更はサービス上での告知により周知いたします。改定後のポリシーは、本ページへの掲載をもって効力を生じるものとします。
          </p>
        </Section>

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
      <dt className="text-text-muted shrink-0 sm:w-28">{label}</dt>
      <dd className="text-text-2">{value}</dd>
    </div>
  );
}
