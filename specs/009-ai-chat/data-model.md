# Data Model: AIチャット全画面化

## エンティティ定義

### ChatMessage（セッション保持）

Firestore への永続化なし。Zustand store (`aiChat.ts`) で管理し、同セッション内はページ遷移後も保持する。

```typescript
interface ChatMessage {
  id: string;              // crypto.randomUUID()
  role: 'user' | 'assistant';
  content: string;         // テキスト全文（%%PROPOSAL%%ブロックを含む場合あり）
}
```

### Proposal（解析済み提案）

AIレスポンスの `%%PROPOSAL%%...%%/PROPOSAL%%` ブロックを解析して得られる。

```typescript
interface Proposal {
  type: 'schedule' | 'task' | 'collab';
  title: string;
  // スケジュール用
  startAt?: string;        // ISO 8601
  endAt?: string;          // ISO 8601
  description?: string;
  // タスク用
  dueDate?: string;        // YYYY-MM-DD
  // コラボ調整用
  partnerName?: string;
  proposedDates?: string[]; // ISO 8601[]
}
```

### ProposalStatus（UI状態）

```typescript
type ProposalStatus = 'pending' | 'loading' | 'done' | 'error';
```

## Zustand Store 設計

### `src/stores/aiChat.ts`

チャット履歴をグローバルに保持し、ページ遷移後も同セッション内は残す。

```typescript
interface AIChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  pendingProposal: Proposal | null;
  proposalStatus: ProposalStatus;
  proposalMessageId: string | null;

  // アクション
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (id: string, chunk: string) => void;
  setIsLoading: (v: boolean) => void;
  setPendingProposal: (p: Proposal | null) => void;
  setProposalStatus: (s: ProposalStatus) => void;
  setProposalMessageId: (id: string | null) => void;
  clearMessages: () => void;  // 「会話をリセット」ボタン用
}
```

## コンポーネント状態設計

### AIChatPage（全画面チャット）

```typescript
// Zustand store から取得（ページ遷移後も保持）
const {
  messages, isLoading, pendingProposal, proposalStatus, proposalMessageId,
  addMessage, updateLastAssistantMessage, setIsLoading,
  setPendingProposal, setProposalStatus, setProposalMessageId,
} = useAIChatStore();

// ローカル state（UI のみ）
const [input, setInput] = useState('');
const [error, setError] = useState<string | null>(null);
const messagesRef = useRef<ChatMessage[]>([]);  // stale closure 対策
const proposalMessageIdRef = useRef<string | null>(null);
```

## ページレイアウト設計

### 空の状態（messages.length === 0）: 中央配置

```
┌─────────────────────────────────────────────┐
│ TopBar: "AIに相談"                    [🗑️]   │  h-14
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│           ✨ AIアシスタント                 │  flex-1 flex items-center
│       スケジュールやタスクの登録、           │  justify-center flex-col
│       チームデータへの質問ができます         │
│                                             │
│   ┌─────────────────────────────────────┐  │
│   │ メッセージを入力... (textarea)    → │  │  中央配置の入力欄
│   └─────────────────────────────────────┘  │
│    [📅 配信告知] [✅ タスク追加] [🤝 コラボ]  │  例示チップ
│                                             │
└─────────────────────────────────────────────┘
```

### 会話中（messages.length > 0）: 下部固定

```
┌─────────────────────────────────────────────┐
│ TopBar: "AIに相談"                    [🗑️]   │  h-14
├─────────────────────────────────────────────┤
│                                             │
│  [ユーザー]  コラボ配信を入れたい     →    │  flex-1 overflow-y-auto
│  ← [AI]     誰と？いつ？                   │
│                                             │
│  [ユーザー]  ○○さんと6/5 20時〜    →    │
│  ← [AI]     じゃあこれでどう？             │
│              ┌──────────────────────┐      │
│              │ 📅 スケジュール       │      │
│              │ コラボ配信（○○さん） │      │
│              │ 開始: 6/5 20:00       │      │
│              │ [登録する] [修正する]  │      │
│              └──────────────────────┘      │
│                                             │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ メッセージを入力...（自動伸縮textarea）  │→│  下部固定
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## ルーティング

| パス | コンポーネント | 説明 |
|------|--------------|------|
| `/chat` | `AIChatPage` | AIチャット専用ページ |

## ナビゲーション変更

### Sidebar.tsx — セクション追加

```typescript
// メインセクションの末尾または先頭に追加
{ href: '/chat', label: 'AIに相談', icon: 'auto_awesome' }
```

### BottomNav.tsx — 中央ボタンを置き換え

```tsx
{/* Before: スケジュール追加ボタン（アンバー色） */}
{/* After: AIチャットボタン（パープル色） */}
<Link href="/chat" aria-label="AIに相談">
  <span className="flex items-center justify-center w-11 h-11 bg-purple rounded-[10px] text-white shadow-md">
    <span className="material-icons text-[22px]">auto_awesome</span>
  </span>
  <span className="text-[10px] text-muted">AI</span>
</Link>
```

### TopBar.tsx — 「AIで登録」ボタン削除

`openExtract()` の呼び出しと `useAIStore` のインポートを削除する。

## プロポーザルブロック解析

```typescript
const PROPOSAL_REGEX = /%%PROPOSAL%%([\s\S]*?)%%\/PROPOSAL%%/;

function parseProposalFromContent(content: string): {
  text: string;
  proposal: Proposal | null;
} {
  const match = PROPOSAL_REGEX.exec(content);
  if (!match) return { text: content, proposal: null };
  try {
    const proposal = JSON.parse(match[1].trim()) as Proposal;
    const text = content.replace(PROPOSAL_REGEX, '').trim();
    return { text, proposal };
  } catch {
    return { text: content, proposal: null };
  }
}
```
