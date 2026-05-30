# plan model

## モデル方針

Plan は、利用者ごとの契約状態と月次利用カウントを表す論理モデルである。

このカテゴリでは、プラン制限に直接関係する項目だけを正本化する。実体の保存先は `users/{uid}` ドキュメント上のフィールドであり、チーム UI では `teams/{teamId}/members/{uid}.plan` を参照用スナップショットとして併用する。

## Plan

| フィールド | 型 / 例 | 意味 |
| --- | --- | --- |
| `userId` | string | プランを所有するユーザーの UID |
| `planType` | `light` \| `party` | 現在のプラン種別 |
| `planUpdatedAt` | timestamp | プラン状態の最終更新時刻 |
| `monthlyTaskCount` | number | 当月に作成したタスク数 |
| `monthlyCollabCount` | number | 当月に作成したコラボ数 |
| `countResetAt` | timestamp | 月次カウントを最後にリセットした時刻 |

## 保存先

### 正本

```text
users/{uid}
```

- `plan`
- `planUpdatedAt`
- `monthlyTaskCount`
- `monthlyCollabCount`
- `countResetAt`

### 参照用スナップショット

```text
teams/{teamId}/members/{uid}
```

- `plan`

TeamMember 側の `plan` はチーム UI でメンバーの現在プランを表示・判定するための参照値であり、月次カウントは保持しない。

## 制約

- `planType === 'light'` のときのみ月次制限を適用する
- `planType === 'party'` では月次カウントを保持していても上限制御には使わない
- `monthlyTaskCount` はタスク作成成功時のみ増加する
- `monthlyCollabCount` はコラボ作成成功時のみ増加する
- `countResetAt` は毎月 1 日 0:00 JST のリセット処理で更新する
- チーム参加の 3 人目以降判定では、参加者を含む全メンバーの `planType` が `party` である必要がある

## 関連する隣接モデル

### user 側で管理するもの

- `displayName`、`email`、`avatarUrl`
- `currentTeamId`、`teamIds`

### team 側で管理するもの

- チーム参加フロー
- `TeamMember.role`
- チームコードと参加 / 退出条件

### task / collab 側で管理するもの

- タスク / コラボの作成成功条件
- 上限到達時の画面ごとの表示内容

### ui / notification 側で管理するもの

- プランバッジ、アップグレード CTA、広告枠の見た目
- 参加ブロック時や制限案内時のシステム通知
