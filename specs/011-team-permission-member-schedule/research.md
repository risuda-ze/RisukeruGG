# Research: チーム権限バグ修正 & メンバースケジュール閲覧機能

## バグ原因の詳細調査

### バグ 1 & 2: オペレーター権限問題

**Decision**: 複数オペレーターを許可し、ロール変更時の強制降格ロジックを削除する

**根拠となるコード調査**:

1. `src/app/(protected)/team/page.tsx:288`
   ```tsx
   {isOperator && !isMe && member.role !== 'operator' && (
   ```
   `member.role !== 'operator'` フィルタがオペレーターへのロール変更UIを非表示にしている。

2. `src/components/team/RoleChangeDialog.tsx:41`
   ```tsx
   if (newRole === 'operator' && currentOperatorId) {
     await updateMemberRole(teamId, currentOperatorId, 'member');
   }
   ```
   昇格前に必ず現在のオペレーター（= 自分自身）をメンバーに降格している。

3. `src/app/(protected)/team/page.tsx:467`
   ```tsx
   currentOperatorId={myMember?.userId}
   ```
   `currentOperatorId` に自分のIDを渡しているため、自分が降格対象になる。

**昇格失敗のシーケンス**:
```
オペレーターA が メンバーB を オペレーターに昇格する
  ↓
Step 1: updateMemberRole(teamId, A.userId, 'member')
         → 成功（自分の書き込みは rules で許可: request.auth.uid == memberId）
  ↓
Step 2: updateMemberRole(teamId, B.userId, 'operator')
         → 失敗（AはもうoperatorでないためisTeamOwner=false、かつA≠B）
  ↓
結果: A = member、B = member（オペレーター0名）
```

**Firestore Security Rules の確認**:
```
match /members/{memberId} {
  allow write: if isTeamOwner(teamId) ||
                  (request.auth != null && request.auth.uid == memberId);
}
match /kanbanColumns/{columnId} {
  allow write: if isTeamOwner(teamId);  // operator必須
}
```

**修正方針**:
- `RoleChangeDialog` から強制降格ロジックを削除（`currentOperatorId` prop を廃止）
- `team/page.tsx` の `member.role !== 'operator'` 条件を削除し、オペレーターのロール変更も可能にする
- ロール変更ダイアログの「オペレーターへ昇格すると現在のオペレーターは降格」という警告メッセージも削除

**Alternatives considered**:
- Cloud Functions でトランザクション処理 → シンプルさ優先（Constitution Principle I）で却下。クライアントからの直接 Firestore 書き込みで十分
- 「1オペレーター制約をFirestoreルールで強制」→ 要件と逆行するため却下

---

### バグ 3: 別チーム参加時の確認

**Decision**: `TeamJoinForm` に「現在チームから脱退するか」の確認ダイアログを追加

**根拠となるコード調査**:

- `src/components/team/TeamJoinForm.tsx`: チームコード入力・送信フォーム（`joinTeam` CF呼び出し）
- `functions/src/teams/joinTeam.ts:72`: 現在のチームには継続所属したまま新チームを追加する実装
  ```typescript
  /* 既存チームには引き続き所属し、新チームを追加してアクティブにする */
  tx.update(db.doc(`users/${uid}`), {
    currentTeamId: teamId,
    teamIds: FieldValue.arrayUnion(teamId),
  });
  ```
- `src/lib/repositories/teams.ts:104`: `leaveSpecificTeam` Cloud Function が既に存在する
  ```typescript
  export const leaveSpecificTeam = httpsCallable<
    { teamId: string }, { success: boolean; newActiveTeamId: string }
  >(functions, 'leaveSpecificTeam');
  ```

**修正方針**:
- `TeamJoinForm` でチームコード検証後、現在チームに所属している場合は確認ダイアログを表示
- 「脱退してから参加」選択: まず `leaveSpecificTeam` を呼び出し、その後 `joinTeam` を呼ぶ
- ソロ状態（`currentTeamId === null` または `teamIds.length === 0`）では確認なしに参加

---

### バグ 4: サイドバーのチーム切り替え

**Decision**: `switchActiveTeam` の呼び出し後、他のデータストアが新チームのデータに再購読されていない可能性を調査・修正する

**根拠となるコード調査**:

- `src/stores/auth.ts:110`: `users/{uid}` をリアルタイム購読し、`currentTeamId` が変化すると `subscribeTeam` と `subscribeMembers` を再設定している。これ自体は正しい実装。
- 問題の可能性1: `useTasksStore`, `useScheduleStore` 等の他ストアは `teamId` を引数に `subscribe` を呼ぶが、`teamId` の変化検知はコンポーネントの `useEffect` に依存している
  - コンポーネントがマウントされたまま `teamId` が変化した場合、`useEffect` のクリーンアップ→再購読が正しく動作するか確認が必要
- 問題の可能性2: `TeamSwitcher.tsx:50` の `teamIds.length <= 1 && !collapsed` 条件により、1チームのみの場合はコンポーネントが非表示
  - 正しい挙動だが、初回ログイン時は1チームのため非表示。2チーム以上に参加した後は表示される

**修正方針**:
- `switchActiveTeam` 呼び出し後に、ページリロードまたは明示的なルーター リフレッシュを行うか確認
- 他ストアの `teamId` 依存 `useEffect` が正しくクリーンアップ・再購読されているか確認・修正
- 必要に応じて `router.refresh()` または `window.location.reload()` を追加（シンプルな解決策）

---

## 権限スキーマ完全統一（追加調査）

### 根本原因: 旧ロール名が Firestore に残存している

**Decision**: 一回限りの移行 CF（`migrateRoles`）を作成・デプロイし、全メンバードキュメントを新スキーマへ更新する。その後 Security Rules と normalizeRole を簡素化する。

**調査結果**:

1. **初期 CF コード**（コミット `1f0f62c`）:
   - `createTeam.ts`: `role: 'owner'` を書き込んでいた
   - `joinTeam.ts`: `role: 'editor'` を書き込んでいた

2. **ロール統一 CF**（コミット `72e6e20` "feat: ユーザー管理修正（ロール名称統一・削除後データ保持・PlanStatus接続）"）:
   - 全 CF がコードレベルで新スキーマ（`'operator'`, `'member'`, `'rom'`）を書き込むよう更新された
   - しかし **既存 Firestore データは移行されていない**（`role: 'owner'` のまま残存）
   - `validateAuth.ts` と `teams.ts` に `normalizeRole()` が追加され、読み取り時のみ変換している

3. **Firestore Security Rules の履歴**:
   - 初期: `data.role == 'owner'`（オーナーのみ書き込み可能）
   - 統一後（コード）: `data.role in ['owner', 'operator']`（後方互換）
   - しかしこの Rules が Firebase に未デプロイのまま `'operator'` ユーザーが書き込もうとして `permission-denied` が発生していた
   - 2026-05-26 本日: Rules を Firebase にデプロイ済み（`['owner', 'operator']` を許可）

4. **`updateMemberRole` CF**:
   - コミット `282eaf5` でコード追加（Admin SDK でルールをバイパス）
   - しかし Firebase に未デプロイ → `functions/not-found` → クライアントで "internal" と表示

**修正が必要な箇所**:

| ファイル | 現状 | 必要な対応 |
|---|---|---|
| `firestore.rules` | `['owner', 'operator']` / `['owner', 'editor', 'operator', 'member']` | 移行完了後: `['operator']` / `['operator', 'member']` |
| `functions/src/lib/validateAuth.ts` | `normalizeRole`: owner→operator, editor→member, viewer→rom | 移行後: レガシー変換を廃止 |
| `src/lib/repositories/teams.ts` | `normalizeRole`: 同上 + `updateMemberRole` が直接 Firestore 書き込み | `normalizeRole` 簡素化 + CF 経由に戻す |
| Firestore データ | 旧チーム: `role: 'owner'`/`'editor'`/`'viewer'` | 一回限り移行: 新スキーマへ更新 |
| `updateMemberRole` CF | コード存在・未デプロイ | デプロイ必須 |

**移行 CF の設計**:
- `functions/src/admin/migrateRoles.ts` として新規作成
- `onCall` で呼び出し（呼び出し元は認証済みユーザー、ただしアプリ内の「管理」操作として呼ぶ）
- Admin SDK で全チームの全メンバードキュメントをスキャンし旧値を更新
- 移行ドキュメント数をレスポンスで返す

**Security Rules 更新順序**:
1. 移行 CF をデプロイ・実行する
2. 移行完了後、Rules から旧ロール名を除去してデプロイする

**Rationale**:
- 移行前に Rules から `'owner'` を除去すると、旧スキーマデータのユーザーが突然アクセス不能になる
- 逆に移行完了後も Rules に `'owner'` を残すと、コードの一貫性が失われ将来の混乱を招く
- Admin SDK での一括移行は Security Rules をバイパスするため安全に実行できる

**Alternatives considered**:
- クライアントサイドからの段階的移行（ログイン時に自分のドキュメントを更新）→ 全ユーザーの再ログインが必要なため長期化する。また manager/operator 以外のユーザーが自分のロールを書き換えること自体がセキュリティリスク。却下。
- 既存 Rules を永続的に維持（常に old + new 両方サポート）→ コードに不要な複雑性を持ち込む。Constitution Principle I (シンプルさ優先) に違反。却下。

---

## 追加機能: メンバースケジュール

### Firestoreデータ構造の設計

**Decision**: `teams/{teamId}/memberCalendars/{userId}/events/{eventId}` サブコレクション構造を採用

**Rationale**:
- チームスコープで管理できるため、Security Rules の適用が簡単
- ユーザーのカレンダーデータはチーム単位で参照されるため、チーム配下が自然
- 既存の `teams/{teamId}/schedules` と分離することで、「チームの予定（手動登録）」と「メンバーの予定（Googleカレンダー自動同期）」を明確に区別できる

**Alternatives considered**:
- `teams/{teamId}/schedules` に `source: 'memberCalendar'` フラグを追加 → 既存のスケジュール一覧への影響大、責務混在のため却下
- `users/{userId}/calendarSync/{teamId}/events/{eventId}` → チームスコープでの Security Rules 適用が困難なため却下

### ログイン時の同期フロー

**Decision**: クライアントサイド（`initAuthListener` の onAuthStateChanged コールバック内）で Googleカレンダーを取得し、Firestore に書き込む

**Rationale**:
- 既存の `src/lib/googleCalendar.ts` の `fetchGCalEvents()` を再利用できる
- accessToken は sessionStorage に保存済み（`gcal_token`）
- Cloud Functions での実装は accessToken の受け渡しが複雑になるため、クライアントサイドが適切

**同期タイミング**: ログイン成功後、`currentTeamId` が確定した時点（`onSnapshot` コールバック内）

### 重複排除の設計

**Decision**: GoogleカレンダーのイベントIDを `sourceEventId` としてFirestoreに保存し、スケジュール画面でフィルタリング

**表示ロジック**:
- 「自分のGoogleカレンダー」= `fetchGCalEvents()` から直接取得（`source: 'google'`）
- 「メンバーの予定」= Firestoreの `memberCalendars` から取得（自分のものも含む）
- 表示時に「自分のGoogleカレンダー」と「メンバーの予定内の自分のもの」が重複しないよう、自分の `memberCalendar` イベントを除外する

### AIへのコンテキスト提供

**Decision**: AI API (`/api/ai/chat`) のシステムプロンプトに、memberCalendars と team schedules のデータを含める

**Rationale**:
- 既存の AI チャット実装（`src/app/api/ai/chat/route.ts`）にチームコンテキストを追加する形で実装
- データ量を考慮し、AIに渡すのは「今日〜2週間先」に絞る

**Alternatives considered**:
- Firestore Triggers でベクトルDB的な検索 → 複雑すぎるため却下。シンプルなシステムプロンプト注入で十分
