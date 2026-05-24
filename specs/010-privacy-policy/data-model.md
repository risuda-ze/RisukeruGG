# Data Model: プライバシーポリシー

## 概要

プライバシーポリシーは静的コンテンツであり、専用のデータベーススキーマ追加は不要。  
実装はすべて静的な React コンポーネントと Next.js ページで行う。

---

## データベース変更

**なし。** Firestore スキーマへの変更は不要。

---

## ルーティング変更

| 変更種別 | パス | 認証 | レイアウト |
|---------|------|------|----------|
| 新規追加 | `/privacy-policy` | 不要 | 独立（サイドバーなし） |

---

## 型定義変更

### `src/app/(protected)/settings/profile/page.tsx`

`Tab` 型に `'app-info'` を追加：

```typescript
// Before
type Tab = 'profile' | 'notifications' | 'plan' | 'account';

// After
type Tab = 'profile' | 'notifications' | 'plan' | 'account' | 'app-info';
```

`TAB_LABELS` レコードに追加：

```typescript
const TAB_LABELS: Record<Tab, string> = {
  profile: 'プロフィール',
  notifications: '通知設定',
  plan: 'プラン',
  account: 'アカウント',
  'app-info': 'アプリ情報',   // 追加
};
```

---

## ファイル構成

### 新規作成ファイル

```text
src/
└── app/
    └── privacy-policy/
        └── page.tsx          # プライバシーポリシーページ（公開・認証不要）
```

### 変更ファイル

```text
src/
└── app/
    ├── (auth)/
    │   └── login/
    │       └── page.tsx      # プライバシーポリシーへのリンク追加
    └── (protected)/
        └── settings/
            └── profile/
                └── page.tsx  # 'app-info' タブ追加
```

---

## UIコンポーネント

新規 UI コンポーネントは不要。既存コンポーネントを流用：

| コンポーネント | 利用箇所 | 用途 |
|--------------|---------|------|
| `Card` | プライバシーポリシーページ | コンテンツ囲い込み |
| `TopBar` | プライバシーポリシーページ | ページヘッダー（ログイン前なので独自ヘッダー使用も可） |
| Next.js `Link` | ログインページ・アプリ情報タブ | ページ遷移リンク |

---

## 状態管理

- Zustand ストアへの変更：**不要**
- Server/Client Components：
  - `/privacy-policy/page.tsx` → **Server Component**（静的コンテンツのため `'use client'` 不要）
  - `profile/page.tsx` → 既存が `'use client'` のため変更なし

---

## セキュリティ

- `/privacy-policy` は認証不要のパブリックルートであるため、`src/app/(protected)/` グループには追加しない
- 既存の `middleware.ts`（Firebase Auth チェック）のマッチャーパターンを確認し、`/privacy-policy` が保護対象外であることを検証する

---

## パフォーマンス

- プライバシーポリシーページは完全に静的コンテンツであり、Next.js の Static Generation（SSG）が自動適用される
- 追加バンドルサイズの影響は軽微（テキストコンテンツのみ）
