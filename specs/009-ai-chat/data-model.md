# Data Model: AIチャット全画面化

## エンティティ定義

### ChatMessage（セッションメモリ）

Firestore への永続化なし。コンポーネント内 `useState` で管理する。

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

## コンポーネント状態設計

### AIChatPage（全画面チャット）

```typescript
// ローカル state
const [messages, setMessages] = useState<ChatMessage[]>([]);
const messagesRef = useRef<ChatMessage[]>([]);  // stale closure 対策

const [input, setInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// 提案管理
const [pendingProposal, setPendingProposal] = useState<Proposal | null>(null);
const [proposalStatus, setProposalStatus] = useState<ProposalStatus>('pending');
const [proposalMessageId, setProposalMessageId] = useState<string | null>(null);
const proposalMessageIdRef = useRef<string | null>(null);
```

## ページレイアウト設計

```
┌─────────────────────────────────────────────┐
│ TopBar: "AIに相談"                            │  h-14
├─────────────────────────────────────────────┤
│                                             │
│  [空の状態: 例示ボタン]                      │  flex-1 overflow-y-auto
│                                             │
│  [ユーザー]  こんにちは                →    │
│  ← [AI]     ...                            │
│                                             │
│  [ユーザー]  タスク追加して          →    │
│  ← [AI]     どんなタスク？                  │
│              ┌──────────────────────┐      │
│              │ ✅ タスク            │      │
│              │ 動画編集              │      │
│              │ [登録する] [修正する]  │      │
│              └──────────────────────┘      │
│                                             │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ メッセージを入力...（自動伸縮textarea）  │→│  h-auto min-h-[48px]
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## ルーティング

| パス | コンポーネント | 説明 |
|------|--------------|------|
| `/chat` | `AIChatPage` | AIチャット専用ページ |

## ナビゲーション追加

```typescript
// Sidebar.tsx の NAV_SECTIONS にセクション追加
{
  label: 'AIアシスタント',
  icon: 'auto_awesome',
  items: [
    { href: '/chat', label: 'AIに相談', icon: 'auto_awesome' },
  ],
}
```

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
