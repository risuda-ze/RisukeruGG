# 007-schedule-calendar-ui-improvements 履歴

## 変更の概要

- スケジュール画面のカレンダー UI と詳細モーダルを中心に、視認性と編集操作を改善した。
- ヘッダー統合、高さ削減、予定カードの文字サイズ見直し、ドラッグ・リサイズ対応を実施した。
- DateTimeInput のブラウザ互換性問題を回避するため、日付と時刻入力を分割した。

## 正本参照先

- [docs/仕様・計画/schedule/README.md](../../docs/仕様・計画/schedule/README.md)
- [docs/仕様・計画/ui/README.md](../../docs/仕様・計画/ui/README.md)

## 関連スプリント

- [../003-schedule-ui-improvements/history.md](../003-schedule-ui-improvements/history.md): カレンダー操作改善の前段
- [../004-schedule-task-fixes/history.md](../004-schedule-task-fixes/history.md): 終日入力と補完の前段修正
- [../001-risukeru-gg-app/history.md](../001-risukeru-gg-app/history.md): スケジュール基本要件の起点

## 変更の理由

- カレンダー上の文字サイズと余白が不足し、複数予定の判読性が低かった。
- 詳細モーダルが固定的で、長い内容の確認や編集時に扱いづらかった。
- datetime-local に依存した入力では一部ブラウザで互換性問題が残っていた。

## 変更した仕様の内容

| 観点           | 変更前                                               | 変更後                                                               |
| -------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| カレンダー表示 | ヘッダーやカードの密度が高く、視認性が不足していた。 | ナビバー統合、高さ削減、フォントと余白の調整で読みやすさを改善した。 |
| 詳細モーダル   | 固定配置中心で柔軟性が低かった。                     | ドラッグ・リサイズ対応の詳細モーダルへ改善した。                     |
| 日時入力       | datetime-local に依存していた。                      | date と time の分割入力へ変更し、互換性を高めた。                    |
| 説明欄         | MarkdownEditor 前提が重かった。                      | 標準 textarea を前提に簡素化した。                                   |

## 変更の影響範囲

### 廃止した詳細ファイル

- plan.md
- research.md
- data-model.md
- tasks.md

### 影響した正本仕様ファイル

- [docs/仕様・計画/schedule/requirements.md](../../docs/仕様・計画/schedule/requirements.md)
- [docs/仕様・計画/schedule/flows.md](../../docs/仕様・計画/schedule/flows.md)
- [docs/仕様・計画/ui/requirements.md](../../docs/仕様・計画/ui/requirements.md)

### 主要な実装影響ファイル

- src/app/(protected)/schedule/page.tsx
- src/components/calendar/MonthCalendar.tsx
- src/components/calendar/ScheduleDetailModal.tsx
- src/components/ui/DateTimeInput.tsx
- src/components/ui/Textarea.tsx

## 補足

- このスプリントには spec.md がなく、plan と設計メモが事実上の仕様ソースだった。
