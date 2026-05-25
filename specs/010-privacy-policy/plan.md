# Implementation Plan: プライバシーポリシー策定・実装

**Branch**: `010-privacy-policy` | **Date**: 2026-05-24 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/010-privacy-policy/spec.md`

## Summary

個人情報保護法（2022年改正）に準拠した日本語プライバシーポリシーを策定し、アプリに実装する。実装は3点：(1) `/privacy-policy` 公開ページ（静的 Server Component）の新規作成、(2) ログインページの同意テキストをリンク化、(3) 個人設定プロフィールページへの「アプリ情報」タブ追加。データベース変更は不要。

## Technical Context

**Language/Version**: TypeScript 5、Next.js 14（App Router）  
**Primary Dependencies**: React、Next.js `Link`  
**Storage**: N/A（静的コンテンツのみ）  
**Testing**: TypeScript 型チェック（tsc --noEmit）、Playwright スモークテスト  
**Target Platform**: Web（Vercel ホスティング）  
**Project Type**: Web application  
**Performance Goals**: `/privacy-policy` は SSG により静的配信、TTI 影響なし  
**Constraints**: ミドルウェア（`middleware.ts`）は存在しないため、認証制御は既存の `(protected)` ルートグループで行われている。新規 `/privacy-policy` は `(protected)` 外に配置するだけでパブリックアクセスが可能。  
**Scale/Scope**: 変更ファイル 2 件（既存）＋新規ページ 1 件

## Constitution Check

| 原則 | 評価 | 根拠 |
|------|------|------|
| I. シンプルさ優先 | ✅ PASS | 新規抽象化なし。静的コンテンツのみ。タブ追加は `Tab` 型への 1 値追加のみ。 |
| II. TypeScript型安全 | ✅ PASS | `Tab` 型に `'app-info'` を追加して型安全を維持。`any` 不使用。 |
| III. テスト方針 | ✅ PASS | UI 変更のみのためユニットテスト不要。AC 検証は Playwright スモークテストで対応。 |
| IV. Firebase・セキュリティ | ✅ PASS | Firestore・Storage へのアクセスなし。新規ページは公開ページのため Security Rules 変更不要。 |
| V. 日本語コメント | ✅ PASS | コード内コメントは日本語で記述。プライバシーポリシー本文も日本語。 |

## Project Structure

### Documentation (this feature)

```text
specs/010-privacy-policy/
├── plan.md         # このファイル
├── spec.md         # フィーチャー仕様
├── research.md     # Phase 0 調査結果
├── data-model.md   # Phase 1 データモデル
└── tasks.md        # Phase 2 タスク（/speckit-tasks で生成）
```

### Source Code（変更対象ファイル）

```text
src/
└── app/
    ├── privacy-policy/
    │   └── page.tsx                   # 新規：公開プライバシーポリシーページ
    ├── (auth)/
    │   └── login/
    │       └── page.tsx               # 変更：同意テキストをリンク化
    └── (protected)/
        └── settings/
            └── profile/
                └── page.tsx           # 変更：'app-info' タブ追加
```

---

## 実装詳細

### A. `/privacy-policy` ページ（新規）

**ファイル**: `src/app/privacy-policy/page.tsx`  
**コンポーネントタイプ**: Server Component（`'use client'` 不要）

#### ページ構成

```text
<ページ全体（白背景 or bg-bg）>
  <ヘッダー（ロゴ + アプリ名 + 「ログインに戻る」リンク）>
  <メインコンテンツ（max-w-3xl、中央寄せ）>
    h1: プライバシーポリシー
    制定日・最終改定日
    
    各セクション（h2 見出し）：
    1. 事業者情報
    2. 取得する個人情報
    3. 利用目的
    4. 第三者への提供
    5. 委託先（Firebase・Vercel）への提供
    6. 外国への個人情報の提供
    7. Cookie・認証トークンの使用
    8. 安全管理措置
    9. 個人情報に関するご請求
    10. お問い合わせ窓口
    11. プライバシーポリシーの変更
  </メインコンテンツ>
  <フッター（コピーライト）>
```

#### プライバシーポリシー本文（必須10項目）

以下は Generator が実装する際の本文テンプレート。`【　】` で囲まれた箇所は事業者が確定値を記入すること。

**1. 事業者情報**
```
名称: 【事業者名または個人名】
所在地: 【住所】
代表者: 【代表者名】
お問い合わせ先: 【メールアドレスまたは問い合わせフォームURL】
```

**2. 取得する個人情報**

Googleアカウント連携時に取得する情報：
- メールアドレス
- 表示名（displayName）
- プロフィール画像URL
- Google アカウント固有 ID（Firebase UID）

サービス利用中にユーザーが登録・作成する情報：
- プロフィール画像（アップロード）
- チーム情報（チーム名・招待設定）
- 配信スケジュール情報（タイトル・日時・カテゴリ・参加者）
- タスク情報（内容・担当者・進捗状態）
- 通知設定

サービス利用時に自動取得する情報：
- IPアドレス・User-Agent（Vercel アクセスログ）

**3. 利用目的**

1. 本サービスの提供・維持・改善
2. ユーザー認証および本人確認
3. チーム機能・コラボ機能の提供
4. プッシュ通知・アプリ内通知の配信
5. 利用状況の集計・分析によるサービス改善
6. お問い合わせへの対応
7. 不正アクセスの検知・防止
8. 法令に基づく対応

**4. 第三者への提供**

当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません：
- ユーザーの同意がある場合
- 法令に基づく場合
- 人の生命・身体または財産の保護のために必要な場合

**5. 委託先への提供**

以下の事業者に業務委託のため個人情報を提供します（個人情報保護法上の「第三者提供」には該当しません）：

| 委託先 | 利用目的 |
|--------|---------|
| Google LLC（Firebase） | 認証・データベース・ファイルストレージ・サーバーサイド処理・プッシュ通知 |
| Vercel Inc. | Webサービスのホスティング・配信 |

**6. 外国への個人情報の提供**

上記委託先（Google LLC・Vercel Inc.）は米国に所在します。個人情報保護委員会が定める基準（十分性認定）を受けていない国への移転ですが、各社の DPA（データ処理契約）に基づく適切な保護措置を講じています。

- Google LLC のプライバシーポリシー：https://policies.google.com/privacy
- Vercel Inc. のプライバシーポリシー：https://vercel.com/legal/privacy-policy

**7. Cookie・認証トークンの使用**

本サービスはユーザー認証のために Firebase Authentication が発行する認証トークンを Cookie または Session Storage に保存します。これらはサービスの提供に必要不可欠であり、ブラウザの設定で無効化した場合はサービスをご利用いただけません。第三者のトラッキング Cookie や広告 Cookie は使用しておりません。

**8. 安全管理措置**

- Firestore Security Rules によるデータアクセス制御（チーム単位で分離）
- 通信の HTTPS 暗号化
- Firebase Cloud Functions での認証チェック
- Firebase Authentication による厳格なユーザー認証

**9. 個人情報に関するご請求**

ユーザーはご自身の個人情報について、以下の権利を有します：
- 開示請求（第33条）
- 訂正・追加・削除請求（第34条）
- 利用停止・消去請求（第35条）
- 第三者提供の停止請求（第37条）

ご請求は下記お問い合わせ窓口までご連絡ください。本人確認の上、法令の定める期間内に対応いたします。

**10. お問い合わせ窓口**
```
【事業者名】 個人情報取扱窓口
メール: 【問い合わせメールアドレス】
受付時間: 【対応時間】
```

**11. プライバシーポリシーの変更**

当社は、法令の変更またはサービスの変更に伴い、本ポリシーを改定することがあります。重要な変更はアプリ内通知またはサービス上での告知により周知いたします。改定後のポリシーは、本ページへの掲載をもって効力を生じるものとします。

**制定日**: 2026年XX月XX日  
**最終改定日**: 2026年XX月XX日

---

### B. ログインページの更新

**ファイル**: `src/app/(auth)/login/page.tsx`  
**変更箇所**: L124〜L126（同意テキスト部分）

```tsx
// Before
<p className="text-center text-[11px] text-muted mt-5">
  サインインすることで利用規約・プライバシーポリシーに同意します
</p>

// After
<p className="text-center text-[11px] text-muted mt-5">
  サインインすることで利用規約・
  <Link
    href="/privacy-policy"
    target="_blank"
    rel="noopener noreferrer"
    className="underline hover:text-text transition-colors"
  >
    プライバシーポリシー
  </Link>
  に同意します
</p>
```

`next/link` の import を追加すること。

---

### C. 個人設定プロフィールページへの「アプリ情報」タブ追加

**ファイル**: `src/app/(protected)/settings/profile/page.tsx`

#### 1. 型定義の変更（L18）

```typescript
// Before
type Tab = 'profile' | 'notifications' | 'plan' | 'account';

// After
type Tab = 'profile' | 'notifications' | 'plan' | 'account' | 'app-info';
```

#### 2. TAB_LABELS の変更（L21〜L26）

```typescript
const TAB_LABELS: Record<Tab, string> = {
  profile: 'プロフィール',
  notifications: '通知設定',
  plan: 'プラン',
  account: 'アカウント',
  'app-info': 'アプリ情報',  // 追加
};
```

#### 3. タブコンテンツのレンダリング

`activeTab === 'app-info'` のとき以下を表示するセクションを追加：

```tsx
{activeTab === 'app-info' && (
  <Card>
    <div className="space-y-6">
      {/* アプリ情報 */}
      <div>
        <h3 className="text-sm font-medium text-muted mb-3">アプリ情報</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">アプリ名</span>
            <span className="text-text">リスケるGG</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">バージョン</span>
            <span className="text-text">0.1.0</span>
          </div>
        </div>
      </div>

      {/* リンク */}
      <div>
        <h3 className="text-sm font-medium text-muted mb-3">法的情報</h3>
        <div className="space-y-2">
          <Link
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between text-sm text-text hover:text-purple-l transition-colors py-2 border-b border-border"
          >
            <span>プライバシーポリシー</span>
            <span className="material-icons text-base text-muted">open_in_new</span>
          </Link>
          <div className="flex items-center justify-between text-sm text-muted py-2 border-b border-border">
            <span>利用規約</span>
            <span className="text-xs text-muted">準備中</span>
          </div>
        </div>
      </div>

      {/* お問い合わせ */}
      <div>
        <h3 className="text-sm font-medium text-muted mb-3">サポート</h3>
        <a
          href="mailto:【問い合わせメールアドレス】"
          className="text-sm text-text hover:text-purple-l transition-colors"
        >
          お問い合わせ
        </a>
      </div>
    </div>
  </Card>
)}
```

`next/link` の import が既存ページにない場合は追加すること。

---

## 実装上の注意事項

1. **プレースホルダーの扱い**：`【　】` で囲まれた箇所は事業者確定後に差し替え必要。Generator は `TODO: 事業者情報を記入してください` コメントを付けておくこと。

2. **本文の正確性**：`research.md` の「取得していない情報」欄に記載した情報（Google Analytics、決済情報、電話番号等）はポリシーに含めないこと。

3. **ミドルウェアなし**：`middleware.ts` が存在しないため、`/privacy-policy` は追加設定なしでパブリックアクセス可能。ただし `src/app/(protected)/layout.tsx` の auth チェックロジックが `/privacy-policy` に影響していないことを確認すること。

4. **バージョン文字列**：アプリ情報タブのバージョンは `package.json` の `"version": "0.1.0"` を参照（ハードコードまたは import）。

5. **Material Icons**：アプリ情報タブで `open_in_new` アイコンを使用。既存プロジェクトで Material Icons が利用可能であること（`layout.tsx` で読み込み済み）を前提とする。
