---
name: RisukeruGG design system
description: Light "lavender observatory" design system for RisukeruGG — streamer task & schedule management app
theme: light
version: 3
colors:
  # 基調
  canvas: '#fcf9f5' # Parchment — ページ背景
  surface: '#f3ecf7' # Lilac Mist — 1段目の面（テーブル行・セクション背景）
  surface-2: '#eadff8' # Lavender Veil — テーブルヘッダー・フッター・区切り
  card: '#ffffff' # Pure — カード・モーダル・入力欄
  border: '#eadff8' # Lavender Veil — 既定の枡線（1px）
  border-strong: '#4d3e78' # Deep Iris — 強い枡線（ゴーストボタン・フォーカス）

  # ブランド（紫）
  brand: '#4d3e78' # Deep Iris — 文字・アイコン・枡線の基本色
  brand-2: '#6956a8' # Amethyst — 補足文字・2次枡線
  primary: '#745fbb' # Iris Glow — 唯一の塗りボタン色
  primary-hover: '#6956a8'
  primary-active: '#4d3e78'

  # テキスト
  text: '#4d3e78' # Deep Iris — 本文・見出し（parchment 上 8.8:1）
  text-2: '#6956a8' # Amethyst — 補足（parchment 上 5.7:1）
  text-muted: '#7f72ac' # placeholder・大きい補足のみ（parchment 上 4.1:1）
  text-disabled: '#b8afd4'
  text-on-primary: '#ffffff' # primary 上 5.1:1

  # セマンティック（ファミリーから割り当て）
  success: '#1f7a57' # Forest Fern
  success-tint: '#e9f3e7' # Licheno
  warning: '#b74d1a' # Tangerine
  warning-tint: '#feede0' # Apricot Wash
  danger: '#a53c3a' # Crimson
  danger-tint: '#ffdce8' # Rose Quartz
  info: '#3c699b' # Cobalt
  info-tint: '#ccdcf8' # Sky Tint
  live: '#e14f4c' # Vermilion — LIVE ドットのみ（文字には使わない）

  # カラーファミリー（カテゴリ色・チーム色・カード種別）: tint + border + text
  family-pink: { tint: '#ffdce8', border: '#a54b7a', text: '#803218' }
  family-orange: { tint: '#feede0', border: '#b74d1a', text: '#b74d1a' }
  family-green: { tint: '#e9f3e7', border: '#1f7a57', text: '#1f7a57' }
  family-blue: { tint: '#ccdcf8', border: '#3c699b', text: '#4d3e78' }
  family-teal: { tint: '#f3ecf7', border: '#058380', text: '#4d3e78' }

typography:
  # システムフォントのみ（Web フォントは読み込まない）。見出しも本文も同じスタック。
  # 見出しは細いウェイト + 負のトラッキングで「静かな見出し」を作る
  family: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Hiragino Sans', 'Yu Gothic UI', 'Noto Sans JP', sans-serif"
  base: 16px
  display: { size: 2.5rem, weight: 300, lineHeight: 1.05, tracking: '-0.03em' } # 40px
  h1: { size: 1.75rem, weight: 300, lineHeight: 1.1, tracking: '-0.02em' } # 28px
  h2: { size: 1.5rem, weight: 400, lineHeight: 1.15, tracking: '-0.015em' } # 24px
  h3: { size: 1.25rem, weight: 500, lineHeight: 1.2, tracking: '-0.01em' } # 20px
  body: { size: 1rem, weight: 400, lineHeight: 1.6 } # 16px
  body-sm: { size: 0.875rem, weight: 400, lineHeight: 1.5 } # 14px
  caption: { size: 0.75rem, weight: 500, lineHeight: 1.3, tracking: '0.02em' } # 12px
  eyebrow: { size: 0.75rem, weight: 600, lineHeight: 1.15, tracking: '0.06em', transform: uppercase } # 12px
  num: { weight: 500, tracking: '-0.01em', features: 'tnum' } # 数値・時刻（等幅数字）

spacing:
  unit: 4px
  comfortable: { card: 24px, section: 32px, gap: 24px }
  compact: { card: 12px, section: 16px, gap: 8px } # かんばん・カレンダー・リスト行

rounded:
  xs: 4px # チップ内の小要素
  sm: 7px # タグ・ナビ項目・入力欄
  md: 10px # 小カード・ドロップダウン
  lg: 14px # カード・ボタン・モーダル（システムの基本形）
  full: 9999px # ピル・バッジ・アバター

elevation: none # 影は使わない。枡線と面の色で奥行きを出す
---

# RisukeruGG デザインシステム v3（ライト）

**App**: RisukeruGG — 配信者向けのタスク管理・スケジュール管理アプリ
**Brand**: 温かみのあるオフホワイトのキャンバスに、濃い紫がインクのように乗る。影を使わず、淡い面と鮮やかな枡線で奥行きを作る「標本カード」の世界観。
**Platform**: スマホ（Android / iOS）＋ PC。Web（Next.js）で両対応。

v2（ネオンパープル・ダーク）は廃止。ダークテーマは別 PR で `[data-theme="dark"]` として追加する（後述）。

---

## 0. 原則

1. **ページ背景は Parchment `#fcf9f5`**。純白 `#ffffff` はカード・モーダル・入力欄にだけ使う。
2. **文字・アイコン・枡線の基本色は Deep Iris `#4d3e78`**。黒 `#000` と無彩色グレーは使わない。
3. **塗りボタンは Iris Glow `#745fbb` のみ**。2次アクションは Deep Iris のゴースト枡線。
4. **影を使わない**。奥行きは「Parchment → 淡い面 → 白」の面の段差と、2px の枡線で表す。
5. **角丸は 14px が基本形**。カード・ボタン・モーダルは全部 14px。タグ・ナビ・入力欄は 7px。
6. **色を付けたい要素はカラーファミリーから1つ選ぶ**。淡い面（tint）と枡線（border）は同じファミリーから取る。鮮やかな色を広い面に塗らない。
7. **フォントはシステムフォントの1スタック**。Web フォントは読み込まない。見出しは細いウェイト（300〜400）と負のトラッキングで静かに。
8. **色・余白・角丸・時間はトークン経由**。生の値を書かない。`prefers-reduced-motion` を必ず尊重する。
9. タップ対象は 44px 以上。

---

## 1. トークン

### 1.1 色

| 役割 | トークン | 値 | 備考 |
| --- | --- | --- | --- |
| ページ背景 | `--canvas` | `#fcf9f5` | Parchment |
| 面 1 | `--surface` | `#f3ecf7` | Lilac Mist。テーブル行・サイドバー・セクション背景 |
| 面 2 | `--surface-2` | `#eadff8` | Lavender Veil。テーブルヘッダー・区切り |
| カード | `--card` | `#ffffff` | カード・モーダル・入力欄・ボトムナビ |
| 枡線 | `--border` | `#eadff8` | 既定 1px |
| 強い枡線 | `--border-strong` | `#4d3e78` | ゴーストボタン・フォーカスリング |
| ブランド | `--brand` | `#4d3e78` | Deep Iris |
| ブランド 2 | `--brand-2` | `#6956a8` | Amethyst |
| プライマリ | `--primary` | `#745fbb` | Iris Glow。塗りボタン |
| プライマリ hover | `--primary-hover` | `#6956a8` | |
| プライマリ active | `--primary-active` | `#4d3e78` | |
| 文字 | `--text` | `#4d3e78` | |
| 文字 2 | `--text-2` | `#6956a8` | |
| 文字 muted | `--text-muted` | `#7f72ac` | placeholder・補足のみ（4.1:1） |
| 文字 disabled | `--text-disabled` | `#b8afd4` | |
| プライマリ上の文字 | `--text-on-primary` | `#ffffff` | |
| 成功 | `--success` / `--success-tint` | `#1f7a57` / `#e9f3e7` | Forest Fern / Licheno |
| 警告 | `--warning` / `--warning-tint` | `#b74d1a` / `#feede0` | Tangerine / Apricot |
| 危険 | `--danger` / `--danger-tint` | `#a53c3a` / `#ffdce8` | Crimson / Rose |
| 情報 | `--info` / `--info-tint` | `#3c699b` / `#ccdcf8` | Cobalt / Sky |
| LIVE | `--live` | `#e14f4c` | Vermilion。ドット・アイコンのみ。文字色に使わない（3.7:1） |

#### カラーファミリー（カテゴリ色・チーム色）

ユーザーが選ぶカテゴリ色は、自由な色ではなくこの5ファミリーから選ぶ。カードやチップは `tint` を面、`border` を枡線、`text` を文字に使う。

| ファミリー | tint | border | text | 文字コントラスト（tint 上） |
| --- | --- | --- | --- | --- |
| pink | `#ffdce8` | `#a54b7a` | `#803218` | 7.0:1 |
| orange | `#feede0` | `#b74d1a` | `#b74d1a` | 4.5:1 |
| green | `#e9f3e7` | `#1f7a57` | `#1f7a57` | 4.6:1 |
| blue | `#ccdcf8` | `#3c699b` | `#4d3e78` | 6.7:1（Cobalt は 4.1:1 で不足のため Deep Iris） |
| teal | `#f3ecf7` | `#058380` | `#4d3e78` | 8.0:1（Peacock は 4.0:1 で不足のため Deep Iris） |

#### コントラスト（WCAG、実測）

| 組み合わせ | 比 | 判定 |
| --- | --- | --- |
| text `#4d3e78` on canvas / surface / card | 8.8 / 8.0 / 9.2 | AAA |
| text-2 `#6956a8` on canvas / card | 5.7 / 6.0 | AA |
| text-2 on Sky `#ccdcf8` | 4.3 | 大きい文字のみ。Sky の上では text を使う |
| text-muted `#7f72ac` on canvas | 4.1 | 大きい文字・placeholder のみ |
| white on primary `#745fbb` | 5.1 | AA |
| white on danger `#a53c3a` | 6.4 | AA |
| white on success `#1f7a57` | 5.3 | AA |
| white on live `#e14f4c` | 3.9 | 不可。LIVE は文字を乗せない |

### 1.2 タイポグラフィ

**システムフォント**を使う。Web フォントは読み込まず、`system-ui` を先頭にした1スタックで全環境をまかなう（Windows: Yu Gothic UI / Segoe UI、macOS・iOS: Hiragino Sans、Android: Roboto + Noto Sans CJK）。第2ファミリーは使わない。数値・時刻は `font-variant-numeric: tabular-nums` で桁を揃える。

| 役割 | サイズ | ウェイト | 行間 | トラッキング | 用途 |
| --- | --- | --- | --- | --- | --- |
| display | 40px | 300 | 1.05 | -0.03em | ダッシュボードの日付・大きな数値 |
| h1 | 28px | 300 | 1.1 | -0.02em | ページタイトル（TopBar） |
| h2 | 24px | 400 | 1.15 | -0.015em | セクション見出し・モーダルタイトル |
| h3 | 20px | 500 | 1.2 | -0.01em | カード見出し |
| body | 16px | 400 | 1.6 | 0 | 本文 |
| body-sm | 14px | 400 | 1.5 | 0 | リスト行・補足 |
| caption | 12px | 500 | 1.3 | 0.02em | タイムスタンプ・メタ情報 |
| eyebrow | 12px | 600 | 1.15 | 0.06em / 大文字 | セクションラベル・ステータス名 |

- 本文の最小は 14px。12px は caption / eyebrow / バッジに限る。
- 300 ウェイトは OS によって存在しない（Yu Gothic は Light / Regular / Bold のみ）。その場合ブラウザが最も近いウェイトに丸めるので、h1 / display が太く見えたら 400 に下げて揃える。Windows で細く薄く見える場合は `-webkit-font-smoothing` ではなく色（`--text`）で補う。
- `html { font-size: 16px }`。v2 の 18px は廃止。

#### システムフォントを選んだ理由

初回ロードの速さを優先した。Web フォントの読み込みがなくなるため、フォント起因の CLS とちらつきが出ない。代償として OS ごとに字面とウェイトの出方が変わり、配信画面に映したときの見え方も環境依存になる。見え方の統一が必要になったら、`--font-sans` の先頭に `next/font/google` の Noto Sans JP を1行足すだけで切り替えられる構成にしておく。

### 1.3 余白

4px グリッド。2段階の密度を持つ。

| 密度 | カード内 | セクション間 | 要素間 | 用途 |
| --- | --- | --- | --- | --- |
| comfortable | 24px | 32px | 24px | 設定・フォーム・ダッシュボード |
| compact | 12px | 16px | 8px | かんばん・月カレンダー・リスト行・モバイル |

Tailwind の `p-*` / `gap-*` / `space-y-*` をそのまま使う。ピクセル直値は書かない。

### 1.4 角丸

| トークン | 値 | 用途 |
| --- | --- | --- |
| `--radius-xs` | 4px | チップ内の小要素 |
| `--radius-sm` | 7px | タグ・ナビ項目・入力欄・ドロップダウン項目 |
| `--radius-md` | 10px | 小カード・ドロップダウン・ツールチップ |
| `--radius-lg` | 14px | カード・ボタン・モーダル・ドロワー |
| `--radius-full` | 9999px | ピル・バッジ・アバター |

shadcn の `--radius` は `--radius-lg`（14px）に合わせる。

### 1.5 奥行き

影は使わない。`box-shadow` はフォーカスリングを除き全面禁止。

| 段 | 面 | 用途 |
| --- | --- | --- |
| 0 | `--canvas` | ページ |
| 1 | `--surface` | サイドバー・テーブル行・セクション背景 |
| 2 | ファミリー tint | 色付きカード・バッジ |
| 3 | `--card`（白） | カード・モーダル・入力欄・ドロップダウン |

重なりの表現は「面の段差 + 1px `--border`」が基本。強調したいカードだけ「2px ファミリー border」にする。モーダルのスクリムは `color-mix(in oklab, var(--brand) 40%, transparent)`。

### 1.6 モーション

| トークン | 値 | 用途 |
| --- | --- | --- |
| `--duration-instant` | 80ms | hover の色変化 |
| `--duration-fast` | 150ms | ボタン押下・バッジ出現 |
| `--duration-base` | 250ms | ドロップダウン・トースト |
| `--duration-slow` | 400ms | モーダル・ドロワー・画面遷移 |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | 出現 |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | 消滅 |
| `--ease-snap` | `cubic-bezier(0.25, 0, 0, 1)` | 押下 |
| `--ease-spring` | `cubic-bezier(0.34, 1.4, 0.64, 1)` | バッジ・ボトムナビ選択 |

- 動かすのは `transform` と `opacity` のみ。glow・box-shadow のアニメは使わない。
- 出現は CSS（Tailwind v4 `starting:` / `transition-discrete`）。退場・layout・ページ遷移だけ `motion`。
- `@media (prefers-reduced-motion: reduce)` で全アニメを 0.01ms にする。

---

## 2. コンポーネント規約

部品は shadcn（Base UI）からコピーし、見た目は以下に合わせる。アニメ付き版は Animate UI を主、Motion Primitives を補助に使う。

### Button

| variant | 背景 | 枡線 | 文字 | hover | 用途 |
| --- | --- | --- | --- | --- | --- |
| primary | `--primary` | なし | white | `--primary-hover` | 画面に1つの主アクション |
| ghost | 透明 | 1.5px `--border-strong` | `--text` | 背景 `--surface` | 2次アクション |
| subtle | `--surface` | なし | `--text` | 背景 `--surface-2` | ツールバー・補助操作 |
| danger | `--danger` | なし | white | 暗く | 削除 |
| link | 透明 | なし | `--brand-2` | 下線 | インライン |

- 角丸 `--radius-lg`、高さ 44px（sm: 36px、lg: 52px）、padding 12px 24px、ウェイト 600。
- active は `scale(0.97)`。focus は `2px solid var(--brand)` + 2px offset。
- 塗りは primary と danger だけ。success の塗りボタンは作らない（成功は結果表示であって操作ではない）。

### Card

| variant | 面 | 枡線 | 用途 |
| --- | --- | --- | --- |
| default | `--card` | 1px `--border` | 一般カード |
| specimen | ファミリー tint | 2px ファミリー border | カテゴリ付きカード・統計カード・強調 |
| flat | `--surface` | なし | セクション背景・グループ枡 |

- 角丸 `--radius-lg`、padding 24px（compact: 12px）。
- hover は枡線を `--border-strong` に変えるだけ。浮かせない。
- タスクカード（かんばん）は compact の specimen。カテゴリ色のファミリーで tint と border を決める。

### Badge / Tag

- Badge: ピル、tint 面 + 1px 同ファミリー border + ファミリー text、eyebrow タイポ。
- Tag: 角丸 `--radius-sm`、同配色、caption タイポ。
- ステータス: success / warning / danger / info は各 `*-tint` と色。
- LIVE: `--danger-tint` 面 + `--danger` 文字 + `--live` のドット（ドットだけ `pulse`）。

### Input / Textarea / Select

- 面 `--card`、1px `--border`、角丸 `--radius-sm`、高さ 44px、文字 `--text`、placeholder `--text-muted`。
- focus: 枡線 `--brand` + リング。エラー: 枡線 `--danger` + 下に caption のメッセージ。
- ラベルは eyebrow。必須は `*` ではなく「必須」バッジ。

### Navigation

- サイドバー: 面 `--surface`、項目は角丸 `--radius-sm`、hover `--surface-2`、active は `--card` 面 + `--text` ウェイト 600。
- TopBar: `--canvas` と同色で枡線なし。タイトルは h1。
- ボトムナビ（モバイル）: 面 `--card`、上 1px `--border`、高さ 64px。active は `--surface-2` のピル + `--brand`。

### Dialog / Drawer

- PC: Dialog。面 `--card`、1px `--border`、角丸 `--radius-lg`、padding 24px。出現 `slide-up` + `fade-in`（slow / ease-out）。
- モバイル（md 未満）: Drawer（下から）。上角だけ `--radius-lg`、グラバー付き。
- フッターは右寄せで「キャンセル（ghost）→ 主アクション（primary / danger）」。
- タイトルは h2。スクリムは 1.5 節の通り。

### Dropdown / Popover / Tooltip

- 面 `--card`、1px `--border`、角丸 `--radius-md`。項目は `--radius-sm`、hover `--surface`。
- 出現 `drop-down` + `fade-in`（base / ease-out）。
- Tooltip は `--brand` 面 + 白文字、`--radius-sm`。

### Toast

- 面 `--card`、左 3px のステータス色レール、角丸 `--radius-lg`。出現 `slide-in-right`（base / spring）。
- 文言は #207 の規約に従う。

### Table / List

- ヘッダー `--surface-2`、行は交互に `--canvas` / `--surface`。行間の枡線なし。
- 行 hover `--surface-2`。選択行は左 3px `--brand`。

### Skeleton / Empty

- Skeleton: `--surface` → `--surface-2` の `scan`（600ms linear）。
- Empty: `--surface` の flat Card にイラスト風アイコン（線画、`--brand`）と body-sm の説明。

### Avatar

- 円、2px `--border`。チームカラーがあるときはファミリー border。

### Calendar / Kanban（外部ライブラリ上書き）

`react-big-calendar` と `@hello-pangea/dnd` は独自 DOM のため部品は置き換えない。色・角丸・枡線をトークンで上書きするだけに留め、見た目の崩れは後続 issue で扱う。

---

## 3. Do / Don't

### Do

- カード・ボタン・モーダルは 14px 角丸で揃える
- 色を付けるときはファミリーの tint と border を組で使う
- 見出しは細いウェイト + 負のトラッキング、ラベルは大文字 + 正のトラッキング
- 塗りボタンは画面に1つ、primary 色のみ
- ページ背景は Parchment、白はカード以上の段にだけ

### Don't

- `box-shadow` で浮かせない（フォーカスリング以外）
- 黒・無彩色グレーを使わない。グレーが欲しいときは `--text-muted` / `--surface-2`
- 鮮やかな色（ファミリー border や `--live`）を広い面に塗らない
- 第2フォントを足さない
- `#5865F2`（Discord）など第三者ブランド色以外の生値を書かない

---

## 4. 実装（globals.css）

```css
@import 'tailwindcss';

/* ── デザイントークン（正本: docs/DESIGN.md） ───────────────── */
@theme {
  --color-canvas: #fcf9f5;
  --color-surface: #f3ecf7;
  --color-surface-2: #eadff8;
  --color-card: #ffffff;
  --color-border: #eadff8;
  --color-border-strong: #4d3e78;
  --color-brand: #4d3e78;
  --color-brand-2: #6956a8;
  --color-primary: #745fbb;
  --color-primary-hover: #6956a8;
  --color-primary-active: #4d3e78;
  --color-text: #4d3e78;
  --color-text-2: #6956a8;
  --color-text-muted: #7f72ac;
  --color-text-disabled: #b8afd4;
  --color-text-on-primary: #ffffff;
  --color-success: #1f7a57;
  --color-success-tint: #e9f3e7;
  --color-warning: #b74d1a;
  --color-warning-tint: #feede0;
  --color-danger: #a53c3a;
  --color-danger-tint: #ffdce8;
  --color-info: #3c699b;
  --color-info-tint: #ccdcf8;
  --color-live: #e14f4c;

  /* カラーファミリー */
  --color-pink-tint: #ffdce8;   --color-pink-border: #a54b7a;   --color-pink-text: #803218;
  --color-orange-tint: #feede0; --color-orange-border: #b74d1a; --color-orange-text: #b74d1a;
  --color-green-tint: #e9f3e7;  --color-green-border: #1f7a57;  --color-green-text: #1f7a57;
  --color-blue-tint: #ccdcf8;   --color-blue-border: #3c699b;   --color-blue-text: #4d3e78;
  --color-teal-tint: #f3ecf7;   --color-teal-border: #058380;   --color-teal-text: #4d3e78;

  /* システムフォントのみ。Web フォントに切り替えるときは先頭に var(--font-noto-sans-jp) を足す */
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, 'Hiragino Sans', 'Yu Gothic UI',
    'Noto Sans JP', sans-serif;

  --radius-xs: 4px;
  --radius-sm: 7px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-full: 9999px;

  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-snap: cubic-bezier(0.25, 0, 0, 1);
  --ease-spring: cubic-bezier(0.34, 1.4, 0.64, 1);
}

/* ── shadcn 変数へのエイリアス ──────────────────────────────── */
:root,
[data-theme='light'] {
  --background: var(--color-canvas);
  --foreground: var(--color-text);
  --card: var(--color-card);
  --card-foreground: var(--color-text);
  --popover: var(--color-card);
  --popover-foreground: var(--color-text);
  --primary: var(--color-primary);
  --primary-foreground: var(--color-text-on-primary);
  --secondary: var(--color-surface);
  --secondary-foreground: var(--color-text);
  --muted: var(--color-surface);
  --muted-foreground: var(--color-text-2);
  --accent: var(--color-surface-2);
  --accent-foreground: var(--color-text);
  --destructive: var(--color-danger);
  --destructive-foreground: #ffffff;
  --border: var(--color-border);
  --input: var(--color-border);
  --ring: var(--color-brand);
  --radius: var(--radius-lg);

  --duration-instant: 80ms;
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
}

/* [data-theme='dark'] は別 PR で追加する。部品側は変数しか参照しないこと */

html { font-size: 16px; }
body {
  background: var(--color-canvas);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-feature-settings: 'palt';
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

`layout.tsx` の `next/font/google`（Zen Kaku Gothic New / Space Grotesk）は削除する。Web フォントは読み込まない。

---

## 5. 同期ルール

- 正本はこのファイル。`globals.css` の `@theme` と `:root` は frontmatter から生成する（スクリプトは #178 フェーズ2で追加）。手で編集した場合は必ず両方を直す。
- 新しい色・角丸・時間が必要になったら、まずここに追記してから使う。
- ダークテーマは `[data-theme='dark']` ブロックとして別 PR で追加する。色は本ファイルのファミリーから派生させ、v2 のネオン配色は再利用しない。
- UI 仕様の規約は `docs/仕様・計画/ui/requirements.md` UI-019〜026 を参照。本ファイルと矛盾した場合は本ファイルを優先し、requirements.md を更新する。

## 6. 生成 AI 向け指示

1. 背景は `--color-canvas`、文字は `--color-text`。黒・グレーの生値は書かない。
2. 塗りは `--color-primary` のボタン1つだけ。他は枡線か面の段差。
3. 色付き要素はファミリー（pink / orange / green / blue / teal）を1つ選び、tint と border を組で使う。
4. `box-shadow` を書かない。
5. 角丸は `--radius-*`、時間は `--duration-*`、イージングは `--ease-*`。
6. `prefers-reduced-motion` を含める。
7. フォントは `--font-sans`（システムフォント）のみ。Web フォントを追加しない。
8. タップ対象は 44px 以上。
