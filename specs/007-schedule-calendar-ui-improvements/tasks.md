# Tasks: スケジュール管理カレンダー UI 改善

**Input**: Design documents from `/specs/007-schedule-calendar-ui-improvements/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Organization**: 4 ユーザーストーリー × ファイル別フェーズ構成。テストはスペック上不要のため含まない。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 別ファイル・依存なしで並列実行可能
- **[Story]**: 対応するユーザーストーリー（US1〜US4）

---

## Phase 1: Setup（基盤コンポーネント）

**Purpose**: 後続タスクが依存する新規コンポーネント・修正コンポーネントを先行作成

- [x] T001 [P] `Textarea` コンポーネントを `src/components/ui/Textarea.tsx` に新規作成（`Input.tsx` と同パターン: `forwardRef`・label/error/hint 対応・`rows` prop 対応）
- [x] T002 [P] `DateTimeInput` を `type="date"` + `type="time"` の 2 input 構成に分割（`src/components/ui/DateTimeInput.tsx`）。`allDay` 時は time input 非表示。onChange で日付文字列+時刻文字列→`Date` 合成

**Checkpoint**: T001・T002 完了後、US4 フェーズの実装が可能になる

---

## Phase 2: Foundational

本フィーチャーはデータモデル変更なし・インフラ変更なし。Phase 1 で Setup は完了。

---

## Phase 3: US1 — ヘッダー・ナビバー改善（Priority: P1）🎯

**Goal**: スケジュールページのヘッダーをシンプル化し、カレンダー表示領域を拡大する

**Independent Test**: スケジュールページで「予定を追加」ボタンが消えていること。月表示時にナビバーと曜日ヘッダーが視覚的に連続していること。

- [x] T00X [US1] `schedule/page.tsx` の TopBar 内 `canEdit && <button>予定を追加</button>` ブロックを削除（`src/app/(protected)/schedule/page.tsx` 99〜111行）
- [x] T00X [US1] `schedule/page.tsx` のナビバー `<div>` から `border-b` クラスを除去してカレンダーナビバーと曜日ヘッダーを視覚的に連続させる（`src/app/(protected)/schedule/page.tsx`）

**Checkpoint**: US1 完了 — ヘッダーボタン削除・ナビバー統合が確認できる

---

## Phase 4: US2 — MonthCalendar レイアウト改善（Priority: P2）

**Goal**: 曜日ヘッダーの高さを削減してカレンダー領域を拡大し、ホバーツールチップを使いやすく改善する

**Independent Test**: 曜日ヘッダーがコンパクトになりカレンダーグリッドが広くなっていること。ホバーツールチップが画面上半分では下方向、下半分では上方向に展開されること。

- [x] T00X [US2] `MonthCalendar.tsx` の定数を更新: `DATE_H = 26 → 20`、曜日ヘッダー行の `py-2 → py-1`（`src/components/calendar/MonthCalendar.tsx`）
- [x] T00X [US2] `DayTooltipPanel` の `PANEL_W` を `240 → 360` に拡大し `approxItemH` を `32 → 44` に更新（`src/components/calendar/MonthCalendar.tsx`）
- [x] T00X [US2] `DayTooltipPanel` の Y 位置計算を修正: `tooltip.y > window.innerHeight / 2` の場合は `top = tooltip.y - panelH - 8`（上方向展開）、そうでなければ `top = tooltip.y`。X のはみ出し対策に `Math.max(8, Math.min(...))` を追加（`src/components/calendar/MonthCalendar.tsx`）

**Checkpoint**: US2 完了 — コンパクトヘッダー・改善ツールチップが確認できる

---

## Phase 5: US3 — MonthCalendar 予定カード改善（Priority: P2）

**Goal**: 予定カードの表示を改善する（フォント拡大・余白統一・日程非表示・+n件オーバーフロー）

**Independent Test**: 単日カードが `text-[12px]` で表示されること。複数日バーのタイトルが左揃えになること。「MM/dd」が表示されず「HH:mm」のみ表示されること。3件以上の複数日イベントがある日に「+n件」が表示されること。

- [x] T00X [US3] 単日イベントカードのフォントサイズを `text-[10px] → text-[12px]` に拡大（`src/components/calendar/MonthCalendar.tsx` の daySingles button）
- [x] T00X [US3] `EVENT_H = 22 → 24` に拡大。複数日イベントバーのタイトルフォント `text-[11px] → text-[12px]`、時刻フォント `text-[9px] → text-[10px]`（`src/components/calendar/MonthCalendar.tsx`）
- [x] T010 [US3] 複数日イベントバーのタイトル span を `text-center → text-left` に変更（`src/components/calendar/MonthCalendar.tsx` 250行付近）
- [x] T011 [US3] 複数日バーの余白を単日カードに統一: `left: calc(${leftPct} + ${marginLeft}px)`・`width: calc(${widthPct} - ${marginLeft + marginRight}px)` で実装（`startsBefore`/`endsAfter` に応じて marginLeft/marginRight を 0 or 4px に設定）（`src/components/calendar/MonthCalendar.tsx`）
- [x] T012 [US3] 複数日バーの日付表示を削除: `format(s.startAt, 'MM/dd HH:mm')` → `allDay ? '' : format(s.startAt, 'HH:mm')` に変更（`src/components/calendar/MonthCalendar.tsx`）
- [x] T013 [US3] `WeekRow` 内で複数日イベントを `track assign` 前に期間降順（`colEnd - colStart` 降順）でソート。各 col (0〜6) で `track >= MAX_TRACKS` のイベント数を集計し `overflowByCol` を作成。各日付セル内の単日イベントリスト下部に `overflowByCol[colIndex] > 0` の場合 `+n件` テキストを追加（クリック不可）（`src/components/calendar/MonthCalendar.tsx`）

**Checkpoint**: US3 完了 — カード表示の全改善が確認できる

---

## Phase 6: US4 — ScheduleDetailModal 改善（Priority: P3）

**Goal**: 詳細モーダルの説明欄からプレビュー機能を除去し、ドラッグ＆リサイズ対応にする

**Independent Test**: 説明欄にプレビュー/編集切替ボタンが表示されないこと（Textarea のみ）。モーダルヘッダーをドラッグして移動できること。右下コーナーハンドルでリサイズできること。モバイルでは従来通り固定表示されること。

**依存**: T001（Textarea）、T002（DateTimeInput split）完了後に着手

- [x] T014 [US4] `ScheduleDetailModal.tsx` の `MarkdownEditor` import を削除し `Textarea` import に置き換え。説明編集時を `<Textarea value={description} onChange={setDescription} placeholder="予定の詳細を入力..." maxLength={1000} rows={4} />` に変更（`src/components/calendar/ScheduleDetailModal.tsx`）
- [x] T015 [US4] 説明非編集時の `<MarkdownEditor readOnly>` を `<p className="text-[14px] text-text/80 whitespace-pre-wrap leading-relaxed min-h-[40px]">{description || <span className="italic text-muted/50">内容なし</span>}</p>` に変更（`src/components/calendar/ScheduleDetailModal.tsx`）
- [x] T016 [US4] モーダルの構造をドラッグ対応に変更: `absolute inset-0 flex items-center justify-center` → オーバーレイ用 `fixed inset-0 bg-black/70` div と、`fixed` + `left/top` state で位置管理するモーダル div に分離。`useState<{x: number; y: number}>` を追加し初期値は `{x: (window.innerWidth-720)/2, y: (window.innerHeight-650)/2}`。ヘッダー `<div>` に `onPointerDown` でドラッグ開始・`onPointerMove` で position 更新・`onPointerUp` で終了の実装追加（`src/components/calendar/ScheduleDetailModal.tsx`）
- [x] T017 [US4] モーダル右下コーナーに `w-4 h-4 cursor-se-resize` のリサイズハンドル追加。`useState<{width: number; height: number}>({width: 720, height: 650})` を追加。リサイズハンドルの `onPointerDown` で width/height を更新（最小 width: 480px, height: 400px）（`src/components/calendar/ScheduleDetailModal.tsx`）

**Checkpoint**: US4 完了 — 説明欄の変更・ドラッグ/リサイズが確認できる

---

## Phase 7: Polish & 型チェック

**Purpose**: 全ストーリー完了後の品質確認

- [x] T018 [P] `pnpm typecheck` を実行し TypeScript エラーをゼロにする
- [x] T019 [P] `pnpm lint:fix` を実行し ESLint エラー・警告をゼロにする

---

## Dependencies & Execution Order

### Phase 依存関係

```
Phase 1 (T001, T002) ──→ US4 (T014〜T017) のみブロック
US1 (T003〜T004)     ──→ 依存なし（即時開始可）
US2 (T005〜T007)     ──→ 依存なし（即時開始可）
US3 (T008〜T013)     ──→ US2 完了後推奨（同ファイル）
Polish (T018, T019)  ──→ 全 US 完了後
```

### ユーザーストーリー間依存

- **US1**: 依存なし（page.tsx のみ）
- **US2**: 依存なし（MonthCalendar.tsx レイアウト）
- **US3**: US2 と同ファイルのため US2 完了後に着手推奨
- **US4**: T001（Textarea）+ T002（DateTimeInput）完了が前提

### 並列実行機会

```
# 即時並列開始可能なグループ
T001 (Textarea.tsx)
T002 (DateTimeInput.tsx)
T003 (page.tsx ボタン削除)

# T001/T002 完了後に並列可能
T005〜T007 (MonthCalendar レイアウト) と T014〜T017 (ScheduleDetailModal)

# 順次実行グループ（同ファイル）
T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013
T014 → T015 → T016 → T017
```

---

## Parallel Example

```bash
# 並列グループ 1（即時）
Task T001: src/components/ui/Textarea.tsx を作成
Task T002: src/components/ui/DateTimeInput.tsx を date+time 分割
Task T003: src/app/(protected)/schedule/page.tsx ボタン削除

# 並列グループ 2（T001+T002 完了後）
MonthCalendar 担当: T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013
ScheduleDetailModal 担当: T014 → T015 → T016 → T017
```

---

## Implementation Strategy

### MVP（最優先: US1 + US2 + US3 のカード修正）

1. T001, T002, T003 を並列実行
2. T004 (US1 完了)
3. T005 → T006 → T007 (US2 完了)
4. T008 → T009 → T010 → T011 → T012 → T013 (US3 完了)
5. **STOP & VALIDATE**: カレンダービューの全改善を目視確認
6. T014 → T015 → T016 → T017 (US4 完了)
7. T018, T019 (Polish)

### Incremental Delivery

1. T001+T002+T003 → 基盤完成
2. US1 完了 → ヘッダー改善を確認
3. US2 完了 → レイアウト改善を確認
4. US3 完了 → カード改善を確認（MVPリリース可能ポイント）
5. US4 完了 → モーダル改善を確認
6. Polish → 最終リリース

---

## Notes

- テストはスペック上不要（UIコンポーネント変更のみ）
- T016/T017 はモバイル（タッチ）では無効化不要（mousedown はタッチでは発火しない）
- `window` 参照は `typeof window !== 'undefined'` でガードすること（SSR対応）
- 各タスク完了後に `pnpm dev` で目視確認推奨
