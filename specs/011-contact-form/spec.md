# Spec: お問い合わせフォーム

## 概要

設定画面にお問い合わせフォームページ（`/settings/contact`）を新規追加する。  
ユーザーは「バグ報告」「機能追加リクエスト」「一般的なご質問」の3カテゴリで問い合わせを送信できる。  
バックエンドは Firebase Cloud Functions (v2) + Resend API を使用してメール送信を行う。

## ユーザーストーリー

### US1: お問い合わせフォームの送信（Priority: P1）🎯 MVP

**As a** ログイン済みユーザー  
**I want to** カテゴリ・件名・内容を入力してフォームを送信したい  
**So that** 開発チームに問い合わせが届く

**受け入れ基準:**
- AC-1: `/settings/contact` にアクセスするとお問い合わせフォームが表示される
- AC-2: 問い合わせ種別（バグ報告・機能追加リクエスト・一般的なご質問）を選択できる
- AC-3: 件名（最大100文字）と内容（最大2000文字）を入力できる
- AC-4: 送信ボタン押下で Firebase Cloud Function 経由でメール送信される
- AC-5: 送信成功時に「送信しました」メッセージが表示される
- AC-6: バリデーションエラー（空欄・文字数超過）が適切に表示される
- AC-7: 送信中はボタンがローディング状態になる

### US2: サイドバーからのアクセス（Priority: P2）

**As a** ログイン済みユーザー  
**I want to** サイドバーの設定セクションから「お問い合わせ」へ移動したい  
**So that** フォームに容易にアクセスできる

**受け入れ基準:**
- AC-8: サイドバーの「設定」セクションに「お問い合わせ」項目が表示される
- AC-9: クリックすると `/settings/contact` に遷移する
- AC-10: アクティブ時はハイライト表示される

### US3: アプリ情報タブからのアクセス（Priority: P3）

**As a** ログイン済みユーザー  
**I want to** 個人設定のアプリ情報タブの「お問い合わせ」からフォームに移動したい  
**So that** アプリ内から問い合わせできる

**受け入れ基準:**
- AC-11: アプリ情報タブの「お問い合わせ」リンクが `/settings/contact` を指す

## 技術仕様

- フロント: Next.js App Router、`(protected)` グループ内、Client Component
- バックエンド: Firebase Cloud Functions v2 (`onCall`)、`asia-northeast1` リージョン
- メール送信: Resend API（Firebase Secret `RESEND_API_KEY` で管理）
- ログ: Firestore `inquiries` コレクションに送信記録を保存
- エラー対応: Firebase Functions エラーを日本語でユーザーに表示
