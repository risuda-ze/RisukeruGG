# Implementation Plan: AIチャット全画面化

**Branch**: `claude/friendly-cohen-d11c4a` | **Date**: 2026-05-24 | **Spec**: `specs/009-ai-chat/spec.md`

## Summary

現在のフローティングパネル（380×520px）形式のAIチャットを、ChatGPTライクな専用フルページ画面に置き換える。
ユーザーは `/chat` ルートに遷移してAIと対話し、スケジュール・タスク・コラボを自然言語で登録できる。

**確定した設計決定（/speckit-clarify より）**:
- **チャット履歴**: Zustand でグローバル管理し、同セッション内（ページ遷移後も）保持する
- **TopBar「AIで登録」ボタン**: 廃止。AIチャットに一本化する
- **BottomNav 中央ボタン**: 「追加」→「AI」に置き換え
- **入力欄レイアウト**: メッセージ0件のとき画面中央、会話開始後は下部固定

## Technical Context

**Language/Version**: TypeScript 5.x / Next.js 14 App Router  
**Primary Dependencies**: Vercel AI SDK (`ai` + `@ai-sdk/anthropic`)、Zustand、Tailwind CSS  
**Storage**: N/A（セッションメモリのみ、Firestore永続化なし）  
**Testing**: Vitest（ロジック）、Playwright E2E（主要フロー）  
**Target Platform**: Web（PC / モバイルレスポンシブ）  
**Project Type**: Web アプリケーション機能追加  
**Performance Goals**: AIストリーミング初回表示 < 1s  
**Constraints**: セッションごとの揮発性履歴・Anthropic APIキー必須  
**Scale/Scope**: 単一ページ追加（`/chat`）+ 既存コンポーネント修正

## Constitution Check

_GATE: Must pass before Phase 0 research._

| # | Principle | Check | Status |
|---|-----------|-------|--------|
| I | シンプルさ優先 | セッション内メモリのみ。Firestoreへの永続化・セッション管理は不要 | ✅ PASS |
| II | TypeScript型安全 | ChatMessage / Proposal 型を明示定義。AIレスポンスはZodでスキーマ検証済み | ✅ PASS |
| III | テスト方針 | UIコンポーネントテスト不要。AIロジック（提案解析）はユニットテスト任意 | ✅ PASS |
| IV | Firebase・セキュリティ | チャット登録は既存リポジトリ関数経由。直接Firestore書き込みなし | ✅ PASS |
| V | 日本語コメント | コードコメントは日本語で記述 | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/009-ai-chat/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code

```text
src/
├── app/(protected)/
│   └── chat/
│       └── page.tsx                    # 新規: /chat ページ
├── components/ai/
│   ├── AIChatPage.tsx                  # 新規: フルページチャットUI（中央→下部入力欄）
│   ├── AIChatWidget.tsx                # 修正: フローティングボタン→/chatへ遷移のみ
│   ├── AIExtractModal.tsx              # 削除（チャットに一本化）
├── stores/
│   └── aiChat.ts                       # 新規: チャット履歴のZustand store（セッション保持）
└── components/layout/
    ├── Sidebar.tsx                     # 修正: AIチャットナビ追加
    ├── BottomNav.tsx                   # 修正: 中央「追加」→「AI」ボタンに置き換え
    └── TopBar.tsx                      # 修正: 「AIで登録」ボタン削除
```

## Implementation Phases

### Sprint 1: 専用ページ + 基本チャットUI

**目標**: `/chat` ページでChatGPTライクな会話ができる

実装内容:
- `src/stores/aiChat.ts` 新規作成
  - メッセージ一覧・提案状態を Zustand で管理
  - セッション内（ページ遷移後も）履歴を保持
- `src/app/(protected)/chat/page.tsx` 新規作成
- `src/components/ai/AIChatPage.tsx` 新規作成
  - **入力欄レイアウト**: messages.length === 0 のとき中央配置（ChatGPT風）、会話後は下部固定
  - ユーザー/AIメッセージバブル
  - ストリーミング表示（タイピングインジケーター）
  - Enter送信 / Shift+Enter改行（textarea 自動伸縮）
  - 提案カード（ProposalCard）をインライン表示
  - Firestore登録（createSchedule / createTask / createCollabSession）
- `AIChatWidget.tsx` を修正
  - フローティングパネルを削除
  - フローティングボタン → `/chat` へルーター遷移
- `AIExtractModal.tsx` を削除
- `TopBar.tsx` から「AIで登録」ボタンを削除
- `Sidebar.tsx` に「AIに相談」ナビリンク追加
- `BottomNav.tsx` の中央「追加」ボタンを「AI」ボタンに置き換え

受け入れ基準:
1. `/chat` にアクセスして質問を送信するとAIが返答する
2. 複数回のやり取り（マルチターン）が会話として表示される
3. AIが `%%PROPOSAL%%` ブロックを返すと提案カードが表示される
4. 「登録する」ボタンで Firestore に登録され、成功が確認できる
5. 「OK」「はい」等のテキストでも登録が実行される
6. アプリ無関係な質問には短い拒否メッセージが返る
7. モバイル・PCどちらでも使いやすいレイアウト

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|-----------|--------------------------------------|
| N/A | - | - |
