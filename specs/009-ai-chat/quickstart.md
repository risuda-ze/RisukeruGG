# Quickstart: AIチャット全画面化

## 起動方法

```bash
# Docker 開発環境（推奨）
docker compose up -d
# → http://localhost:3000 でアクセス可能

# ローカル直接起動
pnpm dev
# → http://localhost:3000
```

## テスト手順

1. `http://localhost:3000` にアクセスしてログイン
2. サイドバーまたはBottomNavの「AIに相談」をクリック  
   → `/chat` ページに遷移する
3. 「今日の配信予定を入れて」と入力して Enter  
   → AI が質問してくる（日時など）
4. 「20時から2時間」と返す  
   → AI が `%%PROPOSAL%%` を返し、提案カードが表示される
5. 「登録する」ボタンをクリック  
   → 「登録しました！」と表示され、スケジュールページへのリンクが出る
6. 「ゲームの攻略法教えて」と打つ  
   → 「ごめん！それはRisukeruGGのことしか...」と短く断られる

## ファイル変更一覧

| ファイル | 種別 | 内容 |
|---------|------|------|
| `src/app/(protected)/chat/page.tsx` | 新規 | /chatルートページ |
| `src/components/ai/AIChatPage.tsx` | 新規 | フルページチャットUI |
| `src/components/ai/AIChatWidget.tsx` | 修正 | パネル削除・ボタンを/chatへ遷移 |
| `src/components/layout/Sidebar.tsx` | 修正 | AIチャットナビ追加 |
| `src/components/layout/BottomNav.tsx` | 修正 | AIチャットナビ追加 |
| `src/components/layout/TopBar.tsx` | 修正 | 「AIで登録」ボタン維持（AIExtractModal用） |

## 環境変数

```env
ANTHROPIC_API_KEY=sk-ant-...   # Anthropic APIキー（必須）
```
