# Implementation Plan: スケジュール画面のメンバー予定表示バグ修正

**Branch**: `017-schedule-member-visibility-fix` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/017-schedule-member-visibility-fix/spec.md`

## Summary

スケジュール画面の「メンバーの予定」トグルが機能しない根本原因は、`subscribeMemberCalendarEvents` が `collectionGroup(db, 'events')` でメンバー予定を購読しているのに対し、`firestore.rules` がコレクショングループクエリを認可する再帰ワイルドカードルールを持たないこと。クエリが `permission-denied` で拒否され、かつ `onSnapshot` にエラーハンドラが無いためサイレント失敗していた。

**技術アプローチ**: (1) `firestore.rules` に `match /{path=**}/events/{eventId}` の read ルールを追加してコレクショングループ読み取りを `isTeamMember(resource.data.teamId)` 条件で許可する。(2) `subscribeMemberCalendarEvents` にエラーハンドラを追加して将来の失敗を可視化する。データモデル・書き込みロジック・UI は変更しない。

## Technical Context

**Language/Version**: TypeScript 5.x（`strict: true`）/ Next.js 15 App Router
**Primary Dependencies**: Firebase JS SDK（`firebase/firestore`）, Zustand（auth store）, date-fns
**Storage**: Cloud Firestore（`teams/{teamId}/memberCalendars/{userId}/events/{eventId}`）
**Testing**: Vitest（ユニット）, Playwright（E2E）
**Target Platform**: Web（ブラウザ）/ Firebase Hosting・Functions
**Project Type**: Web application（単一 Next.js プロジェクト）
**Performance Goals**: メンバー予定購読はトグル ON 時のみ。リアルタイム反映（`onSnapshot`）
**Constraints**: 他チームの予定を漏洩しないこと。既存スケジュール表示に回帰なきこと
**Scale/Scope**: 変更ファイル 2〜3（`firestore.rules`, `memberCalendars.ts`, 必要なら `firestore.indexes.json`）。新規 UI なし

## Constitution Check

_GATE: Phase 0 前に通過必須。Phase 1 設計後に再確認。_

| 原則 | 評価 | 備考 |
| --- | --- | --- |
| I. シンプルさ優先 | ✅ PASS | 最小修正（ルール 1 ブロック追加＋エラーハンドラ）。新抽象化なし。データモデル変更なし。 |
| II. TypeScript型安全 | ✅ PASS | `any` 不使用。エラーハンドラの型は Firebase SDK の `FirestoreError`。 |
| III. テスト方針 | ✅ PASS | コアロジック（変換）は既存ユニットテストで担保済み。ルールは Firestore エミュレータ／手動 E2E で検証。 |
| IV. Firebase・セキュリティ | ✅ PASS | 追加ルールは read のみ・`teamId` メンバー検証付き。最小権限を維持。 |
| V. 日本語コメント | ✅ PASS | 追加コードに日本語コメントを付す。 |

**Gate 結果**: 違反なし。Complexity Tracking 不要。

## Project Structure

### Documentation (this feature)

```text
specs/017-schedule-member-visibility-fix/
├── plan.md              # 本ファイル
├── research.md          # Phase 0 出力（原因調査）
├── data-model.md        # Phase 1 出力（影響エンティティ）
├── quickstart.md        # Phase 1 出力（検証・デプロイ手順）
└── contracts/
    └── firestore-rules.contract.md  # セキュリティルール契約
```

### Source Code (repository root)

```text
firestore.rules                              # [変更] events コレクショングループ read ルール追加
firestore.indexes.json                       # [条件付き変更] failed-precondition 観測時のみ index 追加
src/
├── lib/repositories/memberCalendars.ts      # [変更] subscribeMemberCalendarEvents にエラーハンドラ追加
└── app/(protected)/schedule/page.tsx        # [変更なし] 既存の購読・変換・描画ロジックはそのまま
tests/
└── unit/schedules/memberCalendarVisibility.test.ts  # [変更なし] 既存テストで変換ロジックを担保
```

**Structure Decision**: 既存の単一 Next.js プロジェクト構成を維持。バグ修正のため新規ディレクトリ・モジュールは作成しない。修正は Firestore ルール層とリポジトリ層に局所化する。

## Phase 1 設計成果物

- **data-model.md**: 影響を受ける `MemberCalendarEvent` エンティティと Firestore パス、読み書きの認可境界を整理。
- **contracts/firestore-rules.contract.md**: 追加するセキュリティルールの入出力契約（誰が・どの条件で読めるか）。
- **quickstart.md**: ルールのデプロイ手順と AC を満たす手動／E2E 検証シナリオ。

## 実装ステップ概要（/speckit-tasks で詳細化）

1. `firestore.rules` に再帰ワイルドカード `events` read ルールを追加。
2. `subscribeMemberCalendarEvents` の `onSnapshot` にエラーコールバックを追加。
3. `firebase deploy --only firestore:rules` でルールをデプロイ。
4. 2 アカウント（同一チーム）で AC-1〜AC-7 を手動検証。
5. （`failed-precondition` 観測時のみ）`firestore.indexes.json` に collection-group 単一フィールドインデックスを追加しデプロイ。

## Complexity Tracking

> Constitution Check に違反なし。記載不要。
