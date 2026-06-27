# Phase 0: Research — コラボ新規作成「internal」エラーの原因分析

**Date**: 2026-06-27
**対象**: コラボ調整機能「新規追加」が失敗し、画面に `internal` と表示される不具合

---

## 1. 症状

- コラボ詳細モーダルの「新規追加」ボタン押下時、作成に失敗する。
- 画面のバリデーションエラー欄に **`internal`** とだけ表示される。

## 2. エラーフロー（確定事実）

| 層 | ファイル | 振る舞い |
|---|---|---|
| クライアント呼び出し | `src/lib/repositories/collabs.ts:152-191` | `createCollabSessionDraftFn = httpsCallable(functions, 'createCollabSessionDraft')` を呼ぶ |
| クライアント表示 | `src/components/collab/CollabDetailModal.tsx:315-316` | `catch (err) { setCreateError(err instanceof Error ? err.message : ...) }` で **`err.message` をそのまま表示** |
| サーバー | `functions/src/collab/createCollabSessionDraft.ts` | `onCall` 内で例外発生 |

**根本メカニズム（確定）**: Firebase Functions v2 の `onCall` は、ハンドラ内でスローされた例外が `HttpsError` の場合のみ `code`/`message` をクライアントへ透過する。`HttpsError` **以外**の例外（通常の `Error`・Google API エラー・`TypeError` 等）は、情報漏えい防止のため **すべて `functions/internal`** にラップされ、`message` は文字列 `"internal"` に置き換えられる。

→ 画面の `internal` は「**CF が `HttpsError` 以外の例外をスローした**」ことを示す。`createCollabSessionDraft.ts` には例外境界（try/catch）も構造化ログも無いため、**現状クライアント・サーバーいずれのログからも真因を特定できない**。これが本不具合の最大の問題点。

## 3. 真因の候補（要ログ確認・全件ハードニング対象）

`createCollabSessionDraft.ts` の処理順に、`HttpsError` 以外がスローされ得る箇所を洗い出した。

| # | 箇所 | 想定例外 | 影響範囲 | 確度 |
|---|---|---|---|---|
| C1 | `assertActiveCollabLimit`（`functions/src/collab/lib.ts:28-43`）の集計クエリ `.where('status','in',[...]).count().get()` | `firebase-admin` のバージョン差異や集計インデックス未整備で `FAILED_PRECONDITION` / `TypeError`（`.count is not a function`）。いずれも非 `HttpsError` → internal | **light プランのみ** | 中 |
| C2 | トランザクション `tx.set` の `proposedDates.map((d) => new Date(d))`（`createCollabSessionDraft.ts:74`） | 不正な日付文字列で `Invalid Date` → Firestore が値を拒否 → 非 `HttpsError` | 全プラン | 中 |
| C3 | `tx.set` のドキュメントに `undefined` フィールドが混入（`participants` の各要素・`content`・`icon` 等） | Firestore はデフォルトで `undefined` 値を拒否し例外。`ignoreUndefinedProperties` 未設定 | 全プラン | 中 |
| C4 | `incrementCollabCount`（`lib.ts:46-56`）の `tx.update(users/{uid})` | 対象ドキュメント不在で `tx.update` が例外。`getUserDoc` で存在確認済みのため低い | open 作成・light のみ | 低 |
| C5 | `getAuthContext`（`validateAuth.ts:14-34`）の `memberSnap.data()!.role` | メンバードキュメントに `role` 欠落でも throw はしないが、後続の権限判定が想定外動作 | — | 低 |

※ クライアント Functions リージョン（`src/lib/firebase/client.ts:24` = `asia-northeast1`）は CF 側（`createCollabSessionDraft.ts:33`）と**一致**しており、リージョン不整合は**除外**。

## 4. 決定（Decisions）

### Decision 1: CF に「例外境界 + 構造化ログ」を導入する
- **What**: `createCollabSessionDraft` のハンドラ全体を try/catch でラップ。`HttpsError` はそのまま再スロー、それ以外は `logger.error`（`firebase-functions/logger`）に **入力サマリ・uid・teamId・エラー内容** を出力したうえで、`HttpsError('internal', 利用者向けメッセージ)` に変換して再スロー。
- **Rationale**: 真因を断定するにはサーバーログが必須。既存 CF（`expireCollabSessions.ts` 等）で `firebase-functions/logger` を使う前例があり、パターンを踏襲できる。これにより「今後エラーが発生した際に原因を特定できる」という副目標を直接満たす。
- **Alternatives considered**: クライアント側でのみメッセージを整える案 → サーバーの真因が依然ログに残らず却下。

### Decision 2: 既知の脆弱ポイント（C1〜C4）を防御的に修正する
- **What**:
  - C2: ISO 文字列を `new Date()` でパースした直後に `isNaN(date.getTime())` を検査し、不正なら `HttpsError('invalid-argument', ...)`。
  - C3: `tx.set` のペイロードを `undefined` 除去のうえ構築（または `participants` 要素を `{id,name,type}` に正規化）。
  - C1: 集計クエリ失敗時も Decision 1 の境界でログ化。必要なら件数取得を `try/catch` で個別保護。
- **Rationale**: 真因がどれであっても作成成功に到達させ、「達成条件: 新規追加ができること」を満たす。
- **Alternatives considered**: 真因 1 点のみ修正 → ログが無い現状では特定不能なため全候補をハードニングするのが堅実。

### Decision 3: クライアントのエラーメッセージを `code` ベースで日本語化する
- **What**: `CollabDetailModal.handleCreate` の `catch` で、Firebase の `FunctionsError`（`err.code`）に応じて利用者向け日本語メッセージへマッピング（例: `functions/internal` → 「サーバーで問題が発生しました。時間をおいて再試行してください」、`functions/failed-precondition` → CF が返す上限メッセージをそのまま表示、`functions/unauthenticated` → 「再ログインしてください」）。
- **Rationale**: `internal` という不親切な文言を画面から排除し、「画面に適切なエラーメッセージを表示」の副目標を満たす。
- **Alternatives considered**: 既存の `err.message` 透過のまま → `internal` 表示が残るため却下。

## 5. 未解決事項（実装フェーズでログ確認）

- 真因が C1〜C4 のどれか（あるいは別）は、Decision 1 のログ導入後に再現テストして確定する。`tasks` フェーズで「ログ確認 → 真因特定 → 該当箇所の恒久修正」を 1 タスクとして扱う。
