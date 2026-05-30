# 003-schedule-ui-improvements 履歴

## 変更の概要

- スケジュール管理 UI を中心に、週 / 月カレンダー操作、下書き復元、複製新規作成、終日入力周辺の改善方針を整理した。
- 複数チーム所属とアクティブチーム切り替えを導入し、チーム横断運用の前提を追加した。
- スケジュールとチーム管理の境界を見直し、teamIds と currentTeamId を前提にした動作へ寄せた。

## 正本参照先

- [docs/仕様・計画/schedule/README.md](../../docs/仕様・計画/schedule/README.md)
- [docs/仕様・計画/team/README.md](../../docs/仕様・計画/team/README.md)

## 採用状態

- 一部採用
- 週 / 月カレンダー操作、下書き復元、複数チーム所属の基本方針は採用されたが、終日保存やカレンダー UI の細部は 004-s と 007 で補正された。

## 関連スプリント

- [../001-risukeru-gg-app/history.md](../001-risukeru-gg-app/history.md): スケジュール基本要件の起点
- [../004-schedule-task-fixes/history.md](../004-schedule-task-fixes/history.md): 終日保存と入力補完の後続修正
- [../007-schedule-calendar-ui-improvements/history.md](../007-schedule-calendar-ui-improvements/history.md): カレンダー UI の後続改善

## 変更の理由

- MVP の単一チーム前提では、複数チーム運用やアクティブチーム切り替えに対応できなかった。
- スケジュール入力の中断復帰や複製作成が弱く、日常運用時の編集効率が不足していた。
- カレンダー操作性の不足を、UI 改善だけでなくデータモデル側から支える必要があった。

## 変更した仕様の内容

| 観点             | 変更前                                                    | 変更後                                                                      |
| ---------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| チーム所属       | 単一チーム前提の挙動が中心だった。                        | teamIds と currentTeamId を前提に、複数所属と切り替えを扱う方針へ拡張した。 |
| スケジュール入力 | 基本 CRUD 中心で、中断復帰や複製が弱かった。              | 下書き復元、複製新規作成、終日入力の改善方針を追加した。                    |
| カレンダー操作   | 基本表示はあったが、週 / 月切り替えや補助 UI が弱かった。 | 週 / 月カレンダー操作と表示改善を schedule カテゴリへ統合した。             |

## 変更の影響範囲

### 廃止した詳細ファイル

- spec.md
- plan.md
- research.md
- data-model.md
- tasks.md
- checklists/requirements.md

### 影響した正本仕様ファイル

- [docs/仕様・計画/schedule/requirements.md](../../docs/仕様・計画/schedule/requirements.md)
- [docs/仕様・計画/schedule/model.md](../../docs/仕様・計画/schedule/model.md)
- [docs/仕様・計画/schedule/flows.md](../../docs/仕様・計画/schedule/flows.md)
- [docs/仕様・計画/team/requirements.md](../../docs/仕様・計画/team/requirements.md)
- [docs/仕様・計画/team/model.md](../../docs/仕様・計画/team/model.md)

### 主要な実装影響ファイル

- src/app/(protected)/schedule/\*
- src/components/calendar/\*
- src/components/team/\*
- functions/src/teams/switchActiveTeam.ts

## 補足

- このスプリントは schedule と team の境界を再定義したため、後続の team 改善スプリントの前提になっている。
