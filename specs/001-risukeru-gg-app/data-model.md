# Data Model: リスケるGG UIコンポーネント構造

**Feature**: `001-risukeru-gg-app` — UIデザイン刷新
**Phase**: 1 — UI Component Design
**Date**: 2026-05-14

---

## 概要

このドキュメントは、UIデザイン刷新で新規作成・刷新するコンポーネントの構造と
Props型定義を記述する。既存のFirestoreデータモデルは変更しない。

---

## 1. デザイントークン層

### globals.css 構造

```
globals.css
├── @import "tailwindcss"
├── @theme { ... }           — Tailwind v4 カスタムトークン
├── :root { ... }            — CSS カスタムプロパティ（デザイントークン）
├── body { ... }             — ベーススタイル（フォント・背景・文字色）
├── @keyframes pulse         — LIVE バッジアニメーション
└── @layer utilities { ... } — カスタムユーティリティ（スクロールバー等）
```

---

## 2. プリミティブUIコンポーネント (`src/components/ui/`)

### Button

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'amber' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; // デフォルト: 'primary'
  size?: ButtonSize; // デフォルト: 'md'
  loading?: boolean; // ローディングスピナー表示
}
```

| variant   | 背景          | テキスト   | 用途           |
| --------- | ------------- | ---------- | -------------- |
| primary   | --purple-d    | --purple-l | 主要アクション |
| secondary | transparent   | --text     | 補助アクション |
| amber     | --amber-d     | white      | CTA・打診      |
| danger    | rgba(live,.2) | --live     | 削除・NG       |
| ghost     | transparent   | --muted    | テキストボタン |

---

### Badge

```typescript
type BadgeVariant = 'purple' | 'amber' | 'live' | 'green' | 'muted' | 'default';

interface BadgeProps {
  variant?: BadgeVariant; // デフォルト: 'default'
  children: React.ReactNode;
}
```

---

### Input

```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}
```

---

### Card

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean; // section-card でヘッダーを自前で持つ場合
}

// セクションカードのサブコンポーネント
interface CardHeaderProps {
  title: string;
  action?: React.ReactNode; // 右側アクションリンク
}
```

---

### StatCard

```typescript
type StatColorVariant = 'purple' | 'amber' | 'live' | 'green';

interface StatCardProps {
  label: string; // カード上部ラベル
  value: string | number; // 大きな数値テキスト
  color?: StatColorVariant; // 数値テキスト色（デフォルト: 'purple'）
  sub?: string; // 下部補助テキスト（例: "先月比 +3"）
}
```

---

### Avatar

```typescript
interface AvatarProps {
  initials: string; // 1〜2文字のイニシャル
  colorClass?: string; // 背景色クラス（Tailwind）
  size?: 'sm' | 'md' | 'lg'; // sm=24px, md=34px, lg=42px
  online?: boolean; // オンライン状態ドット表示
}
```

---

### Modal

```typescript
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg'; // デフォルト: 'md'
}
```

---

## 3. レイアウトコンポーネント (`src/components/layout/`)

### AppShell

アプリ全体のシェル。`md:` 以上でSidebarを表示し、`md:` 未満でBottomNavを表示する。

```typescript
interface AppShellProps {
  children: React.ReactNode;
}

// 内部構造
// <div class="flex min-h-screen bg-bg">
//   <Sidebar />                    <!-- md: 以上のみ表示 -->
//   <div class="flex flex-col flex-1">
//     <TopBar />
//     <main class="flex-1 overflow-y-auto">
//       {children}
//     </main>
//   </div>
//   <BottomNav />                  <!-- md: 未満のみ表示 -->
// </div>
```

---

### Sidebar

```typescript
// ナビゲーションアイテムの定義
interface SidebarNavItem {
  href: string;
  label: string;
  icon: string; // Unicode記号またはSVGコンポーネント
}

// セクション定義
interface SidebarSection {
  label: string;
  items: SidebarNavItem[];
}

// Sidebarコンポーネントはpropsを受け取らず、内部でuseAuthStore・usePathnameを使用
```

**構成**:

1. ロゴエリア（リスケるGG + SVGマスコット）
2. メインナビ（ダッシュボード・スケジュール・タスク管理・コラボ調整）
3. チームナビ（メンバー・チャンネル設定・通知）
4. 連携ナビ（YouTube・Twitch）
5. フッター（プランバッジ + ユーザーアバター）

---

### TopBar

```typescript
interface TopBarProps {
  title?: string; // ページタイトル（デスクトップ用）
  date?: string; // 日付表示（デスクトップ用）
  actions?: React.ReactNode; // 右側アクションボタン群
}

// モバイルではロゴ・LIVEバッジ・通知ベルを表示
// デスクトップではタイトル・日付・アクションボタンを表示
```

---

### BottomNav

5アイテム構成（モバイルのみ表示）:

```typescript
// ナビアイテムは固定（configには出さない）
// ホーム | スケジュール | ＋(追加) | タスク | チーム
// 中央の「＋」はアンバーのCTAボタンとして目立つデザイン
```

---

## 4. ダッシュボード専用コンポーネント (`src/components/dashboard/`)

### TodayTimeline

```typescript
interface TimelineItem {
  time: string; // "20:00"
  title: string; // タイトル
  tags: TimelineTag[]; // タグリスト
  color: string; // バーカラー（--live / --amber / --purple / --green）
}

interface TimelineTag {
  label: string;
  color: string;
}

interface TodayTimelineProps {
  items: TimelineItem[];
}
```

---

### CollabRequests

```typescript
interface CollabRequestItem {
  id: string;
  name: string; // 相手の名前
  detail: string; // "Apex コラボ希望 — 5/18 20:00〜"
  status: 'pending' | 'confirmed' | 'cancelled';
  onOk?: () => void;
  onNg?: () => void;
}

interface CollabRequestsProps {
  items: CollabRequestItem[];
}
```

---

## 5. 画面別コンポーネント構造

### ダッシュボード (`/dashboard`)

```
DashboardPage
├── StatRow（4枚 StatCard: 配信数・コラボ予定・LIVE視聴者・タスク完了率）
├── TwoColLayout
│   ├── LeftCol
│   │   ├── Card（今週のスケジュール）
│   │   │   ├── WeekStrip（7日分 CalDay）
│   │   │   └── TodayTimeline
│   │   └── Card（タスクボード）
│   │       └── KanbanPreview（TODO/進行中/完了 各2件まで）
│   └── RightCol
│       ├── Card（コラボ打診）
│       │   └── CollabRequests
│       ├── Card（通知）
│       │   └── NotificationList（最新4件）
│       └── Card（チームメンバー）
│           └── MemberStatusList
└── BannerAd（LIGHTプランのみ、md: 以下で表示）
```

### スケジュール (`/schedule`)

```
SchedulePage
├── PageHeader（タイトル + 「配信を追加」ボタン）
├── ViewToggle（週ビュー / 月ビュー）
├── SyncErrorBanner（Googleカレンダー同期エラー時）
└── CalendarView（react-big-calendar を新テーマで再スタイリング）
```

### タスクボード (`/tasks`)

```
TasksPage
├── PageHeader（タイトル + 「タスクを追加」ボタン + CSVエクスポートボタン）
├── FilterTabs（カテゴリフィルタ: すべて / 撮影 / 編集 / サムネ / 告知）
└── KanbanBoard（既存コンポーネントを新テーマで再スタイリング）
    ├── KanbanColumn × N（設定カラム数）
    │   └── TaskCard × N（ドラッグ&ドロップ / モバイル: ステータス変更ボタン）
    └── AddColumnButton（Ownerのみ）
```

### コラボ一覧 (`/collabs`)

```
CollabsPage
├── PageHeader（タイトル + 「打診する」ボタン）
├── StatusTabs（返答待ち / 確定済み / 期限切れ / キャンセル）
└── CollabList
    └── CollabCard × N（相手名・候補日・OK/NGボタン / ステータスバッジ）
```

### 通知 (`/notifications`)

```
NotificationsPage
├── PageHeader（タイトル + 「すべて既読」ボタン）
└── NotificationList
    └── NotificationItem × N
        ├── StatusDot（カテゴリ別カラー）
        ├── NotificationText（強調+本文）
        └── NotificationTime
```

### チーム管理 (`/team`)

```
TeamPage
├── TeamInfo（チーム名・チームコード・コードリセットボタン）
├── MemberList
│   └── MemberRow × N
│       ├── Avatar
│       ├── MemberInfo（名前・ロール・プラン）
│       └── MemberActions（ロール変更・削除 — Ownerのみ）
├── JoinTeamSection（チームコードで参加）
└── DangerZone（チーム脱退）
```

### 設定 (`/settings`)

```
SettingsPage
├── ProfileSection（アバター・表示名）
├── PlanSection（プランバッジ・アップグレードCTA）
├── NotificationSection（カテゴリ別ON/OFF — PARTYのみ）
├── GoogleCalendarSection（連携設定・再認証バナー）
└── PwaSection（インストールプロンプト）
```

---

## 6. 状態遷移・インタラクション

### LIVE バッジアニメーション

```css
/* pulse keyframe はglobals.cssで定義 */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.live-dot {
  animation: pulse 1.2s infinite;
}
```

### Kanban ドラッグ&ドロップ (PC)

- ライブラリ: `@hello-pangea/dnd`（既存）
- モバイル: タップによるステータス変更モーダルで代替（FR-031）

### 楽観的ロック競合

- Firestoreのバージョン番号チェック後、競合があれば`Modal`でエラー表示（既存ロジック継続）
