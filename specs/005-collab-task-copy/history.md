# 005-collab-task-copy 履歴

## 変更の概要

- コラボセッションの再調整とコピー新規作成を、利用者が迷わず使える形へ整理した。
- 004 で入った改善を、ユーザー操作として完結できるように補足した。

## 正本参照先

- [docs/仕様・計画/collab/README.md](../../docs/仕様・計画/collab/README.md)

## 関連スプリント

- [../004-collab-improvements/history.md](../004-collab-improvements/history.md): 再調整機能の本体
- [../006-collab-ui-redesign/history.md](../006-collab-ui-redesign/history.md): コラボ UI の後続刷新

## 変更の理由

- 再調整や類似セッション作成が毎回ゼロからだと、コラボ運用の実務コストが高かった。
- 004 のバックエンド改善だけでは、利用者が実際に再利用しやすい導線としては不十分だった。

## 変更した仕様の内容

| 観点           | 変更前                                     | 変更後                                             |
| -------------- | ------------------------------------------ | -------------------------------------------------- |
| 再調整         | 既存セッションを再利用する導線が弱かった。 | reopen を利用した再調整フローを明確化した。        |
| コピー新規作成 | 類似セッションを複製する手順が曖昧だった。 | duplicate を使ったコピー新規作成の扱いを整理した。 |

## 変更の影響範囲

### 廃止した詳細ファイル

- spec.md
- plan.md
- tasks.md
- checklists/requirements.md

### 影響した正本仕様ファイル

- [docs/仕様・計画/collab/requirements.md](../../docs/仕様・計画/collab/requirements.md)
- [docs/仕様・計画/collab/flows.md](../../docs/仕様・計画/collab/flows.md)

### 主要な実装影響ファイル

- src/app/(protected)/collabs/\*
- src/components/collab/\*
- functions/src/collab/reopenCollabSession.ts

## 補足

- 正本側では 004 と 005 を分けず、collab 改善群として一体で採用している。
