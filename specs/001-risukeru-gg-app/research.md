# Research: リスケるGG UIデザイン刷新

**Feature**: `001-risukeru-gg-app`
**Phase**: 0 — Design Token & Layout Research
**Date**: 2026-05-14

---

## 1. デザイントークン決定

### Decision: カラーパレット

参照ファイル `docs/risukeru_gg_dashboard.html`・`docs/risukeru_gg_mobile.html`・`docs/risukeru_gg_lp.html` の
`:root` CSS変数を統合し、以下を正規のデザイントークンとして採用する。

`docs/DESIGN.md` はライトテーマ向けのブループリントだが、プロダクトデザインはダークテーマ優先であるため、
参照HTMLの実装値を正とし、DESIGN.md のスペーシング・ラウンド・シャドウトークンを補完的に採用する。

```css
/* === カラー === */
--bg:        #08081a;   /* ページ最背面 */
--surface:   #10102a;   /* サイドバー・トップバー・フッター */
--card:      #16163a;   /* カード・パネル背景 */
--border:    #28285a;   /* ボーダー・区切り線 */

/* プライマリ（パープル） */
--purple:    #7F77DD;   /* アクセント標準 */
--purple-l:  #a0a0ff;   /* ライト（テキスト・バッジ） */
--purple-d:  #534AB7;   /* ダーク（ボタン背景・選択状態） */

/* セカンダリ（アンバー） */
--amber:     #EF9F27;   /* CTA・警告 */
--amber-l:   #FAC775;   /* ライト（テキスト） */
--amber-d:   #BA7517;   /* ダーク（ボタン背景） */

/* テキスト */
--text:      #eeeeff;   /* 本文 */
--muted:     #6666aa;   /* 補助テキスト */

/* セマンティック */
--live:      #ff4d6d;   /* LIVE状態・危険・緊急 */
--green:     #3fcf7f;   /* 完了・成功 */
```

**Rationale**: 参照デザインの実装値と一致させることで、デザイナーが作成したモックとコードの乖離をゼロにする。

**Alternatives considered**:
- DESIGN.md の `primary: #3686ff`（青系）採用 → 参照HTMLと大きく異なるため却下
- dark mode media query での切り替え → フェーズ1はダークテーマ固定のため不要

---

### Decision: タイポグラフィ

```css
/* === フォント === */
--font-ja:   'Zen Kaku Gothic New', sans-serif;  /* 日本語本文・見出し */
--font-num:  'Space Grotesk', sans-serif;         /* 数値・英字ラベル */
```

**Google Fonts URL**:
```
https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Space+Grotesk:wght@400;500;600&display=swap
```

**Next.js 14 での実装**:
`next/font/google` を使用し、`layout.tsx` でローカルフォント変数として定義する。

```tsx
import { Zen_Kaku_Gothic_New, Space_Grotesk } from 'next/font/google';

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-ja',
});

const spaceGrotesk = Space_Grotesk({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-num',
});
```

**Rationale**: `next/font` によるフォント最適化（self-hosting、layout shift防止）でLCP要件（<3s）を満たす。

---

### Decision: スペーシング・ラウンド・シャドウ

DESIGN.md のトークンを採用する（参照HTMLと概ね一致）。

```css
/* === スペーシング (8px ベース) === */
--space-2xs: 4px;
--space-xs:  8px;
--space-sm:  12px;
--space-md:  16px;
--space-lg:  24px;
--space-xl:  32px;
--space-2xl: 48px;
--space-3xl: 64px;

/* === 角丸 === */
--radius-sm:   6px;    /* Input */
--radius-md:   12px;   /* Button */
--radius-lg:   14px;   /* Card */
--radius-full:  9999px; /* Badge・Pill */

/* === シャドウ === */
--shadow-sm: 0 1px 2px 0 rgba(0,0,0,.24);
--shadow-md: 0 4px 6px -1px rgba(0,0,0,.32), 0 2px 4px -2px rgba(0,0,0,.32);
--shadow-lg: 0 20px 60px rgba(0,0,0,.4);
```

---

## 2. レスポンシブレイアウト決定

### Decision: デスクトップ = Sidebar、モバイル = Bottom Navigation

**ブレークポイント**: `md` (768px)

| 幅 | レイアウト |
|------|---------|
| < 768px | TopBar(固定) + scrollable content + BottomNav(固定) |
| >= 768px | Sidebar(220px固定) + TopBar(サイドバー右) + scrollable content |

**Rationale**:
- 参照デザイン `dashboard.html` がデスクトップ向け Sidebar レイアウトを採用
- 参照デザイン `mobile.html` がモバイル向け Bottom Navigation を採用
- Next.js App Router の`(protected)/layout.tsx`で `md:flex-row` / `flex-col` を切り替える

**Alternatives considered**:
- 常にBottomNav（現状の実装）→ デスクトップでの操作性が低くUX上問題あり
- 常にSidebar → モバイルでは画面領域を圧迫するため不適切

---

## 3. Tailwind CSS v4 カスタムトークン設定

Tailwind CSS v4 では `tailwind.config.ts` の代わりに `globals.css` の `@theme` ブロックで設定する。

```css
@import "tailwindcss";

@theme {
  /* カラー */
  --color-bg: #08081a;
  --color-surface: #10102a;
  --color-card: #16163a;
  --color-border: #28285a;
  --color-purple: #7F77DD;
  --color-purple-l: #a0a0ff;
  --color-purple-d: #534AB7;
  --color-amber: #EF9F27;
  --color-amber-l: #FAC775;
  --color-amber-d: #BA7517;
  --color-text: #eeeeff;
  --color-muted: #6666aa;
  --color-live: #ff4d6d;
  --color-green: #3fcf7f;

  /* フォント */
  --font-ja: 'Zen Kaku Gothic New', sans-serif;
  --font-num: 'Space Grotesk', sans-serif;

  /* ラウンド */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 14px;
  --radius-full: 9999px;
}
```

これにより、`bg-bg`、`text-purple-l`、`border-border` などのTailwindユーティリティが使用可能になる。

---

## 4. コンポーネント再利用可能性マッピング

| コンポーネント | 変更種別 | 備考 |
|------------|--------|------|
| `Button.tsx` | スタイル刷新 | variantに `amber` 追加。ダークテーマ対応 |
| `Badge.tsx` | スタイル刷新 | `live`・`green`・`purple`・`amber`・`muted` variant |
| `Input.tsx` | スタイル刷新 | ダークテーマ対応 |
| `Modal.tsx` | スタイル刷新 | ダークテーマ対応。backdrop blur追加 |
| `Spinner.tsx` | スタイル刷新 | パープル系に変更 |
| `Card.tsx` | 新規作成 | `--card` 背景 + `--border` ボーダーの汎用カード |
| `StatCard.tsx` | 新規作成 | ダッシュボード統計カード専用 |
| `Avatar.tsx` | 新規作成 | イニシャル表示アバター（カラー指定可能） |
| `Sidebar.tsx` | 新規作成 | デスクトップ専用220pxサイドバー |
| `AppShell.tsx` | 新規作成 | Sidebar/BottomNav 切り替えシェル |
| `TopBar.tsx` | スタイル刷新 + 機能追加 | LIVE バッジ、通知ベル、チームPlan表示 |
| `BottomNav.tsx` | スタイル刷新 | ダークテーマ。5アイテム構成 |

---

## 5. PWA manifest テーマカラー変更

現状: `themeColor: '#6366f1'` (indigo)
変更後: `themeColor: '#534AB7'` (--purple-d)

```json
{
  "theme_color": "#534AB7",
  "background_color": "#08081a"
}
```

---

## 6. WCAG 2.1 AA コントラスト確認（推算）

| テキスト色 | 背景色 | 推算コントラスト比 | AA基準 |
|----------|--------|----------------|--------|
| `#eeeeff` (--text) | `#08081a` (--bg) | ~16.5:1 | Pass |
| `#eeeeff` (--text) | `#16163a` (--card) | ~11.2:1 | Pass |
| `#a0a0ff` (--purple-l) | `#08081a` (--bg) | ~5.8:1 | Pass |
| `#6666aa` (--muted) | `#08081a` (--bg) | ~3.8:1 | Large text only |
| `#6666aa` (--muted) | `#16163a` (--card) | ~3.1:1 | Large text only |

**対応方針**: `--muted` はラベル・補助テキストのみに使用し、本文・インタラクティブ要素には `--text` / `--purple-l` を使用することで AA 基準を満たす。
実装時に ChromeDevTools の Accessibility パネルで全画面のコントラスト比を確認する。

---

## 7. NEEDS CLARIFICATION 解消状況

| 項目 | 状態 | 解決内容 |
|------|------|---------|
| フォント選定 | 解消 | Zen Kaku Gothic New + Space Grotesk（参照HTMLに準拠） |
| Tailwind v4 カスタムカラー設定方法 | 解消 | `@theme` ブロックを `globals.css` に定義 |
| デスクトップレイアウト | 解消 | 220px固定Sidebarを `md:` 以上に表示 |
| モバイルレイアウト | 解消 | BottomNav 5アイテム構成を `md:` 未満に表示 |
| WCAG AA 対応方針 | 解消 | `--muted` を補助テキスト限定使用で準拠 |
