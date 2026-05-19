# Tasks: スケジュール・タスク修正＆終日フラグ対応

**Input**: Design documents from `specs/004-schedule-task-fixes/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Tests**: 仕様に明示的なテスト要求なし — テストタスクは省略

**Organization**: 依存関係順に Foundational → US1 → US2 → US3 → US4 → US5 の順で実施

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル・依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US5）

---

## Phase 1: Foundational — 型定義・リポジトリ基盤

**Purpose**: すべての US が依存する型変更とリポジトリ関数修正。この Phase が完了するまで US 実装を開始しない。

**⚠️ CRITICAL**: 型変更（T001）は他すべてのタスクが参照するため最初に完了させる

- [x] T001 `src/types/entities.ts` の `CollabComment` インターフェースに `parentId?: string` フィールドを追加する
- [x] T002 [P] `src/lib/repositories/schedules.ts` の `toSchedule()` 関数に `allDay: (data.allDay as boolean | undefined) ?? false` の読み取りを追加する（T001 完了後）
- [x] T003 [P] `src/lib/repositories/tasks.ts` の `toTask()` 内 `comments` マッピングに `parentId: (c.parentId as string | undefined) ?? undefined` を追加する（T001 完了後）

**Checkpoint**: 型チェック `pnpm typecheck` がエラーなく通過すること

---

## Phase 2: US1 — 終日フラグ（allDay）対応

**Goal**: 「終日」ボタンで `allDay: true` が Firestore に保存され、WeekCalendar / MonthCalendar の all-day ストリップに表示される

**Independent Test**: スケジュール作成画面で「終日」を選択して保存 → Firestore ドキュメントに `allDay: true`, `startAt == endAt == 00:00:00` が保存され、カレンダーの all-day エリアに表示される

- [x] T004 [P] [US1] `src/components/calendar/ScheduleForm.tsx` を修正する: `const [isAllDay, setIsAllDay] = useState(initialData?.allDay ?? false)` state を追加し、`handleAllDay()` を `startAt = endAt = 選択日00:00:00` かつ `setIsAllDay(true)` に変更、`handleSubmit` の `onSubmit` 呼び出しに `allDay: isAllDay` を追加する
- [x] T005 [P] [US1] `src/components/calendar/ScheduleDetailModal.tsx` を修正する: 編集フォームに同様の `isAllDay` state を追加し、「終日」ボタン押下時に `allDay: true` + `startAt = endAt = 00:00:00` をセットし、保存時に `allDay` を含める
- [x] T006 [US1] `src/components/calendar/WeekCalendar.tsx` を修正する: スケジュール分類ロジックを `allDaySchedules = schedules.filter(s => s.allDay)` / `multiDaySchedules = schedules.filter(s => !s.allDay && startOfDay(s.startAt) < startOfDay(s.endAt))` / `singleDaySchedules = schedules.filter(s => !s.allDay && startOfDay(s.startAt).getTime() === startOfDay(s.endAt).getTime())` に変更し、all-day ストリップの表示対象を `[...allDaySchedules, ...multiDaySchedules]` とする。`allDay` イベントの `getEventWeekCols` は `startAt` の曜日列のみに表示する（T002, T003 完了後）
- [x] T007 [P] [US1] `src/components/calendar/MonthCalendar.tsx` を修正する: `multiDayEvents` の抽出ロジックに `s.allDay` を追加し、`allDay: true` の単日イベントも multi-day バーとして `WeekRow` に渡す（T002 完了後）

**Checkpoint**: WeekCalendar で終日予定が all-day ストリップの先頭行に表示され、時刻非表示であること

---

## Phase 3: US2 — 複数日カードスタイル統一・アニメーション追加

**Goal**: WeekCalendar の all-day ストリップカードのスタイルが単日カードと統一され、単日カードにも `animate-puni` アニメーションが付く

**Independent Test**: WeekCalendar（デスクトップ）で複数日予定カードと単日予定カードが同じ角丸・文字サイズ・パディングで表示され、両方ともホバー時にアニメーションが付く

- [x] T008 [US2] `src/components/calendar/WeekCalendar.tsx` を修正する: ①all-day ストリップのボタンクラスを `text-[12px]`・`px-2 py-1`・`rounded-[6px]`（週境界外は条件付き）に変更し単日カードに合わせる。②単日カード（デスクトップグリッド）のボタンに `animate-puni` クラスを追加する（Phase 2 の T006 と同一ファイルのため T006 完了後に実施）
- [x] T008b [P] [US2] `src/components/calendar/MonthCalendar.tsx` を修正する: `WeekRow` 内の単日イベントボタン（`daySingles.map` 内）に `animate-puni` クラスを追加する（spec.md 修正点3 で明示要求）

**Checkpoint**: WeekCalendar で複数日カードと単日カードの見た目・アニメーションが統一されていること

---

## Phase 4: US3 — タスク詳細締切日入力コンポーネント統一

**Goal**: `TaskDetailModal` の締切日入力が `DateInput` コンポーネントを使用し、他の画面と見た目が一致する

**Independent Test**: タスク詳細ポップアップの締切日フィールドが `ScheduleForm` の日時入力と同じスタイル（角丸・ボーダー・フォントサイズ）で表示される

- [x] T009 [P] [US3] `src/components/ui/DateInput.tsx` を新規作成する: `DateTimeInput` と同一の `BASE_CLASS` を使用し `type="date"` で動作する `DateInput` コンポーネント。Props: `{ label: string; value: string; onChange: (v: string) => void; min?: string; required?: boolean; error?: string; hint?: string; className?: string }`
- [x] T010 [US3] `src/components/kanban/TaskDetailModal.tsx` を修正する: `import { DateInput } from '@/components/ui/DateInput'` を追加し、締切日の `<input type="date" ... className={selectClass} />` を `<DateInput label="締切日" value={dueDate} onChange={handleDueDateChange} />` に置き換える（T009 完了後）

**Checkpoint**: タスク詳細の締切日フィールドが `DateTimeInput` と同じビジュアルで表示される

---

## Phase 5: US4 — Markdown バッククォート問題修正

**Goal**: `MarkdownEditor` プレビューモードでコードブロックを含む markdown を表示したとき、バッククォート文字が積み上がらず正しく表示される

**Independent Test**: MarkdownEditor のプレビューモードで `` `インライン` `` と ` ```ブロック``` ` を入力したとき、バッククォート文字が表示領域外や上部に漏れ出さない

- [x] T011 [US4] `src/components/ui/MarkdownEditor.tsx` を修正する: `pre` コンポーネントの実装を `<pre style={{ whiteSpace: 'pre', ... }}>` の内側に `<InsidePreCtx.Provider value={true}>` を移動する形に変更する（現在: Provider > pre、修正後: pre > Provider）。合わせて `whiteSpace: 'pre'` を `whiteSpace: 'pre-wrap'` に変更してオーバーフロー対応を改善する。修正後にブラウザで各種 markdown パターン（インラインコード・コードブロック・未閉バッククォート）を確認し、スタック問題が解消しない場合は原因を特定して追加修正する

**Checkpoint**: MarkdownEditor プレビューでコードブロックが正しくレンダリングされ、バッククォート文字が浮いて表示されない

---

## Phase 6: US5 — コメント返信 Firestore 化（localReplies 廃止）

**Goal**: タスク詳細コメントの返信が Firestore に保存され、ポップアップを閉じて再度開いても消えない

**Independent Test**: タスク詳細でルートコメントを投稿 → 返信を投稿 → ポップアップを閉じて再度開く → ルートコメントと返信の両方が表示される

- [x] T012 [US5] `src/components/kanban/TaskDetailModal.tsx` を修正する（大規模変更、以下をすべて実施）:
  1. `LocalReply` インターフェース定義を削除する
  2. `localReplies`, `repliesKey`, `replyingTo`, `replyText` の state と `repliesKey` localStorage キーを削除する
  3. 返信テキスト入力を管理するために `const [replyInputs, setReplyInputs] = useState<Record<string, string>>({})` を追加する（コメントID ごとに独立した入力欄を管理）
  4. `addReply()` 関数を削除し、代わりに `async function addReply(parentId: string)` を新規定義する: `replyInputs[parentId]?.trim()` を本文として `addTaskComment(teamId, task.id, { id: \`${Date.now()}\`, authorId: currentUser.uid, authorName: myName, text: replyInputs[parentId].trim(), createdAt: Timestamp.now(), parentId })` を呼び出し、`setComments` で楽観的更新した後 `setReplyInputs(prev => ({ ...prev, [parentId]: '' }))` で入力欄をリセットする
  5. `task.id` 変化時にコメントを同期する `useEffect(() => { setComments(task.comments ?? []); }, [task.id]);` を追加する
  6. コメント表示部分を `parentId` なし（ルート）と `parentId` あり（返信）でツリー表示に変更する: `const rootComments = comments.filter(c => !c.parentId)` → 各ルートの下に `comments.filter(c => c.parentId === root.id)` をネストして表示する
  7. 各ルートコメントの下に返信フォームを配置する: `<textarea value={replyInputs[comment.id] ?? ''} onChange={e => setReplyInputs(prev => ({ ...prev, [comment.id]: e.target.value }))} />` と送信ボタン（T001, T003 完了後）

**Checkpoint**: コメントと返信を投稿後、ポップアップを閉じて再度開いても両方が表示される。Firestore ドキュメントの `comments` 配列に `parentId` 付き返信が保存されている

---

## Phase 7: Polish & 型チェック

**Purpose**: 全変更後の型チェック・Lint 確認

- [x] T013 `pnpm typecheck` を実行してすべての TypeScript エラーがないことを確認する。エラーがある場合は修正する
- [x] T014 [P] `pnpm lint` を実行して ESLint エラーがないことを確認する。エラーがある場合は修正する

---

## Dependencies & Execution Order

### Phase 依存関係

- **Phase 1 (Foundational)**: 即時開始可能、すべての US をブロック
- **Phase 2 (US1)**: Phase 1 完了後に開始。T004/T005/T007 は並列可能。T006 は T002 依存
- **Phase 3 (US2)**: Phase 2 の T006 完了後（同一ファイル WeekCalendar.tsx）
- **Phase 4 (US3)**: Phase 1 完了後に並列開始可能。T010 は T009 依存
- **Phase 5 (US4)**: Phase 1 完了後に並列開始可能
- **Phase 6 (US5)**: Phase 1 完了後に開始。T012 は T001/T003 依存
- **Phase 7 (Polish)**: すべての US 完了後

### User Story 依存関係

- **US1**: Phase 1 (T001, T002) 完了後
- **US2**: US1 の WeekCalendar 変更 (T006) 完了後（同一ファイル）
- **US3**: Phase 1 (T001) 完了後（独立）
- **US4**: Phase 1 (T001) 完了後（独立）
- **US5**: Phase 1 (T001, T003) 完了後（独立）

### Parallel Opportunities

```bash
# Phase 1 完了後、以下を並列実行可能:
T004 (ScheduleForm allDay)       # US1
T005 (ScheduleDetailModal allDay) # US1
T007 (MonthCalendar allDay)      # US1
T009 (DateInput 新規作成)         # US3
T011 (MarkdownEditor 修正)       # US4

# T006 (WeekCalendar allDay) 完了後:
T008 (WeekCalendar カードスタイル) # US2

# T009 完了後:
T010 (TaskDetailModal DateInput)  # US3
```

---

## Implementation Strategy

### 推奨実施順序

1. **Phase 1** (T001→T002/T003並列) — 型基盤を確立
2. **Phase 2** (T004/T005/T007並列→T006) — allDay 主機能
3. **Phase 3** (T008) — カードスタイル（同一ファイル継続）
4. **Phase 4** (T009→T010) — DateInput
5. **Phase 5** (T011) — Markdown 修正
6. **Phase 6** (T012) — コメント Firestore 化（最も複雑）
7. **Phase 7** (T013/T014) — 型チェック・Lint

### MVP スコープ

最小限の動作確認: Phase 1 + Phase 2 (US1 完了) のみで終日フラグの主機能が検証可能。残りは独立して追加可能。

---

## 総計

| フェーズ | タスク数 | 並列可能 |
|---------|---------|---------|
| Foundational | 3 | T002/T003 並列 |
| US1 (allDay) | 4 | T004/T005/T007 並列 |
| US2 (カードスタイル) | 1 | — |
| US3 (DateInput) | 2 | T009 先行 |
| US4 (Markdown) | 1 | — |
| US5 (コメント) | 1 | — |
| Polish | 2 | T014 並列 |
| **合計** | **14** | — |
