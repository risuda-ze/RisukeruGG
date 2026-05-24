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
