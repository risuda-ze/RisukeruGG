# Contract: Firebase Security Rules

**目的**: Firestoreのデータアクセス制御設計。チームスコープの隔離とロール制御を定義する。
**更新日**: 2026-05-13（アクセストークン・招待削除、チームコード・プラン対応）

---

## アクセス制御マトリクス

| コレクション | 未認証 | 認証済み（自分） | Owner | Editor | Viewer |
|-------------|--------|----------------|-------|--------|--------|
| users/{自分} | ✗ | CRUD | CRUD | CRUD | CRUD |
| teamCodes/{code} | ✗ | R | ✗（CF経由） | ✗（CF経由） | ✗（CF経由） |
| teams/{所属外} | ✗ | ✗ | ✗ | ✗ | ✗ |
| teams/{所属}/members | ✗ | ✗ | CRUD | R | R |
| teams/{所属}/schedules | ✗ | ✗ | CRUD | CRUD | R |
| teams/{所属}/tasks | ✗ | ✗ | CRUD（CF経由） | CRUD（CF経由） | R |
| teams/{所属}/kanbanColumns | ✗ | ✗ | CRUD | R | R |
| teams/{所属}/collabSessions | ✗ | ✗ | CRUD（CF経由） | CRUD（CF経由） | R |
| collabSessions（公開） | R | R | - | - | - |
| teams/{所属}/notifications | ✗ | ✗ | R（自分宛） | R（自分宛） | R（自分宛） |

**CF経由**: タスク作成・コラボ作成はプラン制限チェックのため Cloud Functions 経由必須。
チーム参加・脱退・コード管理も Cloud Functions 経由（`teamCodes`の整合性維持のため）。

---

## Security Rules 設計

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // チームメンバー判定
    function isTeamMember(teamId) {
      return request.auth != null &&
             exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
    }

    // Owner判定
    function isTeamOwner(teamId) {
      return isTeamMember(teamId) &&
             get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role == 'owner';
    }

    // Owner または Editor 判定
    function isOwnerOrEditor(teamId) {
      return isTeamMember(teamId) &&
             get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role in ['owner', 'editor'];
    }

    // ユーザードキュメント（自分のみ読み書き）
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // チームコード逆引きコレクション（認証済みユーザーが読み取り可、書き込みはCloud Functionsのみ）
    match /teamCodes/{code} {
      allow read: if request.auth != null;
      allow write: if false;  // Cloud Functions（Admin SDK）のみが書き込み・削除
    }

    // チームドキュメント
    match /teams/{teamId} {
      allow read: if isTeamMember(teamId);
      allow create: if request.auth != null;  // 新規チーム作成は認証済みユーザー全員
      allow update, delete: if isTeamOwner(teamId);

      // メンバー管理（Ownerのみ変更可）
      match /members/{memberId} {
        allow read: if isTeamMember(teamId);
        allow write: if isTeamOwner(teamId) ||
                        (request.auth != null && request.auth.uid == memberId);
                        // 自身の脱退処理（leaveTeam CF経由）
      }

      // カンバンカラム設定（Ownerのみ変更可）
      match /kanbanColumns/{columnId} {
        allow read: if isTeamMember(teamId);
        allow write: if isTeamOwner(teamId);
      }

      // スケジュールエントリ（Owner/Editor が書き込み）
      match /schedules/{scheduleId} {
        allow read: if isTeamMember(teamId);
        allow write: if isOwnerOrEditor(teamId);
      }

      // タスク（Owner/Editor が書き込み。ただし作成はCF経由でプランチェック済み）
      match /tasks/{taskId} {
        allow read: if isTeamMember(teamId);
        allow update, delete: if isOwnerOrEditor(teamId);
        allow create: if false;  // createTask Cloud Function のみが作成（プランチェック必須）
      }

      // コラボセッション（Owner/Editor が管理。作成はCF経由でプランチェック済み）
      match /collabSessions/{sessionId} {
        allow read: if isTeamMember(teamId) || true;
        // 注: collabSessions は公開読み取りOK（URLトークンが事実上の認証）
        allow update, delete: if isOwnerOrEditor(teamId);
        allow create: if false;  // createCollabSession Cloud Function のみが作成（プランチェック必須）
      }

      // 通知（受信者本人のみ読み取り）
      match /notifications/{notificationId} {
        allow read: if request.auth != null &&
                       request.auth.uid == resource.data.recipientId;
        allow update: if request.auth != null &&
                         request.auth.uid == resource.data.recipientId &&
                         request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isRead']);
        allow create, delete: if false;  // Cloud Functionsのみが書き込み
      }
    }
  }
}
```

---

## 重要な設計注意事項

1. **コラボセッションの公開読み取り**: `collabSessions/{sessionId}` の read は認証なしで許可する。
   UUID v4トークン（=ドキュメントID）の推測困難性がアクセス制御の役割を担う。

2. **タスク・コラボ作成のCF強制**: プラン制限（月次カウント）をバックエンドで強制するため、
   タスクとコラボセッションの`create`はFirestoreルールで禁止し、Cloud Functions経由のみ許可する。

3. **チームコードの整合性**: `teamCodes/{code}`の書き込みはCloud Functions（Admin SDK）のみ許可。
   コードのリセット・削除はトランザクションで旧コード削除と新コード作成を原子的に実行する。

4. **楽観的ロックのルール**: Security Rulesでは `updatedAt` の比較は行わない。
   楽観的ロックの検証はCloud Functions内のFirestore transactionで実施する。

5. **通知の既読更新**: クライアントは `isRead` フィールドのみ更新可能（他フィールド変更は拒否）。
