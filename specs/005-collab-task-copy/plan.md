# Implementation Plan: コラボ再調整・復元

**Branch**: `005-collab-reopen` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification — コラボ確定後の再調整・複製機能

## Summary

確定済みコラボを「調整中」に戻す「再調整（reopen）」機能と、確定済みコラボをテンプレートとして新規コラボ調整を素早く作成する「複製」機能を実装する。再調整は新しい Cloud Function として実装し、確定時に自動作成されたスケジュールも合わせて削除する。複製はクライアント側のみで完結する（既存 `createCollabSession` を再利用）。

## Technical Context

**Language/Version**: TypeScript 5 + Next.js 14 (App Router)  
**Primary Dependencies**: Firebase Cloud Functions v2 (Admin SDK)、Firestore、Zustand  
**Storage**: Firebase Firestore (`teams/{teamId}/collabSessions/{sessionId}`、`teams/{teamId}/schedules/{scheduleId}`)  
**Testing**: なし（UIコンポーネントテストは不要。Cloud Function は手動検証）  
**Target Platform**: Web (Vercel)  
**Project Type**: Web Application (Next.js App Router)  
**Performance Goals**: UI 操作は 100ms 以内に応答  
**Constraints**: 既存の `confirmCollabDate` フローに影響を与えない。型安全を維持する  
**Scale/Scope**: チーム単位で運用するコラボ調整機能

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. シンプルさ優先 | ✅ PASS | 新ライブラリなし。Cloud Function 1本追加のみ。 |
| II. TypeScript 型安全 | ✅ PASS | any 禁止継続。Cloud Function は型付きインターフェース定義。 |
| III. テスト方針 | ✅ PASS | テスト不要（UIコンポーネント・Cloud Function は手動検証）。 |
| IV. Firebase・セキュリティ | ✅ PASS | reopen は Cloud Function 経由。Owner/Editor 権限チェック必須。 |
| V. 日本語コメント | ✅ PASS | 新規コードは日本語コメントで記述。 |

## Project Structure

### Documentation (this feature)

```text
specs/005-collab-task-copy/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (impact areas)

```text
src/
├── components/collab/
│   ├── CollabDetailModal.tsx     # 確定済みUIに「再調整」「複製」ボタン追加
│   └── CollabForm.tsx            # initialData props でプリフィル対応
└── lib/repositories/
    └── collabs.ts                # reopenCollabSession 呼び出し追加

functions/src/collab/
└── reopenCollabSession.ts        # [NEW] 再調整 Cloud Function

functions/src/
└── index.ts                      # 新 Cloud Function をエクスポート
```

## Phase 1: Design Details

### 1. Cloud Function: reopenCollabSession

**functions/src/collab/reopenCollabSession.ts**:
```typescript
interface ReopenCollabSessionData {
  teamId: string;
  sessionId: string;
}

// 処理:
// 1. 認証チェック（Owner/Editor のみ）
// 2. セッションのステータスが 'confirmed' であることを確認
// 3. トランザクション:
//    a. linkedScheduleId のスケジュールを削除（存在する場合）
//    b. セッションを更新: status → 'open', confirmedDate → null, linkedScheduleId → null
// 4. 成功レスポンス
```

### 2. クライアント側リポジトリ

**src/lib/repositories/collabs.ts** — 追加:
```typescript
export const reopenCollabSession = httpsCallable<
  { teamId: string; sessionId: string },
  { success: boolean }
>(functions, 'reopenCollabSession');
```

### 3. CollabDetailModal.tsx の UI 変更

**確定済みセクションに追加**:
- 「再調整する」ボタン（危険色系スタイル）→ 確認ダイアログ → Cloud Function 呼び出し
- 「コピーして新規作成」ボタン → `onDuplicate` コールバックで親コンポーネントへ通知

**フッター変更**:
- `confirmed` ステータス時: 「再調整する」「コピーして新規作成」ボタンを表示
- `open` ステータス時: 既存の「調整を確定」ボタンを表示

**Props 追加**:
```typescript
interface CollabDetailModalProps {
  session: CollabSession;
  canEdit: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onReopen?: () => void;       // [NEW] 再調整完了時
  onDuplicate?: (session: CollabSession) => void;  // [NEW] 複製時
}
```

### 4. CollabForm.tsx の複製対応

**Props 追加**:
```typescript
interface CollabFormProps {
  teamId: string;
  isLightPlanFull?: boolean;
  onSuccess: (shareUrl: string) => void;
  onCancel: () => void;
  initialData?: {             // [NEW] 複製時のプリフィルデータ
    title?: string;
    partnerName?: string;
    expiresInDays?: number;
  };
}
```

フォームの useState 初期値を `initialData` から取得するよう変更。

### 5. 親コンポーネント（collabs ページ）

確定済みコラボから「複製」が選択されたとき:
- `CollabForm` を `initialData` 付きで表示
- 新規コラボ作成完了後、通常フロー（シェアURL表示）に戻る

## Complexity Tracking

| 変更 | 理由 | シンプルな代替が不十分な理由 |
|------|------|----------------------------|
| Cloud Function 追加 (reopenCollabSession) | スケジュール削除 + ステータス更新を原子的に実行する必要がある | クライアント直接書き込みでは Security Rules 変更が必要かつ原子性が保証されない |
