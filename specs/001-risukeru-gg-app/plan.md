# Implementation Plan: リスケるGG MVP

**Branch**: `001-risukeru-gg-app` | **Date**: 2026-05-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-risukeru-gg-app/spec.md`

## Summary

配信者向けチームスケジュール管理WebアプリのMVP実装計画。Next.js 14（App Router）と
Firebaseエコシステムを組み合わせ、配信スケジュール共有・コラボ日程調整（外部共有URL方式）・
制作タスク管理（カスタムカンバン）・通知（PARTYプランのみ4カテゴリ設定可能）をPWAとして提供する。
Googleアカウント（Firebase Authentication Google OAuth2）で認証し、ログイン後は自動的に
LIGHTプラン（無料）に設定される。PARTYプラン（有料）へのアップグレードはフェーズ1では
外部申し込みフォームへのリンクで対応し、フェーズ2で課金処理を実装する。
チーム参加はチームコード入力方式とし、1ユーザーは同時に1チームのみ所属できる。

## Technical Context

**Language/Version**: TypeScript 5.x（`strict: true`）
**Primary Dependencies**:
- Next.js 14（App Router）
- Firebase SDK 10.x（Auth・Firestore・Storage・Cloud Functions・FCM）
- Tailwind CSS 3.x
- Zustand 4.x（クライアント状態管理）
- react-big-calendar（カレンダーUI）
- @hello-pangea/dnd（カンバンDnD）
- next-pwa（Service Worker・プッシュ通知）
- Zod（APIバウンダリのランタイムバリデーション）
- date-fns（日時操作・JST変換）

**Storage**: Cloud Firestore（プライマリ）、Firebase Storage（アバター・画像）
**Testing**: Vitest（コアビジネスロジックのユニットテスト）、Playwright（主要E2Eジャーニー）
**Target Platform**: PWA（PC: Chrome/Edge/Firefox最新2版、Android Chrome）、Vercelデプロイ
**Performance Goals**: LCP < 3s（4G回線）、INP < 100ms、Firestoreリアルタイム更新 < 1s
**Constraints**: Firebase Blazeプラン（Cloud Scheduler使用のため）、JST固定、日本語UIのみ
**Scale/Scope**: フェーズ1 LIGHT/PARTYプラン（課金はフェーズ2）、6ユーザーストーリー（P1: 5、P2: 1）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | チェック内容 | 判定 |
|------|------------|------|
| I. シンプルさ優先 | BaaSでサーバー管理コストゼロ。Google OAuth認証はFirebase標準機能で追加実装なし。プラン管理はFirestoreフィールドで単純に管理、課金処理はフェーズ2に延期 | ✅ Pass |
| II. TypeScript型安全 | `strict: true`、Zodによるバウンダリバリデーション、FirestoreコレクションをリポジトリでTyped化。`any`禁止 | ✅ Pass |
| III. テスト方針 | Vitest: 認証フロー・プラン制限ロジック・コラボURL検証・タスク状態遷移のみ。Playwright: ログイン・スケジュール作成・タスク管理の3ジャーニー | ✅ Pass |
| IV. Firebase・セキュリティ | Security RulesでチームスコープCRUD制限。プラン制限チェックはCloud Functionsで強制。コンポーネントからFirestore直接アクセス禁止 | ✅ Pass |
| V. 日本語コメント | 全コメント日本語。識別子は英語。UIテキストは日本語 | ✅ Pass |

**判定: 全原則 ✅ Pass — Phase 0 研究に進む**

## Project Structure

### Documentation (this feature)

```text
specs/001-risukeru-gg-app/
├── plan.md                      # This file
├── research.md                  # Phase 0 output
├── data-model.md                # Phase 1 output
├── quickstart.md                # Phase 1 output
├── contracts/
│   ├── firestore-rules.md       # Security Rules設計
│   ├── cloud-functions-api.md   # Cloud Functions エンドポイント仕様
│   └── collab-share-url.md      # コラボ共有URL仕様
└── tasks.md                     # /speckit-tasks で生成（plan後）
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/               # Googleログインページ（メール認証なし）
│   ├── (protected)/             # middleware.tsでFirebase認証を検証
│   │   ├── dashboard/
│   │   ├── schedule/
│   │   │   └── [id]/
│   │   ├── tasks/
│   │   ├── collabs/
│   │   │   └── [id]/
│   │   ├── team/
│   │   ├── notifications/
│   │   └── settings/            # チームコード入力・プラン確認・通知設定
│   └── collab/[token]/          # コラボ回答ページ（認証不要・公開）
├── components/
│   ├── calendar/                # react-big-calendar ラッパーコンポーネント
│   ├── kanban/                  # @hello-pangea/dnd カンバンボード
│   ├── collab/                  # コラボセッション管理UI
│   ├── notifications/           # 通知バナー・ベル・一覧
│   ├── plan/                    # プランバッジ・アップグレードCTA・バナー広告
│   └── ui/                      # Button・Inputなど汎用コンポーネント
├── lib/
│   ├── firebase/                # Firebase SDK 初期化・エクスポート
│   ├── repositories/            # Firestoreアクセスを全て集約（直接SDKコール禁止）
│   │   ├── schedules.ts
│   │   ├── tasks.ts
│   │   ├── collabs.ts
│   │   ├── teams.ts
│   │   ├── plans.ts             # プランカウント読み書き
│   │   └── notifications.ts
│   └── validations/             # Zodスキーマ（フォーム・API応答バリデーション）
├── stores/                      # Zustandグローバルストア
│   ├── auth.ts                  # ユーザー・プラン状態
│   ├── schedule.ts
│   ├── tasks.ts
│   └── notifications.ts
├── hooks/                       # カスタムReactフック（Firestoreリスナー管理）
└── types/                       # TypeScript型定義（エンティティ・API）

functions/
└── src/
    ├── notifications/           # FCM通知送信・配信リマインダースケジューリング
    ├── collab/                  # コラボセッションURL生成・有効期限チェック
    ├── calendar/                # Googleカレンダー双方向同期（ポーリング）
    ├── plan/                    # 月次カウントリセット（毎月1日 JST）
    └── team/                    # チームコード生成・プラン制限チェック・脱退処理

tests/
├── unit/                        # Vitest（コアロジックのみ）
│   ├── auth/
│   ├── plan/                    # プラン制限ロジック（月次カウント・メンバー上限）
│   ├── collab/
│   └── tasks/
└── e2e/                         # Playwright（3主要ジャーニー）
    ├── login.spec.ts
    ├── schedule.spec.ts
    └── tasks.spec.ts
```

**Structure Decision**: `admin/`ディレクトリは廃止（アクセストークン管理不要）。
`(auth)/register/[token]/`も廃止しログインページのみ。`settings/`ページがチームコード入力・
プラン確認の主要画面となる。Cloud Functionsに`plan/`モジュールを追加し月次カウントリセットを担当。

## Complexity Tracking

| 追加複雑性 | 理由 | 対策 |
|-----------|------|------|
| プラン制限のバックエンド強制（NFR-011） | クライアント回避を防ぐためCloud Functionsで検証必要 | タスク作成・コラボ作成はCallable FunctionsでプランチェックをServer側で実施 |
| 1ユーザー1チーム制約とチーム脱退フロー | Owner脱退時の所有権移譲ロジックが複雑 | FR-015b/016に明示。脱退前の確認ダイアログでフロー分岐 |
| 月次カウントリセット（JST毎月1日） | タイムゾーン変換とCloud Schedulerの設定が必要 | date-fnsでJST変換。Cloud Schedulerは`0 0 1 * *`でUTC+9を考慮し`15 0 1 * *`（UTC）で設定 |
