# Research: スケジュール管理画面 UI 改善

## 影響ファイルの確認

| ファイル | 役割 | 変更対象 |
|---|---|---|
| `src/app/(protected)/schedule/page.tsx` | スケジュールページ | ヘッダーボタン削除、ナビバー高さ調整 |
| `src/components/calendar/MonthCalendar.tsx` | 月カレンダー | ほぼ全改修対象 |
| `src/components/calendar/ScheduleDetailModal.tsx` | スケジュール詳細モーダル | 説明欄・ドラッグ対応 |
| `src/components/ui/DateTimeInput.tsx` | 日時入力 | Edge 互換性修正 |

---

## 各課題の調査結果

### 1. 「予定を追加」ボタン削除

- Decision: `page.tsx` 100–110行目の `<TopBar>` 子要素の `<button>` を削除するのみ
- `setShowCreate` は日付クリック（`onDateClick`）でも呼ばれているため、関連 state・handler は残す

---

### 2. タイトル欄と曜日表示欄の結合・高さ削減

- 現状: ナビバー（`py-1 md:py-1.5`）→ `border-b` → 曜日ヘッダー（`py-2`）で視覚的に2段に分離
- Decision: 月表示時、ナビバーから `border-b` を除去し、曜日ヘッダーと同じ `bg-card` で繋げて1つのブロックに見せる。ナビバーの縦 padding を `py-0.5` に削減、曜日ヘッダーの `py-2` を `py-1` に削減。
- 週表示では既存の `WeekCalendar` ヘッダー構造はそのまま維持

---

### 3. 予定カードのフォントサイズ拡大

- 単日カード: `text-[10px]` → `text-[12px]`
- 複数日バー: タイトル `text-[11px]` → `text-[12px]`、時刻表示 `text-[9px]` → `text-[11px]`
- `EVENT_H = 22px` でフォントが大きくなるとオーバーフローする可能性があるため `EVENT_H = 24px` に拡大

---

### 4. 複数日カードのテキスト左揃え

- `MonthCalendar.tsx` 250行目: タイトルspanが `text-center` → `text-left` に変更
- 全体レイアウトを `flex items-center` から再検討し、左揃えでアイコン→時刻→タイトルの順で並べる

---

### 5. 説明欄のプレビュー削除

- Decision: `ScheduleDetailModal.tsx` の `MarkdownEditor` を標準 `textarea` に置き換え
- 読み取り時: `whitespace-pre-wrap` の `div` または `p` タグで表示
- 編集時: 素の `<textarea>` (クラスは既存 `MarkdownEditor` 内と同じスタイル)
- ドラフト保存の `ScheduleDetailDraft.editingDesc` も不要になるが、互換のため残す

---

### 6. 詳細モーダルのドラッグ・リサイズ対応

- Decision: CSS `resize: both` は `overflow: hidden` と競合するため使用不可。代わりに:
  - **ドラッグ**: `mousedown` on ヘッダー → `mousemove` on window → `mouseup` で `transform: translate(dx, dy)` 更新
  - **リサイズ**: 右下コーナーに `resize-handle` を設置し同様の mouse event で width/height 更新
- モーダル内 `overflow-y-auto` は body 部のみ適用し、`max-h-[90vh]` → `height` で実際の高さを管理
- 初期サイズ: width=720px, height=600px（最小: 480x400）
- 位置は `fixed` + `top`/`left` で管理（現在は `flex items-center justify-center` のため、`fixed` に変更）
- overlay クリックで閉じる動作は維持（ただしドラッグ中は閉じない）

---

### 7. 複数日カードの余白修正

- 問題: 複数日バーの `left = colStart/7 * 100%` は週境界セルと隙間なく接する
- 単日カードは `px-1`（4px）のコンテナ内に配置されているため余白あり
- Decision: 多日バーの left/width 計算にオフセットを加える
  - `colStart` が 0（週の最初の列）かつ `!startsBefore`：left に `4px` 加算、width を `4px` 減算
  - `colEnd` が 6（週の最後の列）かつ `!endsAfter`：width を `4px` 減算
  - CSS `calc()` で表現: `left: calc(${leftPct} + ${startMargin}px)`, `width: calc(${widthPct} - ${widthAdj}px)`

---

### 8. Edge での日付コンポーネント表示の互換性修正

- 問題: `DateTimeInput.tsx` の `<input type="datetime-local">` はブラウザが UI 表示フォーマットを制御する
  - Chrome: `年/月/日 --:--`、Edge: `yyyy/MM/dd --:--` などブラウザ依存
- Decision: `datetime-local` を `date` + `time` の2つの独立した input に分割
  - 日付: `<input type="date">` → 値は `YYYY-MM-DD`
  - 時刻: `<input type="time">` → 値は `HH:mm`
  - onChangeで両方を合成して `Date` オブジェクトに変換
- Edge/Chrome で `type="date"` の表示フォーマットは依然ブラウザ依存だが、`datetime-local` より一貫性が高い
- **注意**: `allDay` モードでは時刻 input を非表示

---

### 9. 予定カードに日程表示しない（時間とタイトルのみ）

- 複数日バー: `format(s.startAt, 'MM/dd HH:mm')` → `format(s.startAt, 'HH:mm')` または `allDay` の場合は時刻非表示
- 単日カード: 既に `HH:mm` のみ表示 → そのまま

---

### 10. 複数日カード「+n件」表示

- 問題: `MAX_TRACKS = 2` で超過分は `return null` → ユーザーに存在が分からない
- Decision:
  - `WeekRow` 内で各日ごとに「track >= MAX_TRACKS のイベント数」を集計
  - 日付セルの下部（`singleDaySchedules` の下）に `+n件` テキストを表示
  - 対象は「この週の複数日イベントのうち、その日にかかっていてトラックがオーバーした件数」
- 複数日の並べ替え: `assignTracks` に渡す前に期間（長い順）でソート
  - 期間 = `endAt - startAt` 降順 → `colStart` 昇順のtie-break

---

### 11. 日付ホバーポップアップの修正

- 問題: 現在 `PANEL_W = 240px`、画面下端オーバーフロー対策は `Math.min` のみ
- Decision:
  - パネル幅を `360px`（1.5倍）に拡大
  - アイテム高さの推定を `approxItemH = 44px` に調整（幅広になるため折り返し減少）
  - 位置: `tooltip.y > window.innerHeight / 2` のとき、パネルを tooltip の上方に展開（`top = tooltip.y - panelH`）
  - 左側はみ出し対策も追加: `x = Math.max(8, Math.min(tooltip.x, window.innerWidth - PANEL_W - 8))`
