# Tasks: リスケるGG MVP

**Input**: `specs/001-risukeru-gg-app/` の設計ドキュメント群
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: ユーザーストーリー単位でタスクを整理し、各ストーリーを独立して実装・テスト可能にする。

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 並行実行可能（異なるファイル・未完タスクへの依存なし）
- **[Story]**: どのユーザーストーリーに属するか（US1〜US6）
- 各タスクに正確なファイルパスを記載

---

## Phase 1: Setup（プロジェクト初期化）

**Purpose**: リポジトリ構造の確立と開発環境のセットアップ

- [x] T001 Create Next.js 14 App Router project with TypeScript strict mode via `pnpm create next-app` at repository root
- [x] T002 [P] Configure Tailwind CSS 3.x (tailwind.config.ts, globals.css)
- [x] T003 [P] Configure ESLint + Prettier with Next.js recommended rules (.eslintrc.json, .prettierrc)
- [x] T004 [P] Create `.env.local.example` with all required environment variables per quickstart.md (NEXT_PUBLIC_FIREBASE_*, GOOGLE_CLIENT_ID/SECRET, NEXT_PUBLIC_PARTY_SIGNUP_URL)
- [x] T005 [P] Initialize Firebase Functions sub-package at `functions/` with `pnpm init` + TypeScript config (functions/tsconfig.json, functions/package.json)
- [x] T006 [P] Configure pnpm workspace (pnpm-workspace.yaml) to link root and functions/ packages
- [x] T007 [P] Configure Vitest for unit tests (vitest.config.ts, tests/unit/ structure)
- [x] T008 [P] Configure Playwright for E2E tests (playwright.config.ts, tests/e2e/ structure)
- [x] T009 Configure Firebase emulator suite (firebase.json with Auth/Firestore/Functions/Storage emulators)
- [x] T010 [P] Configure next-pwa in next.config.js with basic PWA manifest (public/manifest.json)

**Checkpoint**: `pnpm dev` が起動し、`firebase emulators:start` が全エミュレータを立ち上げられる状態

---

## Phase 2: Foundational（全ストーリーに必要な基盤）

**Purpose**: 全ユーザーストーリーが依存するコアインフラ。このフェーズ完了まで各ストーリーの実装を開始しない

**⚠️ CRITICAL**: 全ユーザーストーリーの実装はこのフェーズの完了後に開始する

- [x] T011 Create TypeScript entity type definitions in `src/types/entities.ts` per data-model.md — UserRole, PlanType, LIGHT_PLAN_LIMITS定数（maxTeamMembers: 2, monthlyTasks: 5, monthlyCollabs: 3）、User（currentTeamId: string | null）、Team（teamCode: string）、TeamMember（plan: PlanType）、ScheduleEntry, Task, CollabSession, Notification等。CollabSessionStatusのUI表示名マッピング定数も含む（open→「回答受付中」, confirmed→「確定」, expired→「期限切れ」, cancelled→「キャンセル」）
- [x] T012 [P] Initialize Firebase client SDK in `src/lib/firebase/client.ts` (Auth, Firestore, Storage, FCM exports)
- [x] T013 [P] Initialize Firebase Admin SDK in `functions/src/lib/admin.ts` (admin.initializeApp with env config)
- [x] T014 [P] Create Zod validation schemas in `src/lib/validations/schedule.ts`, `tasks.ts`, `collab.ts`, `team.ts` per data-model.md — joinTeamSchema（teamCode: z.string().min(1).max(20)）を含む
- [x] T015 Implement Firestore Security Rules in `firestore.rules` with helper functions (isTeamMember, isTeamOwner, isOwnerOrEditor) per contracts/firestore-rules.md — isProductAdmin は実装しない。teamCodes/{code}（認証済みユーザーread・write=false、CF Admin SDKのみ書き込み可）、tasks/{taskId}（create=false・createTask CF経由のみ）、collabSessions/{sessionId}（create=false・createCollabSession CF経由のみ）、notifications/{notificationId}（isReadフィールドのみクライアント更新可）
- [x] T016 [P] Implement Firebase Storage security rules in `storage.rules` — MVPスコープはアバター画像のみ（認証済みユーザーが自分のパスに読み書き可。アバターアップロードUIはMVPスコープ外のためルールは最小限に設定し、フェーズ2でアップロード機能追加時に拡張する）
- [x] T017 Implement Next.js middleware for auth protection in `src/middleware.ts` (redirect unauthenticated to /login, allow /collab/* public access)
- [x] T018 [P] Create common UI components in `src/components/ui/` — Button.tsx, Input.tsx, Modal.tsx, Badge.tsx, Spinner.tsx
- [x] T019 [P] Create Cloud Functions entry point `functions/src/index.ts` with shared error handler (HttpsError codes per contracts/cloud-functions-api.md)
- [x] T020 [P] Create shared Cloud Functions utilities in `functions/src/lib/` — validateAuth.ts (role checks: isOwner, isOwnerOrEditor, isTeamMember)
- [x] T020a [P] Setup GitHub Actions CI workflow in `.github/workflows/ci.yml` — ESLint・TypeScriptコンパイル・Vitestユニットテスト・Playwrightテストを自動実行（Constitution Governance: PRマージ前必須チェック）
- [x] T020b Create settings page shell in `src/app/(protected)/settings/page.tsx` — タブまたはセクション構成（Team/Kanban/Calendar/Notifications）の空シェル。US1・US3・US2・US6の各フェーズがここにセクションを追加する

**Checkpoint**: Security Rules がエミュレータでデプロイされ、型定義とZodスキーマが TypeScript コンパイルを通過する。GitHub Actions CIが空プロジェクトでグリーンになる

---

## Phase 3: User Story 1 — 認証・チーム管理・プラン管理 (Priority: P1) 🎯 MVP Start

**Goal**: Google OAuth でログイン → LIGHTプラン + ソロチームが自動作成 → チームコードでチームを作成または参加 → プラン制限がバックエンドで強制される

**Independent Test**: ① Googleアカウントでサインイン → ② LIGHTプラン + ソロチームが自動生成される → ③ チームコードを入力してチームに参加（現チームを脱退して参加確認あり）→ ④ Ownerがチームコードをリセット → ⑤ 旧コードで参加不可になる

### チーム管理 Cloud Functions

- [x] T021 [P] [US1] Implement `createTeam` Callable Function in `functions/src/teams/createTeam.ts` — 認証済みユーザー必須、新チームドキュメント作成・英数字8文字teamCode生成（Crypto.randomBytesを使用）・teamCodes/{code}マッピング作成・旧チームから自動脱退（leaveTeamロジックをトランザクションで実行）・users/{uid}/currentTeamIdを更新、{teamId, teamCode}を返す
- [x] T022 [P] [US1] Implement `joinTeam` Callable Function in `functions/src/teams/joinTeam.ts` — 認証済みユーザー必須、①teamCodes/{teamCode}からteamId取得（not-found: コードが無効）、②メンバー数+プラン確認（LIGHTメンバーが2名いて3人目参加時は既存LIGHTメンバー全員にsystem通知を送ってfailed-precondition）、③旧チームから脱退（トランザクション）、④teams/{teamId}/members/{uid}をeditorロールで作成、⑤users/{uid}/currentTeamIdを更新、{success, teamId}を返す
- [x] T023 [P] [US1] Implement `leaveTeam` Callable Function in `functions/src/teams/leaveTeam.ts` — 認証済みユーザー必須、role=ownerはfailed-precondition（先に所有権移譲が必要）、members/{uid}削除・未完タスクのassigneeIdをnullに更新・Ownerへ通知・新ソロチームを自動生成・users/{uid}/currentTeamIdを更新、{success, newSoloTeamId}を返す
- [x] T024 [P] [US1] Implement `transferOwnership` Callable Function in `functions/src/teams/transferOwnership.ts` — Owner認証必須、members/{newOwnerId}/roleをowner・members/{uid}/roleをeditorに更新・teams/{teamId}/ownerIdを更新・旧Owner/新Owner双方に通知、{success}を返す
- [x] T025 [P] [US1] Implement `resetTeamCode` Callable Function in `functions/src/teams/resetTeamCode.ts` — Owner認証必須、トランザクションで旧teamCodes/{oldCode}削除・新コード生成・teams/{teamId}/teamCode更新・teamCodes/{newCode}作成（旧コードは即時無効化）、{newTeamCode}を返す

### Auth Trigger

- [x] T026 [US1] Implement `onUserCreate` Auth trigger in `functions/src/auth/onUserCreate.ts` — Firebase Auth新規ユーザー作成時に発火、①users/{uid}をLIGHTプランで初期化（plan: "light", monthlyTaskCount: 0, monthlyCollabCount: 0, countResetAt: now, displayName, email, avatarUrl等）、②ソロチーム（teams/{soloTeamId}）を自動生成（name: displayName + "のチーム"）、③Ownerとしてmembers/{uid}を追加、④users/{uid}/currentTeamIdをソロチームIDに設定

### リポジトリ

- [x] T027 [US1] Implement teams repository in `src/lib/repositories/teams.ts` — createTeam（createTeam CF呼び出し）, joinTeam（joinTeam CF呼び出し）, leaveTeam（leaveTeam CF呼び出し）, getTeam, getTeamMembers, subscribeTeam (onSnapshot), subscribeMembers (onSnapshot), updateMemberRole

### 認証ストア

- [x] T028 [US1] Implement Zustand auth store in `src/stores/auth.ts` — onAuthStateChanged + onIdTokenChanged リスナー（FR-003: セッション自動リフレッシュ）、currentUser（currentTeamId: string | null — 1ユーザーは1チームのみ所属）、currentTeam、signIn（signInWithPopup + GoogleAuthProvider）/signOut アクション、idToken期限切れ時の自動再フェッチ処理

### 認証ページ

- [x] T029 [P] [US1] Implement login page in `src/app/(auth)/login/page.tsx` — `signInWithPopup(auth, new GoogleAuthProvider())` を使用したGoogleサインインボタン（FR-001）、ログイン中スピナー、エラー表示（ポップアップブロック等）

### ダッシュボード

- [x] T030 [US1] Implement dashboard page in `src/app/(protected)/dashboard/page.tsx` — 現在のチーム情報表示（チーム名・メンバー数・自分のロール・プランバッジ）、ソロチームユーザー向けオンボーディングUI（「チームを作成する」ボタンと「チームコードで参加する」ボタンの誘導）。TeamSwitcherは実装しない（FR-015: 1ユーザーは1チームのみ所属）

### プラン管理 UI

- [x] T031 [P] [US1] Implement plan status component in `src/components/plan/PlanStatus.tsx` — 現プランバッジ（LIGHT/PARTY）・月次使用量表示（タスク 0/5件、コラボ 0/3件）・PARTYプラン申し込みボタン（NEXT_PUBLIC_PARTY_SIGNUP_URL が設定されている場合のみ表示、外部フォームURLをtarget="_blank"で開く。URL未設定時はボタン非表示）
- [x] T032 [P] [US1] Implement banner ad placeholder component in `src/components/plan/BannerAd.tsx` — LIGHTプランのみ表示（plan="light"のユーザーに対してisVisible=true）、PARTYプランでは非表示。MVPでは空のバナー枠（適切なaria-label付き）として実装し、フェーズ2で広告実装を追加

### プラン管理 Cloud Function

- [x] T033 [US1] Implement `resetMonthlyPlanCounts` Scheduled Function in `functions/src/plan/resetMonthlyPlanCounts.ts` — Cloud Scheduler `15 0 1 * *` UTC（毎月1日 0:00 JST）、plan=="light"の全ユーザーをバッチ取得・monthlyTaskCount/monthlyCollabCountを0にリセット・countResetAtを現在時刻に更新

### チーム設定・参加 UI

- [x] T034 [US1] Implement team settings section in `src/app/(protected)/settings/page.tsx` (Team section) — チームコード表示（Owner/Editorに表示）・コードリセットボタン（Owner専用・resetTeamCode CF呼び出し）・チーム名変更（Owner専用）・PlanStatus（src/components/plan/PlanStatus.tsx）の組み込み
- [x] T035 [P] [US1] Implement team join form component in `src/components/team/TeamJoinForm.tsx` — チームコード入力（英数字バリデーション）・joinTeam CF呼び出し・「現在のチームを脱退して参加します」確認ダイアログ・エラー表示（コード無効: not-found / プラン制限: failed-precondition）
- [x] T035a [US1] Implement leave team confirmation dialog in `src/components/team/LeaveTeamDialog.tsx` — 脱退確認（「ソロチームに自動移行します」の説明）・Ownerの場合は「先に所有権を移譲してください」エラー表示・leaveTeam CF呼び出し

**Checkpoint**: ① Googleアカウントでサインイン → ② LIGHTプラン + ソロチームが自動生成 → ③ チームコードでチームに参加（脱退確認あり）→ ④ チームコードリセットで旧コードが即時無効化される

---

## Phase 4: User Story 2 — 共有カレンダー・スケジュール管理 (Priority: P1)

**Goal**: チームメンバーがリアルタイム共有カレンダーで配信枠・動画投稿予定をCRUDできる。Googleカレンダーとの同期も設定できる

**Independent Test**: Editorがスケジュールを作成すると別タブ・別デバイスで1秒以内に反映される。Viewerには編集ボタンが表示されない

### リポジトリ・ストア

- [ ] T036 [P] [US2] Implement schedules repository in `src/lib/repositories/schedules.ts` — createSchedule, updateSchedule (楽観的ロック: updatedAt検証 + Firestoreトランザクション), deleteSchedule, subscribeSchedules (onSnapshot)
- [ ] T037 [P] [US2] Implement schedule Zustand store in `src/stores/schedule.ts` — schedules配列、currentView (week/month)、selectedDate、subscribe/unsubscribeアクション

### カレンダーコンポーネント

- [ ] T038 [US2] Implement react-big-calendar wrapper in `src/components/calendar/CalendarView.tsx` — 週/月ビュー切替、エントリクリックで詳細、JST表示設定
- [ ] T039 [US2] Implement schedule entry form in `src/components/calendar/ScheduleForm.tsx` — 全必須項目（タイトル・開始/終了日時・プラットフォーム・ステータス）、Zodバリデーション、時間帯重複警告。type=videoのとき追加フィールド（linkedTaskIds複数選択）を表示（FR-020: 動画投稿予定エントリの紐付けタスク）
- [ ] T040 [US2] Implement LIVE status badge with pulse animation in `src/components/calendar/LiveBadge.tsx` — status=liveのエントリに赤バッジ+`animate-pulse`（Tailwind）。LIVEから終了に変わった時点でアニメーション除去。デザイン確認: 常時パルスはLIVE配信中のみ表示しユーザー体験を損なわないこと

### スケジュールページ

- [ ] T041 [US2] Implement schedule page in `src/app/(protected)/schedule/page.tsx` — CalendarView表示、Viewer時は作成ボタン非表示
- [ ] T042 [US2] Implement schedule detail/edit page in `src/app/(protected)/schedule/[id]/page.tsx` — 楽観的ロック競合時は「再読込して再編集」ダイアログ

### Googleカレンダー同期

- [ ] T043 [US2] Implement `syncGoogleCalendar` Scheduled Cloud Function in `functions/src/calendar/syncGoogleCalendar.ts` — Cloud Scheduler every 5min、Google Calendar API v3でイベント取得、schedules/と照合・差分同期、エラー時はusers/{uid}/googleCalendar.syncErrorに記録
- [ ] T044 [US2] Implement Google Calendar connection flow in `src/app/(protected)/settings/page.tsx` (Calendar section) — Firebase Authentication の Google OAuthトークンを再利用（追加スコープ `https://www.googleapis.com/auth/calendar` をリクエスト）、取得したaccessToken/refreshTokenをusers/{uid}/googleCalendarに保存、接続/切断ボタン表示。別途のOAuth2.0フローは不要（Firebase Auth Google OAuth2を共用）
- [ ] T045 [US2] Implement sync error banner + retry button in `src/components/calendar/SyncErrorBanner.tsx` — googleCalendar.syncErrorが存在する場合にエラーバナー表示、再試行ボタンでCloud Function手動呼び出し、認証切れ時は「再認証が必要です」表示

**Checkpoint**: スケジュール作成が1秒以内に全メンバーへリアルタイム反映される。Googleカレンダー連携が設定できる

---

## Phase 5: User Story 3 — 制作タスク管理（カンバン）(Priority: P1)

**Goal**: カスタムカンバンカラムでタスクをCRUDし、PC ではDnD、モバイルではボタン操作でカラム間移動できる。CSVエクスポートも可能

**Independent Test**: タスクをTODO→進行中→完了と移動でき、担当者変更ができる。CSVエクスポートで全タスクが含まれる

### Cloud Functions（プラン制限付きタスク作成）

- [x] T046a [P] [US3] Implement `createTask` Callable Function in `functions/src/tasks/createTask.ts` — Owner/Editor認証必須、LIGHTプランの場合はmonthlyTaskCount >= 5でfailed-precondition（アップグレード案内を含むエラーメッセージ）、teams/{teamId}/tasks/{taskId}を作成・users/{uid}/monthlyTaskCountをインクリメント・assigneeId設定時は担当者へ通知生成

### リポジトリ・ストア

- [x] T046 [P] [US3] Implement tasks repository in `src/lib/repositories/tasks.ts` — createTask（createTask CF呼び出し・プラン制限エラー failed-precondition をUIに伝播）, updateTask (楽観的ロック), deleteTask, subscribeTasksByTeam (onSnapshot), reassignUnassigned (メンバー削除時用)
- [x] T047 [P] [US3] Implement kanban columns repository in `src/lib/repositories/kanbanColumns.ts` — createColumn, updateColumn, deleteColumn (最低1カラム制約), reorderColumns, subscribeColumns (onSnapshot)
- [x] T048 [US3] Implement tasks Zustand store in `src/stores/tasks.ts` — tasks配列、columns配列、subscribe/unsubscribeアクション

### カンバンコンポーネント

- [x] T049 [US3] Implement kanban board with @hello-pangea/dnd in `src/components/kanban/KanbanBoard.tsx` — DragDropContext + Droppable (カラム) + Draggable (タスクカード)、カラム間移動でupdateTask呼び出し
- [x] T050 [US3] Implement task card in `src/components/kanban/TaskCard.tsx` — PC: ドラッグハンドル表示、モバイル: カラム変更ボタン（ステータス選択ドロップダウン）、担当者アバター表示。createdByがチームメンバーに存在しない場合は「元メンバー」とフォールバック表示（FR-014）
- [x] T051 [US3] Implement task create/edit form in `src/components/kanban/TaskForm.tsx` — 全項目（タイトル・担当者・締切日・カテゴリ・カラム・紐付けスケジュール）、Zodバリデーション、LIGHTプラン月次制限到達時のアップグレードCTA表示（PlanStatus の使用量が 5/5件になった場合に「タスクの作成上限に達しました」メッセージと申し込みリンクを表示）

### タスクページ

- [x] T052 [US3] Implement tasks page in `src/app/(protected)/tasks/page.tsx` — KanbanBoard表示、Viewer時は追加/編集/削除ボタン非表示、CSVエクスポートボタン
- [x] T053 [US3] Implement CSV export for tasks in `src/lib/utils/exportTasksCsv.ts` — 全タスクの全項目（タイトル・担当者・カテゴリ・カラム・締切日・作成日・作成者）をCSV文字列生成、ブラウザダウンロードトリガー

### カンバン設定

- [x] T054 [US3] Implement kanban column settings in `src/app/(protected)/settings/page.tsx` (Kanban section) — カラム追加/リネーム/削除/並び替えUI (Owner専用)、削除時に残タスクを先頭カラムへ移行確認ダイアログ

### ユニットテスト

- [x] T055 [US3] Write unit tests for task column transition logic in `tests/unit/tasks/columnTransition.test.ts` — カラム削除時のタスク移行、最低1カラム制約を検証

**Checkpoint**: タスクをカンバンで管理でき、DnD動作確認済み。CSVエクスポートで全タスクが出力される。LIGHTプラン上限到達時にアップグレードCTAが表示される

---

## Phase 6: User Story 4 — コラボ日程調整 (Priority: P1)

**Goal**: コラボ日程調整セッションを作成し、URLをDiscord等で共有 → コラボ相手が認証なしで回答 → 確定でカレンダー自動登録・URL無効化

**Independent Test**: セッション作成→URL生成→公開ページで回答→確定でカレンダーエントリが登録される。期限切れURLは「有効期限切れ」を表示する

### Cloud Functions

- [x] T056 [P] [US4] Implement `createCollabSession` Callable Function in `functions/src/collab/createCollabSession.ts` — Owner/Editor認証必須、LIGHTプランの場合はmonthlyCollabCount >= 3でfailed-precondition（アップグレード案内）、UUID v4でsessionId生成、`teams/{teamId}/collabSessions/{sessionId}` にレコード作成、users/{uid}/monthlyCollabCountをインクリメント、shareUrlを返す
- [x] T057 [P] [US4] Implement `respondToCollab` Callable Function in `functions/src/collab/respondToCollab.ts` — 認証不要の公開エンドポイント、セッションがopen＆期限内かをサーバーサイド検証、responsesフィールド更新、チームOwner/Editorへ通知生成
- [x] T058 [P] [US4] Implement `confirmCollabDate` Callable Function in `functions/src/collab/confirmCollabDate.ts` — Owner/Editor認証、statusをconfirmed・confirmedDateを更新、schedules/にコラボエントリ自動作成、linkedScheduleIdを記録
- [x] T059 [P] [US4] Implement `cancelCollabSession` Callable Function in `functions/src/collab/cancelCollabSession.ts` — Owner/Editor認証、statusをcancelled、確定済みの場合はlinkedScheduleIdのスケジュールエントリも削除
- [x] T059a [US4] Implement `expireCollabSessions` Scheduled Function in `functions/src/collab/expireCollabSessions.ts` — Cloud Scheduler毎時実行（`0 * * * *`）、`expiresAt < now()` かつ `status == 'open'` のセッションを一括で `expired` に更新（FR-040: 期限切れステータスの自動更新）

### リポジトリ

- [x] T060 [P] [US4] Implement collabs repository in `src/lib/repositories/collabs.ts` — getCollabSession (公開取得・認証不要)、subscribeCollabSessions (チーム用・onSnapshot)、updateCollabSession

### 公開コラボ回答ページ

- [x] T061 [US4] Implement public collab response page in `src/app/collab/[token]/page.tsx` — sessionIdでFirestoreからセッション取得、status別表示分岐（open/confirmed/expired/cancelled/notfound）、認証不要・日本語固定・モバイル対応
- [x] T062 [US4] Implement collab response form in `src/components/collab/CollabResponseForm.tsx` — 候補日程ごとのOK/NGトグル、代替日提案（日付ピッカー）、メモ入力（200文字）、「回答を送信する」ボタン（未選択候補がある場合に確認ダイアログ）、有効期限の残り日数表示（例: 「回答期限: あと3日」、contracts/collab-share-url.md 必須要素6番）

### コラボ管理ページ（認証済みユーザー側）

- [x] T063 [US4] Implement collab create form in `src/components/collab/CollabForm.tsx` — タイトル・相手名・候補日程（最大5件）・有効期限（1〜30日）入力、createCollabSession呼び出し、LIGHTプラン月次制限到達時のアップグレードCTA表示
- [x] T064 [US4] Implement collabs list page in `src/app/(protected)/collabs/page.tsx` — セッション一覧（ステータスバッジ付き）、URLコピーボタン（navigator.clipboard）
- [x] T065 [US4] Implement collab detail page in `src/app/(protected)/collabs/[id]/page.tsx` — 回答状況表示（各候補日時のOK/NG）、確定ボタン（confirmCollabDate）、キャンセルボタン

### ユニットテスト

- [x] T066 [US4] Write unit tests for collab URL expiry and status validation in `tests/unit/collab/collabSession.test.ts` — open/expired/confirmed/cancelled各状態のアクセス可否、期限内/期限切れの判定ロジックを検証

**Checkpoint**: コラボセッション作成→URL共有→外部ユーザーが回答→確定でカレンダーに自動登録される。LIGHTプラン上限到達時にアップグレードCTAが表示される

---

## Phase 7: User Story 5 — チームメンバー管理・ロール制御 (Priority: P1)

**Goal**: OwnerがメンバーのロールをEditor/Viewer間で変更し、メンバーを削除できる。削除時は未完タスクを未アサインに移行。Ownerは所有権を移譲できる

**Independent Test**: OwnerがEditorをViewerに変更後、そのメンバーはスケジュール・タスクの作成ボタンが非表示になる

### Cloud Functions

- [x] T067 [US5] Implement `removeTeamMember` Callable Function in `functions/src/teams/removeTeamMember.ts` — Owner認証必須・自分自身の削除を拒否、members/{targetUserId}削除、未完タスクのassigneeIdをnullに更新、Owner通知生成、users/{targetUserId}/currentTeamIdをソロチームIDに更新（新ソロチームを自動生成してtransaction内で実行）

### チーム管理ページ

- [x] T068 [US5] Implement team management page in `src/app/(protected)/team/page.tsx` — メンバー一覧（ロールバッジ・プランバッジ付き）、ロール変更セレクト（Owner専用）、削除ボタン（Owner専用・自分自身は無効化）、所有権移譲ボタン（Owner専用）
- [x] T069 [US5] Implement role change confirmation dialog in `src/components/team/RoleChangeDialog.tsx` — ロール変更内容の確認、確定後にFirestore直接更新（updateMemberRole経由）
- [x] T070 [US5] Implement member removal confirmation dialog in `src/components/team/RemoveMemberDialog.tsx` — 未完タスクが未アサインになる旨の警告表示、確定後にremoveTeamMember呼び出し
- [x] T070a [US5] Implement ownership transfer dialog in `src/components/team/TransferOwnershipDialog.tsx` — 移譲先メンバー選択（Editor/Viewerのみ選択可）、確認フォーム、transferOwnership CF呼び出し、完了後に「所有権を移譲しました。あなたのロールはEditorになりました」メッセージ表示

**Checkpoint**: ロール変更後に当該メンバーのアクセス権限が即座に変更される。削除後は未完タスクが未アサインになる。所有権移譲が完了する

---

## Phase 8: User Story 6 — 通知・PWA対応 (Priority: P2)

**Goal**: プランに応じた通知をアプリ内+プッシュで受け取れる（LIGHTはシステム通知のみ、PARTYは全4カテゴリ）。PWAとしてAndroidホーム画面にインストールできる

**Independent Test**: 配信開始1時間前のCloud Schedulerトリガーで、PARTYプランユーザーにアプリ内通知とプッシュ通知の両方が届く。LIGHTユーザーには届かない

### リポジトリ・ストア

- [x] T071 [P] [US6] Implement notifications repository in `src/lib/repositories/notifications.ts` — subscribeNotifications (onSnapshot・受信者UID絞り込み)、markAsRead、getUnreadCount
- [x] T072 [P] [US6] Implement notifications Zustand store in `src/stores/notifications.ts` — notifications配列、unreadCount、subscribe/unsubscribeアクション

### Cloud Functions — 通知生成・送信

- [x] T073 [P] [US6] Implement FCM notification sender in `functions/src/notifications/sendFcm.ts` — admin.messaging().sendEachForMulticast、fcmTokens無効時のtoken削除処理
- [x] T074 [P] [US6] Implement `markNotificationRead` Callable Function in `functions/src/notifications/markNotificationRead.ts` — 受信者本人確認、isReadをtrueに更新
- [x] T075 [US6] Implement notification generators for all 4 categories in `functions/src/notifications/generators/` — collab.ts (コラボ関係)、tasks.ts (タスク)、system.ts (システム)、各Cloud Function呼び出し時にここから通知レコード作成＋FCM送信。LIGHTプランユーザーはsystem通知のみ生成（FR-041b: collab/tasks/remindersカテゴリはPARTYプランのみ有効、LIGHTユーザーへのそれら通知はスキップ）
- [x] T076 [US6] Implement `scheduleReminders` Scheduled Function in `functions/src/notifications/scheduleReminders.ts` — Cloud Scheduler毎分実行、startAt -1h/-15min のスケジュールエントリを検出し、participantIdsに予定リマインダー通知生成。LIGHTプランユーザーへのリマインダーはスキップ（PARTYプランのみ有効）

### 通知 UI

- [x] T077 [US6] Implement notification bell + unread badge in `src/components/notifications/NotificationBell.tsx` — ヘッダーに配置、unreadCountが0より大きい場合バッジ表示
- [x] T078 [US6] Implement in-app notification banner in `src/components/notifications/NotificationBanner.tsx` — 新着通知時に画面上部にトースト表示（3秒後自動消去）、クリックで対象ページへ遷移
- [x] T079 [US6] Implement notifications list page in `src/app/(protected)/notifications/page.tsx` — 全通知履歴（既読/未読バッジ）、クリックで対象ページへ遷移しmarkNotificationRead呼び出し

### 通知設定・PWA

- [x] T080 [US6] Implement notification preferences section in `src/app/(protected)/settings/page.tsx` (Notifications section) — PARTYプランのみ: 4カテゴリ×2種類（アプリ内/プッシュ）= 8トグル、FirestoreのnotificationPreferencesを更新
- [x] T080a [US6] Implement LIGHT plan notification restriction UI in `src/app/(protected)/settings/page.tsx` (Notifications section) — LIGHTプランユーザーには「システム通知のみ利用可能」の説明文とPARTYプランへのアップグレードCTAを表示（FR-041b）。通知トグルはsystemカテゴリのみ有効表示し、collab/tasks/remindersはロックアイコン付きで非活性表示
- [x] T081 [US6] Configure FCM service worker in `public/firebase-messaging-sw.js` with next-pwa — バックグラウンド受信時のOS通知表示
- [x] T082 [US6] Implement push permission request flow in `src/hooks/usePushPermission.ts` — Notification.requestPermission、FCMトークン取得・users/{uid}/fcmTokensに保存、OS拒否時はアプリ内許可バナー表示
- [x] T083 [US6] Implement PWA install prompt in `src/hooks/usePwaInstall.ts` — `beforeinstallprompt` イベントハンドリング、インストール促進バナー表示

**Checkpoint**: PARTYプランユーザーに配信1時間前のリマインダーがアプリを閉じていても届く。LIGHTユーザーには通知設定でアップグレードCTAが表示される。Androidでホーム画面へのインストールプロンプトが表示される

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: 複数ストーリーにまたがる改善、テスト、セキュリティ強化

- [x] T084 [P] Polish settings page layout in `src/app/(protected)/settings/page.tsx` — T020bで作成したシェルのタブ/セクション切替UXを洗練。Phase 3（Team）・Phase 5（Kanban）・Phase 4（Calendar）・Phase 8（Notifications）の各セクションが正しく統合されていることを確認し、レスポンシブ対応を完成させる
- [x] T085 [P] Implement offline write error messaging via `src/hooks/useOnlineStatus.ts` — navigator.onLine監視、オフライン時の書き込み操作で「インターネット接続が必要です」トースト表示
- [x] T086 [P] Write E2E test: login journey in `tests/e2e/login.spec.ts` — Firebase EmulatorのAuthentication UIでテストユーザーを手動作成 → Googleサインインポップアップ（モック）→ ソロチームが自動生成されダッシュボードへ到達 → チームコードを入力してチームに参加できる
- [x] T087 [P] Write E2E test: schedule creation journey in `tests/e2e/schedule.spec.ts` — スケジュール作成→別タブで反映確認→Viewerが編集できないことを確認
- [x] T088 [P] Write E2E test: task management journey in `tests/e2e/tasks.spec.ts` — タスク作成→カラム間移動→CSV エクスポートでファイルダウンロード確認
- [x] T089 Deploy and validate Firestore Security Rules against emulator with all access patterns from contracts/firestore-rules.md — teamCodes/（write=false確認）・tasks/create=false・collabSessions/create=false・notifications/{id}（isReadのみ更新可確認）を含む全パターンを検証
- [x] T090 Implement WCAG 2.1 AA accessibility across all interactive components — aria-labels (フォーム・ボタン・モーダル)、キーボードフォーカス管理、色コントラスト確認
- [x] T091 Performance optimization — next/dynamic で重いコンポーネント（CalendarView・KanbanBoard）を遅延読み込み、next/image でアバター最適化（NFR-001: LCP < 3s）。イベントハンドラのyield（scheduler.postTask / setTimeout 0）でINP < 100msを達成（NFR-002）。Chrome DevToolsのPerformanceパネルで実測確認
- [x] T092 Validate complete quickstart.md flow end-to-end — Firebase Emulator起動→Googleアカウントでサインイン→ソロチーム生成確認→チームコードでメンバー参加→全機能動作確認。主要ブラウザ互換性チェックリスト実施（NFR-008: Chrome/Edge/Firefox最新2版、Android Chrome最新2版）
- [x] T092a Configure Workbox runtime cache strategy in `next.config.js` (next-pwa runtimeCaching) — スケジュールデータAPIをStale-While-Revalidateでキャッシュ（FR-047: Service Workerによるオフライン閲覧）

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup           → 依存なし。即座に開始可能
Phase 2: Foundational    → Phase 1 完了後。全ユーザーストーリーをブロック
Phase 3: US1             → Phase 2 完了後
Phase 4: US2             → Phase 2 完了後（US1と並行可能、ただしUS1で作成したauth store・teamsリポジトリを利用）
Phase 5: US3             → Phase 2 完了後（US1と並行可能）
Phase 6: US4             → Phase 2 完了後（US1と並行可能）
Phase 7: US5             → Phase 2 完了後（US1のleaveTeam/transferOwnership/removeTeamMemberに依存）
Phase 8: US6             → Phase 2 完了後（US2〜US5完了後が実態的に安全）
Final Phase              → 全ユーザーストーリー完了後
```

### User Story Dependencies

- **US1 (P1)**: Phase 2完了後に開始。他ストーリーへの依存なし。**全ストーリーが auth/team インフラに依存するため最優先**
- **US2 (P1)**: Phase 2完了後に開始可能。US1のauth storeを利用するため、実際はUS1完了後が安全
- **US3 (P1)**: Phase 2完了後に開始可能。US1のteamsリポジトリ・auth storeを利用
- **US4 (P1)**: Phase 2完了後に開始可能。confirmCollabDateがUS2のschedules作成を内部で行う
- **US5 (P1)**: US1のleaveTeam/transferOwnership/removeTeamMember CF が存在することを前提とする
- **US6 (P2)**: US2〜US5完了後に実装するのが安全（通知はそれらのイベントに依存するため）

### Within Each User Story

- Cloud Functions（並行実装可能 [P] タスク）→ リポジトリ → ストア → コンポーネント → ページの順
- 同一ストーリー内で [P] マークのあるタスクは異なるファイルを扱うため並行実行可能

---

## Parallel Example: User Story 1

```bash
# Team Management Cloud Functions — 並行実装可能:
T021: createTeam (functions/src/teams/createTeam.ts)
T022: joinTeam (functions/src/teams/joinTeam.ts)
T023: leaveTeam (functions/src/teams/leaveTeam.ts)
T024: transferOwnership (functions/src/teams/transferOwnership.ts)
T025: resetTeamCode (functions/src/teams/resetTeamCode.ts)

# Plan/Team UI — 並行実装可能:
T029: login page (src/app/(auth)/login/page.tsx)
T031: PlanStatus component (src/components/plan/PlanStatus.tsx)
T032: BannerAd component (src/components/plan/BannerAd.tsx)
T035: TeamJoinForm component (src/components/team/TeamJoinForm.tsx)
```

## Parallel Example: User Story 4

```bash
# Cloud Functions — 全て並行実装可能:
T056: createCollabSession
T057: respondToCollab
T058: confirmCollabDate
T059: cancelCollabSession
T060: collabs repository
```

---

## Implementation Strategy

### MVP First（US1のみ）

1. Phase 1: Setup完了
2. Phase 2: Foundational完了（重要 — 全ストーリーをブロック）
3. Phase 3: US1完了
4. **STOP & VALIDATE**: Google OAuth → LIGHTプラン初期化 → ソロチーム生成 → チームコードで参加 → コードリセット を端から端までテスト
5. LIGHTプラン制限（タスク5件・コラボ3件・メンバー2名）とPARTYプランアップグレードCTAが正しく機能することを確認

### Incremental Delivery

1. Setup + Foundational → 基盤完成
2. US1（認証・チーム・プラン管理） → 動作確認 → **MVP Demo 1**
3. US2（カレンダー）+ US3（カンバン） → 動作確認 → **MVP Demo 2**（コアバリュー達成）
4. US4（コラボ）+ US5（チーム管理） → 動作確認 → **MVP Demo 3**（差別化機能）
5. US6（通知・PWA） → 動作確認 → **Phase 1 Complete**

### Parallel Team Strategy（複数開発者の場合）

1. Phase 1 + Phase 2 をチーム全員で完了
2. 分担:
   - 開発者A: US1（認証・チーム基盤）← 最優先
   - 開発者B: US2（カレンダー）
   - 開発者C: US3（カンバン）
3. US1完了後:
   - 開発者A: US4（コラボ）
   - 開発者B: US5（チーム管理）
4. US6（通知・PWA）はフロントエンド完成後に着手

---

## Summary

| Phase | User Story | Tasks | Parallel [P] | Independent Test |
|-------|-----------|-------|-------------|-----------------|
| 1 | Setup | T001–T010 | 9/10 | pnpm dev + emulator起動 |
| 2 | Foundational | T011–T020b | 8/12 | TypeScript compile + Rules deploy + CI green |
| 3 | US1 認証・チーム・プラン | T021–T035a | 9/16 | Google OAuth→LIGHTプラン→チームコード参加→コードリセット |
| 4 | US2 カレンダー | T036–T045 | 4/10 | リアルタイム反映1秒以内 |
| 5 | US3 カンバン | T046a, T046–T055 | 4/11 | DnD + CSV出力 + LIGHTプラン制限CTA |
| 6 | US4 コラボ | T056–T066 | 6/12 | URL生成〜確定〜カレンダー登録・期限切れ自動更新 |
| 7 | US5 チーム管理 | T067–T070a | 0/5 | ロール変更→権限即時反映・所有権移譲完了 |
| 8 | US6 通知・PWA | T071–T083 | 4/14 | リマインダープッシュ通知（PARTYのみ）・LIGHT制限表示 |
| Final | Polish | T084–T092a | 5/10 | E2E全ジャーニー通過・主要ブラウザ確認 |
| **Total** | | **100 tasks** | **49 [P]** | |

**MVP Scope（推奨）**: Phase 1 + Phase 2 + Phase 3（US1）→ Demo → Phase 4（US2）+ Phase 5（US3）で実用的なMVP完成
