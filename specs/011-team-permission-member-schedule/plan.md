# Implementation Plan: チーム権限バグ修正 & メンバースケジュール閲覧機能

**Branch**: `011-team-permission-member-schedule` | **Date**: 2026-05-24 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/011-team-permission-member-schedule/spec.md`

## Summary

チーム管理・権限まわりの4つのバグを修正し（オペレーター複数許可・カテゴリ作成失敗・チーム参加確認・チーム切り替え）、スケジュール画面でメンバーのGoogleカレンダー同期予定を閲覧できる機能を追加する。技術的アプローチは既存のFirebase / Firestore構造を活用し、最小限の変更で修正する。

## Technical Context

**Language/Version**: TypeScript (strict mode)  
**Primary Dependencies**: Next.js 14 (App Router), Firebase Auth, Cloud Firestore, Firebase Cloud Functions, Zustand  
**Storage**: Cloud Firestore — `teams/{teamId}/memberCalendars/{userId}/events/{eventId}` (新規)  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Vercel (フロントエンド), Firebase Cloud Functions (バックエンド)  
**Project Type**: Web application (Next.js)  
**Performance Goals**: メンバー予定の同期・表示は3秒以内  
**Constraints**: Googleカレンダー API の上限 250件/ユーザー。AIコンテキストは今日〜2週間先に限定  
**Scale/Scope**: 小規模チーム（〜10名）、複数チーム所属ユーザー対応

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| 原則 | 評価 | 備考 |
|------|------|------|
| I. シンプルさ優先 | ✅ | 既存の `fetchGCalEvents()` を再利用。Cloud Functions の新規追加なし |
| II. TypeScript型安全 | ✅ | 新規 `MemberCalendarEvent` インターフェースに明示的な型注釈を追加 |
| III. テスト方針 | ✅ | ビジネスロジック変更箇所のみテスト。UIコンポーネントのテストは不要 |
| IV. Firebase・セキュリティ | ✅ | `memberCalendars` に Security Rules を追加。クロスチームデータ漏洩なし |
| V. 日本語コメント | ✅ | コメントはWHYのみ日本語で記述 |

**Gates**: 全て合格。Constitution 違反なし。

## Project Structure

### Documentation (this feature)

```text
specs/011-team-permission-member-schedule/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (変更対象ファイル)

```text
src/
├── app/
│   ├── (protected)/
│   │   ├── team/
│   │   │   └── page.tsx                     # Bug1: operator複数対応、Bug3: 参加確認ダイアログ
│   │   ├── schedule/
│   │   │   └── page.tsx                     # 新機能: メンバー予定表示トグル追加
│   │   └── api/
│   │       └── ai/
│   │           └── chat/
│   │               └── route.ts             # 新機能: AIコンテキストにmemberCalendars追加
├── components/
│   ├── team/
│   │   ├── RoleChangeDialog.tsx             # Bug1: currentOperatorId削除、強制降格ロジック削除
│   │   └── TeamJoinForm.tsx                 # Bug3: 参加前確認ダイアログ追加
│   └── layout/
│       └── TeamSwitcher.tsx                 # Bug4: 切り替え後のデータ更新確認
├── lib/
│   ├── repositories/
│   │   └── memberCalendars.ts               # 新規: MemberCalendarEvent CRUD
│   └── googleCalendar.ts                    # 既存（変更なし or 軽微な修正）
├── stores/
│   └── auth.ts                              # 新機能: ログイン時のmemberCalendar同期トリガー
└── types/
    └── entities.ts                          # 新規: MemberCalendarEvent型追加

firestore.rules                              # 新規ルール追加: memberCalendars
```

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

なし。Constitution 違反なし。

---

## Sprint 計画

### Sprint 0: 権限スキーマ完全統一（追加）

**背景**: 初期 CF コードが `role: 'owner'`/`'editor'`/`'viewer'` を書き込んでいたため、既存 Firestore データに旧スキーマ値が残存している。コード上は新スキーマ（`'operator'`/`'member'`/`'rom'`）に統一済みだが、Security Rules が未デプロイのまま旧スキーマを参照し続けていた。

**実装内容**:

1. **移行 CF の作成**: `functions/src/admin/migrateRoles.ts`
   - `onCall` CF として実装（Admin SDK 使用）
   - 全チームの全メンバードキュメントをスキャン
   - `role: 'owner'` → `role: 'operator'`
   - `role: 'editor'` → `role: 'member'`
   - `role: 'viewer'` → `role: 'rom'`
   - 移行件数をレスポンスで返す

2. **`updateMemberRole` CF のデプロイ**: 既存コード `functions/src/teams/updateMemberRole.ts` を Firebase にデプロイ

3. **クライアント `updateMemberRole` の CF 経由化**: `src/lib/repositories/teams.ts` を直接 Firestore 書き込みから CF 呼び出しに戻す（Admin SDK でルールをバイパスする方が安全）

4. **Firestore Security Rules の簡素化**（移行後）:
   - `isTeamOwner`: `role in ['owner', 'operator']` → `role == 'operator'`
   - `isOwnerOrEditor`: `['owner', 'editor', 'operator', 'member']` → `role in ['operator', 'member']`

5. **`normalizeRole` の廃止**:
   - `functions/src/lib/validateAuth.ts` の旧→新変換を削除
   - `src/lib/repositories/teams.ts` の旧→新変換を削除

6. **移行 CF の実行**: デプロイ後に一度だけ呼び出す

**受け入れ基準**:
- [ ] Firestore の全メンバードキュメントが新スキーマ（`'operator'`/`'member'`/`'rom'` のみ）を持つ
- [ ] Security Rules に `'owner'`/`'editor'`/`'viewer'` が存在しない
- [ ] `normalizeRole` が旧→新変換を行わない（引数をそのまま返す）
- [ ] オペレーターが `updateMemberRole` CF 経由で別メンバーのロールを変更できる

---

### Sprint 1: バグ修正（オペレーター権限・カテゴリ作成・チーム切り替え）

**対象バグ**: Bug 1, Bug 2, Bug 4

**実装内容**:

1. **Bug 1 & 2 修正**: `RoleChangeDialog.tsx`
   - `currentOperatorId` prop を削除
   - `if (newRole === 'operator' && currentOperatorId)` の強制降格ロジックを削除
   - 「オペレーターへ昇格すると現在のオペレーターはメンバーに降格されます」の警告メッセージを削除
   
2. **Bug 1 修正**: `team/page.tsx`
   - `{isOperator && !isMe && member.role !== 'operator' && (` の `member.role !== 'operator'` 条件を削除
   - `currentOperatorId={myMember?.userId}` prop の削除
   - 「RoleChangeDialog に currentOperatorId を渡さない」

3. **Bug 4 修正**: `TeamSwitcher.tsx`
   - `switchActiveTeam` 完了後に `router.refresh()` を追加して全ストアをリセット
   - または `switchActiveTeam` 後にページ全体を再レンダリングするトリガーを実装
   
4. **firestore.rules 確認**: `kanbanColumns` の `isTeamOwner` ルールが operator ロールを正しく含んでいることを確認（既に含まれているが、動作確認）

**受け入れ基準**: Bug 1, 2, 4 の受け入れ基準を全て満たす

---

### Sprint 2: バグ修正（別チーム参加確認）

**対象バグ**: Bug 3

**実装内容**:

1. **Bug 3 修正**: `TeamJoinForm.tsx`
   - チームコード検証後・参加前に確認ダイアログを追加
   - 現在チームに所属している場合のみ表示（`currentTeamId !== null` の場合）
   - 「現在のチームから脱退してから参加」と「現在のチームに所属したまま参加」の2択
   - 「脱退してから参加」: `leaveSpecificTeam` → `joinTeam` の順に呼び出し

**受け入れ基準**: Bug 3 の受け入れ基準を全て満たす

---

### Sprint 3: メンバースケジュール表示（Firestore同期）

**新機能**:

1. **型定義追加**: `src/types/entities.ts`
   - `MemberCalendarEvent` インターフェース追加

2. **リポジトリ追加**: `src/lib/repositories/memberCalendars.ts`
   - `saveMemberCalendarEvents(teamId, userId, events)`: writeBatch で一括保存
   - `subscribeMemberCalendarEvents(teamId, callback)`: 全メンバーの予定をリアルタイム購読
   - `getMemberCalendarEvents(teamId, userId, from, to)`: 期間指定で取得

3. **Firestore Security Rules 追加**: `firestore.rules`
   ```
   match /teams/{teamId}/memberCalendars/{userId}/events/{eventId} {
     allow read: if isTeamMember(teamId);
     allow write: if request.auth != null && request.auth.uid == userId;
   }
   ```

4. **ログイン時同期**: `src/stores/auth.ts`
   - `onSnapshot` コールバック内で `currentTeamId` 確定後、`googleAccessToken` がある場合は `fetchGCalEvents()` を実行
   - 取得したイベントを `saveMemberCalendarEvents` でFirestoreに書き込み
   - タイトルは `{displayName} の予定`、`startAt/endAt/allDay/sourceEventId/syncedAt` のみ保存

**受け入れ基準**: User Story 1 の受け入れ基準を全て満たす

---

### Sprint 4: メンバースケジュール表示（UI）

**新機能**:

1. **スケジュール画面 UI 更新**: `src/app/(protected)/schedule/page.tsx`
   - 「メンバーの予定」表示トグルを追加
   - `subscribeMemberCalendarEvents` でリアルタイム取得
   - 重複排除: `currentUser.uid` の memberCalendar イベントは `source: 'google'` が有効な場合は非表示
   - 「チームの予定」と「メンバーの予定」を視覚的に区別（色分けまたはラベル）

**受け入れ基準**: User Story 2, 3 の受け入れ基準を全て満たす

---

### Sprint 5: AIへのメンバー・チームスケジュールコンテキスト追加

**実装方針**: 既存の AI ルートはクライアントが `buildContext()` でデータを組み立てて POST body で渡す設計。サーバーサイドで Firestore に直接アクセスしないことで、認証・teamId の取り回しを不要にする（Constitution I: シンプルさ優先）。

**新機能**:

1. **クライアント側拡張**: `src/components/ai/AIChatPage.tsx`
   - `buildContext()` に `memberCalendars` フィールドを追加
   - `subscribeMemberCalendarEvents` で取得した全メンバーの予定を整形して含める（今日〜14日先、各ユーザー最大20件、自分のイベントは除外）

2. **AI API 更新**: `src/app/api/ai/chat/route.ts`
   - `context` 型定義に `memberCalendars` フィールドを追加
   - `formatMemberCalendars()` 関数を追加し、受け取った `context.memberCalendars` をシステムプロンプトに整形して追加

**受け入れ基準**: User Story 4 の受け入れ基準を全て満たす
