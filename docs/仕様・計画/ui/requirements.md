# ui requirements

## サイドバー

- **UI-001**: サイドバーはトグルボタンで 260px（展開）↔ 72px（折りたたみ）を切り替える
- **UI-002**: サイドバーの「メイン」「チーム管理」「各種連携」の各セクションはクリックで展開 / 収納できる
- **UI-003**: サイドバーの折りたたみ状態は localStorage に永続化し、リロード後も維持する
- **UI-004**: サイドバーのナビゲーションアイコンは Google Material Icons を使用する
- **UI-005**: サイドバーのアプリロゴアイコンをクリックすると `/dashboard` に遷移する
- **UI-012**: サイドバーのアクティブ状態は現在のパスに最も長く一致する 1 項目のみを対象にする。`/settings/profile` 表示時に `/settings` と `/settings/profile` を同時にアクティブ表示してはならない
- **UI-027**: サイドバー「メイン」の「タスク管理」の直下に「タスク管理 v2」（`/briefs`）を置き、β バッジを添える。モバイルの「その他」ドロワーにも同項目を置く。ナビ項目は任意で `badge` 文字列を持てる
- **UI-028**: サイドバー「設定」の「カテゴリ設定」の直下に「AI設定」（`/settings/ai`）を置く。モバイルの「その他」ドロワーにも同項目を置く

## TopBar・通知導線

- **UI-010**: TopBar の通知ベルをクリックすると通知ドロップダウンを表示する
- **UI-011**: 通知ドロップダウンはドロップダウン外クリックで閉じる
- **UI-013**: 通知ドロップダウンは最大 4 件の通知プレビューを表示する
- **UI-014**: 未読通知がある場合、TopBar の通知ベルに未読件数バッジを表示する
- **UI-015**: 設定/通知画面では未削除の通知履歴を一覧表示する
- **UI-016**: 設定/通知画面では通知 1 件ごとの削除操作を提供する
- **UI-017**: 設定/通知画面では通知全件削除操作を提供する
- **UI-018**: 通知ドロップダウンには「すべて見る」によるページ遷移導線を設けない

## ページレイアウト規約（デザイン統一・T7）

デザインシステムは `src/app/globals.css` のデザイントークン（`--color-*` / `--primary-*` / `--radius-*` / `--shadow-*` ほか）とコンポーネントクラス（`.btn` / `.ds-card` / `.ds-badge` / `.navlink` 等）を正とする。全画面はこれに準拠し、独自スタイルを持たない。

- **UI-019（ページヘッダー）**: 保護ルート配下の各ページ上部には `TopBar`（`src/components/layout/TopBar.tsx`）を用いる。`title` を必須、画面の補足がある場合のみ `subtitle` を指定し、画面固有アクションは `children` に渡す。ページ独自のヘッダー実装を作らない。
- **UI-020（ページコンテナ）**: ページは外枠 `flex flex-col flex-1 overflow-hidden`、内側にスクロール領域 `flex-1 overflow-y-auto px-4 py-6 md:px-7` を置く。コンテンツ最大幅は用途に応じ `max-w-lg`（フォーム・オンボーディング）/ `max-w-2xl`（単一列一覧）/ `max-w-3xl`（設定）から選び、ボード系全幅画面（タスク・スケジュール）では最大幅を設けない。独自のページ余白（`p-6` 等）を使わない。
- **UI-021（余白スケール）**: 余白は Tailwind の 4px グリッド（`gap-*` / `space-y-*` / `p-*`）に統一する。密度は2段階とし、設定・フォーム・ダッシュボードは comfortable（カード内 24px・セクション間 32px）、かんばん・月カレンダー・リスト行・モバイルは compact（カード内 12px・セクション間 16px）を基準とする（`docs/DESIGN.md` 1.3）。ピクセル直値（`px-[18px]` 等）は既存のカード内パディング規約に合わせる場合のみ許可する。
- **UI-022（カード規格の統一）**: カードは `Card` コンポーネント（`src/components/ui/Card.tsx`）に必須で統一する。標準 padding は 16px（md 以上 24px）、角丸は `--radius-lg`（14px）、影は使わない。カード外枠を画面ローカルの CSS や `bg-card`+`border`+`rounded-[*]` の手書きで再実装することは禁止する。カード間の差分は `Card` の明示的 props（`variant`＝`default`（card 面 + 1px 枡線）/ `specimen`（カラーファミリーの tint 面 + 2px 枡線。`family` で pink / orange / green / blue / teal を選ぶ）/ `flat`（surface 面・枡線なし） ・ `accent`＝左3pxステータスレール `primary`/`success`/`warning`/`danger` ・ `interactive`＝クリック可能（hover で枡線のみ強調。浮かせない） ・ `noPadding`）のみで表現し、「2規格」を作らない。タイトル付きセクションは `CardHeader` を用いる。トースト・ポップオーバー・モーダル・ドロップダウンなどカードでない小要素は対象外。ドラッグ＆ドロップの制約で `Card` に載せ替えられないタスクカード（`src/components/kanban/TaskCard.tsx`）だけは例外とし、`Card` と同じ規格（radius-lg・padding 16px・border トークン・左レール3px・hover は枡線のみ）のユーティリティを直接当てる。
- **UI-023（色トークン）**: 色は必ず `docs/DESIGN.md` の役割トークン（`var(--canvas)` / `var(--text)` / `var(--primary)` 等、または対応する Tailwind ユーティリティ `bg-canvas` / `bg-surface` / `text-text-muted` / `border-border` 等）で指定する。トークンは既定のダークと `[data-theme="light"]` の両テーマで同じ役割名を持つため、黒・白・無彩色グレーやブランド・セマンティックカラーの生値をハードコードしない。色を付けたい要素はカラーファミリー（pink / orange / green / blue / teal）から1つ選び、`*-tint`（面）・`*-border`（枡線）・`*-text`（文字）を組で使う。透過ティントは `color-mix(in oklab, var(--token) N%, transparent)` で表現する。v2 の旧名（`--purple` / `--amber` / `--text-primary` / `--card-border` / `bg-purple` / `text-purple-l` 等）は `globals.css` の移行用別名として残っているが、新規コードでは使わない。例外は第三者ブランド色（Discord `#5865F2` 等）およびユーザーが選択するカテゴリカラーのパレット値。トークンの値は `docs/DESIGN.md` の frontmatter が正本で、`src/app/tokens.css` は `pnpm tokens` で生成する（手で編集しない）。
- **UI-024（角丸・ボタン・バッジ）**: 角丸は半径トークン（`--radius-xs 4px` / `--radius-sm 7px` / `--radius-md 10px` / `--radius-lg 14px` / `--radius-full`）のスケールに沿う。カード・ボタン・モーダルは `--radius-lg`、タグ・ナビ項目・入力欄は `--radius-sm` を用いる。ボタンは `Button`（`<Link>` 等ボタン以外の要素には `buttonVariants()`）、バッジは `Badge`（同 `badgeVariants()`）を用い、独自ボタン・独自バッジを実装しない。塗りのボタンは `primary` と `danger` のみとし、2次アクションは `ghost`（`secondary` は同じ見た目の別名）、ツールバー等の補助操作は `subtle` を使う。部品は shadcn（Base UI 版）と Animate UI（Base UI 版）を `src/components/ui/*` にコピー所有したもので、見た目の規約は `docs/DESIGN.md` 2 章に従う。部品内のアイコンは `Icon`（`src/components/ui/Icon.tsx`）を使い、lucide 等の別アイコンライブラリを持ち込まない。
- **UI-025（モーダル規約）**: ダイアログは `Modal`（`src/components/ui/Modal.tsx`）を用いる。`Modal` は PC（md 以上）では `Dialog`、モバイルでは下からの `Drawer`（いずれも Base UI）として表示する。フッターは右寄せで「キャンセル（ghost）→ 主アクション（primary/danger）」の順とする。全画面・大型の専用モーダル（タスク詳細・スケジュール・コラボ）は `DialogShell`（`src/components/ui/Dialog.tsx`）を外枠に用い、フォーカストラップ・Esc・スクロールロックをそこに任せたうえで、寸法（モバイルは全幅、PC は固定幅でリサイズ可）は各モーダルが `DialogShell` の `className` で持つ。`fixed inset-0` のオーバーレイを手書きしない。一時的な結果通知（保存完了・失敗等）は sonner の `toast`（`Toaster` は `layout.tsx` に常設）を用い、画面内に独自のトースト表示を実装しない。
- **UI-026（タップターゲット）**: タップ可能なコントロールは 44px 以上の当たり判定を確保する（`Button` の既定サイズ `md` と `Input` / `Dropdown` は高さ 44px。`sm`（36px）は PC のツールバー等、密度が必要な箇所に限る）。375px 幅で主要操作のタップターゲットが 44px を下回らないこと。
- **UI-029（デザインシステムの正本）**: 色・タイポグラフィ・余白・角丸・奥行き・モーションと部品の見た目は `docs/DESIGN.md`（v3）を正本とする。本書と矛盾した場合は `docs/DESIGN.md` を優先し、本書を更新する。既定テーマはダーク、ライトは `[data-theme="light"]` の代替テーマとする。フォントはシステムフォントのみ（Web フォントを読み込まない）。影（`box-shadow`）はフォーカスリングを除き使わず、奥行きは面の段差と枡線で表す。
- **UI-030（モーション）**: アニメーションは `transform` と `opacity` のみを動かし、時間は `--duration-*`、イージングは `--ease-*` のトークンを使う。出現は CSS、退場アニメーションが必要な箇所のみ `motion` を使う。`prefers-reduced-motion: reduce` を必ず尊重する（`globals.css` で全アニメーションを実質無効化し、`motion` は `reducedMotion="user"` とする）。
- **UI-032（画面ローカル CSS を持たない）**: 画面や機能ごとの CSS ファイル・独自クラス（BEM 風の `.xxx__yyy` 等）を新たに作らない。レイアウトと見た目は Tailwind ユーティリティと `src/components/ui/*` の部品で書く。`globals.css` に置いてよいのは、トークンの登録、ベーススタイル、keyframes と、自作を維持する部品（`MiniCalendar`）およびネイティブのフォーム部品（`select` / 日付入力）のスタイルだけとする。
- **UI-031（部品の確認ページ）**: 開発時（`pnpm dev`）のみ `/design-preview` で全部品と両テーマの見え方を確認できる。本番ビルドでは 404 とする。部品や `docs/DESIGN.md` のトークンを変えたときはこのページで確認する。

## 補足

- 通知データの定義、既読更新、削除可否の業務ルールは notification カテゴリを参照する
