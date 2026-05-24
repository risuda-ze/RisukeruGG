# Research: AIチャット全画面化

## 調査対象

### 1. 現行実装の課題分析

**Decision**: フローティングパネルを廃止し、専用ページに移行する  
**Rationale**: 380×520px のポップアップでは長い会話を追いにくく、提案カードも窮屈。フルページなら会話体験が大幅に向上する  
**Alternatives considered**: パネルをリサイズ可能にする → ドラッグ実装のコストが高く YAGNI

### 2. チャット履歴の永続化

**Decision**: セッション内メモリのみ（Firestore永続化なし）  
**Rationale**: ユーザー要件「その時だけのチャット履歴」に合致。設計がシンプルになる。将来的に必要であれば追加可能  
**Alternatives considered**:  
- Firestore に保存 → 設計・コスト・プライバシー面でオーバーエンジニアリング  
- localStorage → ページリロードで残るが要件と一致しない

### 3. 入力UIのデザイン

**Decision**: `<textarea>` (1〜5行自動伸縮) + Enter送信 / Shift+Enter改行  
**Rationale**: ChatGPTの標準的な操作感と一致する  
**Alternatives considered**: 1行 `<input>` → 長文が打ちにくい

### 4. フローティングボタンの役割変更

**Decision**: フローティングボタンは残すが、クリックでパネルを開く代わりに `/chat` へルーター遷移する  
**Rationale**: ボタンはどのページにいても「AIに相談する」エントリポイントとして機能し続ける  
**Alternatives considered**: ボタン廃止してサイドバーのみ → モバイルでの発見性が低下する

### 5. メッセージストリーミング

**Decision**: 既存の `fetch` + `ReadableStream` 手動ストリーミングを流用する  
**Rationale**: 既に動作確認済みで AI SDK v6 互換。変更コストが低い  
**Alternatives considered**: AI SDK の `useChat` フック → v6 では削除済み

### 6. 提案カード（ProposalCard）の配置

**Decision**: アシスタントメッセージバブルの直下にインライン表示する  
**Rationale**: 現行実装と同じ設計で、カードがより大きく表示できる  
**Alternatives considered**: モーダル表示 → コンテキストが失われる

### 7. 状態管理

**Decision**: `AIChatPage` のローカル `useState` のみ。Zustand store は使用しない  
**Rationale**: チャット状態はページスコープで十分。グローバル状態にする理由がない  
**Alternatives considered**: Zustand store → 永続化しないなら過剰

### 8. BottomNav / Sidebar へのナビ追加

**Decision**: 「AIに相談」メニューを追加する（`auto_awesome` アイコン）  
**Rationale**: メインコンテンツと同列に並べることで発見性を高める  
**Alternatives considered**: ヘッダーボタンのみ → モバイルで発見しにくい
