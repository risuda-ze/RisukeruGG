# UI Components Contract: リスケるGG デザインシステム

**Feature**: `001-risukeru-gg-app` — UIデザイン刷新
**Phase**: 1 — Component Contracts
**Date**: 2026-05-14

このドキュメントは、アプリ内で共通使用するUIコンポーネントのパブリックAPIを定義する。
実装者はこの仕様に準拠してコンポーネントを作成・刷新すること。

---

## デザイントークン（必須参照）

全コンポーネントは以下のCSSカスタムプロパティを使用する。
ハードコードの色値は禁止。Tailwindのカスタムカラークラス（`bg-card`、`text-muted` 等）を優先使用する。

```
--bg, --surface, --card, --border
--purple, --purple-l, --purple-d
--amber, --amber-l, --amber-d
--text, --muted
--live, --green
```

---

## プリミティブコンポーネント

### `<Button>`

**ファイル**: `src/components/ui/Button.tsx`

```typescript
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** ボタンのスタイルバリアント */
  variant?: 'primary' | 'secondary' | 'amber' | 'danger' | 'ghost';
  /** ボタンのサイズ */
  size?: 'sm' | 'md' | 'lg';
  /** ローディング中フラグ。trueのときスピナー表示＋disabled */
  loading?: boolean;
}
```

**スタイル仕様**:

- 角丸: `--radius-md` (12px)
- フォント: `font-medium`
- フォーカスリング: `focus-visible:ring-2 focus-visible:ring-purple`
- disabled: `opacity-40 cursor-not-allowed`

| variant   | 背景色                               | テキスト色      | hover背景    |
| --------- | ------------------------------------ | --------------- | ------------ |
| primary   | `bg-purple-d`                        | `text-purple-l` | `bg-purple`  |
| secondary | `bg-surface` border `border-border`  | `text-text`     | `bg-card`    |
| amber     | `bg-amber-d`                         | `text-white`    | `bg-amber`   |
| danger    | `bg-live/10` border `border-live/30` | `text-live`     | `bg-live/20` |
| ghost     | transparent                          | `text-muted`    | `bg-surface` |

| size | padding       | font-size   |
| ---- | ------------- | ----------- |
| sm   | `px-3 py-1.5` | `text-xs`   |
| md   | `px-4 py-2`   | `text-sm`   |
| lg   | `px-6 py-3`   | `text-base` |

---

### `<Badge>`

**ファイル**: `src/components/ui/Badge.tsx`

```typescript
export interface BadgeProps {
  /** バッジのカラーバリアント */
  variant?: 'purple' | 'amber' | 'live' | 'green' | 'muted' | 'default';
  children: React.ReactNode;
  className?: string;
}
```

**スタイル仕様**:

- 角丸: `rounded-full`
- padding: `px-2 py-0.5`
- font-size: `text-[10px] font-bold tracking-wide`

| variant | 背景色                              | テキスト色      |
| ------- | ----------------------------------- | --------------- |
| purple  | `bg-purple/15`                      | `text-purple-l` |
| amber   | `bg-amber/15`                       | `text-amber-l`  |
| live    | `bg-live/15`                        | `text-live`     |
| green   | `bg-green/15`                       | `text-green`    |
| muted   | `bg-surface`                        | `text-muted`    |
| default | `bg-surface` border `border-border` | `text-text`     |

---

### `<Input>`

**ファイル**: `src/components/ui/Input.tsx`

```typescript
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 入力欄上部ラベル */
  label?: string;
  /** エラーメッセージ（表示時はボーダーを --live に変更） */
  error?: string;
  /** ヒントテキスト（エラーより優先度低） */
  hint?: string;
}
```

**スタイル仕様**:

- 背景: `bg-surface`
- ボーダー: `border border-border` → focus: `border-purple`
- 角丸: `rounded-sm` (6px)
- テキスト: `text-text placeholder:text-muted`
- エラー時ボーダー: `border-live`
- フォーカスリング: `outline-none focus:ring-1 focus:ring-purple`

---

### `<Card>` / `<CardHeader>`

**ファイル**: `src/components/ui/Card.tsx`

```typescript
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** trueのとき内部paddingなし（ヘッダー・コンテンツを直接配置） */
  noPadding?: boolean;
}

export interface CardHeaderProps {
  /** セクションタイトル */
  title: string;
  /** 右側アクション要素（例: "すべて見る →" リンク） */
  action?: React.ReactNode;
}
```

**スタイル仕様**:

- 背景: `bg-card`
- ボーダー: `border border-border`
- 角丸: `rounded-lg` (14px)
- overflow: `overflow-hidden`（角丸を内側コンテンツに適用するため）
- CardHeader: `px-[18px] py-[14px]` + `border-b border-border`

---

### `<StatCard>`

**ファイル**: `src/components/ui/StatCard.tsx`

```typescript
export type StatColor = 'purple' | 'amber' | 'live' | 'green';

export interface StatCardProps {
  /** カード上部の小さいラベル */
  label: string;
  /** 大きく表示する値（数値または文字列） */
  value: string | number;
  /** 値テキストの色バリアント */
  color?: StatColor;
  /** 値下部の補助テキスト */
  sub?: string;
}
```

**スタイル仕様**:

- 外観: Card と同一（bg-card, border, rounded-lg）
- padding: `px-[18px] py-[16px]`
- label: `text-[11px] text-muted mb-1.5 tracking-wide`
- value: `text-[26px] font-bold leading-none font-num`
- sub: `text-[11px] text-muted mt-1.5`

| color  | valueテキスト色 |
| ------ | --------------- |
| purple | `text-purple-l` |
| amber  | `text-amber-l`  |
| live   | `text-live`     |
| green  | `text-green`    |

---

### `<Avatar>`

**ファイル**: `src/components/ui/Avatar.tsx`

```typescript
export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** 表示するイニシャル（1〜2文字） */
  initials: string;
  /** 背景色クラス（Tailwind、例: "bg-purple-d/30"） */
  bgClass?: string;
  /** テキスト色クラス（Tailwind、例: "text-purple-l"） */
  textClass?: string;
  /** アバターサイズ */
  size?: AvatarSize;
  /** オンライン状態インジケータ表示 */
  online?: boolean;
}
```

**スタイル仕様**:

| size | width/height | font-size   |
| ---- | ------------ | ----------- |
| sm   | 24px         | text-[9px]  |
| md   | 34px         | text-[13px] |
| lg   | 42px         | text-[15px] |

- 形状: `rounded-full`
- online dot: 幅9px, 高さ9px, `bg-green`, `border-2 border-surface`, absolute bottom-0 right-0

---

### `<Modal>`

**ファイル**: `src/components/ui/Modal.tsx`

```typescript
export interface ModalProps {
  /** モーダル表示フラグ */
  open: boolean;
  /** 閉じるコールバック（Escキー・オーバーレイクリック） */
  onClose: () => void;
  /** モーダルタイトル */
  title?: string;
  children: React.ReactNode;
  /** フッターエリア（OK/キャンセルボタン等） */
  footer?: React.ReactNode;
  /** モーダルサイズ */
  size?: 'sm' | 'md' | 'lg';
}
```

**スタイル仕様**:

- オーバーレイ: `bg-black/60 backdrop-blur-sm`
- ダイアログ: `bg-card border border-border rounded-lg`
- size別width: sm=360px, md=480px, lg=640px

---

### `<Spinner>`

**ファイル**: `src/components/ui/Spinner.tsx`

```typescript
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}
```

**スタイル仕様**:

- カラー: `text-purple-l`（`border-current border-t-transparent` アニメーション）

---

## レイアウトコンポーネント

### `<AppShell>`

**ファイル**: `src/components/layout/AppShell.tsx`

```typescript
export interface AppShellProps {
  children: React.ReactNode;
}
```

**レスポンシブ構造**:

```
<!-- モバイル (< md) -->
<div class="flex flex-col min-h-screen bg-bg">
  <TopBar />                          <!-- 固定ヘッダー -->
  <main class="flex-1 pt-12 pb-16 overflow-y-auto">
    {children}
  </main>
  <BottomNav />                       <!-- 固定フッターナビ -->
</div>

<!-- デスクトップ (>= md) -->
<div class="flex min-h-screen bg-bg">
  <Sidebar />                         <!-- 220px固定サイドバー -->
  <div class="flex flex-col flex-1 min-w-0">
    <TopBar />                        <!-- スクロールしないヘッダー -->
    <main class="flex-1 overflow-y-auto">
      {children}
    </main>
  </div>
</div>
```

---

### `<Sidebar>`

**ファイル**: `src/components/layout/Sidebar.tsx`

- 幅: 220px 固定（`w-[220px] shrink-0`）
- 表示: `hidden md:flex` (モバイルでは非表示)
- 背景: `bg-surface border-r border-border`
- アクティブナビアイテム: `border-l-2 border-purple bg-purple/12 text-purple-l`

**ナビアイテム定義**:

```typescript
// メイン
[ダッシュボード, スケジュール, タスク管理, コラボ調整][
  // チーム
  (メンバー, チャンネル設定, 通知)
][
  // 連携
  (YouTube, Twitch)
];
```

---

### `<TopBar>`

**ファイル**: `src/components/layout/TopBar.tsx`

- モバイル: ロゴ + LIVEバッジ（配信中のみ） + 通知ベル（バッジ数）
- デスクトップ: ページタイトル + 日付 + LIVEバッジ + アクションボタン群
- 高さ: 56px
- 背景: `bg-surface border-b border-border`

---

### `<BottomNav>`

**ファイル**: `src/components/layout/BottomNav.tsx`

- 表示: `flex md:hidden`（デスクトップでは非表示）
- 背景: `bg-surface border-t border-border`
- 5アイテム: ホーム・スケジュール・＋（追加CTA）・タスク・チーム
- 追加ボタン（中央）: `bg-amber rounded-[10px]` アンバー色のCTA

---

## ダッシュボード専用コンポーネント

### `<TodayTimeline>`

**ファイル**: `src/components/dashboard/TodayTimeline.tsx`

```typescript
export interface TimelineTag {
  label: string;
  /** 例: "rgba(255,77,109,.15)" */
  bgColor: string;
  /** 例: "var(--live)" */
  textColor: string;
}

export interface TimelineItem {
  /** 表示時刻 例: "20:00" */
  time: string;
  title: string;
  tags: TimelineTag[];
  /** 左側カラーバー色 例: "var(--live)" */
  barColor: string;
  /** 補助テキスト 例: "YouTube / Twitch 同時配信" */
  meta?: string;
}

export interface TodayTimelineProps {
  items: TimelineItem[];
}
```

---

### `<CollabRequests>`

**ファイル**: `src/components/dashboard/CollabRequests.tsx`

```typescript
export interface CollabRequestItem {
  id: string;
  /** 相手チャンネル名 */
  name: string;
  /** イニシャル（アバター用） */
  initials: string;
  /** 詳細テキスト 例: "Apex コラボ希望 — 5/18 20:00〜" */
  detail: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  onOk?: () => void;
  onNg?: () => void;
}

export interface CollabRequestsProps {
  items: CollabRequestItem[];
}
```

---

## 制約事項

1. **トークン使用の強制**: 色値のハードコードは禁止。必ずCSSカスタムプロパティまたはTailwindのカスタムカラークラスを使用する
2. **日本語コメント**: コンポーネントファイル内のコメントは全て日本語（Constitution Principle V）
3. **型安全**: Props型の `any` は使用禁止。型推論が困難な箇所は `unknown` + 型ガードを使用する
4. **シンプルさ**: 3箇所未満でしか使われないUI要素はインライン記述とし、専用コンポーネントを作らない（Constitution Principle I）
5. **アクセシビリティ**: インタラクティブ要素には `aria-label` を付与。フォームには `<label>` を関連付ける
