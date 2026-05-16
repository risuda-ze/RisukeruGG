# Tasks: UIリデザイン — サイドバー・ダッシュボード・通知

**Input**: Design documents from `/specs/002-ui-redesign/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅

**Organization**: タスクはユーザーストーリー単位でグループ化。各ストーリーは独立して実装・テスト可能。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、未完了タスクへの依存なし）
- **[Story]**: 対象ユーザーストーリー（US1/US2/US3）
- 各タスクに正確なファイルパスを含む

---

## Phase 1: Setup（共有基盤）

**Purpose**: UI リデザイン全体で必要な外部リソースを導入する

- [X] T001 Material Icons CDN リンクを `src/app/layout.tsx` の `<html>` ブロック内に追加する（`<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />`）

---

## Phase 2: Foundational（全ストーリーのブロッキング前提条件）

**Purpose**: US1 専用の Sidebar ストアと、US3 の NotificationDropdown が依存する store 拡張を先行作成する

**⚠️ CRITICAL**: T002 は US1 開始前に必須。T002a は US3（T006）開始前に必須。US2 は T001 完了後から並列開始可能。

- [X] T002 Sidebar の折りたたみ・アコーディオン状態を管理する Zustand ストア `src/stores/sidebar.ts` を新規作成する。`SidebarState`（collapsed, openSections, toggleCollapsed, toggleSection, openSection）を定義し、`zustand/middleware` の `persist` で `localStorage`（key: `risukeru-sidebar`）に永続化する。初期値: `collapsed=false, openSections=['メイン']`

- [X] T002a [P] `src/stores/notifications.ts` に `markAllRead(): void` メソッドを追加する。フェーズ1ではローカル state のみ更新する stub 実装とし（`set({ unreadCount: 0, notifications: get().notifications.map(n => ({ ...n, isRead: true })) })`）、コメントで「Firestore 書き込みは将来の通知機能チケットで実装予定」と明記する

**Checkpoint**: T002 完了後に US1 開始可能。T002a 完了後に US3 開始可能。US2 は T001 完了後すぐに開始可能。

---

## Phase 3: User Story 1 — アコーディオン折りたたみサイドバー（Priority: P1）🎯 MVP

**Goal**: Google Material Icons を使用したアコーディオン型サイドバーを実装。トグルボタンで 260px ↔ 72px を切り替え。折りたたみ状態を localStorage に永続化する。

**Independent Test**: トグルボタンクリックで幅が変化し、セクションヘッダークリックで子項目が展開/収納される。リロード後も状態が維持される。

### Implementation for User Story 1

- [X] T003 [US1] `src/components/layout/Sidebar.tsx` を全面リライトする。`useSidebarStore` で collapsed/openSections を取得し、以下を実装する:
  - ヘッダー: ロゴアイコン（クリックで `/dashboard` へ）、アプリ名「リスケるGG」（collapsed 時は非表示）、トグルボタン（`menu` / `menu_open` Material Icon）
  - ナビゲーション: `NAV_SECTIONS` 配列定義（メイン/チーム管理/各種連携）、各セクションヘッダーをクリックで `toggleSection`、子アイテムは Material Icons + テキスト + バッジ
  - 折りたたみアニメーション: `transition-[width] duration-300` で `w-[260px]` ↔ `w-[72px]`
  - collapsed 時: テキスト・バッジ・矢印を `opacity-0 overflow-hidden w-0` で非表示
  - アクティブ状態: `usePathname()` で現在パスと一致するアイテムをハイライト
  - フッター: ユーザーアバター・名前・プランバッジ・サインアウトボタン（collapsed 時はアバターのみ）
  - 各種連携の子アイテムは `disabled=true` で `pointer-events-none opacity-50` 表示
  - Material Icons 使用: `<span className="material-icons text-[20px]">アイコン名</span>` の形式

**Checkpoint**: サイドバーのトグル・アコーディオン・アクティブハイライト・localStorage 永続化が動作する

---

## Phase 4: User Story 2 — ダッシュボード再設計（Priority: P1）

**Goal**: 5 つの統計ウィジェット（今月の配信枠数・今月の編集タスク数・今月のタスク数・コラボ調整中・タスク完了率）と、クリックで詳細モーダルが開く大き目タスクカードグリッドをダッシュボードに表示する。

**Independent Test**: ダッシュボードに 5 つの StatCard が表示され、タスクカードをクリックするとモーダルが開く。

### Implementation for User Story 2

- [X] T004 [P] [US2] `src/components/dashboard/TaskBoardPreview.tsx` を新規作成する。props: `{ tasks: Task[], columns: KanbanColumn[], members: TeamMember[] }`。以下を実装する:
  - タスクカードグリッド: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` で大き目カード表示
  - 各カードに: タスク名（bold・大き目）・カテゴリバッジ（既存 `Badge` コンポーネント流用）・期限（`format` 関数で日本語表示）・担当者アバター + 名前（既存 `Avatar` コンポーネント流用）
  - カードクリック: `selectedTask: Task | null` state → 既存 `Modal` コンポーネントでタスク詳細表示
  - モーダル内容: タスク名・カテゴリ・期限・担当者・カラム名（進捗状態）・「タスク管理で編集 →」リンク（`/tasks`）
  - 空状態: 「タスクはありません」メッセージ

- [X] T005 [US2] `src/app/(protected)/dashboard/page.tsx` を更新する:
  - 統計ウィジェットを 4 枚から 5 枚に拡張: `grid-cols-2 md:grid-cols-5`
  - 追加ウィジェット: `StatCard` で「今月の編集タスク数」（`tasks.filter(t => t.category === 'editing').length`）を既存の配信数の隣に追加
  - 左カラムを `<TaskBoardPreview tasks={tasks} columns={columns} members={members} />` で置き換え（`TaskBoardPreview` のインポート追加）
  - **削除**: `TodayTimeline`（今日のスケジュール）および `CollabRequests` ウィジェットはモックアップ（`docs/risukeru_gg_screens.html`）のダッシュボード画面に存在しないため、dashboard/page.tsx から削除する。該当のインポート文（`TodayTimeline`, `CollabRequests`）および関連する `timelineItems`・`collabItems` 変数の算出ロジックも合わせて削除する
  - コラボ打診ウィジェットの代替として、右カラムは「最近のコラボ打診」テキストリンク（`/collabs`）または削除する（モックアップに準ずる）
  - `thisMonthSchedules`・`pendingCollabs`・`doneTasks`・`taskCompletionRate` の算出ロジックは統計ウィジェット用に維持する

**Checkpoint**: ダッシュボードに 5 ウィジェット + タスクカードグリッド + 詳細モーダルが動作する

---

## Phase 5: User Story 3 — 通知ドロップダウン（Priority: P1）

**Goal**: TopBar の通知ベルをクリックすると、ページ遷移なしで通知ドロップダウンが開く。ドロップダウン外クリックで自動的に閉じる。

**Independent Test**: 通知ベルをクリックするとドロップダウンが表示され、外側クリックで閉じる。

### Implementation for User Story 3

- [X] T006 [P] [US3] `src/components/notifications/NotificationDropdown.tsx` を新規作成する。props: `{ open: boolean, onClose: () => void }`。以下を実装する:
  - `open=false` → `null` を返す
  - `open=true` → `position: absolute`（`absolute top-full right-0 mt-1`）のドロップダウンパネル
  - 外クリック検知: `useRef<HTMLDivElement>` + `useEffect` で `document.addEventListener('mousedown', handler)` を設定し、`ref.current` の外クリックで `onClose()` 呼び出し
  - 内容: ヘッダー（「通知」テキスト + 「既読にする」ボタン）、通知リスト（最大 4 件、未読ドット付き）、フッター（「すべて見る →」→ `/notifications` リンク）
  - `useNotificationsStore()` から `notifications` と `unreadCount` を取得
  - スタイル: `bg-card border border-border rounded-[12px] shadow-lg w-[340px] z-50`

- [X] T007 [US3] `src/components/layout/TopBar.tsx` を更新する:
  - `useState(false)` で `dropdownOpen` state を追加
  - 通知ベルの `<Link href="/notifications">` を `<button onClick={() => setDropdownOpen(o => !o)}>` に変更
  - ベル周辺の wrapper を `<div className="relative">` に変更し、内部に `<NotificationDropdown open={dropdownOpen} onClose={() => setDropdownOpen(false)} />` を追加
  - `NotificationDropdown` を `src/components/notifications/NotificationDropdown` からインポート

**Checkpoint**: 通知ベルクリックでドロップダウン表示・外クリックで閉じる動作が完成

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 型チェック・デッドコード除去・フォーマット確認・目視確認

- [X] T008 `pnpm typecheck` を実行してコンパイルエラーゼロを確認する。エラーがあれば修正する

- [X] T009 デッドコード・不要ファイルの削除を行う:
  - `src/components/notifications/NotificationBell.tsx` を削除する（どこからもインポートされていない既存の死んだコード）
  - `src/components/dashboard/TodayTimeline.tsx` を削除する（T005 で dashboard から除去済み。他にインポート箇所がないことを確認してから削除）
  - `src/components/dashboard/CollabRequests.tsx` を削除する（T005 で dashboard から除去済み。他にインポート箇所がないことを確認してから削除）
  - 各ファイル削除前に `grep -rn "ファイル名" src/` で残存インポートがないことを必ず確認する

- [X] T010 `src/components/layout/AppShell.tsx` を確認する。Sidebar コンポーネント自身が `w-[260px]` / `w-[72px]` を管理するため AppShell 側の幅指定変更は不要。ただし `flex min-h-screen bg-bg` などのレイアウト整合性を確認し、問題があれば修正する（変更不要な場合もタスクをチェック済みとする）

- [X] T011 `pnpm lint` を実行して ESLint エラーゼロを確認する。未使用インポート・変数（`no-unused-vars`）が残っていれば修正する

- [X] T012 `pnpm format` を実行して Prettier フォーマットを適用する。大規模リライト後のコードスタイルを統一する

- [X] T013 `pnpm dev` で開発サーバーを起動し、`docs/risukeru_gg_screens.html` と以下の画面を比較して目視確認する:
  - サイドバー: トグル・アコーディオン・アクティブハイライト・Material Icons 表示・折りたたみ状態のリロード後維持
  - ダッシュボード: 5 統計ウィジェット表示・タスクカードグリッド・詳細モーダル開閉・TodayTimeline/CollabRequests が消えていること
  - 通知ドロップダウン: ベルクリックで開く・外クリックで閉じる・未読バッジ表示・「既読にする」ボタン動作

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup（Phase 1）**: 依存なし → 即座に開始可能
- **Foundational（Phase 2）**: Phase 1 完了後。T002 は US1 専用・T002a は US3 専用。US2 は T001 完了後すぐ開始可能
- **US1（Phase 3）**: T001・T002 完了後に開始
- **US2（Phase 4）**: T001 完了後に開始（T002/T002a 不要）
- **US3（Phase 5）**: T001・T002a 完了後に開始
- **Polish（Phase 6）**: T003・T005・T007 全て完了後

### User Story Dependencies

- **US1（P1）**: T002（sidebar.ts）完了後に開始。他 US に依存なし
- **US2（P1）**: T001 完了後すぐ開始可能。US1・US3 に依存なし
- **US3（P1）**: T002a（markAllRead stub）完了後に開始。US1・US2 に依存なし

### タスク内依存関係

- T003（Sidebar）: T002（sidebar.ts）完了後
- T005（dashboard page）: T004（TaskBoardPreview）完了後
- T007（TopBar）: T006（NotificationDropdown）完了後
- T006（NotificationDropdown）: T002a（markAllRead）完了後
- T008〜T013（Polish）: T003・T005・T007 全て完了後
- T011（lint）: T009（削除）完了後が望ましい（削除後の不要インポートを検出するため）
- T012（format）: T011（lint）完了後

---

## Parallel Opportunities

```bash
# T001 完了後すぐ US2 を開始し、T002/T002a と並列実行:
Task T002:  sidebar.ts 新規作成（US1 前提）
Task T002a: notifications.ts に markAllRead 追加（US3 前提）
Task T004:  TaskBoardPreview.tsx 新規作成（US2）  ← T001 直後から可能

# T002 完了後に US1 開始:
Task T003: Sidebar.tsx リライト（US1）

# T002a と T004 の完了後:
Task T005: dashboard/page.tsx 更新（US2 - T004 依存）
Task T006: NotificationDropdown.tsx 新規作成（US3 - T002a 依存）

# T006 完了後:
Task T007: TopBar.tsx 更新（US3 - T006 依存）
```

---

## Implementation Strategy

### MVP First（全 US が P1 のためシーケンシャル推奨）

1. **Phase 1**: T001（Material Icons CDN）— 5 分
2. **Phase 2**: T002（sidebar.ts）+ T002a（markAllRead stub）— 20 分
3. **Phase 3 US1**: T003（Sidebar リライト）— 60〜90 分
4. **Checkpoint**: サイドバー動作確認 → 問題なければ続行
5. **Phase 4 US2**: T004 → T005（ダッシュボード + TodayTimeline/CollabRequests 削除）— 45〜60 分
6. **Checkpoint**: ダッシュボード動作確認 → 問題なければ続行
7. **Phase 5 US3**: T006 → T007（通知ドロップダウン）— 30〜45 分
8. **Phase 6 Polish**: T008（typecheck）→ T009（デッドコード削除）→ T010（AppShell 確認）→ T011（lint）→ T012（format）→ T013（目視確認）— 25〜35 分

### 推定合計工数: 3〜4 時間（+ クリーンアップ 30 分）

---

## Notes

- `[P]` タスクは異なるファイルを対象とするため並列実行可能
- Material Icons は `<span className="material-icons text-[20px]">icon_name</span>` の形式で使用
- Tailwind CSS `@theme` トークン（`bg-card`・`text-purple`・`border-border` 等）を活用すること
- `any` 型は禁止。props は全てインライン型注釈
- コメントは全て日本語
- **削除前の必須確認**: ファイル削除（T009）前に `grep -rn "対象コンポーネント名" src/` で残存インポートがないことを確認すること
- **markAllRead は stub 実装**: T002a で追加する `markAllRead` は Firestore 書き込みなしのローカル state 更新のみ。将来の通知機能チケットで本実装する
