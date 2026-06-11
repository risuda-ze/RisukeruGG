---
name: risukeruGG design system
description: Dark neon-purple design system for risukeruGG — VTuber/streamer schedule & collab management app
colors:
  # Primary: Neon Purple (#7f77dd = purple, NOT blue)
  primary:     '#7f77dd'
  primary-50:  '#f0effc'
  primary-100: '#dddcf8'
  primary-200: '#c0bdf3'
  primary-300: '#a0a0ff'
  primary-400: '#8f88e8'
  primary-500: '#7f77dd'
  primary-600: '#6b63cc'
  primary-700: '#534ab7'
  primary-800: '#3b3490'
  primary-900: '#271f6a'
  primary-950: '#130f3a'

  # Neutral
  neutral-50:  '#f4f4f8'
  neutral-100: '#e4e4ee'
  neutral-200: '#c8c8dd'
  neutral-300: '#a8a8c0'
  neutral-400: '#8484a0'
  neutral-500: '#626280'
  neutral-600: '#484864'
  neutral-700: '#32324a'
  neutral-800: '#1e1e32'
  neutral-900: '#0e0e1e'
  neutral-950: '#06060f'

  # Backgrounds: bg → surface → card → card-raised (front)
  bg:          '#0a0a18'
  surface:     '#11112a'
  card:        '#16163a'
  card-raised: '#1c1c42'

  border:       '#2a2a55'
  border-light: '#3a3a6a'

  # Semantic
  success:     '#3dd68c'
  success-dim: 'rgba(61,214,140,0.15)'
  warning:     '#ef9f27'
  warning-dim: 'rgba(239,159,39,0.15)'
  danger:      '#f0506e'
  danger-dim:  'rgba(240,80,110,0.15)'
  info:        '#5bc8fa'
  info-dim:    'rgba(91,200,250,0.15)'

  # Glow (box-shadow用)
  glow-primary: '0 0 16px rgba(127,119,221,0.5)'
  glow-success: '0 0 12px rgba(61,214,140,0.4)'
  glow-warning: '0 0 12px rgba(239,159,39,0.4)'
  glow-danger:  '0 0 12px rgba(240,80,110,0.4)'

  # Text (コントラスト比 on bg)
  text-primary:    '#e4e4ee'  # 13.5:1 AAA — 見出し・重要テキスト
  text-secondary:  '#a8a8c0'  # 6.2:1  AA  — 本文・説明文
  text-muted:      '#7070a0'  # 3.5:1  large only — 補足・placeholder
  text-disabled:   '#4a4a70'  # disabled状態のみ
  text-accent:     '#a0a0ff'  # 8.1:1  AA  — リンク・数値・強調
  text-on-primary: '#ffffff'  # primary背景上のテキスト

typography:
  # Base: 18px / ratio: 1.4 — html { font-size: 18px } 必須
  # display=4.800rem(86px) h1=3.430rem(62px) h2=2.450rem(44px)
  # h3=1.750rem(32px) h4=1.250rem(23px) body=1rem(18px)
  # Heading: Space Grotesk / Body: Zen Kaku Gothic New
  display:
    fontFamily: "'Space Grotesk', 'Noto Sans JP', sans-serif"
    fontSize: 4.800rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '-0.025em'
  h1:
    fontFamily: "'Space Grotesk', 'Noto Sans JP', sans-serif"
    fontSize: 3.430rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: '-0.02em'
  h2:
    fontFamily: "'Space Grotesk', 'Noto Sans JP', sans-serif"
    fontSize: 2.450rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.01em'
  h3:
    fontFamily: "'Space Grotesk', 'Noto Sans JP', sans-serif"
    fontSize: 1.750rem
    fontWeight: 600
    lineHeight: 1.3
  h4:
    fontFamily: "'Space Grotesk', 'Noto Sans JP', sans-serif"
    fontSize: 1.250rem
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.65
  body-sm:
    fontFamily: "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: "'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif"
    fontSize: 0.722rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Space Grotesk', 'Noto Sans JP', sans-serif"
    fontSize: 0.722rem
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: '0.08em'
    textTransform: 'uppercase'

spacing:
  2xs: 4px
  xs:  8px
  sm:  12px
  md:  16px
  lg:  24px
  xl:  32px
  2xl: 48px
  3xl: 64px
  4xl: 96px
  5xl: 128px

rounded:
  none: 0
  xs:   4px   # tag
  sm:   6px   # input
  md:   10px  # button
  lg:   16px  # card
  xl:   24px  # modal
  2xl:  32px
  full: 9999px  # badge, avatar

components:
  button:
    rounded: '{rounded.md}'
    shadow-hover: '{colors.glow-primary}'
  card:
    rounded: '{rounded.lg}'
    background: '{colors.card}'
    border: '1px solid {colors.border}'
    shadow: '0 4px 24px rgba(0,0,0,0.4)'
  card-raised:
    rounded: '{rounded.lg}'
    background: '{colors.card-raised}'
    border: '1px solid {colors.border-light}'
  input:
    rounded: '{rounded.sm}'
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    border-focus: '1px solid {colors.primary}'
  badge:
    rounded: '{rounded.full}'
  tag:
    rounded: '{rounded.xs}'
  modal:
    rounded: '{rounded.xl}'
    background: '{colors.card}'
    border: '1px solid {colors.border-light}'
  tooltip:
    rounded: '{rounded.sm}'
    background: '{colors.card-raised}'
  bottom-nav:
    background: '{colors.surface}'
    border-top: '1px solid {colors.border}'
  avatar:
    rounded: '{rounded.full}'
    border: '2px solid {colors.border-light}'
---

## Overview

**App**: risukeruGG — VTuber・ゲーム配信者向けスケジュール管理 & コラボ調整ツール
**Brand**: ダーク＋ネオンパープル。暗いキャンバスに発光する紫のアクセント。
**Platform**: スマホ（Android/iOS）＋ PC 両対応。

---

## CSS Variables（実装用・全トークンを含む）

```css
html { font-size: 18px; } /* typography スケールの基準 — 必須 */

:root {
  /* Backgrounds */
  --bg:          #0a0a18;
  --surface:     #11112a;
  --card:        #16163a;
  --card-raised: #1c1c42;

  /* Borders */
  --border:       #2a2a55;
  --border-light: #3a3a6a;

  /* Primary */
  --primary:     #7f77dd;
  --primary-300: #a0a0ff;
  --primary-600: #6b63cc;
  --primary-700: #534ab7;
  --primary-800: #3b3490;
  --primary-950: #130f3a;

  /* Semantic */
  --success:     #3dd68c;  --success-dim: rgba(61,214,140,0.15);
  --warning:     #ef9f27;  --warning-dim: rgba(239,159,39,0.15);
  --danger:      #f0506e;  --danger-dim:  rgba(240,80,110,0.15);
  --info:        #5bc8fa;

  /* Glow */
  --glow-primary: 0 0 16px rgba(127,119,221,0.5);
  --glow-success: 0 0 12px rgba(61,214,140,0.4);
  --glow-warning: 0 0 12px rgba(239,159,39,0.4);
  --glow-danger:  0 0 12px rgba(240,80,110,0.4);

  /* Text */
  --text-primary:    #e4e4ee;
  --text-secondary:  #a8a8c0;
  --text-muted:      #7070a0;
  --text-disabled:   #4a4a70;
  --text-accent:     #a0a0ff;
  --text-on-primary: #ffffff;

  /* Shadow */
  --shadow-sm: 0 1px 3px 0 rgba(0,0,0,0.4);
  --shadow-md: 0 4px 12px -1px rgba(0,0,0,0.5), 0 2px 6px -2px rgba(0,0,0,0.4);
  --shadow-lg: 0 10px 28px -3px rgba(0,0,0,0.6), 0 4px 10px -4px rgba(0,0,0,0.4);
  --shadow-xl: 0 20px 40px -5px rgba(0,0,0,0.7), 0 8px 16px -6px rgba(0,0,0,0.5);

  /* Spacing */
  --space-2xs: 4px;  --space-xs: 8px;   --space-sm: 12px;
  --space-md:  16px; --space-lg: 24px;  --space-xl: 32px;
  --space-2xl: 48px;

  /* Radius */
  --radius-xs: 4px; --radius-sm: 6px;  --radius-md:   10px;
  --radius-lg: 16px; --radius-xl: 24px; --radius-full: 9999px;

  /* Motion — Duration */
  --duration-instant: 80ms;   /* hover 色変化・opacity */
  --duration-fast:    150ms;  /* ボタン押下・バッジ出現 */
  --duration-base:    250ms;  /* ドロップダウン・トースト */
  --duration-slow:    400ms;  /* モーダル・画面遷移 */
  --duration-crawl:   600ms;  /* スケルトン・進捗バー */

  /* Motion — Easing */
  --ease-snap:   cubic-bezier(0.25, 0, 0, 1);      /* パチンと決まる */
  --ease-out:    cubic-bezier(0, 0, 0.2, 1);        /* 出現 */
  --ease-in:     cubic-bezier(0.4, 0, 1, 1);        /* 消滅 */
  --ease-spring: cubic-bezier(0.34, 1.4, 0.64, 1);  /* オーバーシュート */
  --ease-linear: linear;                             /* ループ */
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Interaction States

- `hover`: lightness +8%
- `active`: primary-700
- `focus`: `2px solid var(--primary)` + 2px offset + `var(--glow-primary)`
- `disabled`: opacity 35%
- **glow**: hover・active・通知バッジのみ。常時グローは使わない

---

## Components

### Button
```css
/* Primary */
background: var(--primary); color: var(--text-on-primary);
padding: var(--space-xs) var(--space-lg); border-radius: var(--radius-md);
hover: background var(--primary-600) + box-shadow var(--glow-primary);
active: background var(--primary-700) + transform scale(0.96);

/* Ghost */
background: transparent; border: 1px solid var(--primary); color: var(--primary);
hover: background var(--primary-950);

/* Danger */
background: var(--danger);
hover: box-shadow var(--glow-danger);
```

### Card
```css
background: var(--card); border: 1px solid var(--border);
border-radius: var(--radius-lg); box-shadow: var(--shadow-md);
hover: border-color var(--border-light) + transform translateY(-2px);
```

### Input
```css
background: var(--surface); border: 1px solid var(--border);
border-radius: var(--radius-sm); color: var(--text-primary);
placeholder: var(--text-muted);
focus: border-color var(--primary) + box-shadow var(--glow-primary);
```

### Badge
```css
border-radius: var(--radius-full); padding: 2px 8px; font: label style;
primary: bg var(--primary-950), color var(--primary-300), border var(--primary-800);
success: bg var(--success-dim), color var(--success);
warning: bg var(--warning-dim), color var(--warning);
danger:  bg var(--danger-dim),  color var(--danger);
```

### Bottom Navigation
```css
background: var(--surface); border-top: 1px solid var(--border); height: 64px;
active: color var(--primary) + bg var(--primary-950) pill;
inactive: color var(--text-muted);
```

---

## Motion — Keyframes & Component Mapping

```css
@keyframes fade-in      { from{opacity:0} to{opacity:1} }
@keyframes slide-up     { from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes slide-in-left{ from{transform:translateX(-16px);opacity:0} to{transform:translateX(0);opacity:1} }
@keyframes pop          { 0%{transform:scale(0.85);opacity:0} 70%{transform:scale(1.08);opacity:1} 100%{transform:scale(1);opacity:1} }
@keyframes glow-pulse   { 0%,100%{box-shadow:0 0 8px rgba(127,119,221,0.3)} 50%{box-shadow:0 0 20px rgba(127,119,221,0.7)} }
@keyframes scan         { from{background-position:-200% center} to{background-position:200% center} }
```

| コンポーネント | トリガー | アニメーション | Duration | Easing |
|---|---|---|---|---|
| Button | hover | bg変化 + glow | `instant` | `snap` |
| Button | active | scale(0.96) | `fast` | `snap` |
| Card | hover | translateY(-2px) + border変化 | `fast` | `out` |
| Badge | 出現 | `pop` | `fast` | `spring` |
| Modal | 開く | `slide-up` + `fade-in` | `slow` | `out` |
| Modal | 閉じる | `fade-in` reverse | `base` | `in` |
| Toast | 出現 | `slide-in-left` | `base` | `spring` |
| BottomNav | 選択 | `pop` + color変化 | `fast` | `spring` |
| Input | focus | glow出現 | `instant` | `snap` |
| Dropdown | 開く | `slide-up` + `fade-in` | `base` | `out` |
| Skeleton | loop | `scan` | `crawl` | `linear` |
| 通知バッジ | active | `glow-pulse` loop(2s) | — | `linear` |

---

## Google Fonts

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
```

---

## Generation Instructions for AI

1. `primary` = `#7f77dd`（紫）。青ではない。
2. 背景レイヤー順: `bg` → `surface` → `card` → `card-raised`。
3. 上記CSS Variablesブロックをそのまま `:root {}` に使用する。`html { font-size: 18px }` も必須。
4. テキストは `--text-*` 変数を使う。生の色コードを直書きしない。
5. アニメーションは `--duration-*` / `--ease-*` を使う。msをハードコードしない。
6. keyframesは上記定義を使い回す。新規定義はAppendixに追記してフラグを立てる。
7. `@media (prefers-reduced-motion: reduce)` を必ず含める。
8. モバイルのインタラクティブ要素は最小タッチターゲット44px確保。
