# Tasks: リスケるGG — 全画面UIデザイン刷新

**Input**: `specs/001-risukeru-gg-app/` の設計ドキュメント群
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ui-components.md ✅, quickstart.md ✅

**Tests**: UIコンポーネントのユニットテストは追加しない（Constitution Principle III — 任意扱い）。
フェーズD終了後に既存E2Eテスト（login・schedule・tasks）のセレクタ修正のみ行う。

**Organization**: タスクはUIデザイン刷新の実装順（デザイン基盤→コンポーネント→画面）と
spec.md のユーザーストーリー（US1〜US6）にマッピングして整理する。

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 並列実行可能（異なるファイル・依存関係なし）
- **[Story]**: 対象ユーザーストーリー（US1〜US6）
- 各タスクに実際のファイルパスを記載

---

## Phase 1: Setup — デザイン基盤構築

**Purpose**: デザイントークン・フォント・Tailwindカスタムカラーをセットアップし、
全コンポーネントが参照できる共通スタイル基盤を確立する

- [ ] T001 `src/app/globals.css` を全面刷新: `@import "tailwindcss"` + `@theme` ブロックにカスタムカラー（--bg, --surface, --card, --border, --purple, --purple-l, --purple-d, --amber, --amber-l, --amber-d, --text, --muted, --live, --green）・フォント変数・ラウンド変数を定義。`:root` にCSSカスタムプロパティ、`body` にフォント・背景・文字色を設定。`@keyframes pulse`（LIVEバッジ用）を追加
- [ ] T002 `src/app/layout.tsx` を更新: `next/font/google` で `Zen_Kaku_Gothic_New`（weight: 400/500/700）と `Space_Grotesk`（weight: 400/500/600）を読み込み、`--font-ja` / `--font-num` CSS変数としてhtmlタグに適用。`metadata.themeColor` を `#534AB7` に更新
- [ ] T003 `public/manifest.json` を更新: `theme_color` を `#534AB7`、`background_color` を `#08081a` に変更。`src/app/layout.tsx` の `viewport.themeColor` も同値に更新

**Checkpoint**: 開発サーバー（`pnpm dev`）を起動し、ページ背景が `#08081a` になっていること、DevToolsのFontsで Zen Kaku Gothic New が読み込まれていることを確認

---

## Phase 2: Foundational — 共通UIコンポーネント刷新

**Purpose**: 全画面で使われるプリミティブ・レイアウトコンポーネントをダークテーマに刷新する。
この Phase の完了が全画面実装の前提条件。

**⚠️ CRITICAL**: このPhaseが完了するまで画面実装フェーズには進まないこと

### プリミティブコンポーネント（並列実行可能）

- [ ] T004 [P] `src/components/ui/Button.tsx` を刷新: `contracts/ui-components.md` の仕様通りに variant（primary/secondary/amber/danger/ghost）・size（sm/md/lg）・loading状態を実装。ダークテーマ色（`bg-purple-d text-purple-l`等）・角丸 `rounded-[12px]`・フォーカスリング `focus-visible:ring-2 focus-visible:ring-purple` を適用
- [ ] T005 [P] `src/components/ui/Badge.tsx` を刷新: variant（purple/amber/live/green/muted/default）を `contracts/ui-components.md` に従い実装。`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide` のスタイルを適用
- [ ] T006 [P] `src/components/ui/Input.tsx` を刷新: ダークテーマ対応（`bg-surface border-border text-text placeholder:text-muted`）。フォーカス時 `border-purple`、エラー時 `border-live` を実装。label・error・hint propsを保持
- [ ] T007 [P] `src/components/ui/Modal.tsx` を刷新: オーバーレイ `bg-black/60 backdrop-blur-sm`、ダイアログ `bg-card border border-border rounded-[14px]`。size（sm=360px/md=480px/lg=640px）対応。Escキーで閉じる挙動を保持
- [ ] T008 [P] `src/components/ui/Spinner.tsx` を刷新: `text-purple-l` カラー。`border-current border-t-transparent` アニメーションでパープル系スピナー
- [ ] T009 [P] `src/components/ui/Card.tsx` を新規作成: `bg-card border border-border rounded-[14px] overflow-hidden` の汎用カード。`noPadding` propをfalseのとき `p-[18px]` を内包。`CardHeader` サブコンポーネントを同ファイルにエクスポート（`px-[18px] py-[14px] border-b border-border flex items-center justify-between`）
- [ ] T010 [P] `src/components/ui/StatCard.tsx` を新規作成: `contracts/ui-components.md` の仕様通り。label（`text-[11px] text-muted`）・value（`text-[26px] font-bold font-num`）・color variant（purple-l/amber-l/live/green）・sub（`text-[11px] text-muted`）を実装
- [ ] T011 [P] `src/components/ui/Avatar.tsx` を新規作成: イニシャル表示アバター。size（sm=24px/md=34px/lg=42px）・bgClass・textClass・online（グリーンドット `border-2 border-surface`）を実装

### レイアウトコンポーネント（プリミティブ完了後）

- [ ] T012 `src/components/layout/Sidebar.tsx` を新規作成: `w-[220px] shrink-0 bg-surface border-r border-border flex flex-col py-5 hidden md:flex`。ロゴエリア（SVGマスコット + "リスケるGG"）、ナビセクション（メイン/チーム/連携）、フッター（プランバッジ + Avatar）を実装。アクティブ状態 `border-l-2 border-purple bg-purple/12 text-purple-l`。`useAuthStore` と `usePathname` を使用
- [ ] T013 `src/components/layout/TopBar.tsx` を刷新: モバイル（ロゴ + LIVEバッジ + 通知ベル）とデスクトップ（タイトル + 日付 + LIVEバッジ + アクションボタン群）の表示切り替え。`h-[56px] bg-surface border-b border-border`。通知ベルは `useNotificationsStore` でバッジ数表示
- [ ] T014 `src/components/layout/BottomNav.tsx` を刷新: `flex md:hidden bg-surface border-t border-border`。5アイテム（ホーム・スケジュール・＋追加・タスク・チーム）。中央の追加ボタン `bg-amber rounded-[10px]` で視覚的に目立たせる。アクティブ状態 `text-purple-l`
- [ ] T015 `src/components/layout/AppShell.tsx` を新規作成: モバイル（TopBar + `pt-12 pb-16` main + BottomNav）とデスクトップ（Sidebar + TopBar + スクロール可能main）を `md:` ブレークポイントで切り替えるシェル。`src/app/(protected)/layout.tsx` でこのコンポーネントを使用するように更新

**Checkpoint**: `pnpm dev` → `/dashboard` にアクセスし、デスクトップではSidebar（220px）が表示され、モバイル（375px幅）ではBottomNavが表示されることを確認

---

## Phase 3: US1 — 認証画面（ログイン）

**Goal**: Googleログイン画面をダークテーマの没入型UIに刷新する

**Independent Test**: `/login` にアクセスしてダーク背景・パープルグラデーション・「Googleでサインイン」ボタンが表示される。ボタンクリックで認証フロー（ポップアップ）が起動する

### Implementation for US1

- [ ] T016 [US1] `src/app/(auth)/login/page.tsx` を刷新: `docs/risukeru_gg_lp.html` のヒーロービジュアルを参考にダークテーマ化。`min-h-screen bg-bg` 全画面。グリッドオーバーレイ（パープル微透過）+ ラジアルグラデーション背景。中央カード（`bg-surface border border-border rounded-[16px] p-8`）にSVGマスコット・"リスケるGG"ロゴ・キャッチコピー・Googleサインインボタン（`variant="primary"`）・エラーメッセージ（`text-live`）を配置。既存の認証ロジック（`useAuthStore.signIn`）は変更しない

**Checkpoint**: ブラウザで `/login` を確認。Googleボタンのクリックでポップアップが開くこと

---

## Phase 4: US2 — スケジュール画面

**Goal**: スケジュール管理画面（カレンダー・詳細）をダークテーマに刷新する

**Independent Test**: `/schedule` にアクセスし、週ビュー/月ビューが正常に表示・切り替えができる。スケジュール追加ボタンからフォームが開き、保存後カレンダーに反映される

### Implementation for US2

- [ ] T017 [P] [US2] `src/components/calendar/CalendarView.tsx` を刷新: react-big-calendar の CSS カスタマイズ（`--bg`/`--card`/`--border`/`--purple` 変数をカレンダーCSSに上書き）。LIVEエントリは `--live` 赤背景、コラボエントリは `--amber` 橙背景、通常配信は `--purple-d` 紫背景で色分け。既存のデータ取得ロジックは変更しない
- [ ] T018 [P] [US2] `src/components/calendar/SyncErrorBanner.tsx` を刷新: `bg-live/10 border border-live/30 text-live rounded-[12px]` のエラーバナー。「再試行」・「再認証」ボタンを `variant="danger"` の Button で実装
- [ ] T019 [US2] `src/app/(protected)/schedule/page.tsx` を刷新: `PageHeader`（タイトル + 「配信を追加」Buttonアンバー + 「週/月」ViewToggle）+ SyncErrorBanner + CalendarView のレイアウト。`p-6 md:p-7` のコンテンツパディング
- [ ] T020 [US2] `src/app/(protected)/schedule/[id]/page.tsx` を刷新: スケジュール詳細をダークカードUIで表示。ステータスバッジ（LIVE/予定/終了）・日時・プラットフォーム・参加メンバーのAvatarリストを `Card` コンポーネントで整理。編集/削除ボタンはロール制御済みの既存ロジックを保持

**Checkpoint**: `/schedule` を開き、カレンダーのイベントがダークテーマで表示される。LIVE中エントリが赤色で表示されること

---

## Phase 5: US3 — タスク管理画面（カンバン）

**Goal**: カンバンボード画面をダークテーマに刷新し、モバイル操作に対応する

**Independent Test**: `/tasks` にアクセスしカンバンが3カラム表示される。PCではドラッグ&ドロップでカード移動、モバイルではタップでステータス変更できる

### Implementation for US3

- [ ] T021 [P] [US3] `src/components/kanban/TaskCard.tsx` を刷新: `bg-surface border border-border rounded-[8px] hover:border-purple` のダークカード。担当者Avatarバッジ・締切日（`font-num text-[10px]`）・カテゴリタグ（`badge variant`）を表示。モバイル用「ステータス変更」ボタン（`variant="ghost" size="sm"`）を追加してカラム変更モーダルを呼び出す
- [ ] T022 [P] [US3] `src/components/kanban/KanbanBoard.tsx` を刷新: カラムヘッダー（カラム名・タスク数バッジ `variant="muted"`）をダークテーマに。カラムbody `bg-surface/50 rounded-[10px] p-3`。既存の `@hello-pangea/dnd` ドラッグ&ドロップロジックは変更しない
- [ ] T023 [US3] `src/app/(protected)/tasks/page.tsx` を刷新: PageHeader（タイトル + 「タスクを追加」Button + 「CSVエクスポート」Button `variant="secondary"`）+ カテゴリFilterTabs（`rounded-full px-4 py-1.5` ピルボタン、アクティブ時 `bg-purple-d text-purple-l`）+ KanbanBoard

**Checkpoint**: `/tasks` でカンバンが表示される。PCでカードをドラッグして別カラムに移動できること

---

## Phase 6: US4 — コラボ日程調整画面

**Goal**: コラボ打診・一覧・詳細・外部回答ページをダークテーマに刷新する

**Independent Test**: `/collabs` にアクセスし返答待ち/確定済みのタブが切り替わる。「打診する」から新規セッション作成フローが動作する。外部共有URL `/collab/[token]` で候補日程を選択・送信できる

### Implementation for US4

- [ ] T024 [P] [US4] `src/components/dashboard/CollabRequests.tsx` を新規作成: ダッシュボード用コラボ打診リスト。各アイテム `bg-surface border border-border rounded-[10px] p-3 flex items-center gap-3`。Avatar（イニシャル・カラー）・名前・詳細テキスト・OK（`variant="primary" size="sm"`）/NG（`variant="danger" size="sm"`）ボタン。確定済みアイテムは `opacity-60` + 「確定」テキスト表示
- [ ] T025 [P] [US4] `src/components/collab/CollabForm.tsx` を刷新: モーダル内フォームをダークテーマに。Input（刷新済み）・DatePicker互換入力・有効期限選択を `bg-surface` ベースで統一
- [ ] T026 [P] [US4] `src/components/collab/CollabResponseForm.tsx` を刷新: 外部公開ページ用回答フォーム。候補日程ボタン（OK=`bg-green/15 border-green/40`・NG=`bg-live/10 border-live/30`）を Card で包む。回答送信ボタン `variant="amber"`
- [ ] T027 [US4] `src/app/(protected)/collabs/page.tsx` を刷新: PageHeader + StatusTabs（返答待ち/確定済み/期限切れ/キャンセル のピルタブ）+ CollabList（各 CollabCard = Avatar + 名前/詳細 + OKNGボタン or ステータスバッジ）
- [ ] T028 [US4] `src/app/(protected)/collabs/[id]/page.tsx` を刷新: コラボ詳細をCardレイアウトで表示。候補日程・回答状況の視覚化（OK/NG/未回答バッジ）・「確定」「キャンセル」ボタン
- [ ] T029 [US4] `src/app/collab/[token]/page.tsx` を刷新: 外部公開回答ページ。`bg-bg` ダーク全画面。ロゴヘッダー + CollabResponseForm（Card内）。期限切れ・確定済みの場合は専用メッセージ画面

**Checkpoint**: `/collabs` でリスト表示。「打診する」から作成フロー。生成されたURLで回答フォームが開くこと

---

## Phase 7: US5 — ダッシュボード・チーム管理画面

**Goal**: ダッシュボードをリファレンスデザイン通りのStatsカード+タイムライン+マルチカラムに、
チーム管理画面をダークカードUIに刷新する

**Independent Test**: `/dashboard` にアクセスし4枚StatCard・今週カレンダーストリップ・タイムライン・コラボ打診・通知・チームメンバーが表示される。`/team` でメンバー一覧・チームコード・ロール変更UIが動作する

### ダッシュボード専用コンポーネント（並列実行可能）

- [ ] T030 [P] [US5] `src/components/dashboard/TodayTimeline.tsx` を新規作成: `contracts/ui-components.md` の仕様通り。タイムライン行（時刻 + 3px縦バー + タイトル + タグ）をリスト表示。各行 `hover:bg-purple/7 rounded-[8px]` のホバーエフェクト
- [ ] T031 [P] [US5] `src/components/notifications/NotificationBell.tsx` を刷新: `bg-live` の未読バッジ付きベルアイコン。`text-[10px] font-bold` バッジ数表示

### ダッシュボードページ

- [ ] T032 [US5] `src/app/(protected)/dashboard/page.tsx` を全面刷新: `docs/risukeru_gg_dashboard.html` を参考に構成
  - StatRow: 4枚StatCard（今月配信数/コラボ予定/LIVE視聴者/タスク完了率）を `grid grid-cols-2 md:grid-cols-4 gap-3`
  - TwoColLayout: `grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4`
    - 左カラム: 今週スケジュールCard（WeekStrip 7日分 + TodayTimeline）+ タスクボードCard（KanbanPreview 各カラム2件）
    - 右カラム: コラボ打診Card（CollabRequests）+ 通知Card（最新4件 NotificationList）+ チームメンバーCard（Avatar + 名前 + 活動状態）
  - BannerAd（`src/components/plan/BannerAd.tsx` をダークテーマに刷新）はLIGHTプランのみページ下部に表示
  - ソロチーム時はオンボーディングUI（チームコード入力 + チーム作成）をCardレイアウトで表示
  - データ取得は既存の `useAuthStore` を使用

### チーム管理ページ

- [ ] T033 [US5] `src/app/(protected)/team/page.tsx` を刷新: 
  - TeamInfoCard: チーム名 + チームコード（`font-num`コードフォント）+ 「コードをコピー」ボタン + 「リセット」ボタン
  - MemberList: 各メンバー行（Avatar + 名前/ロールBadge/プランBadge + ロール変更/削除アクション）
  - JoinTeamSection（`TeamJoinForm.tsx` をダークテーマに刷新）
  - DangerZoneCard: 「チームを脱退する」ボタン（`variant="danger"`）
  - 既存のダイアログコンポーネント（LeaveTeamDialog等）をModalスタイル刷新（T007）に合わせる

**Checkpoint**: `/dashboard` でStatカード4枚・タイムライン・右カラムが表示される。`/team` でメンバー一覧が確認できること

---

## Phase 8: US6 — 通知・設定画面（P2）

**Goal**: 通知一覧・設定画面をダークテーマに刷新し、PWA通知UIを整備する

**Independent Test**: `/notifications` で未読・既読の通知が一覧表示される。`/settings` でGoogleカレンダー連携・通知設定の切り替えUIが動作する

### Implementation for US6

- [ ] T034 [P] [US6] `src/components/notifications/NotificationBanner.tsx` を刷新: `bg-purple/12 border border-purple/30 rounded-[12px]` のアプリ内通知バナー。カテゴリ別カラードット（live/amber/purple/green）
- [ ] T035 [P] [US6] `src/components/plan/PlanStatus.tsx` を刷新: プランバッジ（PARTY=`variant="purple"`/LIGHT=`variant="muted"`）+ アップグレードCTAリンク
- [ ] T036 [US6] `src/app/(protected)/notifications/page.tsx` を刷新: PageHeader + 「すべて既読」Button `variant="ghost"` + NotificationList（各行: カテゴリ別カラードット + テキスト + 時刻 `font-num text-[10px]`）。未読アイテムは `bg-purple/5` で強調
- [ ] T037 [US6] `src/app/(protected)/settings/page.tsx` を刷新:
  - ProfileSection: アバター + 表示名
  - PlanSection: PlanStatus + アップグレードCTAボタン（`variant="amber"`）
  - NotificationSection: カテゴリ別通知ON/OFFトグル（PARTYプランのみ有効。LIGHTは `opacity-40` でPARTYへの誘導を表示）
  - GoogleCalendarSection: SyncErrorBanner + 「連携する/解除する」ボタン
  - PwaSection: 「ホーム画面に追加」ボタン（インストール済みの場合は非表示）

**Checkpoint**: `/notifications` で通知が一覧表示。`/settings` で各セクションが正しく表示されること

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: レスポンシブ品質確認・アクセシビリティ確認・既存テストの整合性修正

- [ ] T038 既存E2Eテスト `tests/e2e/login.spec.ts` のセレクタをダークテーマ後のDOM構造に合わせて修正（必要な場合のみ）
- [ ] T039 [P] 既存E2Eテスト `tests/e2e/schedule.spec.ts` のセレクタを更新（必要な場合のみ）
- [ ] T040 [P] 既存E2Eテスト `tests/e2e/tasks.spec.ts` のセレクタを更新（必要な場合のみ）
- [ ] T041 レスポンシブ動作確認: Chrome DevToolsで375px（モバイル）・768px（タブレット）・1280px（デスクトップ）の3サイズで全画面を確認。Sidebar/BottomNav切り替え・統計カードの折り返し・カンバンの横スクロールが正常動作すること
- [ ] T042 WCAG 2.1 AA 確認: ChromeDevTools Accessibilityパネルで主要インタラクティブ要素（Button・Input・Link・Badge）のコントラスト比が4.5:1以上であることを確認。`--muted` 使用箇所が補助テキストのみであることを確認
- [ ] T043 [P] `src/components/calendar/LiveBadge.tsx` を刷新: `bg-live/15 border border-live/40 text-live rounded-full` + `live-dot`（`animate-pulse bg-live`）アニメーション
- [ ] T044 [P] `src/components/team/` 以下の全ダイアログコンポーネント（LeaveTeamDialog, RemoveMemberDialog, RoleChangeDialog, TransferOwnershipDialog）をダークテーマModal（T007刷新済み）に統一
- [ ] T045 [P] `src/components/team/TeamJoinForm.tsx` をダークテーマInput・Buttonで刷新
- [ ] T046 `pnpm typecheck && pnpm lint` を実行し、全エラー・警告をゼロにする

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即座に開始可能
- **Foundational (Phase 2)**: Phase 1 完了後に開始 — **全画面実装フェーズをブロック**
- **画面実装 (Phase 3〜8)**: Phase 2 完了後に開始。各Phaseは独立しており並列実行可能
- **Polish (Phase 9)**: 全Phase完了後に開始

### User Story Dependencies

- **US1 (Phase 3)**: Phase 2 完了後 — 他ストーリーと独立
- **US2 (Phase 4)**: Phase 2 完了後 — US1と並列実行可能
- **US3 (Phase 5)**: Phase 2 完了後 — US1/US2と並列実行可能
- **US4 (Phase 6)**: Phase 2 完了後。T024（CollabRequests）はPhase 7のDashboardでも使用
- **US5 (Phase 7)**: Phase 2 完了後。T024が完了していること（T032が依存）
- **US6 (Phase 8)**: Phase 2 完了後 — US1〜US5と並列実行可能

### Within Each Phase

- `[P]` マークのタスクは同一フェーズ内で並列実行可能（異なるファイル）
- `[P]` なしのタスクは前のタスクの完了後に開始
- 各フェーズ末尾のCheckpointで動作確認してから次フェーズへ進む

---

## Parallel Example: Phase 2 (Foundational)

```bash
# プリミティブコンポーネント群はすべて並列実行可能（別ファイル）:
Task T004: src/components/ui/Button.tsx
Task T005: src/components/ui/Badge.tsx
Task T006: src/components/ui/Input.tsx
Task T007: src/components/ui/Modal.tsx
Task T008: src/components/ui/Spinner.tsx
Task T009: src/components/ui/Card.tsx
Task T010: src/components/ui/StatCard.tsx
Task T011: src/components/ui/Avatar.tsx

# 上記完了後、レイアウトコンポーネントを順番に実装:
Task T012: Sidebar.tsx  → T013: TopBar.tsx → T014: BottomNav.tsx → T015: AppShell.tsx
```

## Parallel Example: Phase 3〜8 (User Stories)

```bash
# Phase 2 完了後、以下を並列実行可能:
Phase 3 (US1): src/app/(auth)/login/page.tsx
Phase 4 (US2): CalendarView.tsx, SyncErrorBanner.tsx → schedule/page.tsx
Phase 5 (US3): TaskCard.tsx, KanbanBoard.tsx → tasks/page.tsx
Phase 8 (US6): NotificationBanner.tsx, PlanStatus.tsx → notifications/page.tsx, settings/page.tsx

# Phase 6 (US4) の CollabRequests (T024) が完了後:
Phase 7 (US5): TodayTimeline.tsx, NotificationBell.tsx → dashboard/page.tsx, team/page.tsx
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + US5 Dashboard)

1. Phase 1 完了 → デザイントークン確立
2. Phase 2 完了 → 共通コンポーネント完成（ここが最大の作業量）
3. Phase 7 のダッシュボードを完成 → アプリの第一印象が確定
4. **STOP and VALIDATE**: デスクトップ・モバイルの両方でダッシュボードを確認
5. 残りフェーズを優先度順に進める

### Incremental Delivery

1. Phase 1 → 2: デザイン基盤完成
2. Phase 7 (Dashboard): 最もインパクトの大きい画面でUI方向性を確認
3. Phase 3 (Login) + Phase 4 (Schedule): コア機能画面
4. Phase 5 (Tasks) + Phase 6 (Collabs): チーム協作機能画面
5. Phase 8 (通知・設定): 補助機能画面
6. Phase 9 (Polish): 品質確認

---

## Notes

- `[P]` タスクは異なるファイルへの変更で依存関係なし
- `[Story]` ラベルで対象ユーザーストーリーをトレース可能
- 各フェーズ末のCheckpointで独立検証を実施
- データ取得ロジック（Firestoreリポジトリ・Zustandストア・Cloud Functions）は変更しない
- 色値のハードコード禁止 — `contracts/ui-components.md` のトークン使用ルールを遵守
- コメントは全て日本語で記述（Constitution Principle V）

---

## タスク統計

| Phase | ストーリー | タスク数 |
|-------|---------|-------|
| Phase 1: Setup | — | 3 |
| Phase 2: Foundational | — | 12 |
| Phase 3 | US1（認証） | 1 |
| Phase 4 | US2（スケジュール） | 4 |
| Phase 5 | US3（タスク） | 3 |
| Phase 6 | US4（コラボ） | 6 |
| Phase 7 | US5（チーム・ダッシュボード） | 4 |
| Phase 8 | US6（通知・設定） | 4 |
| Phase 9: Polish | — | 9 |
| **合計** | | **46** |

**並列実行可能タスク**: 27件（[P]マーク付き）
**独立テスト可能**: 全6ユーザーストーリー（各Phase末のCheckpointで確認）
**推奨MVPスコープ**: Phase 1 + Phase 2 + Phase 7（Dashboard）
