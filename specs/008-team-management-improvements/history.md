# 008-team-management-improvements 履歴

## 変更の概要

- ソロチームのオペレーターが脱退できない不具合を修正し、必要時は自動削除されるようにした。
- チーム管理画面で全ロールに退出 UI を提供した。
- サイドバーのアクティブ判定を最長一致へ変更し、 settings と profile の多重ハイライトを解消した。

## 正本参照先

- [docs/仕様・計画/team/README.md](../../docs/仕様・計画/team/README.md)
- [docs/仕様・計画/ui/README.md](../../docs/仕様・計画/ui/README.md)

## 関連スプリント

- [../003-schedule-ui-improvements/history.md](../003-schedule-ui-improvements/history.md): 複数チーム所属の前段
- [../007-user-management-fixes/history.md](../007-user-management-fixes/history.md): ロール体系の前段修正
- [../001-risukeru-gg-app/history.md](../001-risukeru-gg-app/history.md): チーム基本要件の起点

## 変更の理由

- ソロチームのオペレーターが脱退できない挙動は、実際のチーム運用を阻害していた。
- 退出 UI が非オペレーターに見えないと、画面上の操作可能性が不足した。
- サイドバーの前方一致判定では、関連パスが複数同時にアクティブになり、ナビゲーションが不正確だった。

## 変更した仕様の内容

| 観点                   | 変更前                                     | 変更後                                                                          |
| ---------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| ソロチーム脱退         | operator は一律で脱退不可に寄っていた。    | メンバー数が 1 以下なら脱退を許可し、必要に応じてチーム削除する方針へ修正した。 |
| 退出 UI                | 非オペレーターには退出導線が見えなかった。 | 全ロール表示へ変更し、条件に応じたダイアログ分岐を持たせた。                    |
| サイドバー active 判定 | startsWith ベースで複数項目が反応し得た。  | 最長一致で 1 項目だけをアクティブにする方針へ変更した。                         |

## 変更の影響範囲

### 廃止した詳細ファイル

- spec.md
- plan.md
- research.md
- data-model.md
- tasks.md

### 影響した正本仕様ファイル

- [docs/仕様・計画/team/requirements.md](../../docs/仕様・計画/team/requirements.md)
- [docs/仕様・計画/team/flows.md](../../docs/仕様・計画/team/flows.md)
- [docs/仕様・計画/ui/requirements.md](../../docs/仕様・計画/ui/requirements.md)

### 主要な実装影響ファイル

- functions/src/teams/leaveSpecificTeam.ts
- functions/src/teams/leaveTeam.ts
- functions/src/teams/removeTeamMember.ts
- src/components/team/LeaveTeamDialog.tsx
- src/app/(protected)/team/page.tsx
- src/components/layout/Sidebar.tsx

## 補足

- leaveTeam.ts と leaveSpecificTeam.ts は役割が異なるため、このスプリントでは統合対象にしていない。
