# Feature Spec: スケジュール・タスク修正＆終日フラグ対応

**Branch**: `004-schedule-task-fixes` | **Date**: 2026-05-19

## Overview

配信者向けスケジュール・タスク管理アプリ RisukeruGG において、スケジュール画面の終日フラグ対応と複数の UI バグ修正を行う。

---

## 仕様変更点

### 1. 終日フラグ対応（allDay flag）

**現状**: 終日予定は開始を `00:00`、終了を `23:59` に設定するだけで保存されており、`allDay` フラグが Firestore に保存されない（`toSchedule()` が読み取らない）。

**変更後**:
- 「終日」ボタン押下時に `allDay: true` をフォーム状態に持ち、送信データに含める
- `toSchedule()` が `allDay` フィールドを Firestore から読み取る
- `allDay: true` の予定は当該日付のカレンダーカラム最上部（または all-day ストリップ）に表示する

**startAt / endAt の定義（確定）**:
- `allDay: true` 時は `startAt = endAt = 選択日付の 00:00:00` に統一する
- 時刻情報を持たせず日付のみを表現するため、両フィールドを同一日の 00:00 に揃える
- 表示時は `allDay` フラグで判定し、時刻を表示しない

## Clarifications

### Session 2026-05-19
- Q: `allDay: true` 時の `startAt` / `endAt` の定義は？ → A: 両方とも選択日付の `00:00:00` に統一（日付のみ保持、時刻情報なし）
- Q: 「treeの子供のみコメントが消えている」とは何を指すか？ → A: コメント返信（localReplies）が localStorage にしか保存されておらず消える。返信を Firestore（DB）に保存する設計に変更する。`CollabComment` に `parentId?: string` を追加。

---

## 修正点

### 2. 複数日予定カードの表示統一

**現状**: WeekCalendar の all-day ストリップ内の複数日カードは `text-[11px]`・1行レイアウト（時刻なし）で表示される。単日カードは `text-[12px]`・2行レイアウト（時刻＋タイトル）と異なる。

**修正後**: 複数日カードのスタイルを単日カードの形式に揃える（パディング・角丸・レイアウト）。

### 3. アニメーション統一

**現状**: WeekCalendar の multi-day ストリップカードには `animate-puni` クラスが付いているが、単日カードには付いていない。

**修正後**: 単日カードにも `animate-puni` クラスを追加。

### 4. タスク詳細画面の日程入力コンポーネント統一

**現状**: `TaskDetailModal.tsx` の締切日入力が `<input type="date">` で実装されており、他の画面の `DateTimeInput` コンポーネントと見た目・スタイルが異なる。

**修正後**: 日付専用 `DateInput` コンポーネント（`DateTimeInput` と同スタイル・`type="date"`）を新規作成し使用する。

### 5. Markdown コードブロックのバッククォート問題

**現状**: `MarkdownEditor` のプレビューモードで、コードブロック（バッククォート）を含む markdown を入力した際に、バッククォート文字が上部に積み上がって表示される。

**調査対象**: `MarkdownEditor.tsx` の `pre` / `code` コンポーネント実装。

### 6. コメント消失バグ

**現状**: タスク詳細ポップアップでコメントを入力後、ポップアップを閉じて再度開くと、一部のコメントが消えている。

**根本原因と修正方針（確定）**:
- 「treeの子供」= コメントへの返信（`localReplies`）を指す
- 現状: 返信は localStorage にのみ保存されており、ポップアップを閉じると消える
- **修正方針: 返信を Firestore（DB）に保存するよう変更する**
- `CollabComment` に `parentId?: string` フィールドを追加し、返信も Firestore の `comments` 配列に保存する
- `localReplies` の localStorage 実装は廃止し、Firestore の親子構造に統一する
- 表示時は `parentId` の有無でルートコメントと返信を区別してツリー表示する

---

## スコープ外

- Google カレンダー連携の allDay 対応（`source: 'google'` イベント）
- 新機能の E2E テスト追加（既存テストの破損修正のみ）
