# Research: コラボ調整機能 UI リデザイン

## デザインファイル取得

- URL: `https://api.anthropic.com/v1/design/h/KEJLSjVqmxQJChUzj8ngpQ?open_file=コラボ.html`
- 取得方法: gzip tarball（`リスケるGG_README-handoff.tar.gz`）をダウンロード・解凍
- 格納先: `specs/015-collab-ui-redesign/design/gg-readme/`
- 主要ファイル: `collab-pc.jsx`, `collab-mobile.jsx`, `collab-data.jsx`, `collab.css`, `components.jsx`
- チャット履歴: `chats/chat1.md` 〜 `chats/chat8.md`（設計の意図・反復の軌跡）

---

## デザインファイル調査結果

### ステータス体系（`collab-data.jsx`）

```js
const CB_STATUS = {
  prep:    { key: 'prep',    base: '準備中', zone: 'adjust' },
  recruit: { key: 'recruit', base: '募集中', zone: 'adjust' },
  fixed:   { key: 'fixed',   base: '確定',   zone: 'fixed'  },
};
```

- `adjust`ゾーン（調整中）: prep + recruit
- `fixed`ゾーン（確定済み）: fixed のみ

### ゾーン分割（`collab-pc.jsx` `CollabZone`）

```jsx
<CollabZone zone="adjust" />  // 調整中のコラボ
<CollabZone zone="fixed"  />  // 予定確定したコラボ
```

### コラボ行カード（`cbrow`）— PC

```
[エンブレム] [タイトル + バッジ / サブ情報] [参加者アバター重ね] [回答状況 or 確定日時] [詳細ボタン] [削除ボタン]
```

- 横長行カード。左ボーダー4px accent。hover で translateX(2px) + glow
- 確定案件は `border-left-color: var(--success)` + 確定日時パネル

### コラボカード（モバイル: `mcbcard`）

- タイトル + ステータスバッジ（上段）
- 候補日程数 or 確定日時（中段）
- 回答プログレスバー + 残り人数（下段）

### 詳細フォーム（`CollabDetailForm`）

```
Modal (1020px) 
└── cbform
    ├── cbform__split (flex-row / mobile: flex-col)
    │   ├── cbcol--main  (左: 入力項目, overflow-y: auto, max-height: 564px)
    │   │   ├── タイトル (input)
    │   │   ├── ステータス (Dropdown)
    │   │   ├── 内容 (textarea)
    │   │   ├── 候補日時 (CandidateEditor)
    │   │   └── 参加者 (ParticipantEditor)
    │   └── cbcol--chat  (右: 384px固定, コメント欄)
    │       └── CollabChat
    └── cbfooter
        ├── [＊は必須] テキスト
        ├── Btn(subtle) キャンセル
        ├── Btn(danger) 削除 ← isNew のとき非表示
        └── Btn(primary) 保存
```

**フィールド順**: タイトル → ステータス → 内容 → 候補日時 → 参加者（chat7でリオーダーリクエストあり、最終コードは上記順）

### 候補日時エディタ（`CandidateEditor`）

- カレンダーではなく**カード+インライン追加フォーム**
- カードに `cbcand__rank`（番号）+ 日時 + `○N △M ×N` 集計 + 「日程確定」ボタン + 削除ボタン
- 「候補日時を追加」ボタン（タスク画面の `kbcol__add` と同形式） → インライン入力展開

### 参加者エディタ（`ParticipantEditor`）

- `Dropdown`（チームメンバー選択） + `input`（外部ゲスト直接入力） + 「追加」ボタン
- 追加済みは `.cbchip`（アバター + 名前 + ゲストバッジ + ×ボタン）

### コラボチャット（`CollabChat`）

- `.tchat` クラスを再利用（タスク詳細コメントと同じスタイル）
- アバター + 名前 + 時刻 + バブル形式
- 入力欄（input + 送信ボタン）

### テーマ

- FPS テーマ: `.cb--fps` クラスで primary を `#3fb6e0` に
- CSS変数: `--cb-accent`, `--cb-accent-rgb` がアクセント

### モバイル固有

- 一覧: ゾーン切替ピルタブ（`.mtpills`）
- 詳細: `sch--mobile` クラス → `cbform__split` が `flex-direction: column`
- 「コラボ調整開始」はフローティングボタン（`position: absolute`）
- `CollabDetailForm` はPC版と共通（CSS で1カラムに）

### チャット履歴から判明した最終変更

| チャット | 変更内容 |
|---------|---------|
| chat7 | 候補日時エディタをカレンダー→カード形式に変更。レスポンシブ追加。フィールド順変更リクエスト |
| chat8 | 「作成者・更新者・日時」をフォームから**削除**。「URLをコピー」ボタンを追加 |

> **注意**: ユーザーの現行テキスト仕様では「作成者・作成日時・最終更新者・最終更新日時」を表示項目として明示しているため、本プランでは**メタ情報を残す**。デザインファイルの削除はデザイン過程の一時的な判断とみなす。

---

## 既存コードとの対応

### `CollabStatus` 型の変更

```ts
// 変更前
export type CollabStatus = 'open' | 'confirmed' | 'expired' | 'cancelled';

// 変更後
export type CollabStatus = 'draft' | 'open' | 'confirmed' | 'expired' | 'cancelled';
```

### `COLLAB_STATUS_LABELS` の変更

```ts
export const COLLAB_STATUS_LABELS: Record<CollabStatus, string> = {
  draft:     '準備中',  // 新規追加
  open:      '募集中',  // 変更: 調整中 → 募集中
  confirmed: '確定',    // 変更: 予定決定 → 確定
  expired:   '終了',
  cancelled: '終了',
};
```

### 既存コンポーネントの活用

| デザインコンポーネント | 対応する既存コンポーネント |
|----------------------|--------------------------|
| `Icon` (design) | `Icon` @ `src/components/ui/Icon.tsx` |
| `Avatar` (design) | 既存なし → 新規実装（アバター用ヘルパー関数）|
| `Dropdown` (design) | HTML `<select>` またはカスタム |
| `TopBar` (design) | `TopBar` @ `src/components/layout/TopBar.tsx` |
| `.tchat` (design) | 既存の `CollabDetailModal.tsx` 内コメント欄を参考 |

---

## 技術決定事項

### Decision 1: `participantResponses` の値型

- **Decision**: `'ok' | 'ng' | 'maybe' | 'pending'` に拡張（`'pending'` は後方互換で残す）
- **Rationale**: デザインの `△` = `maybe`。既存コードの `'pending'` も同義に扱う

### Decision 2: 候補日時 ○△× ホバーツールチップ

- **Decision**: デザインファイルにはツールチップ実装なし → テキスト仕様の要件として実装
- **Rationale**: `cbcand__t--ok/maybe/ng` の数字を `<span title="">` または Tooltip コンポーネントでラップ

### Decision 3: CollabForm.tsx の廃止

- **Decision**: `CollabDetailModal.tsx` に統合し `CollabForm.tsx` を削除
- **Rationale**: デザインの `CollabDetailForm` が新規作成・編集を統合。Constitution I 準拠

### Decision 4: メタ情報の表示

- **Decision**: テキスト仕様に従い `cbmeta` セクション（作成者・更新者・日時）をフォームに含める
- **Rationale**: デザインファイルの chat8 では削除されたが、現行ユーザー要件が明示しているため復活。CSS `.cbmeta` は design ファイルに定義済み
- **実装**: `CollabSession` に `updatedBy?: string` / `updatedAt?: Date` を追加

### Decision 5: フッターボタン順

- **Decision**: 右から「キャンセル → 削除（編集時）→ 保存」（テキスト仕様に従う）
- **Rationale**: デザインファイル最終版の `URLをコピー` ボタンは今回の実装範囲外（コラボ調整URLは現行で未実装）
