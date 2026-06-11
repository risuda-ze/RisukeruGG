# UI Contracts: コラボ調整機能（デザインファイル準拠）

> 参照: `specs/015-collab-ui-redesign/design/gg-readme/project/collab-pc.jsx`, `collab-mobile.jsx`, `collab.css`

---

## ページ構造 (`/collabs`)

```tsx
// src/app/(protected)/collabs/page.tsx
<div className="rk sch cb--fps">        // FPS テーマ
  <Sidebar active="collab" />
  <div className="sch__main">
    <TopBar title="コラボ調整" desc="..." />
    <CollabBoard />
  </div>
  {modal && <CollabModal />}
</div>
```

---

## CollabBoard（一覧ボード）

```
cbboard
└── cbscroll
    ├── cbbanner（バナーヘッダー: コラボ調整 + 「コラボ調整開始」ボタン）
    ├── hint（ヘルプヒント・閉じられる）
    ├── CollabZone zone="adjust"（調整中ゾーン）
    └── CollabZone zone="fixed"（予定確定ゾーン）
```

---

## CollabZone

```tsx
interface CollabZoneProps {
  zone: 'adjust' | 'fixed';
  onOpen: (session: CollabSession) => void;
  onDelete: (session: CollabSession) => void;
}
```

**表示**: セクションヘッダー（アイコン+タイトル+件数+説明） + CollabRow のリスト | 空状態メッセージ

---

## CollabRow（横長カード）

```tsx
interface CollabRowProps {
  collab: CollabSession;
  onOpen: (session: CollabSession) => void;
  onDelete: (session: CollabSession) => void;
}
```

**CSS クラス**: `.cbrow` / `.cbrow--fixed`（確定時）

```
[.cbrow__emblem]  [.cbrow__main]              [.cbava]       [.cbresp]           [.cbrow__actions]
  アイコン          タイトル+バッジ               参加者重ね       残り回答/確定日時     詳細ボタン+削除ボタン
                   サブ情報
```

| 要素 | 調整中 | 確定済み |
|------|--------|---------|
| `cbrow__emblem` | collab アイコン、primary-950 背景 | check アイコン、success-dim 背景 |
| `cbresp` | 残り N 人 / M人中 + プログレスバー | 確定日時パネル（success-dim 背景）|
| `border-left` | `var(--cb-accent)` | `var(--success)` |

---

## CollabBadge（ステータスバッジ）

```tsx
interface CollabBadgeProps {
  status: CollabStatus;  // 'draft' | 'open' | 'confirmed' | 'expired' | 'cancelled'
}
```

| status | CSS クラス | bg | color |
|--------|-----------|-----|-------|
| `draft` | `cbbadge--prep` | `var(--surface)` | `var(--text-secondary)` |
| `open` | `cbbadge--recruit` | `rgba(cb-accent, 0.14)` | `var(--cb-accent)` |
| `confirmed` | `cbbadge--fixed` | `var(--success-dim)` | `var(--success)` |
| `expired`/`cancelled` | `cbbadge--prep` | `var(--surface)` | `var(--text-secondary)` |

```
<span class="cbbadge cbbadge--{status}">
  <span class="cbbadge__dot" />
  <span class="cbbadge__main">{label}</span>
</span>
```

---

## PartyAvatars（参加者アバター重ね）

```tsx
interface PartyAvatarsProps {
  members: string[];       // 参加者名リスト
  memberMap: Record<string, { tone: string; guest: boolean }>;
  max?: number;            // デフォルト 4
}
```

**CSS クラス**: `.cbava` > `.cbava__stack` + `.cbava__more`（+N）+ `.cbava__count`（N名）

アバターは `.avatar` の `margin-left: -9px` で重ね表示。

---

## CollabDetailModal（詳細ポップアップ）

```tsx
interface CollabDetailModalProps {
  session: CollabSession | null;  // null = 新規作成モード
  members: TeamMember[];          // チームメンバー一覧（参加者プルダウン用）
  onClose: () => void;
  onSaved: (session: CollabSession) => void;
  onDeleted: (id: string) => void;
}
```

**CSS クラス**: `.smodal > .smodal__card.smodal__card--collab`（width: 1020px）

```
smodal
└── smodal__card--collab (1020px)
    ├── smodal__hd（タイトル + 閉じるボタン）
    ├── cbform
    │   ├── cbform__split
    │   │   ├── cbcol--main（左: 入力, max-height: 564px, overflow-y: auto）
    │   │   │   ├── タイトル（input.sform__title-input, required）
    │   │   │   ├── ステータス（Dropdown, required, options: 準備中/募集中/確定）
    │   │   │   ├── 内容（textarea）
    │   │   │   ├── 候補日時（CandidateEditor, required: 1件以上）
    │   │   │   └── 参加者（ParticipantEditor, required: 1人以上）
    │   │   └── cbcol--chat（右: 384px固定, コメント欄）
    │   │       └── CollabChat
    │   └── cbfooter
    │       ├── .cbfooter__note（「＊は必須項目」）
    │       ├── Btn(subtle) キャンセル
    │       ├── Btn(danger) 削除（!isNew のとき表示）
    │       └── Btn(primary) 保存
    └── （モバイル: cbform__split → flex-direction: column）
```

---

## CandidateEditor（候補日時エディタ）

```tsx
interface CandidateEditorProps {
  collab: CollabSession | null;
  participants: CollabParticipant[];   // ホバーツールチップ用
}
```

**カード構造** (`.cbcand__item`):
```
[.cbcand__rank] [.cbcand__when] [.cbcand__tally] [.cbcand__confirm] [.cbcand__x]
  番号            日時            ○N △M ×K          日程確定ボタン       削除
```

**ツールチップ（ホバー）**:
- `○N` / `△M` / `×K` の `<span>` に `onMouseEnter` で参加者アバター+名前のポップアップ
- デザインファイルには未実装 → テキスト仕様に従い追加実装

**追加フォーム** (`.cbcand__addinline`): `<input type="date">` + `<input type="time">` + 追加ボタン + キャンセル

**「候補日時を追加」ボタン** (`.cbcand__addrow`): タスク画面の `kbcol__add` と同形式（破線ボーダー）

---

## ParticipantEditor（参加者エディタ）

```tsx
interface ParticipantEditorProps {
  collab: CollabSession | null;
  teamMembers: TeamMember[];
  onChange: (participants: CollabParticipant[]) => void;
}
```

**構造**:
```
.cbpart
├── .cbpart__addrow
│   ├── Dropdown（チームメンバー選択）[flex: 0 0 168px]
│   ├── input（外部ゲスト名直接入力）[flex: 1]
│   └── Btn(subtle) 追加
└── .cbpart__list
    └── .cbchip（アバター + 名前 + [ゲスト] + ×）
```

---

## CollabChat（コメント欄）

**CSS クラス**: `.tchat`（既存タスク詳細と共通スタイル）

```
.tchat
├── .tchat__list（空時: .tchat__empty）
│   └── .tchat__msg（.tchat__msg--me で自分のメッセージ）
│       ├── Avatar
│       └── .tchat__body（.tchat__meta + .tchat__bubble）
└── .tchat__inputrow
    ├── .tchat__field（input）
    └── .tchat__send（送信ボタン）
```

---

## モバイルレスポンシブ

| 要素 | PC | モバイル（390px） |
|------|-----|-----------------|
| 一覧 | 2ゾーン縦並び（`cbzone`）| ゾーン切替ピルタブ（`mtpills`） |
| カード | 横長行（`cbrow`）| コンパクト縦型（`mcbcard`）|
| 詳細フォーム | 左右2ペイン（`cbform__split`）| 縦1カラム（`sch--mobile` で `flex-direction: column`）|
| 「調整開始」 | 右上ボタン（`cbbanner__actions`）| 下部フローティングボタン |

**ブレークポイント**: `sch--mobile` クラスを幅 768px 以下で適用（または `md:` プレフィックスで制御）
