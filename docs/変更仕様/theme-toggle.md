# ライト / ダークテーマ切り替え 変更仕様

**作成日**: 2026-11-18
**状態**: 実装済み（Issue #215）。手順 7 の目視（2026-11-21、スケジュール・タスク・タスク管理 v2・コラボ・チーム・個人設定・カテゴリ設定・AI 相談・モバイルのドロワー）で目立つ崩れは無し
**正本**: [docs/仕様・計画/ui/](../仕様・計画/ui/README.md)（UI-033〜UI-038）

## 背景・目的

デザインシステム v3（#178）は既定がダークで、ライトを `[data-theme="light"]` の代替テーマとして定義済み。両テーマは同じ役割名のトークンを持つため、`<html data-theme>` を切り替えるだけで全部品の見た目が変わる。ユーザーが切り替える UI と、選択を保持する仕組みがまだ無いので追加する。

## 現状（2026-11-18、develop の実コードで確認）

| 対象 | 状態 |
| --- | --- |
| `src/app/tokens.css` | `:root, [data-theme='dark']` と `[data-theme='light']` の 2 ブロック。各ブロックに `color-scheme: dark` / `light` を持つ（`pnpm tokens` で生成） |
| `src/app/globals.css` | `dark:` バリアントは「`[data-theme='light']` の外」に効く定義。16 進の生値は 0 件 |
| `src/app/layout.tsx` | `<html>` に `data-theme` を付けていない（常にダーク）。`viewport.themeColor` は `#100c1c` 固定 |
| `public/manifest.json` | `theme_color` / `background_color` とも `#100c1c` 固定 |
| テーマ切り替え | `/design-preview`（開発時のみ）が `document.documentElement.dataset.theme` を直接書き換えているだけ。保持しない |
| `next-themes` | 未導入 |
| `users/{uid}` | `theme` フィールドなし。`src/stores/auth.ts` が `onSnapshot` で購読済み（現状は `currentTeamId` / `teamIds` のみ取り出す） |
| `firestore.rules` | `users/{uid}` の update は本人のみ。`plan` / `planUpdatedAt` / `stripeCustomerId` 以外は値を検証していない |
| ゴースト化 | `deleteAccount` が `users/{uid}` を `set` で上書きするため、列挙した 5 フィールド以外は残らない |
| PC のナビ | `Sidebar`（md 以上）。最下部は `TeamSwitcher`。折りたたみ時は 72px |
| モバイルのナビ | `MobileToolbar` の「その他」ドロワー（リンクの一覧）。サイドバーは非表示 |
| 設定画面 | `/settings/profile`（タブ: profile / plan / account / app-info）、`/settings/categories`、`/settings/ai`、`/settings/contact`。「表示」設定の画面は無い |
| LP（`src/app/page.tsx`） | `#lp-root` に独自パレット（`--bg` / `--surface` / `--text` 等）を持ち、役割トークンを参照しない |
| CSP | 設定なし（インラインスクリプトの制約なし） |
| `react-big-calendar` | `package.json` にあるが `src/` から import されていない。カレンダーは自作（`MonthCalendar` / `WeekCalendar`） |

## 決定事項

★ は確認済み（Issue 本文・ユーザー回答）。それ以外は「仮決定」の表を参照。

| 項目 | 決定 |
| --- | --- |
| ★ 既定テーマ | ダーク |
| ★ 選択肢 | `dark` / `light` / `system`。`system` は `prefers-color-scheme` に追従 |
| ★ 適用方法 | `next-themes` で `<html data-theme>` を付ける。初回描画前に適用し、ちらつかせない |
| ★ 保存先 | ログイン中は `users/{uid}.theme`、未ログイン時は localStorage |
| ★ `color-scheme` | テーマに合わせて切り替える（`tokens.css` の既存定義で満たされる。追加実装なし） |

### next-themes の設定

```tsx
<ThemeProvider
  attribute="data-theme"
  defaultTheme="dark"
  themes={['dark', 'light']}
  enableSystem
  storageKey="risukeru-theme"
  enableColorScheme={false}
  disableTransitionOnChange
>
```

- `<html>` に `suppressHydrationWarning` を付ける
- `enableColorScheme={false}`: `color-scheme` は `tokens.css` が持つので二重に管理しない
- `storageKey`: 既存の `risukeru-sidebar` に合わせた命名

### next-themes を足す妥当性

自前で書く場合、必要なのは (1) hydration 前に走るインラインスクリプト、(2) `prefers-color-scheme` の変更監視、(3) 別タブとの同期（`storage` イベント）、(4) hydration 不一致を起こさない hook の 4 つで、合わせて数十行になる。量は小さいが、ちらつきと hydration 不一致は壊れても気づきにくい。`next-themes` は依存ゼロ・数 KB で、この 4 つをそのまま満たし、`attribute="data-theme"` で現行のトークン構成に手を入れずに載る。Issue の方針を覆す理由は無いため `next-themes` を採用する。React 19.2 / Next 16 で警告が出ないかは実装時に確認し、出る場合のみ自前実装に切り替える。

## 仮決定

Issue に無い、または候補止まりだった点。最小の案を選んだ。覆す場合は正本と本書を直す。

| # | 項目 | 仮決定 | 理由 | 代替案 |
| --- | --- | --- | --- | --- |
| 1 | ボタンの置き場所 | PC: サイドバー最下部（`TeamSwitcher` の直上）。モバイル: 「その他」ドロワーの最下部。同じ部品 `ThemeToggle` を置く | Issue の候補のうち、既存の画面に足すだけで済む。「設定 > 表示」は画面が無く新設が要る | (a) `/settings/profile` に「表示」カードを足す（1 か所で済むが、切り替えまでの手数が多い） (b) TopBar の `AccountMenu` に入れる（PC・モバイル共通で 1 か所。Issue の候補外） |
| 2 | ボタンの形 | 1 つのボタン。押すたびに ダーク → ライト → 端末に合わせる の順に切り替える。現在の選択をアイコン + ラベルで示す。サイドバー折りたたみ時はアイコンのみ | 展開・折りたたみ・ドロワーの 3 か所を同じ部品でまかなえる | 3 択のセグメント（折りたたみ時の別表示が要る） |
| 3 | ログイン直後の優先順位 | `users/{uid}.theme` に値があればそれを正とし、端末の表示と localStorage を合わせる。未設定なら端末の選択をそのまま使い、Firestore へは書かない | ログイン時の書き込みを増やさない。既存ユーザーの移行処理も不要 | 未設定なら端末の選択を Firestore へ書き込む |
| 4 | 書き込みのタイミング | ユーザーがボタンを押したときだけ。localStorage は常に、ログイン中は `users/{uid}.theme` にも書く | 最小 | — |
| 5 | 複数端末 | 既存の `users/{uid}` 購読で他端末の変更を即時反映する。後勝ち | 追加の購読が要らない | 端末ごとに独立（Firestore に保存しない。Issue と不一致） |
| 6 | 初回描画 | localStorage の値で描画する。Firestore の値と違う場合（他端末で変更した直後）のみ、購読の到着時に 1 回切り替わる | サーバーでユーザーを特定できず、Cookie 等を足さないと防げない | テーマを Cookie にも持ち、サーバーで `data-theme` を出力する |
| 7 | Security Rules | `theme` の値域は検証しない（ルール変更なし）。読み取り側で 3 値以外を未設定として扱う | 読み書きは本人だけで、不正値の影響は本人の表示に留まる。ルールのデプロイが要らない | update 条件に `theme in ['dark','light','system']` を足す |
| 8 | 保存失敗 | 端末の表示は切り替えたまま、toast でエラーを出す | 失敗を隠さない。表示は端末で完結している | 表示を元に戻す |
| 9 | ログアウト後 | 端末の選択（localStorage）を維持する | `next-themes` の既定動作のまま | ログアウト時に既定へ戻す |
| 10 | 未ログイン画面 | テーマは全ページに適用する（ルートレイアウト）。切り替えボタンは保護ルート内にだけ置く | LP は独自パレットで影響を受けない。ログイン・規約ページは役割トークンで描かれている | 公開ページをダーク固定にする / 公開ページにもボタンを置く |
| 11 | `<meta name="theme-color">` | `#100c1c` 固定のまま | ブラウザのアドレスバー色だけの差。Next の `viewport` は静的で、追従には別途クライアント処理が要る | 解決後のテーマに合わせて `--canvas` の値へ書き換える |
| 12 | PWA manifest | 変更なし（ダーク固定） | manifest は静的でユーザーの選択に追従できない。既定テーマと一致している | — |
| 13 | ゴースト化 | `theme` は残さない。実装・正本とも変更なし | `deleteAccount` の上書きで消える。US-009 の保持対象にも無い | — |
| 14 | 共通用語 | 追加しない | 「テーマ」「ダーク」「ライト」は一般語で、定義が要る固有の語が無い | — |
| 15 | ハードコード色の扱い | 本 Issue では直さない。実装 PR で主要画面をライトで目視し、崩れは別 Issue に切り出す | Issue の依存に「UI-023 違反の洗い出しは別途」とある | 実装 PR で同時に直す |

## 波及の確認

| 対象 | 波及 |
| --- | --- |
| `react-big-calendar` | なし（未使用） |
| 自作カレンダー・`MiniCalendar` | トークン参照のため追従する。`MonthCalendar` の予定色の既定値（`#7d68c5` ほか 2 色）は生値で、ライトでも同じ色になる（仮決定 15 の目視対象） |
| sonner（`Toaster`） | `unstyled` + トークンのクラスのため追従する。`theme` prop は不要 |
| カテゴリカラー・第三者ブランド色 | UI-023 の例外。両テーマで同じ色 |
| LP | 影響なし（独自パレット） |
| `theme-color` / manifest | 仮決定 11・12 のとおり固定 |
| Functions | 変更なし（`onUserCreate` は `theme` を書かない。未設定 = 既定） |
| `firestore.rules` / indexes | 変更なし |

## 実装計画（PR 1 本）

1. `pnpm add next-themes`。`layout.tsx` に `ThemeProvider`（クライアント部品のラッパー）と `suppressHydrationWarning` を足す
2. `src/types/entities.ts` の `User` に `theme?: 'dark' | 'light' | 'system'` を足す。`src/stores/auth.ts` の購読で `theme` を取り出す（3 値以外は未設定扱い）
3. 同期: 保護ルートに常時マウントされる場所で、`users/{uid}.theme` が設定済みかつ現在の選択と違うとき `setTheme` する
4. `ThemeToggle` を作り、`Sidebar` 最下部と `MobileToolbar` のドロワー最下部に置く。`Icon.tsx` にアイコン 3 種を足す。押下時に `setTheme` + `updateDoc`、失敗時は `toast.error`
5. `/design-preview` の `dataset.theme` 直書きを `useTheme` に置き換える
6. テスト
   - ユニット: 切り替え順、3 値以外の読み取りを未設定として扱うこと
   - E2E（emulator）: ボタンでライトにする → `html[data-theme="light"]` → リロード後も維持。`system` は `page.emulateMedia({ colorScheme })` で追従を確認
7. 主要画面（スケジュール・タスク・ブリーフ・コラボ・設定・ログイン）をライトで目視。崩れは別 Issue
8. 正本 `ui/*`・`user/model.md` の「未実装」の注記を外す

## 依存

- #178 フェーズ 2（トークン層）: develop にマージ済み（#218）
- `docs/DESIGN.md` は develop で既に「既定ダーク」（#218）。本書と食い違いは無く、書き換え不要
