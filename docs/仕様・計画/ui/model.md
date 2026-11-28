# ui model

## モデル方針

ui カテゴリでは、画面横断で共有するナビゲーション状態と表示用の投影モデルだけを正本化する。

業務データ自体の型は task / schedule / collab / team / user / plan を参照し、ui では「どう見せるか」「どの状態を保持するか」だけを定義する。

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

## ThemePreference

ユーザーが選んだテーマ。型は `'dark' | 'light' | 'system'`。

| 保存先 | キー / フィールド | 条件 |
| ------ | ----------------- | ---- |
| localStorage | `risukeru-theme` | 常に保存する（`next-themes` が管理） |
| Firestore | `users/{uid}.theme` | ログイン中のみ。未設定可 |

- 未設定は `dark` として扱う。3 値以外が入っていた場合も未設定として扱う
- `users/{uid}.theme` の読み書きは本人のみ。Security Rules では値域を検証しない
- `users/{uid}.theme` はゴースト化で残さない（user の US-009 の保持対象外）

### resolvedTheme

- `<html data-theme>` に付ける値（`dark` / `light`）。`ThemePreference` が `system` のときは `prefers-color-scheme` から導出する
