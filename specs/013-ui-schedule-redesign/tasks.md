# Tasks: UIリデザイン — 共通レイアウト & スケジュール画面

**Input**: Design documents from `/specs/013-ui-schedule-redesign/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Tests**: 仕様で明示的に要求されていないため、テストタスクは含まない。TypeCheck/Lint のみ最終フェーズで実施。

**Code Cleanliness Rule**: 不要になったファイル・コード・import は即座に削除する。コメントアウトや `// deprecated` 等の残骸は残さない。廃止に関するメモは `specs/013-ui-schedule-redesign/deprecated.md` に記録する。

**Organization**: タスクはユーザーストーリー単位で整理し、各ストーリーが独立してテスト可能。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: ほかのファイルと依存関係がなく並列実行可能
- **[Story]**: 対象ユーザーストーリー（US1〜US6）
- ファイルパスを各タスクに明記

---

## Phase 1: Setup（共有インフラ）

**Purpose**: 全ストーリーで使うアニメーション CSS とフックの基盤、および廃止記録ファイルを作る

- [x] T001 globals.css に `pop-scale` / `pop-modal` / `slide-in-right` / `glow-pulse` キーフレームを追加する（src/app/globals.css）
- [x] T002 [P] `useHintDismiss(key)` カスタムフックを作成する（src/hooks/useHintDismiss.ts）— localStorage で dismissed 状態を boolean 管理し `{ visible, dismiss, show }` を返す
- [x] T003 [P] `specs/013-ui-schedule-redesign/deprecated.md` を作成し、このフィーチャーで削除・移行するファイルと理由を記録する（`BottomNav.tsx` 削除 → `MobileToolbar.tsx` に置き換え、`AIChatWidget.tsx` 削除 → `AIFab.tsx` に移行・リデザイン、`schedule/[id]/page.tsx` をモーダル化により削除）

---

## Phase 2: Foundational（共有UIコンポーネント）

**Purpose**: 複数ストーリーから使われるコンポーネントを先に作る。これが揃わないと US2・US5・US6 が実装できない

**⚠️ CRITICAL**: T004〜T007 が完了するまでアカウントメニュー・スケジュール詳細・ヒントバーの実装に着手しない

- [x] T004 [P] `src/components/ai/AIChatWidget.tsx` を `src/components/layout/AIFab.tsx` に移行・リデザインする — `/chat` へのリンク・`auto_awesome` アイコンは維持しつつ、`glow-pulse` アニメーション・ホバーで `scale(1.1) rotate(8deg)`・ホバー時 tooltip「AIに相談」表示・`/chat` ページでは非表示の既存ロジックを保持。元ファイル `src/components/ai/AIChatWidget.tsx` は削除し、`src/components/ai/` フォルダが空になれば同フォルダも削除する（src/components/layout/AIFab.tsx）
- [x] T005 [P] `HintBar` コンポーネントを新規作成する — `storageKey` prop で `useHintDismiss` を呼び出し、`×`ボタンで dismiss、`children` にヒント本文を受け取る（src/components/ui/HintBar.tsx）
- [x] T006 [P] `DateField` コンポーネントを新規作成する — テキストボックス＋カレンダーアイコンボタン構成で、アイコンクリックで既存 `MiniCalendar`（src/components/ui/MiniCalendar.tsx）をポップアップ表示、`hideTime?: boolean` で時刻表示を制御、`value: Date | null` / `onChange: (d: Date) => void` を props として受け取る（src/components/ui/DateField.tsx）

**Checkpoint**: T001〜T006 完了 → アニメーション・基盤コンポーネントが揃った状態

---

## Phase 3: User Story 1 — サイドバーナビゲーション (Priority: P1) 🎯

**Goal**: 全ページ共通のサイドバーを新仕様（大項目/小項目・お問い合わせ独立配置・アカウントカード削除）に更新する

**Independent Test**: サイドバーの全8小項目＋お問い合わせリンクをクリックして正しいパスへ遷移できることを確認

### Implementation

- [x] T007 [US1] Sidebar.tsx の `NAV_SECTIONS` を新仕様に再定義する — メイン（AIに相談 `/chat`・スケジュール `/schedule`・タスク管理 `/tasks`・コラボ調整 `/collabs`）、設定（チーム管理 `/team`・通知管理 `/notifications`・個人設定 `/settings/profile`）、各種連携（Discord連携・Youtube連携・X旧Twitter、すべて disabled）。チャンネル設定項目（`/settings`）は削除する（src/components/layout/Sidebar.tsx）
- [x] T008 [US1] Sidebar.tsx に `ContactLink`（お問い合わせ大項目）を設定グループの直後に追加する — 上部に border-top 区切り線、大項目ヘッダーと同等スタイル（text-[10px] font-bold tracking-widest uppercase）、右端に chevron_right アイコン、`/settings/contact` へ遷移（src/components/layout/Sidebar.tsx）
- [x] T009 [US1] Sidebar.tsx のフッターからアカウントカード（Avatar・displayName・signOut ボタン）を削除し TeamSwitcher のみ残す（src/components/layout/Sidebar.tsx）

**Checkpoint**: サイドバーの全ナビゲーションが新仕様どおりに動作する

---

## Phase 4: User Story 2 — トップバー・アカウントメニュー (Priority: P1) 🎯

**Goal**: 全ページ共通の TopBar にお問い合わせボタンとアカウントメニューを追加し、全画面に subtitle（画面説明文）を設定する

**Independent Test**: TopBar のアバターをクリックしてドロップダウンが開き、チーム変更モーダル・個人設定遷移・ログアウトが機能することを確認

### Implementation

- [x] T010 [P] [US2] `AccountMenu` コンポーネントを新規作成する — アバター＋▾のトリガーボタン（`useAuthStore` から `currentUser` を取得し既存 `Avatar` コンポーネントを使用）、外側クリックで閉じる `useRef + useEffect` パターン、ドロップダウン3項目: (1)「チーム変更」groups アイコン → `useState` で open 管理し既存 `TeamSwitcher` コンポーネントを `Modal` でラップしたモーダルを開く（実装前に TeamSwitcher が `collapsed` prop なしで単独動作することを確認し、必要なら props を調整する）、(2)「個人設定」manage_accounts アイコン → `/settings/profile` 遷移、区切り線、(3)「ログアウト」logout アイコン danger 色 → `signOut()` 実行（src/components/layout/AccountMenu.tsx）
- [x] T011 [US2] TopBar.tsx の右側アクションに「お問い合わせ」subtle ボタン（help アイコン、`/settings/contact` 遷移）と `AccountMenu` コンポーネントを追加する（src/components/layout/TopBar.tsx）
- [x] T012 [P] [US2] 以下の全保護ページの `<TopBar>` に `subtitle` prop を追加する — schedule「予定の確認・追加・編集ができます」、tasks「タスクの管理・進捗確認ができます」、chat「AIに配信の相談や企画の壁打ちができます」、collabs「コラボ相手との日程調整ができます」、team「チームメンバーの管理・招待ができます」、notifications「通知の設定・確認ができます」、settings/profile「プロフィールや個人設定を変更できます」（src/app/(protected)/schedule/page.tsx・tasks/page.tsx・chat/page.tsx・collabs/page.tsx・team/page.tsx・notifications/page.tsx・settings/profile/page.tsx）

**Checkpoint**: TopBar にアカウントメニューが表示され、全7ページで subtitle が表示される

---

## Phase 5: User Story 3 — モバイルツールバー (Priority: P1) 🎯

**Goal**: モバイル表示で BottomNav を MobileToolbar に完全置き換えし、5項目ナビゲーションと「その他」右スライドドロワーを実装する

**Independent Test**: ブラウザ幅 375px で MobileToolbar が表示され、「その他」タップで右からドロワーが開くことを確認

### Implementation

- [x] T013 [P] [US3] `MobileToolbar` コンポーネントを新規作成する — 5項目（スケジュール `/schedule`・タスク `/tasks`・AIに相談 `/chat` [AI強調 CTA]・コラボ調整 `/collabs`・その他 [drawer trigger]）、AIに相談はグラデーション背景の強調ボタン（`glow-primary`）でナビバー上方に飛び出す形状、「その他」タップで右スライドドロワーが開く（`slide-in-right` アニメーション）、ドロワー内容: チーム管理・通知管理・個人設定・Discord連携・Youtube連携・X旧Twitter・お問い合わせ、スクリムタップで閉じる（src/components/layout/MobileToolbar.tsx）
- [x] T014 [US3] AppShell.tsx を更新する — `import { BottomNav }` を削除し `import { MobileToolbar }` と `import { AIFab }` に差し替え、JSX 内の `<BottomNav />` を `<MobileToolbar />` に置き換え、`<AIChatWidget />` を `<AIFab />` に置き換える（src/components/layout/AppShell.tsx）
- [x] T015 [US3] `src/components/layout/BottomNav.tsx` を削除する（ファイルを削除するだけ）

**Checkpoint**: モバイル幅でツールバーが正しく表示され「その他」ドロワーが右からスライドして開く

---

## Phase 6: User Story 4 — スケジュール一覧（月/週表示） (Priority: P1) 🎯

**Goal**: スケジュール画面の月表示カレンダーを新週行構造に変更し、イベントカードアニメーション・ツールチップ・日付クリック切替を実装する

**Independent Test**: スケジュール画面を開き、月表示で複数日予定が日付数字の下にバーとして表示され、日付クリックで週表示に切り替わり、日付ホバーでツールチップが表示されることを確認

### Implementation

- [x] T016 [US4] MonthCalendar.tsx の週行構造を変更する — 各週を「①日付行（`calweek__dates`）→ ②複数日バー行（`calweek__bars`, CSS grid 7列）→ ③単日イベントグリッド（`calweek__cells`）」の3層構造に組み替える。複数日予定（startAt から endAt が2日以上）は②バー行に span として配置し、開始日が早い順に表示（src/components/calendar/MonthCalendar.tsx）
- [x] T017 [US4] MonthCalendar.tsx のイベントカードを更新する — 単日イベントカードに `animate-pop-scale` クラスを追加、左から「カテゴリアイコン（16px）」「開始時間（font-num, text-muted）」「タイトル（truncate）」の順に左揃えで配置、カードは `border-left: 3px solid` でカテゴリ色を表示（src/components/calendar/MonthCalendar.tsx）
- [x] T018 [P] [US4] MonthCalendar.tsx に `DayTooltip` を追加する — 各日付ボタンのホバーで表示する `position: absolute` ツールチップ、その日の全予定をリスト表示（開始時間・タイトル）、予定0件の場合「予定はありません」表示、末尾2週は上方向に表示（src/components/calendar/MonthCalendar.tsx）
- [x] T019 [P] [US4] MonthCalendar.tsx の日付クリック→週表示切替を実装する — `onDateLabelClick?: (date: Date) => void` prop を追加し日付ボタンクリック時に呼び出す（schedule/page.tsx 側では `(date) => { setCurrentDate(date); setView('week'); }` に接続する）（src/components/calendar/MonthCalendar.tsx）
- [x] T020 [US4] MonthCalendar.tsx に1日最大3件表示と「+N件」折りたたみを実装する — ②複数日バー行の件数 ＋ ③単日イベントの件数の**合計**が3件を超える場合に、超過分の単日イベントを非表示にして「+N件」テキストを最下行に表示し、クリックで `onDateLabelClick` を呼び出して週表示に切り替える（src/components/calendar/MonthCalendar.tsx）
- [x] T021 [P] [US4] schedule/page.tsx のカレンダーヘッダーを新仕様に再構成する — ヘッダー左: SegmentToggle（週/月切替）+ `{year}年{month}月` 表示、ヘッダー右: 「予定追加」ボタン + `メンバーの予定` 切替ボタン + DateNav（◀今日▶）+ ヘルプトグル「?」ボタン（src/app/(protected)/schedule/page.tsx）

**Checkpoint**: スケジュール月表示で複数日バーが正しい位置に表示され、日付操作が全て動作する

---

## Phase 7: User Story 5 — 予定追加・編集モーダル (Priority: P2)

**Goal**: スケジュール詳細フォームを 870px 幅モーダルに変更し、DateField・終日トグル・フッターボタン順を新仕様にする。`schedule/[id]/page.tsx` はモーダル化に伴い不要になるため削除する

**Independent Test**: 「予定追加」ボタンをクリックして 870px のモーダルが開き、DateField のカレンダーアイコンをクリックしてミニカレンダーが出現し、保存ボタンで予定が登録できることを確認

### Implementation

- [x] T022 [US5] `src/app/(protected)/schedule/[id]/page.tsx` を削除する — 予定詳細はモーダル（FR-014）に統一されたため不要。直接 URL アクセス（`/schedule/:id`）は `/schedule` にリダイレクトする `src/app/(protected)/schedule/[id]/route.ts` を代替として作成するか、Next.js の `notFound()` で処理する。どちらか採用した方で実装すること（src/app/(protected)/schedule/[id]/page.tsx 削除）
- [x] T023 [US5] ScheduleDetailModal.tsx を 870px 幅モーダルに変更する — モーダルカードを `w-[870px] max-w-[calc(100vw-64px)]` に設定、スクリム付き（`position: absolute; inset: 0; backdrop-filter: blur(2px)`）、`animate-pop-modal` クラスで出現アニメーション（transform のみ、opacity 変化なし）、モーダルヘッダーに×閉じるボタン（src/components/calendar/ScheduleDetailModal.tsx）
- [x] T024 [US5] ScheduleDetailModal.tsx / ScheduleForm.tsx の開始日時・終了日時入力を `DateField` コンポーネントに置き換える — 既存の input[type="datetime-local"] または日付ピッカーを `DateField` に差し替え、`hideTime={allDay}` を渡す。置き換えられた古い入力要素は削除する（src/components/calendar/ScheduleDetailModal.tsx）
- [x] T025 [P] [US5] 終日トグルを開始日時ラベルの横・右揃えに移動する — `display: flex; justify-content: space-between` 構造で、左に「開始日時」ラベル、右に toggle スイッチを配置。現在の終日トグルが別の場所にある場合はその実装を削除する（src/components/calendar/ScheduleDetailModal.tsx）
- [x] T026 [P] [US5] フッターを「キャンセル → 削除（新規追加時は非表示） → 保存」の順に並べ替える — `margin-left: auto` で右寄せにし右から保存・削除・キャンセルの並び。`isNew`（新規作成フラグ）が true の場合は削除ボタンを描画しない（非表示ではなく DOM から除外）（src/components/calendar/ScheduleDetailModal.tsx）

**Checkpoint**: 予定追加・編集モーダルが 870px 幅で開き、DateField の操作と保存が正常に動作する

---

## Phase 8: User Story 6 — ヒントバー (Priority: P3)

**Goal**: スケジュール画面に操作説明ヒントバーを追加し、ユーザーが×で閉じ・?ボタンで再表示できるようにする

**Independent Test**: スケジュール画面を初回表示するとヒントバーが表示され、×で閉じた後 localStorage に `riskeru_hint_schedule: "1"` が書き込まれ、再読み込み後も非表示であることを確認

### Implementation

- [x] T027 [US6] schedule/page.tsx に `HintBar` を追加する — `storageKey="riskeru_hint_schedule"` で HintBar を配置し、ヒント本文を「カレンダーの日付をクリックすると週表示に切り替わります。「予定を追加」ボタンまたはセルをクリックして予定を追加できます。」に設定、カレンダーヘッダーとカレンダー本体の間に配置（src/app/(protected)/schedule/page.tsx）
- [x] T028 [US6] schedule/page.tsx のカレンダーヘッダーの「?」ヘルプトグルを `useHintDismiss("riskeru_hint_schedule")` に接続する — `visible` で HintBar 表示/非表示を制御、ボタン ON 時はハイライト（`var(--primary-950)` 背景）、OFF 時はデフォルト（src/app/(protected)/schedule/page.tsx）

**Checkpoint**: ヒントバーが表示・非表示の操作と localStorage 永続化が正常に動作する

---

## Phase 9: ポリッシュ & クロスカット

**Purpose**: 全ストーリー実装後の品質確認と最終調整

- [x] T029 [P] `pnpm typecheck` を実行し TypeScript エラーを全て修正する
- [x] T030 [P] `pnpm lint` を実行し ESLint エラーを全て修正する
- [x] T031 実装後に未使用 import・未参照コンポーネント・空フォルダがないことを確認し、残っていれば削除する（`src/components/ai/` フォルダが空なら削除）
- [x] T032 PC幅（1440px）とモバイル幅（375px）でスケジュール画面・サイドバー・トップバー・ツールバーを目視確認し、レイアウト崩れ・スタイル欠落がないことを確認する

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
  └─→ Phase 2 (Foundational) ← T004〜T006 が揃うまで US2/US5/US6 実装不可
        ├─→ Phase 3 (US1)  ← T002 完了後に着手可
        ├─→ Phase 4 (US2)  ← T010 は T006 不要、T011 は T010 完了後
        ├─→ Phase 5 (US3)  ← T013 は T004(AIFab) 完了後 T014 が可能
        ├─→ Phase 6 (US4)  ← T016〜T020 は独立、T021 は T012 と並行可
        ├─→ Phase 7 (US5)  ← T024 は T006(DateField) 完了後
        └─→ Phase 8 (US6)  ← T027 は T005(HintBar)・T002(useHintDismiss) 完了後
Phase 9 (Polish) ← 全ストーリー完了後
```

### User Story Dependencies

- **US1 (P1)**: Phase 2 完了後に着手可能。他のストーリーに依存しない
- **US2 (P1)**: Phase 2 完了後に着手可能。US1 と並行実行可能（別ファイル）
- **US3 (P1)**: T004(AIFab) 完了後に T014 着手可能。US1/US2 と並行実行可能（別ファイル）
- **US4 (P1)**: Phase 2 完了後に着手可能。T021 は T012(US2) と並行可能
- **US5 (P2)**: T006(DateField) 完了後に着手可能。US4 と並行実行可能（別ファイル）
- **US6 (P3)**: T002(useHintDismiss) + T005(HintBar) 完了後。T028 は T027 の後

### Within Each User Story

```
US1: T007 → T008 → T009
US2: T010 → T011 → T012（T012 は T011 完了後）
US3: T013 → T014 → T015
US4: T016 → T017 → T018[P] / T019[P] → T020 → T021[P]
US5: T022 → T023 → T024 → T025[P] / T026[P]
US6: T027 → T028
```

---

## Parallel Execution Examples

### Phase 2（並列起動可能）

```bash
# 3タスク同時実行可能
Task: T004 — AIChatWidget → AIFab 移行
Task: T005 — HintBar.tsx 作成
Task: T006 — DateField.tsx 作成
```

### Phase 3/4/5（US1・US2・US3 は異なるファイルで並列可）

```bash
# Phase 2 完了後、3ストーリー同時着手可能
Story US1: T007 → T008 → T009  (Sidebar.tsx のみ)
Story US2: T010 → T011 → T012  (AccountMenu.tsx + TopBar.tsx + 各ページ)
Story US3: T013 → T014 → T015  (MobileToolbar.tsx + AppShell.tsx + BottomNav.tsx 削除)
```

### Phase 6 内（MonthCalendar 内部の並列）

```bash
# T016 完了後
Task: T017 — イベントカード更新
Task: T018 — DayTooltip 追加 [P]
Task: T019 — 日付クリック切替 [P]
Task: T021 — ヘッダー再構成 [P]（MonthCalendar と別ファイル）
```

---

## Implementation Strategy

### MVP First（US1〜US3: 共通レイアウトのみ）

1. Phase 1: Setup 完了
2. Phase 2: Foundational 完了
3. Phase 3/4/5: US1・US2・US3 を並列実装
4. **STOP & VALIDATE**: サイドバー・トップバー・ツールバーが全て動作することを確認
5. デモ可能状態

### Full Delivery（全ストーリー）

1. Setup + Foundational → 基盤完成
2. US1 + US2 + US3（並列）→ 共通レイアウト完成
3. US4 → スケジュール一覧完成
4. US5 → 予定追加・編集完成（`schedule/[id]/page.tsx` 削除含む）
5. US6 → ヒントバー追加
6. Polish → TypeCheck + Lint + 未使用ファイル確認 + 目視確認

---

## Notes

- `[P]` タスクは異なるファイルへの変更で依存なし、並列実行可
- **AIChatWidget → AIFab 移行（A1 対応）**: `AIChatWidget.tsx` は新規 `AIFab.tsx` に機能・ロジックを移し元ファイルを削除する。`src/components/ai/` フォルダが空になれば削除する
- **コードクリーン原則**: コメントアウトや `// TODO: 廃止` 等の残骸コードは一切残さない。廃止理由は `specs/013-ui-schedule-redesign/deprecated.md` に記録する
- `BottomNav.tsx` は T015 で削除するが T014（AppShell 更新）完了後に削除すること
- `schedule/[id]/page.tsx` は T022 で削除するが、直接URL アクセスの対処（リダイレクトまたは notFound）を実装してから削除すること
- `DateField` は `MiniCalendar`（src/components/ui/MiniCalendar.tsx）を内部で使うため、MiniCalendar の既存 props を確認してから実装すること
- `pop-scale` アニメーションは `opacity` を変化させない（`transform: scale` のみ）— バックグラウンドタブでのフリーズ防止
- `AccountMenu` の「チーム変更」は実装前に TeamSwitcher が `collapsed` prop なしで独立動作するか確認し、必要なら props を調整してから Modal でラップする
- 広告バナー（AdBanner）は今回スコープ外（specs/013-ui-schedule-redesign/deprecated.md に将来対応として記録）
