---
name: RisukeruGG design system
description: "Lavender observatory" design system for RisukeruGG — streamer task & schedule management app. Dark by default, light as alternate theme
theme: dark
themes: [dark, light]
version: 3
# 役割名は両テーマ共通。値だけがテーマで変わる。dark は light から OKLCH で明度を反転して導出
colors:
  dark:
    # 基調（暗 → 明 で段を積む）
    canvas: '#100c1c' # ページ背景
    surface: '#191528' # 1段目の面（サイドバー・テーブル行）
    card: '#211c33' # カード・モーダル・入力欄（最前面）
    surface-2: '#2c273f' # テーブルヘッダー・区切り・hover
    border: '#36314c' # 既定の枡線（1px）。面より明るい
    border-strong: '#b9b1d9' # ゴーストボタン・フォーカス
    # ブランド（紫）
    brand: '#e8e4fd' # 文字・アイコン・枡線の基本色（= text）
    brand-2: '#b8afe5'
    primary: '#7d68c5' # 唯一の塗りボタン色（白文字 4.5:1）
    primary-hover: '#8e7ad9'
    primary-active: '#6c56b1'
    # テキスト
    text: '#e8e4fd' # canvas 上 15.5:1
    text-2: '#b8afe5' # canvas 上 9.4:1
    text-muted: '#8d86aa' # canvas 上 5.6:1
    text-disabled: '#5c5868'
    text-on-primary: '#ffffff'
    text-on-danger: '#100c1c' # 明るい danger の上は白が足りないため canvas 色
    # セマンティック
    success: '#64b892'
    success-tint: '#222d34'
    warning: '#f18153'
    warning-tint: '#3a242b'
    danger: '#e65850'
    danger-tint: '#2d1926'
    info: '#79a8de'
    info-tint: '#252941'
    live: '#fb6762' # LIVE ドットのみ
    # カラーファミリー: tint + border + text
    family-pink: { tint: '#372339', border: '#e181b0', text: '#feafd4' }
    family-orange: { tint: '#3a242b', border: '#f18153', text: '#feb79b' }
    family-green: { tint: '#222d34', border: '#64b892', text: '#8bdfb7' }
    family-blue: { tint: '#252941', border: '#79a8de', text: '#a5cefe' }
    family-teal: { tint: '#202c3a', border: '#53b7b4', text: '#7bdeda' }
  light:
    # 基調
    canvas: '#fcf9f5' # Parchment — ページ背景
    surface: '#f3ecf7' # Lilac Mist — 1段目の面
    card: '#ffffff' # Pure — カード・モーダル・入力欄
    surface-2: '#eadff8' # Lavender Veil — テーブルヘッダー・区切り
    border: '#eadff8' # 既定の枡線（1px）
    border-strong: '#4d3e78' # Deep Iris — ゴーストボタン・フォーカス
    # ブランド（紫）
    brand: '#4d3e78' # Deep Iris
    brand-2: '#6956a8' # Amethyst
    primary: '#745fbb' # Iris Glow
    primary-hover: '#6956a8'
    primary-active: '#4d3e78'
    # テキスト
    text: '#4d3e78' # canvas 上 8.8:1
    text-2: '#6956a8' # canvas 上 5.7:1
    text-muted: '#7f72ac' # placeholder・大きい補足のみ（4.1:1）
    text-disabled: '#b8afd4'
    text-on-primary: '#ffffff' # primary 上 5.1:1
    text-on-danger: '#ffffff' # danger 上 6.4:1
    # セマンティック
    success: '#1f7a57' # Forest Fern
    success-tint: '#e9f3e7' # Licheno
    warning: '#b74d1a' # Tangerine
    warning-tint: '#feede0' # Apricot Wash
    danger: '#a53c3a' # Crimson
    danger-tint: '#ffdce8' # Rose Quartz
    info: '#3c699b' # Cobalt
    info-tint: '#ccdcf8' # Sky Tint
    live: '#e14f4c' # Vermilion — LIVE ドットのみ
    # カラーファミリー: tint + border + text
    family-pink: { tint: '#ffdce8', border: '#a54b7a', text: '#803218' }
    family-orange: { tint: '#feede0', border: '#b74d1a', text: '#b74d1a' }
    family-green: { tint: '#e9f3e7', border: '#1f7a57', text: '#1f7a57' }
    family-blue: { tint: '#ccdcf8', border: '#3c699b', text: '#4d3e78' }
    family-teal: { tint: '#f3ecf7', border: '#058380', text: '#4d3e78' }

typography:
  # システムフォントのみ（Web フォントは読み込まない）。見出しも本文も同じスタック。
  # 見出しは負のトラッキングと補助色（text-2）で「静かな見出し」を作る。300 は使わない
  family: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Hiragino Sans', 'Yu Gothic UI', 'Noto Sans JP', sans-serif"
  base: 16px
  display: { size: 2.5rem, weight: 400, lineHeight: 1.05, tracking: '-0.03em' } # 40px
  h1: { size: 1.75rem, weight: 400, lineHeight: 1.1, tracking: '-0.02em' } # 28px
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

# RisukeruGG デザインシステム v3

**App**: RisukeruGG — 配信者向けのタスク管理・スケジュール管理アプリ
**Brand**: 紫がかったキャンバスに、ラベンダーの文字と鮮やかな枡線が乗る。影を使わず、面の段差と枡線で奥行きを作る「標本カード」の世界観。
**Platform**: スマホ（Android / iOS）＋ PC。Web（Next.js）で両対応。
**Theme**: **既定はダーク**。ライトは `[data-theme="light"]` の代替テーマ。両テーマは同じ役割名のトークンを持ち、値だけが変わる。ダークの値はライトから OKLCH で明度を反転して導出した（`docs/DESIGN-theme-preview.html` で並べて確認できる）。

v2（ネオンパープル）は廃止。v2 の配色は再利用しない。

---

## 0. 原則

1. **ページ背景は `--canvas`**（dark `#100c1c` / light `#fcf9f5`）。最前面の `--card` はダークでは最も明るい紫黒、ライトでは純白。
2. **文字・アイコン・枡線の基本色は `--text`**（dark `#e8e4fd` / light `#4d3e78`）。黒 `#000`・純白の文字・無彩色グレーは使わない。
3. **塗りボタンは `--primary` のみ**（dark `#7d68c5` / light `#745fbb`）。2次アクションは `--border-strong` のゴースト枡線。
4. **影を使わない**。奥行きは面の段差（ダークは暗 → 明、ライトは明 → 白）と 2px の枡線で表す。
5. **角丸は 14px が基本形**。カード・ボタン・モーダルは全部 14px。タグ・ナビ・入力欄は 7px。
6. **色を付けたい要素はカラーファミリーから1つ選ぶ**。淡い面（tint）と枡線（border）は同じファミリーから取る。鮮やかな色を広い面に塗らない。
7. **フォントはシステムフォントの1スタック**。Web フォントは読み込まない。見出しはウェイト 400 と負のトラッキングで静かに。
8. **色・余白・角丸・時間はトークン経由**。生の値を書かない。`prefers-reduced-motion` を必ず尊重する。
9. タップ対象は 44px 以上。

---

## 1. トークン

### 1.1 色

役割名は両テーマ共通。部品は役割名しか参照しない。

| 役割 | トークン | Dark（既定） | Light | 備考 |
| --- | --- | --- | --- | --- |
| ページ背景 | `--canvas` | `#100c1c` | `#fcf9f5` | |
| 面 1 | `--surface` | `#191528` | `#f3ecf7` | サイドバー・テーブル行・セクション背景 |
| カード | `--card` | `#211c33` | `#ffffff` | カード・モーダル・入力欄・ボトムナビ。最前面 |
| 面 2 | `--surface-2` | `#2c273f` | `#eadff8` | テーブルヘッダー・区切り・hover |
| 枡線 | `--border` | `#36314c` | `#eadff8` | 既定 1px。ダークでは面より明るい |
| 強い枡線 | `--border-strong` | `#b9b1d9` | `#4d3e78` | ゴーストボタン・フォーカスリング |
| ブランド | `--brand` | `#e8e4fd` | `#4d3e78` | 文字・アイコンの基本色（= text） |
| ブランド 2 | `--brand-2` | `#b8afe5` | `#6956a8` | リンク・補足 |
| プライマリ | `--primary` | `#7d68c5` | `#745fbb` | 塗りボタン |
| プライマリ hover | `--primary-hover` | `#8e7ad9` | `#6956a8` | |
| プライマリ active | `--primary-active` | `#6c56b1` | `#4d3e78` | |
| 文字 | `--text` | `#e8e4fd` | `#4d3e78` | |
| 文字 2 | `--text-2` | `#b8afe5` | `#6956a8` | |
| 文字 muted | `--text-muted` | `#8d86aa` | `#7f72ac` | placeholder・補足のみ |
| 文字 disabled | `--text-disabled` | `#5c5868` | `#b8afd4` | |
| プライマリ上の文字 | `--text-on-primary` | `#ffffff` | `#ffffff` | |
| danger 上の文字 | `--text-on-danger` | `#100c1c` | `#ffffff` | ダークは明るい danger に白が乗らないため canvas 色 |
| 成功 | `--success` / `--success-tint` | `#64b892` / `#222d34` | `#1f7a57` / `#e9f3e7` | |
| 警告 | `--warning` / `--warning-tint` | `#f18153` / `#3a242b` | `#b74d1a` / `#feede0` | |
| 危険 | `--danger` / `--danger-tint` | `#e65850` / `#2d1926` | `#a53c3a` / `#ffdce8` | |
| 情報 | `--info` / `--info-tint` | `#79a8de` / `#252941` | `#3c699b` / `#ccdcf8` | |
| LIVE | `--live` | `#fb6762` | `#e14f4c` | ドット・アイコンのみ。文字色に使わない |

#### ダークの導出規則

ライトの各値から、色相を保ったまま OKLCH の明度を反転する。GitHub / Linear / Notion / Material のライト↔ダーク対応に倣う。

- 面は「暗 → 明」で段を積む（canvas → surface → card → surface-2）。ライトの「白が最前面」を「最も明るい紫黒が最前面」に置き換える
- 枡線は面より明るくする（ライトは面より暗い）
- 文字は Deep Iris / Amethyst の色相を保った明るいラベンダー
- プライマリは白文字 4.5:1 を満たす上限まで1段明るく（L 0.58）
- danger は彩度を優先して `#e65850`。白文字は 3.6:1 で不足のため、文字は `--text-on-danger`（canvas 色）
- ファミリーの border は L 0.72 に揃え、tint は border を canvas に 22%（danger は 16%）混ぜた低彩度面、text は L 0.84

#### カラーファミリー（カテゴリ色・チーム色）

ユーザーが選ぶカテゴリ色は、自由な色ではなくこの5ファミリーから選ぶ。カードやチップは `tint` を面、`border` を枡線、`text` を文字に使う。

| ファミリー | Dark tint / border / text | Light tint / border / text | 文字コントラスト（dark / light） |
| --- | --- | --- | --- |
| pink | `#372339` / `#e181b0` / `#feafd4` | `#ffdce8` / `#a54b7a` / `#803218` | 8.4 / 7.0 |
| orange | `#3a242b` / `#f18153` / `#feb79b` | `#feede0` / `#b74d1a` / `#b74d1a` | 8.5 / 4.5 |
| green | `#222d34` / `#64b892` / `#8bdfb7` | `#e9f3e7` / `#1f7a57` / `#1f7a57` | 8.9 / 4.6 |
| blue | `#252941` / `#79a8de` / `#a5cefe` | `#ccdcf8` / `#3c699b` / `#4d3e78` | 8.7 / 6.7（light は Cobalt 4.1 で不足のため Deep Iris） |
| teal | `#202c3a` / `#53b7b4` / `#7bdeda` | `#f3ecf7` / `#058380` / `#4d3e78` | 9.0 / 8.0（light は Peacock 4.0 で不足のため Deep Iris） |

#### コントラスト（WCAG、実測）

| 組み合わせ | Dark | Light | 判定 |
| --- | --- | --- | --- |
| text on canvas / surface / card | 15.5 / 14.4 / 13.3 | 8.8 / 8.0 / 9.2 | AAA |
| text-2 on canvas / card | 9.4 / 8.1 | 5.7 / 6.0 | AA |
| text-2 on info-tint | — | 4.3 | 部品で固定済み。info variant は `--text` を焼き込み `--text-2` を参照しない |
| text-muted on canvas | 5.6 | 4.1 | light は大きい文字・placeholder のみ |
| text-on-primary on primary | 4.5 | 5.1 | AA |
| text-on-danger on danger | 5.4 | 6.4 | AA |
| danger on danger-tint | 4.6 | 5.0 | AA |
| white on success | — | 5.3 | success の塗りは作らない |
| live on canvas | 6.6 | 3.7 | LIVE は文字を乗せない |

### 1.2 タイポグラフィ

**システムフォント**を使う。Web フォントは読み込まず、`system-ui` を先頭にした1スタックで全環境をまかなう（Windows: Yu Gothic UI / Segoe UI、macOS・iOS: Hiragino Sans、Android: Roboto + Noto Sans CJK）。第2ファミリーは使わない。数値・時刻は `font-variant-numeric: tabular-nums` で桁を揃える。

| 役割 | サイズ | ウェイト | 行間 | トラッキング | 用途 |
| --- | --- | --- | --- | --- | --- |
| display | 40px | 400 | 1.05 | -0.03em | ダッシュボードの日付・大きな数値 |
| h1 | 28px | 400 | 1.1 | -0.02em | ページタイトル（TopBar） |
| h2 | 24px | 400 | 1.15 | -0.015em | セクション見出し・モーダルタイトル |
| h3 | 20px | 500 | 1.2 | -0.01em | カード見出し |
| body | 16px | 400 | 1.6 | 0 | 本文 |
| body-sm | 14px | 400 | 1.5 | 0 | リスト行・補足 |
| caption | 12px | 500 | 1.3 | 0.02em | タイムスタンプ・メタ情報 |
| eyebrow | 12px | 600 | 1.15 | 0.06em / 大文字 | セクションラベル・ステータス名 |

- 本文の最小は 14px。12px は caption / eyebrow / バッジに限る。
- 見出しの最小ウェイトは 400。300 は使わない（Windows の Yu Gothic UI に 300 が無く Light 250 に丸まり、環境差が出るため）。「静かな見出し」は負のトラッキングと `--text-2` で出す。Windows で細く薄く見える場合は `-webkit-font-smoothing` ではなく色（`--text`）で補う。
- Tailwind では `text-display` / `text-h1` / `text-h2` / `text-h3` / `text-caption` と `eyebrow` ユーティリティで役割を指定する。h1〜h3 要素には既定で同じ値が当たる。
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
| 3 | `--card` | カード・モーダル・入力欄・ドロップダウン（ダークは最も明るい紫黒、ライトは白） |

重なりの表現は「面の段差 + 1px `--border`」が基本。強調したいカードだけ「2px ファミリー border」にする。モーダルのスクリムは `color-mix(in oklab, var(--canvas) 70%, transparent)`。

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

部品は shadcn（Base UI）からコピーし、見た目は以下に合わせる。アニメ付き版は Animate UI（Base UI 版）のみを使う。コピーした部品内の lucide アイコンは `Icon.tsx`（Material Icons）に差し替える。

### Button

| variant | 背景 | 枡線 | 文字 | hover | 用途 |
| --- | --- | --- | --- | --- | --- |
| primary | `--primary` | なし | white | `--primary-hover` | 画面に1つの主アクション |
| ghost | 透明 | 1.5px `--border-strong` | `--text` | 背景 `--surface` | 2次アクション |
| subtle | `--surface` | なし | `--text` | 背景 `--surface-2` | ツールバー・補助操作 |
| danger | `--danger` | なし | `--text-on-danger` | 暗く | 削除 |
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
- info variant（Badge / Alert / HintBar 等）の文字色は `--text` に固定する。ライトの `--text-2` は info-tint 上で 4.3:1 しかないため、部品側で `--text-2` を参照しない構造にする。
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
- Tooltip は反転配色（`--text` 面 + `--canvas` 文字）、`--radius-sm`。両テーマで成立する。

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
- 見出しはウェイト 400 + 負のトラッキング、ラベルは大文字 + 正のトラッキング
- 塗りボタンは画面に1つ、primary 色のみ
- ページ背景は `--canvas`、最も明るい面（白 / 明るい紫黒）はカード以上の段にだけ

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
@import 'tw-animate-css';
@import 'shadcn/tailwind.css';

/* ── テーマ値（正本: docs/DESIGN.md frontmatter）。既定 = dark ────
   実ファイルではこの2ブロックを src/app/tokens.css に自動生成し、@import './tokens.css' で読み込む */
:root,
[data-theme='dark'] {
  --canvas: #100c1c; --surface: #191528; --card: #211c33; --surface-2: #2c273f;
  --border: #36314c; --border-strong: #b9b1d9;
  --brand: #e8e4fd; --brand-2: #b8afe5;
  --primary: #7d68c5; --primary-hover: #8e7ad9; --primary-active: #6c56b1;
  --text: #e8e4fd; --text-2: #b8afe5; --text-muted: #8d86aa; --text-disabled: #5c5868;
  --text-on-primary: #ffffff; --text-on-danger: #100c1c;
  --success: #64b892; --success-tint: #222d34;
  --warning: #f18153; --warning-tint: #3a242b;
  --danger: #e65850; --danger-tint: #2d1926;
  --info: #79a8de; --info-tint: #252941;
  --live: #fb6762;
  --pink-tint: #372339;   --pink-border: #e181b0;   --pink-text: #feafd4;
  --orange-tint: #3a242b; --orange-border: #f18153; --orange-text: #feb79b;
  --green-tint: #222d34;  --green-border: #64b892;  --green-text: #8bdfb7;
  --blue-tint: #252941;   --blue-border: #79a8de;   --blue-text: #a5cefe;
  --teal-tint: #202c3a;   --teal-border: #53b7b4;   --teal-text: #7bdeda;
  color-scheme: dark;
}
[data-theme='light'] {
  --canvas: #fcf9f5; --surface: #f3ecf7; --card: #ffffff; --surface-2: #eadff8;
  --border: #eadff8; --border-strong: #4d3e78;
  --brand: #4d3e78; --brand-2: #6956a8;
  --primary: #745fbb; --primary-hover: #6956a8; --primary-active: #4d3e78;
  --text: #4d3e78; --text-2: #6956a8; --text-muted: #7f72ac; --text-disabled: #b8afd4;
  --text-on-primary: #ffffff; --text-on-danger: #ffffff;
  --success: #1f7a57; --success-tint: #e9f3e7;
  --warning: #b74d1a; --warning-tint: #feede0;
  --danger: #a53c3a; --danger-tint: #ffdce8;
  --info: #3c699b; --info-tint: #ccdcf8;
  --live: #e14f4c;
  --pink-tint: #ffdce8;   --pink-border: #a54b7a;   --pink-text: #803218;
  --orange-tint: #feede0; --orange-border: #b74d1a; --orange-text: #b74d1a;
  --green-tint: #e9f3e7;  --green-border: #1f7a57;  --green-text: #1f7a57;
  --blue-tint: #ccdcf8;   --blue-border: #3c699b;   --blue-text: #4d3e78;
  --teal-tint: #f3ecf7;   --teal-border: #058380;   --teal-text: #4d3e78;
  color-scheme: light;
}

/* ── Tailwind ユーティリティ化（bg-canvas / text-text-2 / border-pink-border 等） ── */
@theme inline {
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-card: var(--card);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-brand: var(--brand);
  --color-brand-2: var(--brand-2);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-active: var(--primary-active);
  --color-text: var(--text);
  --color-text-2: var(--text-2);
  --color-text-muted: var(--text-muted);
  --color-text-disabled: var(--text-disabled);
  --color-text-on-primary: var(--text-on-primary);
  --color-text-on-danger: var(--text-on-danger);
  --color-success: var(--success);       --color-success-tint: var(--success-tint);
  --color-warning: var(--warning);       --color-warning-tint: var(--warning-tint);
  --color-danger: var(--danger);         --color-danger-tint: var(--danger-tint);
  --color-info: var(--info);             --color-info-tint: var(--info-tint);
  --color-live: var(--live);
  --color-pink-tint: var(--pink-tint);     --color-pink-border: var(--pink-border);     --color-pink-text: var(--pink-text);
  --color-orange-tint: var(--orange-tint); --color-orange-border: var(--orange-border); --color-orange-text: var(--orange-text);
  --color-green-tint: var(--green-tint);   --color-green-border: var(--green-border);   --color-green-text: var(--green-text);
  --color-blue-tint: var(--blue-tint);     --color-blue-border: var(--blue-border);     --color-blue-text: var(--blue-text);
  --color-teal-tint: var(--teal-tint);     --color-teal-border: var(--teal-border);     --color-teal-text: var(--teal-text);
}

@theme {
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

/* ── shadcn 変数へのエイリアス（テーマ非依存。値はテーマ側の変数を参照） ── */
:root {
  --background: var(--canvas);
  --foreground: var(--text);
  --card-foreground: var(--text);
  --popover: var(--card);
  --popover-foreground: var(--text);
  --primary-foreground: var(--text-on-primary);
  --secondary: var(--surface);
  --secondary-foreground: var(--text);
  --muted: var(--surface);
  --muted-foreground: var(--text-2);
  --accent: var(--surface-2);
  --accent-foreground: var(--text);
  --destructive: var(--danger);
  --destructive-foreground: var(--text-on-danger);
  --input: var(--border);
  --ring: var(--brand);
  --radius: var(--radius-lg);

  --duration-instant: 80ms;
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
}
/* shadcn の --card / --primary / --border はテーマ側の同名変数をそのまま使う */

html { font-size: 16px; }
body {
  background: var(--canvas);
  color: var(--text);
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

`layout.tsx` は `next/font/google` を読み込まない（Web フォントなし）。

実際の `globals.css` には上記に加えて、shadcn 互換の `--color-background` 等の登録、タイポグラフィ役割（`--text-h1` 等）、`dark:` バリアントの定義、v2 の旧名を v3 の役割トークンへ向ける移行用の別名ブロックがある。旧名は新規コードで使わない。

---

## 5. 同期ルール

- 正本はこのファイル。`[data-theme]` ブロック（`src/app/tokens.css`）は frontmatter の `colors.dark` / `colors.light` から `pnpm tokens` で生成する（`scripts/generate-design-tokens.mjs`）。`tokens.css` は手で編集しない。同期ずれは `pnpm tokens:check` とユニットテスト（`tests/unit/design/tokens.test.ts`）で検出する。
- frontmatter に色を足したら `globals.css` の `@theme inline` に `--color-*` の登録も足す（Tailwind ユーティリティ化のため。ここは手書き）。
- 新しい色・角丸・時間が必要になったら、まず両テーマ分をここに追記してから使う。片方だけ足さない。
- 既定は dark（`:root`）。light は `[data-theme='light']`。テーマ切り替え UI は #215。
- `docs/DESIGN-theme-preview.html` は両テーマの見え方とコントラストの確認用。トークンを変えたら更新する。
- UI 仕様の規約は `docs/仕様・計画/ui/requirements.md` UI-019〜026 を参照。本ファイルと矛盾した場合は本ファイルを優先し、requirements.md を更新する。

## 6. 生成 AI 向け指示

1. 背景は `--canvas`（Tailwind: `bg-canvas`）、文字は `--text`（`text-text`）。黒・グレー・白の生値は書かない。テーマで値が変わる前提で役割名だけを使う。
2. 塗りは `--primary` のボタン1つだけ。他は枡線か面の段差。
3. 色付き要素はファミリー（pink / orange / green / blue / teal）を1つ選び、tint と border を組で使う。
4. `box-shadow` を書かない。
5. 角丸は `--radius-*`、時間は `--duration-*`、イージングは `--ease-*`。
6. `prefers-reduced-motion` を含める。
7. フォントは `--font-sans`（システムフォント）のみ。Web フォントを追加しない。
8. タップ対象は 44px 以上。
