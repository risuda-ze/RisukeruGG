# 007-user-management-fixes 履歴

## 変更の概要

- ロール名を owner / editor / viewer から operator / member / rom へ統一した。
- アカウント削除後も displayName と avatarUrl を保持するゴースト化方針を導入した。
- PlanStatus をハードコード値ではなく実際のプランデータに接続した。

## 正本参照先

- [docs/仕様・計画/user/README.md](../../docs/仕様・計画/user/README.md)
- [docs/仕様・計画/team/README.md](../../docs/仕様・計画/team/README.md)
- [docs/仕様・計画/plan/README.md](../../docs/仕様・計画/plan/README.md)

## 関連スプリント

- [../001-risukeru-gg-app/history.md](../001-risukeru-gg-app/history.md): 認証とプランの基本要件
- [../003-schedule-ui-improvements/history.md](../003-schedule-ui-improvements/history.md): 複数チーム所属の前段
- [../008-team-management-improvements/history.md](../008-team-management-improvements/history.md): チーム操作の後続修正

## 変更の理由

- 仕様と実装でロール名が食い違っており、権限判定と UI 表示の整合が取りにくかった。
- ユーザー削除時に表示名やアバターまで失うと、過去データや履歴表示で文脈が失われた。
- PlanStatus のハードコードは実運用と表示の乖離を生んでいた。

## 変更した仕様の内容

| 観点         | 変更前                                         | 変更後                                                                 |
| ------------ | ---------------------------------------------- | ---------------------------------------------------------------------- |
| ロール名     | owner / editor / viewer が残っていた。         | operator / member / rom に統一し、読み取り時は後方互換変換を許容した。 |
| ユーザー削除 | 完全削除前提に寄っていた。                     | deleted と deletedAt を持つゴースト化方針を導入した。                  |
| プラン表示   | isLight のようなハードコード前提が残っていた。 | 実際のメンバープランを基準に PlanStatus を表示する方針へ変更した。     |

## 変更の影響範囲

### 廃止した詳細ファイル

- spec.md
- plan.md
- research.md
- data-model.md
- tasks.md

### 影響した正本仕様ファイル

- [docs/仕様・計画/user/requirements.md](../../docs/仕様・計画/user/requirements.md)
- [docs/仕様・計画/user/model.md](../../docs/仕様・計画/user/model.md)
- [docs/仕様・計画/team/requirements.md](../../docs/仕様・計画/team/requirements.md)
- [docs/仕様・計画/team/model.md](../../docs/仕様・計画/team/model.md)
- [docs/仕様・計画/plan/requirements.md](../../docs/仕様・計画/plan/requirements.md)

### 主要な実装影響ファイル

- src/types/entities.ts
- src/lib/repositories/teams.ts
- src/components/team/\*
- src/components/plan/PlanStatus.tsx
- functions/src/lib/validateAuth.ts
- functions/src/teams/\*

## 補足

- 旧ロール値は読み取り互換を維持するため、正本仕様では変換前提として扱う。
