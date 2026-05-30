# 004-schedule-task-fixes 履歴

## 変更の概要

- スケジュールとタスク管理にまたがる運用上の不整合を修正した。
- 終日フラグ、終了時刻補完、コメント保存方法、カード表示の補正を行った。
- コメント周辺を localStorage ベースから Firestore ベースへ寄せる方針へ変更した。

## 正本参照先

- [docs/仕様・計画/schedule/README.md](../../docs/仕様・計画/schedule/README.md)
- [docs/仕様・計画/task/README.md](../../docs/仕様・計画/task/README.md)

## 関連スプリント

- [../001-risukeru-gg-app/history.md](../001-risukeru-gg-app/history.md): スケジュールとタスクの基本要件
- [../002-ui-redesign/history.md](../002-ui-redesign/history.md): タスク UI の前段改善
- [../003-schedule-ui-improvements/history.md](../003-schedule-ui-improvements/history.md): スケジュール入力改善の前段

## 変更の理由

- 終日入力や終了時刻補完などの細部が、日常運用のたびに手戻りや誤入力を生んでいた。
- コメントを localStorage に依存したままでは、共有運用や返信構造との整合が取れなかった。
- UI 側の見た目だけでなく、保存方法とデータ構造の修正が必要だった。

## 変更した仕様の内容

| 観点         | 変更前                                       | 変更後                                                       |
| ------------ | -------------------------------------------- | ------------------------------------------------------------ |
| 終日入力     | 終日扱いと終了時刻補完が不安定だった。       | allDay と終了時刻補完の扱いを明確化した。                    |
| コメント保存 | localStorage ベースの扱いが残っていた。      | Firestore ベースへ寄せ、 parentId を持つ返信構造へ統一した。 |
| タスク表示   | カード表示や細部の UI に不整合が残っていた。 | 運用時に誤読しにくいカード表示へ補正した。                   |

## 変更の影響範囲

### 廃止した詳細ファイル

- spec.md
- plan.md
- research.md
- data-model.md
- tasks.md

### 影響した正本仕様ファイル

- [docs/仕様・計画/schedule/requirements.md](../../docs/仕様・計画/schedule/requirements.md)
- [docs/仕様・計画/schedule/model.md](../../docs/仕様・計画/schedule/model.md)
- [docs/仕様・計画/task/requirements.md](../../docs/仕様・計画/task/requirements.md)
- [docs/仕様・計画/task/model.md](../../docs/仕様・計画/task/model.md)
- [docs/仕様・計画/collab/model.md](../../docs/仕様・計画/collab/model.md)

### 主要な実装影響ファイル

- src/app/(protected)/schedule/\*
- src/app/(protected)/tasks/\*
- src/components/calendar/\*
- src/components/kanban/\*
- src/lib/repositories/collab\*

## 補足

- LocalReply などのローカル専用実装は、このスプリント以降の正本では前提にしない。
