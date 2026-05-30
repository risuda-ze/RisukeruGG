# ui model

## モデル方針

ui カテゴリでは、画面横断で共有するナビゲーション状態と表示用の投影モデルだけを正本化する。

業務データ自体の型は task / schedule / collab / team / notification / user / plan を参照し、ui では「どう見せるか」「どの状態を保持するか」だけを定義する。

## SidebarState

サイドバーの表示状態を保持する Zustand ストア。

| フィールド     | 型       | 意味 |
| -------------- | -------- | ---- |
| `collapsed`    | boolean  | サイドバーが折りたたまれているか |
| `openSections` | string[] | 展開中のセクション識別子一覧 |

### 永続化方針

- `collapsed` は localStorage に永続化する
- `openSections` は表示上の状態として扱い、現在のパスとユーザー操作に応じて復元する

## NavSection

サイドバーのセクション定義。

| フィールド | 型        | 意味 |
| ---------- | --------- | ---- |
| `label`    | string    | セクション表示名 |
| `icon`     | string    | Material Icons 名 |
| `items`    | NavItem[] | セクション配下のナビゲーション項目 |

## NavItem

サイドバーおよび折りたたみ時アイコン列で共有するナビゲーション項目定義。

| フィールド | 型                    | 意味 |
| ---------- | --------------------- | ---- |
| `href`     | string                | 遷移先パス |
| `label`    | string                | 項目表示名 |
| `icon`     | string                | Material Icons 名 |
| `badge`    | string \| undefined   | 任意の補助表示 |
| `disabled` | boolean \| undefined  | 非活性項目かどうか |

## 派生 UI 状態

### activeHref

- 現在の `pathname` と全 `NavItem.href` から導出するサイドバーのアクティブ項目
- 判定対象は `pathname === href` または `pathname.startsWith(href + '/')` を満たす非 disabled 項目
- 複数候補がある場合は `href` が最も長い項目を採用し、同時アクティブ表示を禁止する

## notification 側モデルとの境界

- 通知データの正本は notification カテゴリが持つ
- ui は TopBar 上の未読件数表示、ドロップダウン開閉状態、一覧プレビュー上限、設定/通知画面の削除導線の見せ方を扱う

## 通知表示投影

- 通知ドロップダウンは Notification の表示用投影から最大 4 件だけを扱う
- 設定/通知画面は未削除の Notification 一覧を表示用に投影する
- 1 件削除と全件削除の操作可否は notification カテゴリのルールに従って表示する
