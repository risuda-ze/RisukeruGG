# Research: スケジュール・タスク修正＆終日フラグ対応

## 1. allDay イベントの Firestore タイムスタンプ設計

**Decision**: `allDay: true` 時は `startAt = endAt = 選択日付の 00:00:00 (local time)` に統一する。

**Rationale**:
- 両フィールドを同一の `00:00:00` に揃えることで、日付のみの表現が可能
- `startAt === endAt` となるため既存の `startOfDay(s.startAt).getTime() < startOfDay(s.endAt).getTime()` で multi-day 判定はされない
- WeekCalendar / MonthCalendar は `allDay` フラグを見て表示場所を決定する

**Alternatives considered**:
- A: `startAt = 00:00`, `endAt = 23:59`（現状） — 「終日」の意味が時刻に依存し、表示ロジックが複雑
- B: `endAt = 翌日 00:00`（ISO 8601 準拠） — 複数日判定ロジックとの整合性問題

**影響ファイル**:
- `src/lib/repositories/schedules.ts` — `toSchedule()` で `allDay` を読み取り
- `src/components/calendar/ScheduleForm.tsx` — `handleAllDay()` を修正
- `src/components/calendar/ScheduleDetailModal.tsx` — 同様
- `src/components/calendar/WeekCalendar.tsx` — `allDay` フラグで all-day ストリップに振り分け
- `src/components/calendar/MonthCalendar.tsx` — 同様

---

## 2. CollabComment 親子構造（Firestore arrayUnion）

**Decision**: `CollabComment` に `parentId?: string` を追加し、返信も同一 `comments` 配列に Firestore 保存する。

**Rationale**:
- Firestore `arrayUnion` は任意のオブジェクトフィールドをサポートする
- `parentId` の有無でルートコメントと返信を区別できる（シンプルな実装）
- `localReplies` の localStorage 管理を廃止し、データの永続性を保証する

**Alternatives considered**:
- サブコレクション（`comments/{commentId}/replies`） — クエリが複雑になり YAGNI に反する
- 親コメントにネストした `replies` 配列 — Firestore の arrayUnion で子要素を更新できない

**Display logic**:
```typescript
const rootComments = comments.filter(c => !c.parentId);
const replies = comments.filter(c => !!c.parentId);
// 各ルートコメントに対して replies.filter(r => r.parentId === comment.id) で子を取得
```

**影響ファイル**:
- `src/types/entities.ts` — `CollabComment.parentId?: string` 追加
- `src/lib/repositories/tasks.ts` — `toTask()` での `parentId` 読み取り追加
- `src/components/kanban/TaskDetailModal.tsx` — `localReplies` 廃止、Firestore 保存に変更、ツリー表示

---

## 3. MarkdownEditor バッククォート問題の調査

**Decision**: `pre` コンポーネントの `InsidePreCtx.Provider` の配置順を修正し、`whiteSpace` スタイルの挙動を確認する。

**根本原因の仮説**:
- React の Context.Provider はブラウザ DOM にノードを出力しないため、DOM 構造上の問題は生じないはず
- しかし、`<pre style={{ whiteSpace: 'pre' }}>` の内側に Provider を持つ場合、React が Provider 境界でテキストノードを挿入する可能性がある
- react-markdown v10 が `pre > code` 構造を生成する際、バッククォート文字が literal テキストとして流れ込む場合がある（例：unclosed inline code）

**対処方針**:
1. `InsidePreCtx.Provider` を `pre` の外側に移動（現状は Provider > pre の順だが変更なし — 正しい）
2. `pre` の `style` に `whiteSpace: 'pre-wrap'` を検討（overflow 対応）
3. react-markdown の `rehypeRaw` や `remarkGfm` が余分なバッククォートを挿入していないか確認

**調査ポイント**:
- ` ` (backtick) 単体や未閉の code span が `<p>` 内に literal として現れるケース
- Tailwind `font-mono` + `text-[12px]` でのインライン要素の line-height 不整合

---

## 4. WeekCalendar / MonthCalendar カードスタイル統一

**Decision**: 複数日カード（all-day ストリップ）のスタイルを単日カードに近づける。ただし横スパン表示の制約から完全一致ではなく「時刻なし・タイトルのみ・アイコン付き」の共通スタイルに収束させる。

**単日カードの主要クラス**:
```
w-full text-left px-2 py-1.5 rounded-[6px] text-white border-l-[3px]
transition-opacity hover:opacity-80 shrink-0 min-h-[44px] flex flex-col justify-center
```

**複数日カードの主要クラス（現状）**:
```
flex items-center gap-1 text-[11px] font-semibold text-white
transition-opacity hover:opacity-80 overflow-hidden border-l-[3px] animate-puni
```

**差異と修正方針**:
- `text-[11px]` → `text-[12px]` に合わせる
- padding を `px-2 py-1` に統一
- `rounded-[6px]` を条件付きで適用（週外に伸びるカードは除外）
- 単日カードに `animate-puni` を追加

---

## 5. DateInput コンポーネント設計

**Decision**: `DateTimeInput` と同スタイルの `DateInput` コンポーネントを新規作成する。

**インターフェース**:
```typescript
interface DateInputProps {
  label: string;
  value: string; // "yyyy-MM-dd" 形式
  onChange: (value: string) => void;
  min?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}
```

**差異**:
- `DateTimeInput`: `type="datetime-local"`, `Date | null` 型
- `DateInput`: `type="date"`, `string` 型（TaskDetailModal の既存ロジックと互換）
