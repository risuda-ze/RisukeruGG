# Progress: Discord連携 再設計実装

**Branch**: `claude/affectionate-morse-d4dff0` | **Date**: 2026-05-31  
**Spec**: `specs/012-discord-integration/`

---

## 起動方法

```bash
pnpm dev        # 開発サーバー (localhost:3000)
```

`.env.local` に Discord 関連の環境変数を設定すること（`.env.local.example` 参照）。

---

## 実装内容

### Phase 1: 旧OAuth個人連携の削除

- `src/components/settings/DiscordConnectSection.tsx` — 削除
- `src/app/api/discord/link-start/route.ts` — 削除
- `src/app/api/discord/callback/route.ts` — 削除
- `scripts/register-discord-commands.mjs` — 削除
- `src/types/entities.ts` — `User.discord` フィールド削除、`DiscordSession` を guildId 起点に変更、`DiscordTeamConfig` に `guildId`/`channelId` 追加
- `src/stores/auth.ts` — `discordInfo` 関連コード削除
- `src/app/(protected)/settings/page.tsx` — `DiscordConnectSection` 参照削除

### Phase 2: 基盤整備（guild_id起点）

- `src/app/api/discord/interactions/route.ts` — `guild_id` をスキーマに追加、`flags:64` 削除（通常投稿化）、DM早期リターン追加
- `src/lib/repositories/teams.ts` — `getTeamIdByGuildId`、`isGuildAlreadyLinked` 追加、`updateDiscordSettings`/`getDiscordSettings` を guildId/channelId 対応に拡張

### Phase 3: US1（Webhook通知完成）

- `firestore.rules` — `discord_link_requests` → `discord_bot_invite_requests`/`discord_bot_invite_pending` に更新
- `functions/src/discord/sendBotMessage.ts` — 新規作成（Cloud Functions用Bot通知ユーティリティ）
- `functions/src/schedules/createSchedule.ts` — channelId設定時はBot API経由、未設定時はWebhookへフォールバック
- `functions/src/notifications/scheduleReminders.ts` — 同上の条件分岐追加

### Phase 4: US2（Bot招待フロー）

- `src/app/api/discord/bot-invite-start/route.ts` — 新規作成
- `src/app/api/discord/bot-invite-callback/route.ts` — 新規作成（guildId取得・重複チェック・チャンネル一覧取得）
- `src/app/api/discord/save-guild-config/route.ts` — 新規作成（guildId/channelId保存・ギルドコマンド登録呼び出し）
- `src/app/api/discord/register-guild-commands/route.ts` — 新規作成（ギルドコマンド登録）
- `src/app/api/discord/pending-channels/route.ts` — 新規作成（チャンネル一覧取得API）
- `src/app/api/discord/disconnect-guild/route.ts` — 新規作成（接続解除API）
- `src/lib/discord/sendBotMessage.ts` — 新規作成（Next.js用Bot通知・チャンネル一覧取得）
- `src/components/team/DiscordSettingsSection.tsx` — Bot招待フロー対応に全面改修

### Phase 5: US3（AIボット再設計）

- `src/app/api/discord/interactions/sessionManager.ts` — セッションキーを guildId に変更
- `src/app/api/discord/interactions/handlers/handleRisukerugg.ts` — guild_id→teamId解決ロジックに改修、discordUserId削除
- `src/app/api/discord/interactions/handlers/handleButtonClick.ts` — guildId起点に改修
- `src/app/api/discord/interactions/discordFollowUp.ts` — flags:64削除（通常投稿）、custom_idを `{action}:{guildId}` 形式に変更
- `src/app/api/discord/interactions/register/registerSchedule.ts` — risukeruUserId引数削除
- `src/app/api/discord/interactions/register/registerTask.ts` — risukeruUserId引数削除
- `src/app/api/discord/interactions/register/registerCollab.ts` — risukeruUserId引数削除

---

## テストシナリオ

### Sprint 1: Webhook通知
1. チーム設定 → Discord連携セクションが表示される（operator）
2. Webhook URLを入力・保存でFirestoreの `teams/{teamId}/discord/config.webhookUrl` に保存される
3. memberには設定UIが非表示になっている
4. スケジュール作成 → 通知ONのチームでWebhook POSTが届く

### Sprint 2: Bot招待
1. チーム設定 → 「Botをサーバーに追加」ボタンをクリック
2. Discord OAuth2画面でサーバーを選択・許可
3. チャンネル選択画面が表示される
4. チャンネル選択・保存で `guildId`/`channelId` が Firestore に保存される
5. 同一サーバーを別チームでリンクしようとするとエラー

### Sprint 3: AIボット
1. 連携済みサーバーで `/risukerugg message:来週月曜に配信入れたい` を実行
2. チャンネルに全員が見える通常投稿で返答が届く（ephemeralではない）
3. 未連携サーバーで実行 → チーム設定へのURL付き案内メッセージ
4. AIが提案 → ✅登録する ボタンをクリック → Firestoreにドキュメント作成

---

# Progress: チーム権限バグ修正 & メンバースケジュール閲覧機能

**Branch**: `claude/festive-shtern-a11b38` | **Date**: 2026-05-24  
**Spec**: `specs/011-team-permission-member-schedule/`

---

## 起動方法

```bash
pnpm dev        # 開発サーバー (localhost:3000)
```

Firebase エミュレーターは不要。本番Firestoreに接続。

---

## 実装完了スプリント

### Sprint 1: バグ修正（オペレーター権限・カテゴリ作成）

**状態**: 完了 ✅

**変更ファイル**:
- `src/components/team/RoleChangeDialog.tsx` — `currentOperatorId` prop 削除、強制降格ロジック削除、警告メッセージ削除
- `src/app/(protected)/team/page.tsx` — `member.role !== 'operator'` 条件削除、`currentOperatorId` prop 削除

**テストシナリオ**:
1. チーム管理画面でメンバーAをオペレーターに昇格する
2. 昇格前のオペレーター（自分）が維持されていることを確認
3. 両者がカンバンカラム/スケジュールカテゴリを作成できることを確認

---

### Sprint 2: バグ修正（別チーム参加確認）

**状態**: 完了 ✅

**変更ファイル**:
- `src/components/team/TeamJoinForm.tsx` — 2択確認ダイアログ実装（`leaveSpecificTeam` + `joinTeam`）
- `src/app/(protected)/team/page.tsx` — 説明文更新

**テストシナリオ**:
1. チームAに所属した状態でチームBのコードを入力する
2. 「現在のチームに所属したままにしますか？」ダイアログが表示されることを確認
3. 「いいえ（脱退して参加）」でチームAを脱退しチームBに参加できることを確認
4. 「はい（そのまま参加）」で両チームに所属できることを確認

---

### Sprint 3: バグ修正（チーム切り替え）

**状態**: 完了 ✅

**変更ファイル**:
- `src/components/layout/TeamSwitcher.tsx` — `router.refresh()` 追加

**テストシナリオ**:
1. サイドバーの「チームの切り替え」からチームBを選択する
2. スケジュール・タスク・メンバー一覧が全てチームBのデータに更新されることを確認

---

### Sprint 4: メンバースケジュール同期（Firestore）

**状態**: 完了 ✅

**変更ファイル**:
- `src/types/entities.ts` — `MemberCalendarEvent` インターフェース追加
- `src/lib/repositories/memberCalendars.ts` — 新規作成（saveMemberCalendarEvents / subscribeMemberCalendarEvents / getMemberCalendarEvents）
- `firestore.rules` — `memberCalendars/{userId}/events` ルール追加
- `src/stores/auth.ts` — ログイン時 / チーム切り替え時の GCal → Firestore 同期ロジック追加

**テストシナリオ**:
1. Googleカレンダー連携済みユーザーでログインする
2. Firebase コンソールで `teams/{teamId}/memberCalendars/{uid}/events` にイベントが書き込まれていることを確認

---

### Sprint 5: メンバースケジュール表示（UI）

**状態**: 完了 ✅

**変更ファイル**:
- `src/app/(protected)/schedule/page.tsx` — 「メンバーの予定」トグル追加、`subscribeMemberCalendarEvents` 購読、重複排除ロジック追加
- `src/components/calendar/MonthCalendar.tsx` — `source === 'member'` 用ブルー表示追加
- `src/components/calendar/WeekCalendar.tsx` — `source === 'member'` 用ブルー表示追加

**テストシナリオ**:
1. スケジュール画面の「メンバーの予定」トグルをONにする
2. 他のメンバーがFirestoreに同期した「{name} の予定」が青色でカレンダーに表示されることを確認
3. ログアウト中のメンバーの予定も表示されることを確認
4. 自分のGoogleカレンダーと「メンバーの予定」を両方ONにしても自分の予定が重複しないことを確認

---

### Sprint 6: AIコンテキスト拡張

**状態**: 完了 ✅

**変更ファイル**:
- `src/components/ai/AIChatPage.tsx` — `buildContext()` に `memberCalendars` フィールド追加
- `src/app/api/ai/chat/route.ts` — 型定義拡張、`formatMemberCalendars()` 追加、システムプロンプト更新

**テストシナリオ**:
1. AIチャットで「今週メンバーの予定を教えて」と送信する
2. Firestoreのメンバーカレンダーデータを参照した具体的な回答が返ってくることを確認

---

## 引き渡し事項

### 既知の注意点

- Firestore の `collectionGroup('events')` クエリは単一フィールドインデックス（`teamId`）を使用。デプロイ後にFirestoreコンソールでインデックス作成が必要な場合がある（通常は自動作成）。
- `pnpm lint` は5件の既存エラーあり（`collabs/page.tsx`, `settings/profile/page.tsx`, `CollabDetailModal.tsx`, `schedule/page.tsx`）。今回の実装では新規エラーを追加していない。

### 環境変数

変更なし。既存の `.env.local` で動作する。
