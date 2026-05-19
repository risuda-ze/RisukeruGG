# Implementation Plan: スケジュール・タスク修正＆終日フラグ対応

**Branch**: `004-schedule-task-fixes` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/004-schedule-task-fixes/spec.md`

## Summary

スケジュール画面の終日フラグ（allDay）を Firestore に正しく保存・読み取りし、終日予定を all-day ストリップに表示する。また、複数日カードのスタイル統一、アニメーション追加、タスク詳細の日程入力コンポーネント統一、Markdown バッククォート問題の修正、コメント返信を Firestore に保存する設計変更（localReplies 廃止）を実施する。

## Technical Context

**Language/Version**: TypeScript 5, Next.js 14 (App Router)
**Primary Dependencies**: React 18, Firebase/Firestore, Tailwind CSS 4, react-markdown, date-fns, Zustand
**Storage**: Cloud Firestore (`teams/{teamId}/schedules`, `teams/{teamId}/tasks`)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (Vercel) + モバイル対応 PWA
**Project Type**: Web application
**Performance Goals**: インタラクション応答 < 2秒
**Constraints**: Tailwind CSS 4 カスタムテーマ (`@theme`)、Firebase Security Rules、Zustand 状態管理

## Constitution Check

| 原則 | 評価 | 根拠 |
|------|------|------|
| I. シンプルさ優先 | ✅ PASS | 新規コンポーネント1つ（DateInput）。localReplies 廃止で複雑性削減。YAGNI 準拠。 |
| II. TypeScript型安全 | ✅ PASS | `CollabComment.parentId?: string` 追加。any 不使用。型境界は Zod 不要（内部型）。 |
| III. テスト方針 | ✅ PASS | UI コンポーネントテストは任意。ビジネスロジック変更は最小。 |
| IV. Firebase・セキュリティ | ✅ PASS | CRUD はリポジトリ関数経由を維持。Security Rules のチームスコープに変更なし。 |
| V. 日本語コメント | ✅ PASS | 新規コメントは日本語で記述。 |

## Project Structure

### Documentation (this feature)

```text
specs/004-schedule-task-fixes/
├── plan.md         # このファイル
├── spec.md         # フィーチャー仕様
├── research.md     # Phase 0 調査結果
├── data-model.md   # Phase 1 データモデル
└── tasks.md        # Phase 2 タスク (/speckit-tasks で生成)
```

### Source Code (変更対象ファイル)

```text
src/
├── types/
│   └── entities.ts                          # CollabComment.parentId 追加
├── lib/repositories/
│   ├── schedules.ts                         # toSchedule() allDay 読み取り追加
│   └── tasks.ts                             # toTask() parentId 読み取り追加
├── components/
│   ├── ui/
│   │   ├── DateInput.tsx                    # NEW: date 専用入力コンポーネント
│   │   └── MarkdownEditor.tsx               # バッククォート問題修正
│   ├── calendar/
│   │   ├── ScheduleForm.tsx                 # allDay フラグ対応
│   │   ├── ScheduleDetailModal.tsx          # allDay フラグ対応（編集）
│   │   ├── WeekCalendar.tsx                 # allDay 表示・カードスタイル・アニメーション
│   │   └── MonthCalendar.tsx                # allDay 表示対応
│   └── kanban/
│       └── TaskDetailModal.tsx              # DateInput 差替・コメントツリー Firestore 化
└── (Firestore Security Rules — 今回変更なし)
```

## 実装詳細

### A. 終日フラグ対応

**変更方針**: `allDay: true` 時は `startAt = endAt = 00:00:00` に統一。表示は `allDay` フラグで判定。

**`src/lib/repositories/schedules.ts`**:
- `toSchedule()` に `allDay: (data.allDay as boolean | undefined) ?? false` を追加

**`src/components/calendar/ScheduleForm.tsx`**:
- `const [isAllDay, setIsAllDay] = useState(false)` を追加
- `handleAllDay()` を修正: `startAt = endAt = 選択日00:00:00`, `setIsAllDay(true)`
- `submit` 時に `allDay: isAllDay` を渡す

**`src/components/calendar/ScheduleDetailModal.tsx`**:
- 同様の `isAllDay` state 追加
- 編集フォームの「終日」ボタン押下時に `allDay: true` をセット

**`src/components/calendar/WeekCalendar.tsx`**:
- `allDay: true` の単日イベント（`startAt === endAt`）を `multiDaySchedules` 相当として all-day ストリップに含める
- 分類ロジック修正:
  ```typescript
  const allDaySchedules = schedules.filter(s => s.allDay);
  const multiDaySchedules = schedules.filter(
    s => !s.allDay && startOfDay(s.startAt).getTime() < startOfDay(s.endAt).getTime()
  );
  const singleDaySchedules = schedules.filter(
    s => !s.allDay && startOfDay(s.startAt).getTime() === startOfDay(s.endAt).getTime()
  );
  // all-day ストリップ表示対象: allDaySchedules + multiDaySchedules
  ```

**`src/components/calendar/MonthCalendar.tsx`**:
- `allDay: true` の単日イベントも `multiDayEvents` として `WeekRow` に渡す

---

### B. 複数日カードのスタイル統一

**`src/components/calendar/WeekCalendar.tsx`**:
- all-day ストリップのボタンクラスを単日カードに合わせる:
  - `text-[11px]` → `text-[12px]`
  - `gap-1` → `gap-1.5`
  - 角丸を `rounded-[6px]` に統一（週境界外は条件付き）
  - padding を `px-2 py-1` に

---

### C. アニメーション統一

**`src/components/calendar/WeekCalendar.tsx`**:
- 単日カード（デスクトップグリッド）のボタンに `animate-puni` クラスを追加
- MonthCalendar (`WeekRow` 内 `daySingles.map`) の単日カードにも `animate-puni` を追加する（spec.md 修正点3 で明示要求）

---

### D. タスク詳細画面の日程入力コンポーネント統一

**`src/components/ui/DateInput.tsx`（新規）**:
```typescript
const BASE_CLASS = 'w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple';

export function DateInput({ label, value, onChange, min, required, error, hint, className }: DateInputProps) { ... }
```

**`src/components/kanban/TaskDetailModal.tsx`**:
- `import { DateInput } from '@/components/ui/DateInput'`
- `<input type="date" ... />` を `<DateInput label="締切日" value={dueDate} onChange={handleDueDateChange} />` に差し替え

---

### E. Markdown バッククォート問題修正

**`src/components/ui/MarkdownEditor.tsx`**:

調査の結果、`InsidePreCtx.Provider` の配置と `whiteSpace: 'pre'` の組み合わせが原因と推定。修正方針:

1. `pre` コンポーネントの `style` を `whiteSpace: 'pre-wrap'` に変更（オーバーフロー制御と改行対応）
2. `InsidePreCtx.Provider` を `pre` 要素の内側に移動することでコンテキスト伝播を確実にする:
   ```jsx
   pre: ({ children }) => (
     <pre className="..." style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
       <InsidePreCtx.Provider value={true}>
         {children}
       </InsidePreCtx.Provider>
     </pre>
   ),
   ```
3. インライン `code` の `bg-surface` が `pre` 内でも適用される場合は `insidePre` チェックを強化

---

### F. コメント返信の Firestore 化（localReplies 廃止）

**`src/types/entities.ts`**:
- `CollabComment` に `parentId?: string` を追加

**`src/lib/repositories/tasks.ts`**:
- `toTask()` の `comments` マッピングに `parentId` を追加

**`src/components/kanban/TaskDetailModal.tsx`**:
1. `LocalReply` インターフェースを削除
2. `localReplies`, `repliesKey`, `replyingTo`, `replyText` state を削除
3. `addReply()` 関数を削除し、返信入力テキストを `const [replyInputs, setReplyInputs] = useState<Record<string, string>>({})` で管理する（コメントID をキーとする Map）
4. 代わりに `addReply(parentId: string)` を新規定義: `replyInputs[parentId].trim()` を本文として `addTaskComment()` を `parentId` 付きで呼び出し、完了後に `setReplyInputs` でその入力欄をリセット
5. コメント表示をツリー構造に変更:
   - `rootComments = comments.filter(c => !c.parentId)`
   - `getReplies(commentId) = comments.filter(c => c.parentId === commentId)`
6. `task.id` 変化時にコメントを同期する `useEffect` を追加:
   ```typescript
   useEffect(() => {
     setComments(task.comments ?? []);
   }, [task.id]);
   ```

## Complexity Tracking

変更なし（すべて Constitution に準拠）。

## 実装順序（依存関係順）

1. `entities.ts` — 型定義変更（他のファイルが依存）
2. `tasks.ts` リポジトリ — `parentId` 読み取り追加
3. `schedules.ts` リポジトリ — `allDay` 読み取り追加
4. `DateInput.tsx` — 新規コンポーネント
5. `MarkdownEditor.tsx` — バッククォート修正（単独変更）
6. `TaskDetailModal.tsx` — DateInput 差し替え + コメントツリー Firestore 化
7. `ScheduleForm.tsx` / `ScheduleDetailModal.tsx` — allDay フラグ対応
8. `WeekCalendar.tsx` — allDay 表示 + カードスタイル + アニメーション
9. `MonthCalendar.tsx` — allDay 表示対応
