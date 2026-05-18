# Research: スケジュール・UI改善

## 1. マルチデイイベント表示

**Decision**: `isSameDay` フィルタを `s.startAt <= dayEnd && s.endAt >= dayStart` の範囲判定に変更する。

**Rationale**: カスタムカレンダー実装で date-fns の `startOfDay` / `endOfDay` を使った範囲比較が最もシンプルかつ正確。

**Alternatives considered**: react-big-calendar への移行 → 既存のカスタム実装が十分機能しており、置き換えコストが高い。

---

## 2. マークダウン対応

**Decision**: `react-markdown` + `remark-gfm` を追加。カスタム `MarkdownEditor` コンポーネントで編集/プレビュー切替 UI を提供。

**Rationale**:
- `react-markdown` は Next.js / React エコシステムで最も採用実績が多い
- XSS 対策が内蔵されており独自パーサー不要
- `remark-gfm` でテーブル・チェックリスト・取り消し線などの GFM 記法をサポート

**Alternatives considered**:
- `@uiw/react-md-editor` — 機能豊富だが重量級でシンプルさ原則に反する
- 独自パース — XSS リスクがあり禁止
- `marked` のみ — React コンポーネントとしての統合が煩雑

---

## 3. フォームドラフト保存

**Decision**: `localStorage` にシリアライズして保存。Zustand ストアには含めない。

**Rationale**:
- ページリロードやブラウザ再起動後も保持される
- `Date` 型は ISO 文字列にシリアライズして保存
- Zustand の `persist` ミドルウェアはアプリ全体の状態管理に使うもので、一時的なフォームドラフトには過剰

**Alternatives considered**:
- `sessionStorage` — タブを閉じると消えるため NG（要件は「次回開いた際に残っている」）
- Firestore への下書き保存 — 過剰設計、オフライン時に使えない

---

## 4. 統一日付入力コンポーネント

**Decision**: HTML ネイティブ `<input type="datetime-local">` をラップした `DateTimeInput` コンポーネントを新規作成。

**Rationale**:
- 既存コードで使用中の方式を踏襲（破壊的変更なし）
- ラッパー化により `Date ↔ string` 変換・タイムゾーン処理・スタイルを一箇所に集約
- 追加ライブラリ不要

**Alternatives considered**:
- `react-datepicker` — UI は良いが追加依存が生まれる
- `shadcn/ui Calendar + Popover` — Tailwind 4 との互換性確認が必要、工数増

---

## 5. チーム参加機能

**Decision**: `team/page.tsx` の既存「チームに参加」フォームを拡張し、既所属ユーザーも利用可能にする。

**Rationale**:
- 現在のコードで solo ユーザー向けにチーム参加フォームが実装済み
- 条件分岐を調整し、既所属ユーザーにも「別のチームに参加する」セクションを表示するだけ
- Firestore の `teams/{teamId}/members` にメンバー追加する `joinTeamById` 関数を追加

**Alternatives considered**:
- settings/page.tsx に追加 — team 管理機能は team/page.tsx に集約されているため不適切
