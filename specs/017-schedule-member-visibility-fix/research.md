# Phase 0 Research: メンバー予定表示バグの原因調査

**Feature**: 017-schedule-member-visibility-fix | **Date**: 2026-06-27

## 調査の流れ

UI トグル → 状態 → データ取得 → セキュリティルール の順にトレースし、どの層で破綻しているかを特定した。

### 1. UI トグルと状態管理（正常）

- `src/app/(protected)/schedule/page.tsx:193-199` の「メンバーの予定」ボタンは `setShowMemberCalendars((v) => !v)` を呼ぶだけで、状態は正しく切り替わる（ラベルも「メンバー表示中」に変化）。
- `page.tsx:124-142` の `memberCalendarEvents` → `ScheduleEntry` 変換ロジックは純粋関数として `tests/unit/schedules/memberCalendarVisibility.test.ts` で網羅的にテスト済みで、全ケース合格。
- **結論**: UI・状態・変換ロジックに不具合はない。

### 2. データ購読（破綻箇所）

- `page.tsx:63-66` で `showMemberCalendars` が ON のとき `subscribeMemberCalendarEvents(currentTeamId, setMemberCalendarEvents)` を購読。
- `src/lib/repositories/memberCalendars.ts:68-80`:

  ```ts
  return onSnapshot(
    query(collectionGroup(db, 'events'), where('teamId', '==', teamId)),
    (snap) => { callback(...); }
  );
  ```

  - **コレクショングループクエリ**を使用。
  - `onSnapshot` の **第3引数（エラーコールバック）が無い** → 失敗がサイレント。

### 3. Firestore セキュリティルール（根本原因）

- `firestore.rules:106-113` は `events` を **ネストパスのみ** で許可:

  ```
  match /teams/{teamId}/memberCalendars/{userId}/events/{eventId} {
    allow read: if isTeamMember(teamId);
    allow write: if request.auth != null && request.auth.uid == userId;
  }
  ```

- Firestore の仕様上、`collectionGroup('events')` クエリはネストパスのルールでは認可されず、**再帰ワイルドカード** `match /{path=**}/events/{eventId}` のルールが別途必要。
- 該当ルールが存在しないため、購読は `permission-denied` で即時拒否され、`memberCalendarEvents` は空のまま → カレンダーに何も表示されない。

## Decision 1: セキュリティルールに再帰ワイルドカード read ルールを追加

- **Decision**: `match /databases/{database}/documents` 直下に以下を追加する。

  ```
  match /{path=**}/events/{eventId} {
    allow read: if request.auth != null && isTeamMember(resource.data.teamId);
  }
  ```

- **Rationale**:
  - Firestore でコレクショングループクエリを認可する標準パターン。
  - クエリは `where('teamId', '==', teamId)` で絞り込むため、ルール側も `resource.data.teamId` でドキュメントが属するチームのメンバーか検証でき、他チームの予定漏洩を防げる（AC-5）。
  - **write は既存のネストルールが担保**するため、追加ルールは `read` のみ。Firestore はマッチする全ルールを OR 評価するので、追加は既存挙動に対し非破壊的。
- **コリジョン検証**: コードベース全体で `events` という名前のサブコレクションは `memberCalendars/{userId}/events` のみ（`grep` で確認済み）。他に `events` コレクションが無いため、再帰ワイルドカードが意図しないコレクションに作用するリスクは無い。万一将来 `teamId` フィールドを持たない別の `events` が出現しても、`resource.data.teamId` が `null` → `isTeamMember(null)` が `false` を返すため安全側に倒れる。

### Alternatives considered

- **A. クエリをコレクショングループから per-member の通常クエリ群に変更**: メンバー数ぶん `onSnapshot` を張る必要があり、購読管理が複雑化。`011` の設計意図（1 購読で全メンバー取得）に反するため却下。
- **B. メンバー予定を `teams/{teamId}` 直下のフラットなコレクションに再設計**: データモデル変更＋既存データ移行が必要で、バグ修正の範囲を大きく超えるため却下。

## Decision 2: `subscribeMemberCalendarEvents` にエラーハンドラを追加

- **Decision**: `onSnapshot` の第3引数にエラーコールバックを追加し、`console.error` で記録する（任意で UI 通知に拡張可能な形にする）。
- **Rationale**: 今回のようなルール／インデックス不備を将来サイレントに握り潰さないため（AC-6）。Constitution「シンプルさ優先」に従い、最小限のロギングに留める。

## Decision 3: コレクショングループ単一フィールドインデックスの確認

- **調査結果**: `firestore.indexes.json` は空（`{"indexes": [], "fieldOverrides": []}`）。
- `where('teamId', '==', ...)` の等価フィルタのみのコレクショングループクエリは、Firestore が自動生成する単一フィールドインデックス（コレクショングループスコープ）で充足されるため、**通常は明示インデックス不要**。
- ただし環境によってインデックス未整備の場合 `failed-precondition`（インデックス作成リンク付き）が発生し得る。Decision 2 のエラーハンドラでこのケースも可視化される。
- **判断**: まずはルール修正＋エラーハンドラで対応し、デプロイ後に `failed-precondition` が観測された場合のみ `firestore.indexes.json` に collection-group 単一フィールドインデックスを追加する（quickstart に手順を記載）。

## 未解決の NEEDS CLARIFICATION

なし（全て解決済み）。
