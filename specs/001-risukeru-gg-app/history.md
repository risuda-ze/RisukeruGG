# 001-risukeru-gg-app 履歴

## 変更の概要

- 配信者向けチームスケジュール管理アプリの MVP 要件を、実装と検証が可能な粒度まで初めて具体化した。
- スケジュール、タスク、コラボ、チーム、通知、プラン、PWA を含む横断仕様の起点を定義した。
- UI デザイン刷新のためのデザイントークン、共通コンポーネント、主要画面の実装計画も同一スプリントで整理した。

## 正本参照先

- 親仕様: [docs/仕様・計画/risukeru_gg_spec.md](../../docs/仕様・計画/risukeru_gg_spec.md)
- カテゴリ仕様の入口:
  - [docs/仕様・計画/user/README.md](../../docs/仕様・計画/user/README.md)
  - [docs/仕様・計画/team/README.md](../../docs/仕様・計画/team/README.md)
  - [docs/仕様・計画/schedule/README.md](../../docs/仕様・計画/schedule/README.md)
  - [docs/仕様・計画/task/README.md](../../docs/仕様・計画/task/README.md)
  - [docs/仕様・計画/collab/README.md](../../docs/仕様・計画/collab/README.md)
  - [docs/仕様・計画/notification/README.md](../../docs/仕様・計画/notification/README.md)
  - [docs/仕様・計画/platform/README.md](../../docs/仕様・計画/platform/README.md)
  - [docs/仕様・計画/plan/README.md](../../docs/仕様・計画/plan/README.md)
  - [docs/仕様・計画/ui/README.md](../../docs/仕様・計画/ui/README.md)

## 採用状態

- 一部採用
- MVP の基礎要件は各カテゴリ仕様の起点として採用された一方、詳細な UI 刷新計画と後続の改善差分は 002 以降へ分離された。

## 関連スプリント

- [../002-ui-redesign/history.md](../002-ui-redesign/history.md): UI とタスク体験の後続改善
- [../003-schedule-ui-improvements/history.md](../003-schedule-ui-improvements/history.md): スケジュールと複数チーム対応の後続改善
- [../008-team-management-improvements/history.md](../008-team-management-improvements/history.md): チーム退出とナビゲーション修正の後続改善

## 変更の理由

- 親仕様だけでは実装判断に必要な粒度が不足していたため、ユーザーストーリー、受け入れ条件、成功指標、前提条件を追加する必要があった。
- 対象ユーザーを 0 から 1,000 人規模の配信者とその制作チームに定め、フェーズ 1 で必要な運用条件を固定する必要があった。
- Google カレンダー同期、外部向けコラボ回答 URL、LIGHT と PARTY の 2 プランなど、差別化に直結する仕様を曖昧なまま残せなかった。
- UI 側では参照 HTML と実装の乖離を避けるため、デザイントークン、レイアウト、コンポーネント責務を明文化する必要があった。

## 変更した仕様の内容

| 観点 | 変更前 | 変更後 |
| --- | --- | --- |
| 要件の粒度 | 大まかな全体像が中心で、実装や受け入れ確認に必要な粒度が不足していた。 | ユーザーストーリー、受け入れ条件、エッジケース、成功指標、前提条件を追加し、MVP の判定条件を明確化した。 |
| 認証とチーム参加 | Google ログイン後のアカウント初期化やチーム参加導線は概略のみだった。 | 認証は user カテゴリへ委譲しつつ、チーム作成と参加完了までの体験目標を定義した。 |
| プランと利用上限 | 無料試用と有料化の境界が曖昧だった。 | LIGHT と PARTY の 2 プラン、ユーザー単位課金、月次リセット、外部フォーム経由のアップグレード導線を定義した。 |
| スケジュール管理 | 共有カレンダーの概要が中心だった。 | エントリ項目、LIVE 表示、Google カレンダー同期失敗時の扱い、JST 固定、楽観的ロックによる競合警告を定義した。 |
| タスク管理 | タスク管理の存在は示されていたが、運用ルールが不足していた。 | カンバン CRUD、ROM の閲覧専用、カラムカスタマイズ、月 5 件上限、CSV エクスポートを定義した。 |
| コラボ調整 | 日程調整の流れが抽象的だった。 | 外部 URL 方式、候補日程最大 5 件、有効期限 1 から 30 日、確定時の URL 無効化、月 3 件上限を定義した。 |
| UI 実装方針 | 画面刷新の基準が資料ごとに分散していた。 | デザイントークン、共通コンポーネント、画面別実装順を定義し、後続 UI スプリントの起点とした。 |

## 変更の影響範囲

### 廃止した詳細ファイル

- spec.md
- plan.md
- research.md
- data-model.md
- quickstart.md
- tasks.md
- contracts/cloud-functions-api.md
- contracts/collab-share-url.md
- contracts/ui-components.md
- contracts/firestore-rules.md
- checklists/requirements.md

### 影響した正本仕様ファイル

- [docs/仕様・計画/risukeru_gg_spec.md](../../docs/仕様・計画/risukeru_gg_spec.md)
- [docs/仕様・計画/user/requirements.md](../../docs/仕様・計画/user/requirements.md)
- [docs/仕様・計画/team/requirements.md](../../docs/仕様・計画/team/requirements.md)
- [docs/仕様・計画/schedule/requirements.md](../../docs/仕様・計画/schedule/requirements.md)
- [docs/仕様・計画/task/requirements.md](../../docs/仕様・計画/task/requirements.md)
- [docs/仕様・計画/collab/requirements.md](../../docs/仕様・計画/collab/requirements.md)
- [docs/仕様・計画/notification/requirements.md](../../docs/仕様・計画/notification/requirements.md)
- [docs/仕様・計画/platform/requirements.md](../../docs/仕様・計画/platform/requirements.md)
- [docs/仕様・計画/plan/requirements.md](../../docs/仕様・計画/plan/requirements.md)
- [docs/仕様・計画/ui/requirements.md](../../docs/仕様・計画/ui/requirements.md)

### 主要な実装影響ファイル

- src/app/globals.css
- src/app/layout.tsx
- public/manifest.json
- src/app/(protected)/dashboard/page.tsx
- src/app/(protected)/schedule/page.tsx
- src/app/(protected)/tasks/page.tsx
- src/app/(protected)/collabs/page.tsx
- src/app/(protected)/team/page.tsx
- src/app/(protected)/notifications/page.tsx
- src/app/(protected)/settings/page.tsx
- tests/e2e/login.spec.ts
- tests/e2e/schedule.spec.ts
- tests/e2e/tasks.spec.ts

## 補足

- 001 は基礎仕様と UI 刷新計画が同一ディレクトリに混在していたため、以後の history 形式へ圧縮する際の基準ケースとして扱う。