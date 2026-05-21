# Tasks: チーム管理改善・ナビ修正

**Input**: Design documents from `/specs/008-team-management-improvements/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: User Story 1 — ソロチームの自動削除 (Priority: P1) 🎯

**Goal**: チーム移動後にオペレーターがソロチームから脱退できるようにし、脱退時にチームドキュメントを自動削除する

**Independent Test**: 
1. ソロチームのオペレーターが別チームに参加後、`leaveSpecificTeam({teamId: soloTeamId})` を呼ぶとエラーにならず成功すること
2. 脱退後に `teams/{soloTeamId}` と `teamCodes/{code}` ドキュメントが Firestore に存在しないこと

- [ ] T001 [P] [US1] `functions/src/teams/leaveSpecificTeam.ts` のオペレーターチェック（L32）を修正: ソロチーム（memberCount ≤ 1）の場合はチームドキュメント・teamCode・メンバードキュメントを削除して脱退許可。複数メンバーの場合は既存エラーを維持。新ソロチーム不要時は生成スキップ
- [ ] T002 [P] [US1] `functions/src/teams/leaveTeam.ts` のオペレーターチェック（L17）を修正: ソロチーム確認ロジックを追加し、ソロチームの場合はトランザクション内で旧チームドキュメントと teamCode を削除してから既存の新ソロチーム生成フローに合流
- [ ] T003 [P] [US1] `functions/src/teams/removeTeamMember.ts` に防御的チーム削除を追加: トランザクション内でメンバー削除前に `membersSnap.size === 1` を確認し、真の場合（削除後0メンバー）はチームドキュメントと teamCode も削除

**Checkpoint**: Cloud Functions をデプロイし、ソロチームオペレーターが `leaveSpecificTeam` で脱退できること・チームドキュメントが消えることを確認

---

## Phase 2: User Story 2 — 「現在のチームから退出する」UI追加 (Priority: P2)

**Goal**: チーム管理画面 (`/team`) でオペレーター含む全ロールに退出ボタンを表示し、ソロオペレーターが退出できるようにする

**Independent Test**:
1. オペレーター（ソロチーム）: 退出ボタンが表示され、クリックで確認ダイアログが出て、確認後に脱退成功
2. オペレーター（複数メンバー）: 退出ボタンが表示され、クリックで「先に所有権を移譲してください」メッセージが出る（脱退ボタンなし）
3. 非オペレーター: 退出ボタンが表示され、クリックで従来の脱退フローが動作する

- [ ] T004 [US2] `src/components/team/LeaveTeamDialog.tsx` を更新: props を `{isOwner: boolean}` から `{teamId: string; isSoloOperator: boolean; isMultiOperator: boolean}` に変更。UI: `isMultiOperator` → 「先に所有権を移譲してください」（ボタンなし）、`isSoloOperator` → 「ソロチームを退出します」＋退出ボタン、それ以外（非オペレーター）→ 既存メッセージ。`handleLeave` で `leaveSpecificTeam({ teamId })` に統一（`leaveTeam` を廃止）
- [ ] T005 [US2] `src/app/(protected)/team/page.tsx` を更新: 退出ボタンの条件 `{!isOperator && ...}` を削除して全ロールに表示。ラベルを「現在のチームから退出する」に変更。`LeaveTeamDialog` の props を `teamId={teamId ?? ''}`, `isSoloOperator={isOperator && members.length <= 1}`, `isMultiOperator={isOperator && members.length > 1}` に更新

**Checkpoint**: `/team` ページを開き、全ロールで退出ボタンが表示されること・それぞれのケースで正しい動作をすることを確認

---

## Phase 3: User Story 3 — サイドバー多重アクティブ修正 (Priority: P3)

**Goal**: `/settings/profile` に遷移した際に「チャンネル設定 (`/settings`)」と「個人設定 (`/settings/profile`)」が両方ハイライトされる不具合を修正する

**Independent Test**: `/settings/profile` ページに遷移したとき、サイドバーで「個人設定」のみがアクティブハイライトされ、「チャンネル設定」はハイライトされないこと

- [ ] T006 [US3] `src/components/layout/Sidebar.tsx` を更新: `usePathname()` の直下に最長一致アルゴリズムで `activeHref` を計算するコードを追加。通常表示ループ（L143）と折りたたみ表示ループ（L180）の両方で `pathname.startsWith(item.href)` を `item.href === activeHref` に変更

  ```typescript
  // usePathname() の直下に追加
  const activeHref = NAV_SECTIONS.flatMap((s) => s.items)
    .filter((i) => !i.disabled && (pathname === i.href || pathname.startsWith(i.href + '/')))
    .reduce((longest, i) => (i.href.length > longest.length ? i.href : longest), '');
  ```

**Checkpoint**: `/settings/profile` と `/settings` を交互に遷移してサイドバーのハイライトが正しく切り替わることを確認

---

## Phase 4: Polish & 型チェック

**Purpose**: 全修正の型安全を検証

- [ ] T007 `pnpm typecheck` を実行して TypeScript 型エラーがゼロであることを確認。エラーがある場合は各タスクのファイルを修正して再実行

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: 依存なし — T001・T002・T003 は別ファイルのため並列実行可能
- **Phase 2 (US2)**: Phase 1 完了後（`leaveSpecificTeam` の修正に依存）
  - T004 と T005 は異なるファイルだが T004 完了後に T005 を実行（同じダイアログを参照）
- **Phase 3 (US3)**: Phase 1・2 と独立 — いつでも実行可能
- **Phase 4**: 全フェーズ完了後

### User Story Dependencies

- **US1**: 依存なし（Cloud Functions のみ）
- **US2**: US1 に依存（`leaveSpecificTeam` のソロチーム修正が必要）
- **US3**: 完全独立

### Parallel Opportunities

- T001・T002・T003: すべて別ファイル — 同時実行可能 [P]
- T006: T001-T005 と独立 — Phase 1/2 と並行実行可能

---

## Parallel Example: US1

```bash
# 3つのCloud Functionsを同時に修正:
Task T001: "leaveSpecificTeam.tsにソロチーム脱退ロジックを追加"
Task T002: "leaveTeam.tsにソロチーム脱退許可を追加"
Task T003: "removeTeamMember.tsに防御的チーム削除を追加"
```

---

## Implementation Strategy

### MVP First (US1 → US2 → US3)

1. **Phase 1 (US1)**: T001・T002・T003 を並列実行 → Cloud Functions でソロチーム削除を有効化
2. **Phase 2 (US2)**: T004 → T005 の順に実行 → 退出ボタンを全ロールに公開
3. **Phase 3 (US3)**: T006 → サイドバーのハイライトバグを修正（Phase 1/2 と並行可能）
4. **Phase 4**: T007 → `pnpm typecheck` で最終確認

### 推奨実行順

```
T001 ─┐
T002 ──┼─ (並列) ─→ T004 → T005 → T007
T003 ─┘           ↑
T006 ─────────────┘ (US3は独立)
```
