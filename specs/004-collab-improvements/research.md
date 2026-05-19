# Research: コラボ機能改善

## タイムゾーン問題の根本原因

### Decision: クライアント側で ISO 8601 UTC 文字列に変換してから送信

**Rationale**:
- ブラウザの `datetime-local` input は `"2026-05-19T15:00"` 形式（タイムゾーンなし）の文字列を返す
- ブラウザ環境: `new Date("2026-05-19T15:00")` → ローカル時間として解釈（JST ならば 15:00 JST）
- Node.js (Cloud Functions) 環境: `new Date("2026-05-19T15:00")` → **UTC** として解釈 → 15:00 UTC = 24:00 JST（翌日）
- 修正: `new Date(localStr).toISOString()` でブラウザがローカル時間として解釈した後、UTC の ISO 文字列に変換
  - 例: JST 15:00 → `new Date("2026-05-19T15:00")` = 2026-05-19T06:00:00Z → Cloud Function が正しく JST 15:00 として Firestore に保存

**Alternatives considered**:
- タイムゾーンオフセットを手動で付与（`+09:00` をハードコード）: JST 固定だが夏時間非対応で将来のリスク
- Cloud Function 側でタイムゾーン処理: クライアントから意図を伝えられないため不可

**Impact files**:
- `src/components/collab/CollabForm.tsx:52` — `proposedDates: validDates.map(d => new Date(d).toISOString())`
- `src/components/collab/CollabResponseForm.tsx:74` — `alternativeDates: alternativeDate ? [new Date(alternativeDate).toISOString()] : []`

---

## 候補日程ソートとインデックス管理

### Decision: sortedIndexPairs パターン — 元インデックスを保持したソート済み配列

**Rationale**:
- `participantResponses` は `{respondentKey: {dateIndex: 'ok'|'ng'|'pending'}}` でインデックスをキーとして使用
- 表示順を変えると `getDateAggregates(i)` が正しいデータを参照できなくなる
- 解決: `const sortedPairs = proposedDates.map((d, i) => ({date: d, originalIndex: i})).sort((a, b) => a.date.getTime() - b.date.getTime())`
- 表示ループで `pair.originalIndex` を集計・選択のインデックスとして使用

**Alternatives considered**:
- Firestore 保存時にソートして保存: 書き込みが増え、既存データとの互換性が失われる
- 表示のみソート（インデックス無視）: 既存の participantResponses が誤った日程に集計される

---

## コメント追記方式

### Decision: `respondToCollab` Cloud Function 内でコメントを追記

**Rationale**:
- `CollabResponseForm` は認証なしの公開ページから呼び出される
- Firebase Security Rules が通常 authenticated users の書き込みのみ許可
- Cloud Function (Firebase Admin SDK) は Security Rules を迂回して書き込み可能
- `respondToCollab` はすでにセッションを更新しており、同トランザクション内でコメントも追記できる

**Implementation**:
```typescript
// respondToCollab.ts の updatePayload に追加
if (note?.trim()) {
  updatePayload['comments'] = FieldValue.arrayUnion({
    id: `resp_${Date.now()}`,
    authorId: respondentKey,
    authorName: respondentName ?? 'anonymous',
    text: note.trim(),
    createdAt: now,
  });
}
```

**Alternatives considered**:
- クライアント側 Firestore 直接書き込み: Security Rules の変更が必要、認証されていないユーザーに書き込み権限を与えるリスク
- 新しい Cloud Function 作成: 既存 `respondToCollab` を拡張する方がシンプル

---

## 候補日程の編集・削除

### Decision: proposedDates 配列全体を置換 + participantResponses の再インデックス

**Rationale**:
- `arrayRemove` は exact match が必要で Timestamp の精度問題がある
- 配列全体を置換する方が確実
- 削除時: インデックス `i` を除いた配列 + participantResponses のインデックスを再マッピング

**Repository 関数**:
```typescript
export async function replaceCollabProposedDates(
  teamId: string,
  sessionId: string,
  newDates: Date[],
  newParticipantResponses: Record<string, Record<string, 'ok' | 'ng' | 'pending'>>
): Promise<void>
```

**UI 設計**:
- 各候補日程行に「鉛筆（編集）」「ゴミ箱（削除）」アイコンを追加（`isOpen && canEdit` 時のみ）
- 編集: その行をインライン `datetime-local` 入力に切り替え、保存ボタン
- 削除: 確認なしで即時削除（候補が1件の場合はボタン無効）

---

## レスポンシブ対応 (CollabResponseForm)

### Decision: モバイルファーストのレイアウト見直し

**Current issues**:
1. 候補日程行の `flex items-center` でボタンが横に積まれすぎる
2. `px-3` ボタンが375px幅で収まらない可能性

**Fix approach**:
- 日程行: `flex flex-col sm:flex-row` で積み重ね、またはボタンパディングを `px-2` に削減
- ボタン文字を短縮: 小さいビューポートでは「○」「×」「?」のみ表示も検討
- `datetime-local` input に `min-w-0` を追加
- 全体のコンテナ padding を sm 以下では縮小

**Target**: 375px 幅（iPhone SE）で横スクロールなし
