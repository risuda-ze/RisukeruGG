# Tasks: UI差異修正 — Dropdown & Calendar コンポーネント

**Feature**: デザインファイル（リスケるGG デザイン.html）との差異修正  
**Date**: 2026-05-30  
**対象差異**: カスタム Dropdown コンポーネント・MiniCalendar コンポーネント  
**Input**: デザインファイル分析結果（`/speckit-plan` で特定）

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並行実行可能（別ファイル・依存関係なし）
- **[US1]**: Dropdown UI 差異修正
- **[US2]**: MiniCalendar UI 差異修正

---

## Phase 1: Foundational（基盤コンポーネント作成）

**Purpose**: US1・US2 共通の基盤。全 story 実装の前提。

- [x] T001 `src/components/ui/Dropdown.tsx` を新規作成。デザイン仕様の `.dropdown` / `.dropdown__trigger` / `.dropdown__menu` / `.dropdown__item` CSSクラスを使うカスタム Dropdown コンポーネント。props: `options: {value: string, label: string}[]`, `value`, `placeholder`, `size?: 'sm'|'md'`, `align?: 'left'|'right'`, `up?`, `scroll?`, `onChange`, `disabled?`, `icon?`（IconName）
- [x] T002 `src/app/globals.css` に `.dropdown` 関連 CSS を追加。`.dropdown__trigger`（height:44px, var(--surface)背景）、`.dropdown__trigger--sm`（height:36px）、`.dropdown__trigger.is-open`（var(--primary-950)背景・矢印180°回転）、`.dropdown__menu`（var(--card-raised)背景・slide-up アニメ）、`.dropdown__menu--up`（上方向展開）、`.dropdown__menu--scroll`（max-height:188px・スクロール）、`.dropdown__item`（hover: rgba(91,200,250,0.12) + var(--info)色）、`.dropdown__item.is-active`（var(--primary-300)色・チェックアイコン）

**Checkpoint**: `pnpm typecheck` エラーゼロ確認

---

## Phase 2: User Story 1 — Dropdown UI 差異修正 (Priority: P1) 🎯

**Goal**: 全 `<select>` を Dropdown コンポーネントに置き換え、デザインと一致させる  
**Independent Test**: カレンダーの「カテゴリ」セレクト・タスクフォームの「列」セレクトがカスタム Dropdown で表示され、ホバー時に info 色ハイライト・選択時にチェックアイコンが表示される

- [x] T003 [P] [US1] `src/components/calendar/ScheduleForm.tsx` の `selectClass` 定数（L28）と `<select>`（L125）を Dropdown コンポーネントに置き換え。`categories` を `options` にマッピング
- [x] T004 [P] [US1] `src/components/kanban/TaskForm.tsx` の `<select>` 3箇所（L116: 列選択・L136: カテゴリ選択・L239: 担当者選択）を Dropdown コンポーネントに置き換え
- [x] T005 [P] [US1] `src/components/kanban/TaskDetailModal.tsx` の `selectClass`（L32）と `<select>` 2箇所（L370: 列・L389: カテゴリ）を Dropdown コンポーネントに置き換え
- [x] T006 [P] [US1] `src/components/kanban/TaskCard.tsx` の `<select>`（L149）を Dropdown コンポーネントに置き換え
- [x] T007 [P] [US1] `src/components/collab/CollabForm.tsx` の `<select>`（L146）を Dropdown コンポーネントに置き換え
- [x] T008 [P] [US1] `src/components/calendar/ScheduleDetailModal.tsx` の `<select>`（L433）を Dropdown コンポーネントに置き換え
- [x] T009 [P] [US1] `src/app/(protected)/team/page.tsx` の `<select>`（L291: ロール選択）を Dropdown コンポーネントに置き換え
- [x] T010 [P] [US1] `src/app/(protected)/settings/profile/page.tsx` の `<select>`（L592）を Dropdown コンポーネントに置き換え

**Checkpoint**: `pnpm typecheck` エラーゼロ。全 `<select>` 消滅確認（`grep -r "<select" src/` が 0 件）

---

## Phase 3: User Story 2 — MiniCalendar UI 差異修正 (Priority: P2)

**Goal**: `input[type="date"]` の native ピッカーをデザイン仕様の MiniCalendar コンポーネントに置き換える  
**Independent Test**: スケジュール追加フォームの「開始日時」クリックでカレンダーグリッドが表示され、日付を選択後 readout エリアに `YYYY年M月D日（曜日） HH:mm` 形式で表示される

- [x] T011 `src/components/ui/MiniCalendar.tsx` を新規作成。月グリッド（7列）・月ナビ・時刻選択Dropdown・readout入力欄を実装。props: `value: Date|null`, `onChange: (date: Date|null) => void`, `min?: Date`。CSSクラス `.minical` 系を使用
- [x] T012 `src/app/globals.css` に `.minical` 関連 CSS を追加。`.minical__head`・`.minical__nav`（30px角丸ボタン）・`.minical__grid`（7列グリッド）・`.minical__wd`（曜日ヘッダー、日=danger・土=info色）・`.minical__day`（aspect-ratio:1・hover背景）・`.minical__day.is-today`（primary-300色・inset border）・`.minical__day.is-sel`（primary背景・glow）・`.minical__time`（時刻行）・`.minical__readout`（primary-950背景・focus-within glow）
- [x] T013 `src/components/ui/DateTimeInput.tsx` を MiniCalendar を使うポップオーバー型に刷新。トリガーは `ds-field` スタイルのボタン、クリックで MiniCalendar がドロップダウン展開。外側クリックで閉じる
- [x] T014 [P] `src/components/ui/DateInput.tsx` を MiniCalendar（allDay=true 相当、時刻なし）を使うポップオーバー型に刷新
- [x] T015 [P] `src/components/calendar/ScheduleForm.tsx` の DateTimeInput 使用箇所が新 UI で正常動作することを確認。必要に応じてスタイル調整
- [x] T016 [P] `src/components/collab/CollabForm.tsx` の DateTimeInput / DateInput 使用箇所を確認・調整
- [x] T017 [P] `src/components/kanban/TaskForm.tsx` の DateInput 使用箇所を確認・調整

**Checkpoint**: `pnpm typecheck` エラーゼロ。フォームで日付選択→readout 表示確認

---

## Phase 4: Polish

- [x] T018 [P] `src/app/globals.css` の native `select` / `input[type="date"]` のグローバルスタイルを削除（Dropdown・MiniCalendar に完全移行したため不要）
- [x] T019 `pnpm typecheck` && `pnpm lint` を実行しエラーゼロ確認
- [x] T020 [P] `src/components/ui/Dropdown.tsx` と `src/components/ui/MiniCalendar.tsx` をコンポーネントカタログの `src/components/ui/index.ts`（存在する場合）に追加

---

## Dependencies

```
T001 → T003〜T010（Dropdown コンポーネント必須）
T002 → T003〜T010（CSS クラス必須）
T011 → T013, T014（MiniCalendar コンポーネント必須）
T012 → T013, T014（MiniCalendar CSS 必須）
T013 → T015, T016, T017（新 DateTimeInput 必須）
T014 → T016, T017（新 DateInput 必須）
```

### 並行実行可能グループ

| フェーズ | 並行可能タスク |
|---|---|
| Phase 2 | T003・T004・T005・T006・T007・T008・T009・T010 を同時実行可 |
| Phase 3 | T011+T012 完了後、T013+T014 を並行実行。完了後 T015+T016+T017 を並行実行 |
| Phase 4 | T018+T020 を並行実行 |

---

## Incremental Delivery

1. **Phase 1** (T001-T002): Dropdown CSS + コンポーネント作成
2. **Phase 2 MVP** (T003-T010): 全 `<select>` を Dropdown に置き換え → 動作確認
3. **Phase 3** (T011-T017): MiniCalendar 作成 → DateTimeInput 刷新
4. **Phase 4** (T018-T020): クリーンアップ・最終確認

---

## Notes

- `Dropdown` コンポーネントは `Icon` コンポーネント（`chevron_down`）を内部で使用
- `MiniCalendar` の時刻選択には Dropdown コンポーネント自身を再利用（時・分 各ドロップダウン）
- T003〜T010 の `<select>` 置き換えは value が文字列ID の場合、`options` を `{value: id, label: 表示名}` 配列に変換すること
- コメントは日本語で記述すること（`any` 使用禁止）
- タスク数: 20 タスク（T001〜T020）
