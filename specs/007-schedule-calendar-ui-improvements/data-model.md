# Data Model: スケジュール管理カレンダー UI 改善

## 変更なし

本フィーチャーは純粋な UI 改修であり、Firestore のデータスキーマ・型定義に変更はない。

## 参照型（変更なし）

| 型 | ファイル | 使用箇所 |
|---|---|---|
| `ScheduleEntry` | `src/types/entities.ts` | MonthCalendar, ScheduleDetailModal |
| `ScheduleCategory` | `src/types/entities.ts` | MonthCalendar, ScheduleDetailModal |

## 新規 UI コンポーネント型

### `Textarea` Props（`src/components/ui/Textarea.tsx`）

```typescript
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}
```

`Input.tsx` と同一パターン。`forwardRef` 対応。
