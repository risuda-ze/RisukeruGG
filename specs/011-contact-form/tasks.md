# Tasks: お問い合わせフォーム実装

**Input**: `specs/011-contact-form/spec.md`

---

## Phase 1: Setup

- [x] T001 `.specify/feature.json` を `specs/011-contact-form` に更新する
- [x] T002 `CLAUDE.md` の進行中フィーチャーを更新する
- [x] T003 `specs/011-contact-form/spec.md` を作成する

---

## Phase 3: User Story 1 - お問い合わせフォーム（Priority: P1）🎯 MVP

- [x] T004 [US1] `functions/package.json` に `resend` を追加し `pnpm install` する
- [x] T005 [US1] `functions/src/contact/sendContactEmail.ts` を新規作成する（`onCall` v2、`defineSecret('RESEND_API_KEY')`、バリデーション、Resend 送信、Firestore ログ保存）
- [x] T006 [US1] `functions/src/index.ts` に `export * from './contact/sendContactEmail'` を追加する
- [x] T007 [US1] `src/app/(protected)/settings/contact/page.tsx` を新規作成する（Client Component、3カテゴリ選択・件名・内容フォーム、`httpsCallable` 送信、成功/エラー UI）

---

## Phase 4: User Story 2 - サイドバー追加（Priority: P2）

- [x] T008 [US2] `src/components/layout/Sidebar.tsx` の設定セクションに `{ href: '/settings/contact', label: 'お問い合わせ', icon: 'mail_outline' }` を追加する

---

## Phase 5: User Story 3 - アプリ情報タブからのアクセス（Priority: P3）

- [x] T009 [US3] `src/app/(protected)/settings/profile/page.tsx` のアプリ情報タブ・サポートセクションの `mailto:` リンクを `<Link href="/settings/contact">` に変更する

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T010 `pnpm typecheck` でエラーゼロを確認する
- [x] T011 `pnpm lint` でフィーチャー追加コードのエラーがゼロであることを確認する（既存ファイルの pre-existing エラーは別対応）
- [x] T012 `tests/e2e/contact.spec.ts` を新規作成する（未認証リダイレクト確認・ログインページ回帰テスト）
- [x] T013 `playwright.config.ts` の smoke プロジェクトに `**/e2e/contact.spec.ts` を追加する
- [x] T014 `functions/src/contact/sendContactEmail.ts` の `pnpm build` でコンパイルエラーゼロを確認する

---

## Notes

- `RESEND_API_KEY` は Firebase Secret として設定が必要: `firebase functions:secrets:set RESEND_API_KEY`
- `toEmail`（`contact@example.com`）は本番デプロイ前に実際のメールアドレスに変更すること
- `fromEmail` は Resend で検証済みドメインに変更すること（現在は `onboarding@resend.dev` = テスト専用）
- Firestore `inquiries` コレクションへの書き込みを Security Rules で管理すること（Functions 経由のみ許可）
