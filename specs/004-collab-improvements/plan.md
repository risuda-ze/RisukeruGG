# Implementation Plan: コラボ機能改善・再調整

**Branch**: `004-collab-improvements` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: spec 004（コラボ改善・修正）+ spec 005（コラボ再調整・復元）統合

## Summary

コラボ機能に対して以下を実装する:
1. **バグ修正**: 候補日程ソート（昇順）、タイムゾーン 9 時間ずれ修正
2. **レスポンシブ修正**: 公開送信フォームのモバイル対応
3. **追加機能（改善）**: 送信メモのコメント追記、候補日程の編集・削除
4. **追加機能（再調整）**: 確定済みコラボの再調整（reopen）、複製

## Technical Context

**Language/Version**: TypeScript 5 + Next.js 14 (App Router)  
**Primary Dependencies**: Firebase Cloud Functions v2 (Admin SDK)、Firestore、date-fns、Tailwind CSS 4  
**Storage**: Firestore — `teams/{teamId}/collabSessions/{sessionId}`、`teams/{teamId}/schedules/{scheduleId}`  
**Testing**: なし（UIコンポーネントテスト不要。手動検証）  
**Target Platform**: Web (Vercel) — 送信フォームは外部参加者がモバイルでアクセス  
**Project Type**: Web Application (Next.js App Router)  
**Constraints**: 既存の `participantResponses` インデックス構造を維持。`confirmCollabDate` フローに影響しない

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. シンプルさ優先 | ✅ PASS | 新ライブラリなし。最小限の変更のみ。Cloud Function 1本追加。 |
| II. TypeScript 型安全 | ✅ PASS | any 禁止継続。sortedPairs など型は明示定義。 |
| III. テスト方針 | ✅ PASS | UIテスト不要。タイムゾーン変換のユニットテストは任意。 |
| IV. Firebase・セキュリティ | ✅ PASS | reopen・コメント追記は Cloud Function 経由。認証チェック必須。 |
| V. 日本語コメント | ✅ PASS | 新規コードは日本語コメントで記述。 |

## Project Structure

### Documentation (this feature)

```text
specs/004-collab-improvements/
├── plan.md              # This file
├── spec.md              # 統合フィーチャー仕様（004+005）
├── research.md          # タイムゾーン・ソート設計調査
└── tasks.md             # タスク一覧
```

### Source Code (impact areas)

```text
src/
├── components/collab/
│   ├── CollabDetailModal.tsx   # ソート・候補日程編集/削除・再調整/複製ボタン追加
│   └── CollabResponseForm.tsx  # タイムゾーン修正・ソート表示・レスポンシブ修正
├── components/collab/
│   └── CollabForm.tsx          # タイムゾーン修正のみ（proposedDates ISO変換）
├── lib/repositories/
│   └── collabs.ts              # replaceCollabProposedDates・reopenCollabSession 追加
└── app/(protected)/collabs/
    └── page.tsx                # onReopen/onDuplicate ハンドラー・フォームプリフィル

functions/src/collab/
├── respondToCollab.ts          # メモをコメントとして追記するロジック追加
└── reopenCollabSession.ts      # [NEW] 再調整 Cloud Function

functions/src/
└── index.ts                    # reopenCollabSession エクスポート追加
```

## Design Details

### 1. 候補日程ソート — sortedIndexPairs パターン

`participantResponses` は配列インデックスをキーとして使用するため、元インデックスを保持したまま表示順をソートする。

```typescript
// CollabDetailModal.tsx・CollabResponseForm.tsx 共通パターン
const sortedDatePairs = proposedDates
  .map((date, i) => ({ date, originalIndex: i }))
  .sort((a, b) => a.date.getTime() - b.date.getTime());

// レンダリング例（CollabDetailModal）
{sortedDatePairs.map(({ date, originalIndex }) => {
  const { okNames, ngNames, pendingNames } = getDateAggregates(originalIndex);
  const isSelected = selectedDateIdxs.includes(originalIndex);
  // ...
})}
```

### 2. タイムゾーン修正

```typescript
// CollabForm.tsx — handleSubmit 内
proposedDates: validDates.map((d) => new Date(d).toISOString()),

// CollabResponseForm.tsx — handleSubmit 内
alternativeDates: alternativeDate
  ? [new Date(alternativeDate).toISOString()]
  : [],
```

### 3. レスポンシブ修正（CollabResponseForm）

- 候補日程カードの行: `flex-wrap` または `flex-col sm:flex-row` でモバイル対応
- OK/NG/未定ボタン: `px-2 sm:px-3` でモバイル幅を縮小
- `datetime-local` input: `w-full min-w-0` で横幅に収める
- 外側コンテナ: `overflow-x-hidden` を追加

### 4. 送信メモのコメント追記

```typescript
// functions/src/collab/respondToCollab.ts — updatePayload 構築後に追加
// Timestamp.now() を使用（FieldValue.serverTimestamp() は arrayUnion 内で使用不可）
if (note?.trim()) {
  updatePayload['comments'] = FieldValue.arrayUnion({
    id: `resp_${Date.now()}`,
    authorId: respondentKey,
    authorName: respondentName ?? 'anonymous',
    text: note.trim(),
    createdAt: Timestamp.now(),
  });
}
```

### 5. 候補日程の編集・削除

**新リポジトリ関数**:
```typescript
// src/lib/repositories/collabs.ts
export async function replaceCollabProposedDates(
  teamId: string,
  sessionId: string,
  newDates: Date[],
  newParticipantResponses: Record<string, Record<string, 'ok' | 'ng' | 'pending'>>
): Promise<void>
```

**参加者回答の再インデックス**（削除時）:
```typescript
function remapParticipantResponses(
  responses: Record<string, Record<string, 'ok' | 'ng' | 'pending'>>,
  deletedIndex: number
): Record<string, Record<string, 'ok' | 'ng' | 'pending'>> {
  // deletedIndex より大きいキーを -1 シフト、deletedIndex は削除
}
```

**UI 追加**（`CollabDetailModal.tsx`）:
- 各候補日程行に「鉛筆（編集）」「ゴミ箱（削除）」アイコンを追加（`isOpen && canEdit` 時のみ）
- 編集: `editingDateIndex: number | null` state でインライン `datetime-local` input に切り替え
- 削除: `proposedDates.length <= 1` の場合はボタン無効

### 6. 確定済みコラボの再調整（reopen）

**新 Cloud Function** `functions/src/collab/reopenCollabSession.ts`:
```typescript
// 処理フロー:
// 1. Owner/Editor 認証チェック
// 2. status === 'confirmed' を確認
// 3. トランザクション:
//    a. linkedScheduleId のスケジュールを削除（存在する場合のみ）
//    b. セッション更新: status→'open', confirmedDate→null, linkedScheduleId→null
```

**クライアントリポジトリ追加**:
```typescript
export const reopenCollabSession = httpsCallable<
  { teamId: string; sessionId: string },
  { success: boolean }
>(functions, 'reopenCollabSession');
```

**CollabDetailModal.tsx** の変更:
- `Props` に `onReopen?: () => void`、`onDuplicate?: (session: CollabSession) => void` を追加
- `confirmed` ステータス時のフッターに「再調整する」「コピーして新規作成」ボタンを追加
- `showReopenConfirm: boolean` state と `handleReopen` async 関数を追加

### 7. 確定済みコラボの複製

**collabs/page.tsx** の変更:
- `duplicateSource: CollabSession | null` state を追加
- `onDuplicate` コールバックで `duplicateSource` にセット
- `useEffect` で `duplicateSource` 変化時にフォーム state をプリフィル
  - `formTitle` ← `session.title`
  - `formParticipants` ← `session.participants ?? []`
  - `content` ← `session.content ?? ''`
- フォーム送信後に `duplicateSource` を null にリセット

## Complexity Tracking

| 変更 | 理由 | シンプルな代替が不十分な理由 |
|------|------|----------------------------|
| sortedIndexPairs パターン | participantResponses インデックス互換性 | 単純なソートでは集計データが誤った日程に紐づく |
| replaceCollabProposedDates | 候補日程の削除・編集に必要 | arrayRemove は Timestamp 精度問題がある |
| Cloud Function でのコメント追記 | 認証なし公開ページからの書き込み | Security Rules 変更なしに実現できる唯一の方法 |
| reopenCollabSession Cloud Function | スケジュール削除 + ステータス更新を原子的に実行 | クライアント直接書き込みでは原子性が保証されない |
