# Implementation Plan: スケジュール管理カレンダー UI 改善

**Branch**: `007-schedule-calendar-ui-improvements` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/007-schedule-calendar-ui-improvements/spec.md`

## Summary

スケジュール管理画面（MonthCalendar）・詳細モーダル（ScheduleDetailModal）・スケジュールページ（page.tsx）・DateTimeInput に対し、12件の表示改善と修正を実施する。主な変更は (1) カレンダーヘッダー統合と領域拡大、(2) 予定カードの表示改善（フォント・余白・オーバーフロー表示）、(3) 詳細モーダルのドラッグ/リサイズ対応、(4) ブラウザ互換性修正。外部ライブラリ追加なし・データモデル変更なし。

## Technical Context

**Language/Version**: TypeScript 5, React 18, Next.js 14 (App Router)
**Primary Dependencies**: Tailwind CSS 4, date-fns, react-markdown（既存）
**Storage**: N/A（UI 改修のみ、Firestore スキーマ変更なし）
**Testing**: Vitest（ユニット）/ Playwright（E2E）
**Target Platform**: Web browser（Chrome / Edge / Firefox）、レスポンシブ（md=768px ブレーク）
**Project Type**: Web application
**Performance Goals**: 60fps アニメーション維持
**Constraints**: 外部ライブラリ追加なし、TypeScript strict、コメント日本語

## Constitution Check

| 原則 | 評価 | 備考 |
|------|------|------|
| I. シンプルさ優先 | ✅ PASS | ドラッグ/リサイズはマウスイベントのみの独自実装。新規抽象化はTextareaコンポーネント（Input.tsxパターン踏襲）のみ |
| II. TypeScript型安全 | ✅ PASS | any禁止・全Props明示的型注釈を維持 |
| III. テスト方針 | ✅ PASS | UIコンポーネントの変更のみ→ユニットテスト不要。E2Eのscheduleフローは既存テストで担保 |
| IV. Firebase・セキュリティ | ✅ PASS | Firestore/Security Rules への影響なし |
| V. 日本語コメント | ✅ PASS | 全コメント日本語で記述 |

**Gate**: 全原則 PASS — Phase 0 研究に進む。

## Project Structure

### Documentation (this feature)

```text
specs/007-schedule-calendar-ui-improvements/
├── plan.md              # このファイル
├── research.md          # Phase 0 調査結果
├── data-model.md        # Phase 1 データモデル（変更なし確認）
└── tasks.md             # Phase 2 タスク（/speckit-tasks で生成）
```

### Source Code (変更対象)

```text
src/
├── app/(protected)/schedule/
│   └── page.tsx                    # C-1: ヘッダーボタン削除
├── components/
│   ├── calendar/
│   │   ├── MonthCalendar.tsx       # C-2,C-3,C-4,C-5 / F-1,F-3,F-4,F-5
│   │   └── ScheduleDetailModal.tsx # C-6,C-7 / F-2
│   └── ui/
│       └── Textarea.tsx            # C-6: 新規作成（Input.tsxパターン）
└── components/ui/
    └── DateTimeInput.tsx           # F-2: date+time 分割またはlang属性追加
```

## 変更詳細マップ

### C-1: ヘッダーボタン削除（`page.tsx`）

`schedule/page.tsx` 99–111行: `<TopBar>` 内の `canEdit && <button>` ブロックを削除。
`setShowCreate`・`handleCreateSchedule` は `onDateClick` で引き続き使用されるため残す。

### C-2/C-3: 曜日ヘッダー統合・高さ削減（`MonthCalendar.tsx`）

- `page.tsx` のナビバーから `border-b` を除去し、月表示時に曜日ヘッダーと視覚的に連続
- 曜日ヘッダー行の `py-2` → `py-1`（高さ削減）
- `DATE_H = 26` → `DATE_H = 20`（日付番号エリア削減）
- ナビバー `py-1 md:py-1.5` → `py-0.5 md:py-1`

### C-4: フォントサイズ拡大（`MonthCalendar.tsx`）

- `EVENT_H = 22` → `EVENT_H = 24`
- 単日カード: `text-[10px]` → `text-[12px]`
- 複数日バー タイトル: `text-[11px]` → `text-[12px]`
- 複数日バー 時刻/日付: `text-[9px]` → `text-[10px]`（F-3 と同時変更）

### C-5: テキスト左揃え（`MonthCalendar.tsx`）

複数日バーの `<span className="flex-1 text-center ...">` → `text-left`

### C-6: 説明欄プレビュー削除（`Textarea.tsx` + `ScheduleDetailModal.tsx`）

**新規**: `src/components/ui/Textarea.tsx`（`Input.tsx` と同パターン、`forwardRef`・label/error/hint対応）

**ScheduleDetailModal.tsx**:
- `MarkdownEditor` import 削除
- `Textarea` import 追加
- 編集時: `<Textarea value={description} onChange={...} rows={4} maxLength={1000} />`
- 閲覧時: `<p className="text-[14px] text-text/80 whitespace-pre-wrap leading-relaxed">{description || <span className="italic text-muted/50">内容なし</span>}</p>`
- `editingDesc` ドラフトフィールドは機能的に使用継続（互換性維持）

### C-7: ドラッグ＆リサイズ（`ScheduleDetailModal.tsx`）

- コンポーネントを `absolute inset-0 flex items-center justify-center` から `fixed` + `position: {x, y}` state に変更
- `useState<{x: number; y: number}>` / `useState<{width: number; height: number}>` を追加
- 初期位置: `useMemo` で `(window.innerWidth - 720) / 2`, `(window.innerHeight - 650) / 2`
- ヘッダーに `onPointerDown` でドラッグ開始
- 右下コーナーに `12x12px` リサイズハンドル追加（`cursor-se-resize`）
- オーバーレイ（`fixed inset-0 bg-black/70`）は別 `div` でバックドロップ
- 最小サイズ: width=480px, height=400px

### F-1: 複数日カード余白（`MonthCalendar.tsx`）

```typescript
const marginLeft = !startsBefore ? 4 : 0;
const marginRight = !endsAfter ? 4 : 0;
// style:
left: `calc(${leftPct} + ${marginLeft}px)`
width: `calc(${widthPct} - ${marginLeft + marginRight}px)`
```

### F-2: Edge 日付表示修正（`DateTimeInput.tsx`）

`<input type="datetime-local">` を日付（`type="date"`）と時刻（`type="time"`）の2 input に分割:
- label 行、date input、time input の縦並び
- `toLocalString` を `toDateString` / `toTimeString` に分割
- onChange: 日付文字列 + 時刻文字列 → `new Date(dateStr + 'T' + timeStr)` に合成

### F-3: カード日程非表示（`MonthCalendar.tsx`）

複数日バー: `format(s.startAt, 'MM/dd HH:mm')` → `format(s.startAt, 'HH:mm')`（`allDay` の場合は省略）

### F-4: +n件 オーバーフロー（`MonthCalendar.tsx`）

1. `eventCols` を `colEnd - colStart` 降順でソートしてから `assignTracks` へ渡す
2. 各 col (0-6) に対して `track >= MAX_TRACKS` のイベント数をカウント: `overflowByCol`
3. 日付セル内（単日イベントリストの下または `topOffset` 直下）に:
   ```tsx
   {overflowByCol[colIndex] > 0 && (
     <div className="text-[10px] text-muted px-1.5 py-0.5 font-semibold">
       +{overflowByCol[colIndex]}件
     </div>
   )}
   ```

### F-5: ツールチップ修正（`MonthCalendar.tsx`）

- `PANEL_W = 240` → `PANEL_W = 360`
- `approxItemH = 32` → `approxItemH = 44`
- Y 位置計算:
  ```typescript
  const isLowerHalf = tooltip.y > window.innerHeight / 2;
  const y = isLowerHalf ? tooltip.y - panelH - 8 : tooltip.y;
  ```
- X 位置: `Math.max(8, Math.min(tooltip.x, window.innerWidth - PANEL_W - 8))`

## Complexity Tracking

変更数が多いが、全変更は既存ファイルへの局所的な修正であり、新規抽象化は `Textarea.tsx` 1ファイルのみ。Constitution 違反なし。
