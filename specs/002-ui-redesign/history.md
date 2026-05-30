# 002-ui-redesign 履歴

## 変更の概要

- タスク管理 UI を中心に、詳細モーダル、設定タブ、フル幅レイアウトなどの体験改善を行った。
- サイドバーと通知ドロップダウンを含む共通 UI 導線を整理し、画面横断のデザインルールを更新した。
- タスクカテゴリ管理を enum から Firestore 参照へ移行する前提を導入した。

## 正本参照先

- [docs/仕様・計画/task/README.md](../../docs/仕様・計画/task/README.md)
- [docs/仕様・計画/ui/README.md](../../docs/仕様・計画/ui/README.md)

## 採用状態

- 一部採用
- タスク UI と共通ナビゲーションの基本方針は採用されたが、後続の修正は 004-s と 008 で上書きされた。

## 関連スプリント

- [../001-risukeru-gg-app/history.md](../001-risukeru-gg-app/history.md): UI 刷新の起点
- [../004-schedule-task-fixes/history.md](../004-schedule-task-fixes/history.md): タスクとコメントの後続修正

## 変更の理由

- MVP ベースの UI だけでは、タスク管理の情報量に対して視認性と操作効率が不足していた。
- タスク詳細、カテゴリ設定、通知導線を分散したままにすると、ユーザーの作業切り替えコストが高かった。
- タスクカテゴリを固定 enum のまま維持すると、運用側での拡張性が不足していた。

## 変更した仕様の内容

| 観点                 | 変更前                                   | 変更後                                                                         |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| タスク画面レイアウト | MVP の基本 UI が中心だった。             | フル幅レイアウト、詳細モーダル、設定タブを含む運用向け UI に整理した。         |
| カテゴリ管理         | タスクカテゴリは固定 enum 前提だった。   | categoryId を Firestore で管理する拡張方針へ変更した。                         |
| 共通ナビゲーション   | サイドバーや通知導線の責務が曖昧だった。 | サイドバーと通知ドロップダウンの基本要件を ui カテゴリへ集約する前提を作った。 |

## 変更の影響範囲

### 廃止した詳細ファイル

- spec.md
- plan.md
- research.md
- data-model.md
- quickstart.md
- tasks.md

### 影響した正本仕様ファイル

- [docs/仕様・計画/task/requirements.md](../../docs/仕様・計画/task/requirements.md)
- [docs/仕様・計画/task/model.md](../../docs/仕様・計画/task/model.md)
- [docs/仕様・計画/ui/requirements.md](../../docs/仕様・計画/ui/requirements.md)
- [docs/仕様・計画/ui/model.md](../../docs/仕様・計画/ui/model.md)

### 主要な実装影響ファイル

- src/app/(protected)/tasks/page.tsx
- src/components/kanban/\*
- src/components/layout/Sidebar.tsx
- src/components/notifications/\*

## 補足

- このスプリントで入った task と ui の責務整理は、後続スプリントで docs 側へ統合された。
