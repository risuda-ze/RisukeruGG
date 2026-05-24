# Tasks: プライバシーポリシー策定・実装

**Input**: Design documents from `specs/010-privacy-policy/`  
**Prerequisites**: plan.md ✅、spec.md ✅、research.md ✅、data-model.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル・相互依存なし）
- **[Story]**: 対応するユーザーストーリー（US1・US2・US3）
- 各タスクに具体的なファイルパスを明記

---

## Phase 1: Setup（ルーティング確認）

**Purpose**: `/privacy-policy` が `(protected)` 認証ガードの影響を受けないことを確認し、作業基盤を整える

- [x] T001 `src/app/(protected)/layout.tsx` を読み、auth チェックが `(protected)` グループ内のみに限定されており `/privacy-policy` がブロックされないことを確認・コメントを追記する（確認のみ、変更なし）

**Checkpoint**: `/privacy-policy` はパブリックアクセス可能と確認済み

---

## Phase 2: Foundational（なし）

本フィーチャーはデータベース・インフラ変更なし。Phase 1 完了後すぐにユーザーストーリー実装へ進む。

---

## Phase 3: User Story 1 - プライバシーポリシーページ新規作成（Priority: P1）🎯 MVP

**Goal**: 認証不要の公開ページ `/privacy-policy` に、個人情報保護法準拠の日本語プライバシーポリシーを実装する

**Independent Test**: ブラウザで `http://localhost:3000/privacy-policy` に未ログイン状態でアクセスし、10項目のセクション見出しが全て表示されること

### Implementation for User Story 1

- [x] T002 [US1] `src/app/privacy-policy/page.tsx` を新規作成する（Server Component、`'use client'` 不要）。plan.md の「実装詳細 A」に従い以下を含む：ページヘッダー（ロゴ + アプリ名 + ログインに戻るリンク）、h1「プライバシーポリシー」、制定日・最終改定日（`2026年XX月XX日` プレースホルダー + `TODO: 制定日を記入してください` コメント）
- [x] T003 [US1] `src/app/privacy-policy/page.tsx` のメインコンテンツに以下10セクションを h2 見出しで実装する：(1)事業者情報、(2)取得する個人情報、(3)利用目的、(4)第三者への提供、(5)委託先への提供（Firebase・Vercel の表形式）、(6)外国への個人情報の提供（米国・DPA）、(7)Cookie・認証トークンの使用、(8)安全管理措置、(9)個人情報に関するご請求（開示・訂正・削除・利用停止）、(10)お問い合わせ窓口。各プレースホルダー項目に `TODO: 事業者情報を記入してください` コメントを付ける
- [x] T004 [US1] `src/app/privacy-policy/page.tsx` にレスポンシブスタイリングを適用する：`max-w-3xl mx-auto px-4`、h2 に `text-lg font-semibold text-text mt-8 mb-3 border-b border-border pb-2`、本文に `text-sm text-muted leading-relaxed space-y-2`、モバイル375px幅での表示崩れがないことを確認

**Checkpoint**: `/privacy-policy` にアクセスすると10セクションの見出しが全て表示され、モバイルでも適切に表示される

---

## Phase 4: User Story 2 - ログインページ同意テキストのリンク化（Priority: P2）

**Goal**: ログインページ下部の「プライバシーポリシー」テキストを `/privacy-policy` へのクリッカブルリンクにする

**Independent Test**: ログインページ（`http://localhost:3000/login`）で「プライバシーポリシー」テキストが `href="/privacy-policy"` を持つ `<a>` タグでレンダリングされていること

### Implementation for User Story 2

- [x] T005 [US2] `src/app/(auth)/login/page.tsx` を更新する：ファイル先頭に `import Link from 'next/link'` を追加し、L124〜L126 の同意テキスト `<p>` 内の「プライバシーポリシー」を `<Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-text transition-colors">プライバシーポリシー</Link>` に置き換える（plan.md 「実装詳細 B」参照）

**Checkpoint**: ログインページで「プライバシーポリシー」リンクをクリックすると新しいタブで `/privacy-policy` が開く

---

## Phase 5: User Story 3 - 個人設定「アプリ情報」タブ追加（Priority: P3）

**Goal**: 個人設定プロフィールページ（`/settings/profile`）に「アプリ情報」タブを5番目として追加し、プライバシーポリシーリンク・バージョン情報・サポートリンクを表示する

**Independent Test**: `/settings/profile` にログイン後アクセスし、タブバーの5番目に「アプリ情報」が表示され、クリックするとアプリ名・バージョン・プライバシーポリシーリンクが表示されること

### Implementation for User Story 3

- [x] T006 [US3] `src/app/(protected)/settings/profile/page.tsx` L18 の `Tab` 型定義に `'app-info'` を追加する：`type Tab = 'profile' | 'notifications' | 'plan' | 'account' | 'app-info'`
- [x] T007 [US3] 同ファイルの `TAB_LABELS` レコード（L21〜L26）に `'app-info': 'アプリ情報'` を追加する
- [x] T008 [US3] 同ファイルに `import Link from 'next/link'` を追加する（未 import の場合）
- [x] T009 [US3] 同ファイルのタブコンテンツレンダリング部分に `activeTab === 'app-info'` ブロックを追加する。内容：(1)アプリ情報セクション（アプリ名「リスケるGG」・バージョン「0.1.0」）、(2)法的情報セクション（プライバシーポリシーへの `Link`・利用規約「準備中」）、(3)サポートセクション（お問い合わせ `mailto:` リンク）。plan.md「実装詳細 C」の JSX サンプルを参照し、`TODO: 問い合わせメールアドレスを記入してください` コメントを付ける

**Checkpoint**: `/settings/profile` で「アプリ情報」タブが表示され、プライバシーポリシーリンクが新しいタブで正しく開く

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 型安全確認・E2Eスモークテスト追加・CI統合

- [x] T010 `pnpm typecheck` を実行し、TypeScript エラーがゼロであることを確認する。エラーがある場合は修正する
- [x] T011 `tests/e2e/privacy-policy.spec.ts` を新規作成し、以下の Playwright テストを実装する（スモークテスト・認証不要）：AC-1「`/privacy-policy` に未認証でアクセスできる」、AC-2「10項目の必須見出しが全て存在する（文字列で確認）」、AC-3「ログインページの `a[href="/privacy-policy"]` 要素が存在する」、AC-4「プロフィール設定ページのタブに「アプリ情報」が含まれる（認証必要なので UI テキストのみ確認 or スキップ）」
- [x] T012 `playwright.config.ts` の `smoke` プロジェクト `testMatch` 配列に `'**/e2e/privacy-policy.spec.ts'` を追加する
- [x] T013 [P] `pnpm lint` を実行し ESLint エラーがゼロであることを確認する。エラーがある場合は修正する（本フィーチャー追加コードはエラーなし・既存ファイルの pre-existing エラーは別途対応）

**Checkpoint**: `pnpm typecheck` と `pnpm lint` がエラーゼロ。`pnpm test:e2e --project=smoke` が全テスト合格

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 依存なし・即時開始可能
- **Phase 3 (US1)**: Phase 1 完了後に開始（T001 確認済みであること）
- **Phase 4 (US2)**: Phase 3 完了後に開始（`/privacy-policy` ページが存在すること）
- **Phase 5 (US3)**: Phase 3 完了後に開始（Phase 4 と並列可能）
- **Phase 6 (Polish)**: Phase 3・4・5 全て完了後

### User Story Dependencies

- **US1 (P1)**: Setup 完了後・依存なし → 最初に実装
- **US2 (P2)**: US1 完了後・US3 とは独立 → US3 と並列可能
- **US3 (P3)**: US1 完了後・US2 とは独立 → US2 と並列可能

### Within Each User Story

- US1: T002（ページ骨格）→ T003（本文10セクション）→ T004（スタイリング）
- US2: T005（単一タスク）
- US3: T006（型定義）→ T007（ラベル追加）→ T008（import）→ T009（JSXコンテンツ）

### Parallel Opportunities

- T005（US2）と T006〜T009（US3）は異なるファイルを編集するため並列実行可能
- T010（typecheck）と T013（lint）は並列実行可能
- T011（テスト作成）と T012（config更新）は並列実行可能

---

## Parallel Example: Phase 4 + Phase 5 同時進行

```bash
# US1 完了後、US2 と US3 を並列実行可能：

# 担当A
Task: T005 - src/app/(auth)/login/page.tsx を更新

# 担当B（または同時進行）
Task: T006 - Tab 型に 'app-info' 追加
Task: T007 - TAB_LABELS に 'app-info' 追加
Task: T008 - Link import 追加
Task: T009 - app-info タブコンテンツ追加
```

---

## Implementation Strategy

### MVP First（US1のみ）

1. Phase 1 完了（T001）
2. Phase 3 完了（T002〜T004）→ `/privacy-policy` が公開される
3. **STOP and VALIDATE**: `http://localhost:3000/privacy-policy` にアクセスし10セクション確認
4. この時点で法的要件（個人情報保護法第21条）を最低限充足

### Incremental Delivery

1. Phase 1 + Phase 3（US1）→ ポリシーページ公開
2. Phase 4（US2）→ ログインページにリンク追加（同意の可視化）
3. Phase 5（US3）→ 設定ページ内からアクセス可能に
4. Phase 6（Polish）→ テスト追加・CI統合

---

## Notes

- `【　】` プレースホルダー（事業者名・住所・連絡先）は TODO コメントで明示。実際の情報は事業者が確定後に差し替えること
- 「取得していない情報」（Google Analytics・決済情報・電話番号等）は research.md に記載のとおり、ポリシー本文に含めないこと
- [P] タスク = 異なるファイル・相互依存なし
- [Story] ラベル = ユーザーストーリーとの対応
- 各 Checkpoint で独立して動作確認すること
