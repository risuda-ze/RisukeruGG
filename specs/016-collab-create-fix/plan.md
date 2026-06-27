# Implementation Plan: コラボ新規作成「internal」エラー修正と堅牢化

**Branch**: `016-collab-create-fix`（現作業ブランチ: `claude/suspicious-rubin-0c0bf4`） | **Date**: 2026-06-27
**Input**: ユーザー報告「コラボ調整機能で新規追加ができない／画面に `internal` と表示される」
**関連機能**: `specs/015-collab-ui-redesign`（本不具合はこの機能のサーバー作成パス `createCollabSessionDraft` に存在）

---

## Summary

コラボ詳細モーダルの「新規追加」が失敗し、画面に `internal` とだけ表示される不具合を修正する。原因は Cloud Function `createCollabSessionDraft` が `HttpsError` 以外の例外をスローし、Firebase が `functions/internal`（message=`"internal"`）にラップしている点。クライアントはその文言をそのまま表示している（`CollabDetailModal.tsx:316`）。

本計画は次の 3 本柱で対応する。

1. **観測性の確立**（副目標）: CF に例外境界 + 構造化ログを導入し、真因をサーバーログから特定可能にする。
2. **作成パスの堅牢化**（達成条件）: 日付パース検証・`undefined` 除去・集計クエリ保護など既知の脆弱ポイントを防御的に修正し、新規追加を成功させる。
3. **画面エラー表示の改善**（副目標）: クライアントで Firebase エラー `code` を日本語メッセージにマッピングし、`internal` を排除する。

詳細な原因分析は [research.md](research.md) を参照。

---

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js 22
**Primary Dependencies**: Firebase Functions v2 (`onCall`), firebase-admin (Firestore), Next.js 14 (App Router), Zustand
**Storage**: Firebase Firestore（`teams/{teamId}/collabSessions`, `users/{uid}`）
**Server entry**: `functions/src/collab/createCollabSessionDraft.ts`（region: `asia-northeast1`）
**Client entry**: `src/lib/repositories/collabs.ts`（`createCollabSessionDraft`） / `src/components/collab/CollabDetailModal.tsx`（`handleCreate`）
**Logging**: `firebase-functions/logger`（既存 CF `expireCollabSessions.ts` 等で使用実績あり）
**Testing**: Vitest（ユニット）、Playwright（E2E）、Firebase Emulator（CF 手動再現）
**Project Type**: Web application (Next.js App Router + Cloud Functions)
**Constraints**: 仕様変更なし（既存スキーマ・UI を維持）。`HttpsError` 以外を CF から外へ漏らさない方針を徹底

**NEEDS CLARIFICATION**: なし（真因の最終断定はログ導入後の再現で確定。計画上は全候補をハードニング対象とする）

---

## Constitution Check

| 原則 | 確認 | 備考 |
|---|---|---|
| I. シンプルさ優先 | ✅ | 新抽象化は最小限。CF の例外境界は 1 関数内の try/catch。再利用するなら `functions/src/lib` に小ヘルパ |
| II. TypeScript 型安全 | ✅ | `any` 不使用。クライアント catch は `FunctionsError` を型ガードで判定 |
| III. テスト方針 | ✅ | コラボ作成は中核ロジック → 作成成功・代表的失敗のテストを追加（Constitution III 必須領域） |
| IV. Firebase・セキュリティ | ✅ | 作成は CF 経由のみ（既存方針維持）。ログに機微情報（トークン等）を出力しない |
| V. 日本語コメント | ✅ | 追加コードのコメント・利用者向けメッセージは日本語 |

**Complexity Tracking**: 違反なし。

---

## Project Structure

### Documentation (this feature)

```text
specs/016-collab-create-fix/
├── plan.md                         # 本ファイル
├── research.md                     # Phase 0: 原因分析・技術決定
├── data-model.md                   # Phase 1: 書き込みドキュメント形状・不変条件
├── contracts/
│   └── cloud-function-contract.md  # createCollabSessionDraft の I/O・エラーコード契約
└── quickstart.md                   # Phase 1: 再現・検証手順
```

### Source（変更対象）

```text
functions/src/collab/createCollabSessionDraft.ts   # 例外境界＋ログ＋日付/undefined ハードニング
functions/src/collab/lib.ts                        # 集計クエリの個別保護（必要時）
functions/src/lib/                                  # （任意）withErrorBoundary ヘルパ追加
src/components/collab/CollabDetailModal.tsx         # handleCreate の catch でエラーコード→日本語マッピング
src/lib/firebase/errors.ts                          # （新規・任意）FunctionsError → 日本語メッセージ変換ユーティリティ
```

---

## Phase 1: Design 概要

### 1. CF 例外境界（observability）

`createCollabSessionDraft` のハンドラ本体を try/catch で包む。

```text
try {
  // 既存の検証・認証・作成処理
} catch (err) {
  if (err instanceof HttpsError) throw err;            // 想定内エラーは透過
  logger.error('createCollabSessionDraft failed', {     // 真因をサーバーログへ
    teamId, uid: request.auth?.uid, status,
    proposedDatesCount: proposedDates?.length,
    participantsCount: participants?.length,
    error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err),
  });
  throw new HttpsError('internal', 'コラボの作成中にサーバーエラーが発生しました。時間をおいて再試行してください');
}
```

- ログには Firestore パスや件数などの**非機微**メタのみを出力（トークン・個人情報は出さない）。

### 2. 入力ハードニング（達成条件）

- **日付検証**: `proposedDates` の各 ISO 文字列を `new Date()` し、`isNaN(getTime())` なら `HttpsError('invalid-argument', '候補日程の形式が不正です')`。検証済み `Date[]` を `tx.set` に渡す。
- **undefined 除去**: `participants` を `{ id, name, type }` に正規化し、`content`/`icon` は `?? ''`/`?? 'sports_esports'` で確定。`tx.set` ペイロードに `undefined` を残さない。
- **集計クエリ保護**: `assertActiveCollabLimit` の `.count()` を必要に応じ try/catch し、失敗時はログ後に上限チェックをスキップせず `HttpsError` 化（真因がここでも `internal` を出さない）。

### 3. クライアント エラーマッピング（副目標）

`CollabDetailModal.handleCreate` の `catch` を、`err.code`（`FunctionsError`）ベースに変更。

| code | 画面表示 |
|---|---|
| `functions/failed-precondition` | CF の `message` をそのまま（上限到達などの利用者向け文言） |
| `functions/invalid-argument` | CF の `message` をそのまま |
| `functions/unauthenticated` | 「セッションが切れました。再ログインしてください」 |
| `functions/permission-denied` | 「この操作を行う権限がありません」 |
| `functions/internal`／その他 | 「サーバーで問題が発生しました。時間をおいて再試行してください」 |

変換ロジックは `src/lib/firebase/errors.ts`（新規・任意）に切り出し、他 CF 呼び出しでも再利用可能にする。

---

## Phase 2 への引き継ぎ（/speckit-tasks で具体化）

想定タスク順序（依存順）:

1. CF 例外境界 + 構造化ログ導入（観測性）
2. （ログ確認）Emulator で再現し真因を特定 → `research.md` §5 を更新
3. 入力ハードニング（日付検証・undefined 除去・集計クエリ保護）
4. クライアント エラーマッピング実装（`errors.ts` + `handleCreate`）
5. テスト追加（作成成功 / invalid-argument / 上限到達）
6. `pnpm typecheck` / `pnpm lint` / `pnpm test` + Playwright で受け入れ基準検証

---

## 受け入れ基準（Evaluator 用）

| # | 基準 | 検証方法 |
|---|---|---|
| AC1 | コラボ詳細モーダルで有効な入力（タイトル・参加者1名以上・候補日程1件以上）から「新規追加」が**成功**し、一覧に表示される | Playwright で実操作 |
| AC2 | CF が `HttpsError` 以外の例外で失敗した場合、サーバーログに `teamId`/`uid`/エラー内容が記録される | Emulator ログ確認 |
| AC3 | 作成失敗時、画面に `internal` ではなく**状況に応じた日本語メッセージ**が表示される | 異常系を誘発して確認 |
| AC4 | 既存のコラボ機能（回答・確定・キャンセル・再開・共有リンク作成）に**回帰がない** | 既存 E2E / 手動確認 |
| AC5 | `pnpm typecheck` / `pnpm lint` / `pnpm test` が通過 | CI コマンド |

---

## リスク・留意点

- 真因が Firestore 集計クエリ（C1）だった場合、`firebase-admin` のバージョンや必要インデックスの確認が追加で要る（`firestore.indexes.json` に `collabSessions` の複合インデックスは現状なし）。
- ログ導入後の本番デプロイ（`asia-northeast1`）が必要。デプロイ前に Emulator で再現確認すること。
- メインへの直接マージ禁止（CLAUDE.md）。修正は `develop` 向け `feature/` ブランチで行う。
