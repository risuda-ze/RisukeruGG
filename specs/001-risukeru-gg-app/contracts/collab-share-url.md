# Contract: コラボ共有URL仕様

**目的**: コラボ日程調整の外部共有URLの設計仕様。

---

## URL構造

```
https://risukeru.gg/collab/{sessionId}
```

- `sessionId`: UUID v4（32文字のハイフンあり形式）
- 例: `https://risukeru.gg/collab/550e8400-e29b-41d4-a716-446655440000`

---

## アクセスシナリオ

| 状態 | URLアクセス時の表示 |
|------|-------------------|
| open（期限内） | 回答フォーム（候補日程一覧・OK/NG選択・代替日提案・メモ） |
| open（期限切れ） | 「このリンクは有効期限切れです」メッセージ |
| confirmed | 「日程が確定しました」メッセージ（確定日時を表示） |
| cancelled | 「このコラボ調整はキャンセルされました」メッセージ |
| 存在しないsessionId | 「リンクが見つかりません」404ページ |

---

## 回答ページの要件

- **認証不要**: システムアカウントなしでアクセス可能
- **モバイル対応**: Discord等のスマートフォンアプリからリンクを踏む想定
- **言語**: 日本語固定
- **データ取得**: Firestoreから `collabSessions/{sessionId}` を直接取得
- **回答送信**: `respondToCollab` Cloud Function を呼び出し

### 回答フォームの必須要素

1. セッションタイトル・コラボ相手名（「〇〇さんからのコラボ打診」の形式で表示）
2. 候補日程リスト（各日程に OK / NG のトグル）
3. 代替日程の提案入力（任意、日付ピッカー）
4. メモ入力欄（任意、200文字以内）
5. 「回答を送信する」ボタン（未選択の候補日がある場合は確認ダイアログ）
6. 有効期限の表示

---

## セキュリティ考慮事項

- UUID v4 のランダム性は 2^122 ≈ 5.3 × 10^36 通り。ブルートフォースは非現実的
- 回答送信は Cloud Function 経由でサーバーサイドバリデーション実施
- 同一URLからの複数回答は最後の回答で上書き（重複防止はフェーズ2以降）
- 有効期限チェックはサーバーサイド（Cloud Function）で実施し、クライアントチェックは補助的

---

## 生成・共有フロー

```
[Owner/Editor] コラボセッション作成フォーム入力
    ↓
[Cloud Function] createCollabSession 呼び出し
    ↓
UUID v4 生成 → Firestore に保存 → shareUrl を返す
    ↓
[アプリ] 「URLをコピー」ボタンでクリップボードにコピー
    ↓
[Owner/Editor] Discord / LINE / Twitter DM 等でコラボ相手に送付
    ↓
[コラボ相手] URLにアクセス → 回答フォームで候補日を回答
    ↓
[Cloud Function] respondToCollab → チームに通知
    ↓
[Owner/Editor] アプリ内で回答を確認 → 「確定」を押す
    ↓
[Cloud Function] confirmCollabDate → カレンダーに自動登録 → URLを無効化
```
