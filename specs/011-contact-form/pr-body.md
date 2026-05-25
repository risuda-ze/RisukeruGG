## Summary

- `/settings/contact` に新しいお問い合わせページを追加（バグ報告・機能追加リクエスト・一般的なご質問）
- Firebase Cloud Functions v2 + Resend API でメール送信（`sendContactEmail` 関数）
- Firestore `inquiries` コレクションに送信履歴を記録
- サイドバー「設定」セクションに「お問い合わせ」ナビ項目を追加
- アプリ情報タブのサポートリンクを `mailto:` からインアプリ遷移（`/settings/contact`）に変更

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `functions/src/contact/sendContactEmail.ts` | NEW: お問い合わせメール送信 Cloud Function |
| `src/app/(protected)/settings/contact/page.tsx` | NEW: お問い合わせフォームページ |
| `src/components/layout/Sidebar.tsx` | UPDATE: お問い合わせナビ項目を追加 |
| `src/app/(protected)/settings/profile/page.tsx` | UPDATE: アプリ情報タブのサポートリンクを変更 |
| `tests/e2e/contact.spec.ts` | NEW: E2E スモークテスト |
| `playwright.config.ts` | UPDATE: contact.spec.ts を smoke プロジェクトに追加 |

## デプロイ前の必須作業

1. **Resend API キーを Firebase Secret に設定する:**
   ```bash
   firebase functions:secrets:set RESEND_API_KEY
   ```

2. **`sendContactEmail.ts` の TODO を更新する:**
   - `toEmail`: `contact@example.com` → 実際のお問い合わせ受信メールアドレス
   - `fromEmail`: `onboarding@resend.dev` → Resend で検証済みのドメイン

3. **Firestore Security Rules** に `inquiries` コレクションのルールを追加（Functions 経由のみ書き込み許可）

## Test plan

- [ ] `/settings/contact` にアクセスしてフォームが表示されることを確認
- [ ] 3種別（バグ報告・機能追加リクエスト・一般的なご質問）を選択できることを確認
- [ ] 件名・内容が未入力の場合に送信ボタンが無効であることを確認
- [ ] 件名100文字・内容2000文字超過時に文字数エラーが表示されることを確認
- [ ] 送信後に「送信しました」成功メッセージが表示されることを確認
- [ ] サイドバーの「設定」セクションに「お問い合わせ」が表示されることを確認
- [ ] アプリ情報タブの「お問い合わせ」クリックで `/settings/contact` に遷移することを確認
- [ ] `pnpm typecheck` エラーゼロ ✅
- [ ] functions の `pnpm build` エラーゼロ ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)
