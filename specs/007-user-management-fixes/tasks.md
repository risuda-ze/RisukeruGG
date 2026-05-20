# Tasks: ユーザー管琁E��正�E�ロール名�E削除保持・PlanStatus�E�E
**Input**: Design documents from `specs/007-user-management-fixes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能�E�異なるファイル・依存関係なし！E- **[US1]**: ロール名称統一
- **[US2]**: アカウント削除後�Eユーザー惁E��保持
- **[US3]**: PlanStatus 実データ接綁E
---

## Phase 1: Foundational�E�型定義  E全フェーズのブロチE��ー�E�E
**Purpose**: 全ファイルが依存する型定義を�Eに確定させる

**⚠�E�ECRITICAL**: こ�Eフェーズ完亁E��に他�Eタスクは開始しなぁE
- [x] T001 `src/types/entities.ts` の `UserRole` めE`'operator' | 'member' | 'rom'` に変更し、`User` インターフェースに `deleted?: boolean` と `deletedAt?: Date | null` を追加する

**Checkpoint**: `UserRole` 型確宁E E以降�E全タスクが並列実行可能になめE
---

## Phase 2: US1  Eロール名称統一

**Goal**: コード�EFirestore・UI の全ロール参�Eを新しい名称�E�Eperator/member/rom�E�に統一する

**Independent Test**: `pnpm typecheck` がエラーゼロで通る / チ�Eムペ�Eジのバッジが「オペレーター」「メンバ�E」「ROM専」と表示されめE
### 2-A: validateAuth.ts�E�Eloud Functions の基盤  E最初に更新�E�E
- [x] T002 [US1] `functions/src/lib/validateAuth.ts` を更新する: `AuthContext.role` 型を `'operator' | 'member' | 'rom'` に変更、`normalizeRole()` 関数�E�E'owner'ↁEoperator'`、`'editor'ↁEmember'`、`'viewer'ↁErom'`�E�を追加、`requireOwner()` めE`requireOperator()` にリネ�Eム、`requireOwnerOrEditor()` めE`requireOperatorOrMember()` にリネ�Eム

### 2-B: Cloud Functions  Eロール斁E���Eの一括更新�E�E002 完亁E��、並列実行可�E�E
- [x] T003 [P] [US1] `functions/src/auth/onUserCreate.ts` の `role: 'owner'` めE`role: 'operator'` に変更する
- [x] T004 [P] [US1] `functions/src/teams/createTeam.ts` の `role: 'owner'` めE`role: 'operator'` に変更する
- [x] T005 [P] [US1] `functions/src/teams/joinTeam.ts` の `role: 'editor'` めE`role: 'member'` に変更する
- [x] T006 [P] [US1] `functions/src/teams/leaveTeam.ts` を更新する: `ctx.role === 'owner'` ↁE`=== 'operator'`、ソロチ�Eム作�E時�E `role: 'owner'` ↁE`'operator'`
- [x] T007 [P] [US1] `functions/src/teams/leaveSpecificTeam.ts` を更新する: `role === 'owner'` ↁE`=== 'operator'`、ソロチ�Eム作�E時�E `role: 'owner'` ↁE`'operator'`
- [x] T008 [P] [US1] `functions/src/teams/removeTeamMember.ts` の `role: 'owner'` めE`role: 'operator'` に変更する
- [x] T009 [P] [US1] `functions/src/teams/dissolveTeam.ts` を更新する: `role !== 'owner'` ↁE`!== 'operator'`、ソロチ�Eム作�E時�E `role: 'owner'` ↁE`'operator'`
- [x] T010 [P] [US1] `functions/src/teams/resetTeamCode.ts` の `requireOwner(ctx)` めE`requireOperator(ctx)` に変更する
- [x] T011 [P] [US1] `functions/src/collab/respondToCollab.ts` のロール参�E�E�E'owner'`/`'editor'`�E�を新値に更新する
- [x] T012 [P] [US1] `functions/src/auth/deleteAccount.ts` のロール比輁E��を更新する: `role === 'owner'` ↁE`=== 'operator'`�E�ゴースト化ロジチE��は Phase 3 で実施�E�E
### 2-C: フロントエンチEリポジトリ�E�E001 完亁E��！E
- [x] T013 [US1] `src/lib/repositories/teams.ts` に `normalizeRole()` を追加し、`toTeamMember()` でロールを正規化する�E�旧値 `'owner'`/`'editor'`/`'viewer'` を新値にマッピング�E�E
### 2-D: フロントエンチEコンポ�Eネント�Eペ�Eジ�E�E001 + T013 完亁E��、並列実行可�E�E
- [x] T014 [P] [US1] `src/components/team/RoleChangeDialog.tsx` を更新する: `ROLE_LABELS` めE`{ operator: 'オペレーター', member: 'メンバ�E', rom: 'ROM封E }` に変更、`newRole` 型を `'member' | 'rom'` に変更
- [x] T015 [P] [US1] `src/app/(protected)/team/page.tsx` を更新する: `ROLE_LABELS` を日本語名に変更、`isOwner` ↁE`isOperator`�E�比輁E�� `=== 'operator'`�E�、`DialogState.newRole` 型を `'member' | 'rom'` に変更、セレクトオプション `value="editor"` ↁE`"member"`・`value="viewer"` ↁE`"rom"`、`handleRoleChange` 冁E�E `value === 'editor'` ↁE`=== 'member'`・`value === 'viewer'` ↁE`=== 'rom'`
- [x] T016 [P] [US1] `src/app/(protected)/settings/profile/page.tsx` を更新する: `isOperatorWithMembers` の比輁E�� `=== 'owner'` ↁE`=== 'operator'`、削除ダイアログのオペレーター候裁Efilter のロール参�Eを確認�E修正
- [x] T017 [P] [US1] `src/app/(protected)/tasks/page.tsx` の `canEdit` 条件を更新する: `role === 'owner'` ↁE`=== 'operator'`、`role === 'editor'` ↁE`=== 'member'`
- [x] T018 [P] [US1] `src/app/(protected)/schedule/page.tsx` の `canEdit` 条件を更新する�E�E017 と同�E容�E�E- [x] T019 [P] [US1] `src/app/(protected)/schedule/[id]/page.tsx` の `canEdit` 条件を更新する�E�E017 と同�E容�E�E- [x] T020 [P] [US1] `src/app/(protected)/settings/page.tsx` を更新する: `isOwner` の比輁E�� `=== 'owner'` ↁE`=== 'operator'`�E�E箁E���E�、`canEdit` 条件の `'editor'` ↁE`'member'`�E�カラムの `role` フィールド�E `UserRole` と無関係なので変更不要E��E- [x] T021 [P] [US1] `src/app/(protected)/collabs/page.tsx` の `canEdit` 条件を更新する�E�E017 と同�E容�E�E- [x] T022 [P] [US1] `src/app/(protected)/collabs/[id]/page.tsx` の `canEdit` 条件を更新する�E�E017 と同�E容�E�E
**Checkpoint**: US1 完亁E Eチ�Eムペ�Eジに「オペレーター」「メンバ�E」「ROM専」バチE��が表示され、ロール変更セレクトが正常に動作すめE
---

## Phase 3: US2  Eアカウント削除後�Eユーザー惁E��保持

**Goal**: アカウント削除後も `users/{uid}` ドキュメントに表示名�Eアイコンを残す�E�ゴースト化�E�E
**Independent Test**: 開発環墁E��ユーザー削除を実行後、Firestore の `users/{uid}` ドキュメントが `{ uid, displayName, avatarUrl, deleted: true, deletedAt }` の形式で残ってぁE��ことを確認すめE
- [x] T023 [US2] `functions/src/auth/deleteAccount.ts` のゴースト化処琁E��実裁E��めE トランザクション冁E�E `tx.delete(db.doc('users/${uid}'))` めE`tx.set(db.doc('users/${uid}'), { uid, displayName: userData.displayName, avatarUrl: userData.avatarUrl ?? null, deleted: true, deletedAt: FieldValue.serverTimestamp() })` に変更する�E�E012 でロール比輁E��は更新済み�E�E
**Checkpoint**: US2 完亁E Eユーザー削除後も表示名�Eアイコンがアプリ冁E��残る

---

## Phase 4: US3  EPlanStatus 実データ接綁E
**Goal**: `PlanStatus.tsx` の `isLight` をハードコードから実際のユーザープランに変更する

**Independent Test**: PARTY プランのユーザーでログインすると PlanStatus がアチE�Eグレード�Eタンを表示しなぁE
- [x] T024 [P] [US3] `src/components/plan/PlanStatus.tsx` を更新する: `useAuthStore` から `members` を取得し、`const myMember = members.find((m) => m.userId === currentUser?.uid)` と `const isLight = myMember?.plan !== 'party'` で `isLight` を判定するよぁE��更し、TODO コメントを削除する

**Checkpoint**: US3 完亁E EPlanStatus が実際のプランを反映する

---

## Phase 5: 検証

- [x] T025 `pnpm typecheck` を実行し、TypeScript エラーゼロを確認すめE
---

## Dependencies & Execution Order

### Phase 依存関俁E
- **Phase 1 (Foundational)**: 即時開始可能  E全フェーズのブロチE��ー
- **Phase 2 (US1)**:
  - T002 は Phase 1 完亁E��に開始！EalidateAuth.ts は Cloud Functions の基盤�E�E  - T003〜T012 は T002 完亁E��に並列実行可能
  - T013 は T001 完亁E��に実衁E  - T014〜T022 は T001 + T013 完亁E��に並列実行可能
- **Phase 3 (US2)**: T001 完亁E��に開始可能�E�E012 も完亁E��が望ましい�E�E- **Phase 4 (US3)**: T001 完亁E��にぁE��でも実行可能�E�他フェーズと独立！E- **Phase 5 (検証)**: Phase 2・3・4 完亁E��E
### ユーザースト�Eリー間�E依存関俁E
- **US1 ↁEUS2**: `deleteAccount.ts` を�E有するためET012�E�ロール比輁E��更新�E��E T023�E�ゴースト化�E��E頁E��推奨
- **US3**: US1 / US2 と完�E独竁E
---

## Parallel Example: Phase 2-B�E�Eloud Functions 一括更新�E�E
```bash
# T002 完亁E��、以下を同時実行可能:
T003: functions/src/auth/onUserCreate.ts
T004: functions/src/teams/createTeam.ts
T005: functions/src/teams/joinTeam.ts
T006: functions/src/teams/leaveTeam.ts
T007: functions/src/teams/leaveSpecificTeam.ts
T008: functions/src/teams/removeTeamMember.ts
T009: functions/src/teams/dissolveTeam.ts
T010: functions/src/teams/resetTeamCode.ts
T011: functions/src/collab/respondToCollab.ts
T012: functions/src/auth/deleteAccount.ts

# T013 完亁E��、フロントエンド�Eージを同時実行可能:
T014: src/components/team/RoleChangeDialog.tsx
T015: src/app/(protected)/team/page.tsx
T016: src/app/(protected)/settings/profile/page.tsx
T017: src/app/(protected)/tasks/page.tsx
T018: src/app/(protected)/schedule/page.tsx
T019: src/app/(protected)/schedule/[id]/page.tsx
T020: src/app/(protected)/settings/page.tsx
T021: src/app/(protected)/collabs/page.tsx
T022: src/app/(protected)/collabs/[id]/page.tsx
```

---

## Implementation Strategy

### MVP First�E�ES1 のみ�E�E
1. Phase 1: T001 完亁E2. Phase 2: T002〜T022 完亁E3. Phase 5: T025�E�Eypecheck�E�でバリチE�Eション
4. チ�Eムペ�Eジでバッジ表示を確誁E
### Full Delivery

1. T001 ↁET002 ↁET003〜T013 ↁET014〜T022�E�ES1 完亁E��E2. T023�E�ES2 完亁E��E3. T024�E�ES3 完亁E��E4. T025�E��E佁Etypecheck�E�E
---

## Notes

- `settings/page.tsx` の `col.role === 'done'` はカンバンカラムの役割フィールドであり `UserRole` とは無関俁E E変更不要E- T012 と T023 はどちらも `deleteAccount.ts` を編雁E��るため、忁E�� T012 ↁET023 の頁E��実施すること
- Firestore 既存データのロール値�E�E'owner'`、`'editor'`、`'viewer'`�E��E `normalizeRole()` で読み取り時に変換されるため、Firestore マイグレーションは不要E
