import type { Metadata } from 'next';
import Script from 'next/script';
import { DotGothic16, M_PLUS_1, Zen_Kaku_Gothic_New } from 'next/font/google';

const LP_DESCRIPTION =
  '配信スケジュール、もうリスケしない。配信枠の管理・コラボ日程調整・制作タスク管理を、配信者とチームでひとつにまとめる配信者特化型スケジュール管理アプリ。';

export const metadata: Metadata = {
  // トップページはテンプレートの「| リスケるGG」を付けず、キャッチコピー込みの完全なタイトルにする
  title: { absolute: 'リスケるGG — 撮影も、コラボも、編集もGGなスケジュールを' },
  description: LP_DESCRIPTION,
  alternates: { canonical: '/' },
  // ページで openGraph / twitter を指定すると layout の同キーは置換されるため、
  // 画像・カード種別など必要な項目を明示的に再指定する。
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'リスケるGG',
    title: 'リスケるGG — 撮影も、コラボも、編集もGGなスケジュールを',
    description: LP_DESCRIPTION,
    url: '/',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'リスケるGG — 配信者特化のチームスケジュール管理アプリ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'リスケるGG — 撮影も、コラボも、編集もGGなスケジュールを',
    description: LP_DESCRIPTION,
    images: ['/og-image.png'],
  },
};

const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700', '900'],
  variable: '--font-zen-kaku-gothic-new',
  preload: false,
});

const mPlus1 = M_PLUS_1({
  weight: '900',
  variable: '--font-m-plus-1',
  preload: false,
});

const dotGothic16 = DotGothic16({
  weight: '400',
  variable: '--font-dot-gothic-16',
  preload: false,
});

/* ============================================================
   リスケるGG LP — "配信待機画面" コンセプト
   display(和文): M PLUS 1 / display(英字アクセント): Zen Kaku Gothic New(900) / body: Zen Kaku Gothic New
   utility(HUD): DotGothic16（日本語ピクセルフォント）
   ============================================================ */
const LP_CSS = `
  #lp-root {
    --bg: #06061c;
    --bg-2: #0a0a26;
    --surface: #10102e;
    --card: #161640;
    --border: #2c2c66;
    --border-soft: #232356;
    --purple: #7f77dd;
    --purple-l: #b0aaf8;
    --purple-d: #534ab7;
    --amber: #ef9f27;
    --amber-l: #fac775;
    --amber-d: #b06f10;
    --text: #f0efff;
    --muted: #a3a1d4;
    --faint: #8987bd;
    --live: #ff4d6d;
    --green: #3fcf7f;
    --pixel: var(--font-dot-gothic-16), monospace;
    --display: var(--font-m-plus-1), sans-serif;
    --display-latin: var(--font-zen-kaku-gothic-new), sans-serif;
  }
  #lp-root * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  html:has(#lp-root) {
    scroll-behavior: smooth;
  }
  #lp-root {
    font-family: var(--font-zen-kaku-gothic-new), sans-serif;
    background: var(--bg);
    color: var(--text);
    overflow-x: hidden;
    min-height: 100vh;
    font-size: 16px;
  }
  #lp-root ::selection {
    background: rgba(239, 159, 39, 0.85);
    color: #1a0800;
  }
  #lp-root a:focus-visible,
  #lp-root button:focus-visible {
    outline: 2px solid var(--amber);
    outline-offset: 3px;
    border-radius: 4px;
  }

  /* ── カスタムスクロールバー（LPページ限定。CSS変数は#lp-rootスコープのためhtml側は実値） ── */
  html:has(#lp-root) {
    scrollbar-width: thin;
    scrollbar-color: #534ab7 #06061c; /* var(--purple-d) var(--bg) */
  }
  html:has(#lp-root)::-webkit-scrollbar {
    width: 10px;
  }
  html:has(#lp-root)::-webkit-scrollbar-track {
    background: #06061c; /* var(--bg) */
  }
  html:has(#lp-root)::-webkit-scrollbar-thumb {
    background: #534ab7; /* var(--purple-d) */
    border-radius: 5px;
  }
  html:has(#lp-root)::-webkit-scrollbar-thumb:hover {
    background: #ef9f27; /* var(--amber) */
  }

  /* ── アニメーションユーティリティ ──
     JSが .lp-anim を付与した場合のみ初期非表示（JS無効環境でも内容が見える） */
  #lp-root .fade-up {
    transition:
      opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }
  #lp-root.lp-anim .fade-up:not(.is-visible) {
    opacity: 0;
    transform: translateY(32px);
  }
  #lp-root .delay-100 { transition-delay: 100ms; }
  #lp-root .delay-200 { transition-delay: 200ms; }
  #lp-root .delay-300 { transition-delay: 300ms; }

  @keyframes lpFadeUpInit {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes lpBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
  @keyframes lpToastFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes lpTickerScroll {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
  @keyframes lpWiggle {
    0%, 100% { transform: rotate(0deg); }
    30% { transform: rotate(-9deg); }
    60% { transform: rotate(7deg); }
  }

  /* ── NAV ── */
  #lp-root nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    height: 64px;
    background: rgba(6, 6, 28, 0.82);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border-soft);
    display: flex;
    align-items: center;
    padding: 0 28px;
    gap: 20px;
  }
  #lp-root .nav-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }
  #lp-root .nav-logo-icon {
    width: 36px;
    height: 36px;
    background: var(--purple-d);
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #lp-root .nav-logo-icon svg {
    transform-origin: 50% 90%;
  }
  #lp-root .nav-logo:hover .nav-logo-icon svg {
    animation: lpWiggle 0.5s ease-in-out;
  }
  #lp-root .nav-name {
    font-size: 16px;
    font-weight: 700;
  }
  #lp-root .nav-name span {
    color: var(--amber);
  }
  #lp-root .nav-links {
    display: flex;
    gap: 26px;
  }
  #lp-root .nav-links a {
    font-size: 14px;
    color: var(--muted);
    text-decoration: none;
    transition: color 0.15s;
  }
  #lp-root .nav-links a:hover {
    color: var(--text);
  }
  #lp-root .nav-login {
    font-size: 13px;
    color: var(--muted);
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 9px;
    border: 1px solid var(--border);
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  #lp-root .nav-login:hover {
    color: var(--text);
    border-color: var(--purple);
  }
  #lp-root .nav-cta {
    background: var(--amber);
    color: #241300;
    border: none;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 700;
    padding: 9px 20px;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    box-shadow: 0 3px 0 var(--amber-d);
    transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  }
  #lp-root .nav-cta:hover {
    background: var(--amber-l);
    transform: translateY(-1px);
    box-shadow: 0 4px 0 var(--amber-d);
  }
  #lp-root .nav-cta:active {
    transform: translateY(2px);
    box-shadow: 0 1px 0 var(--amber-d);
  }

  /* ── HERO ── */
  #lp-root .hero {
    min-height: 100svh;
    position: relative;
    padding: 130px 48px 110px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #lp-root .hero-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 70% 55% at 30% 18%, rgba(127, 119, 221, 0.16) 0%, transparent 60%),
      radial-gradient(ellipse 45% 40% at 82% 78%, rgba(239, 159, 39, 0.09) 0%, transparent 55%);
    pointer-events: none;
  }
  #lp-root .hero-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(127, 119, 221, 0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(127, 119, 221, 0.07) 1px, transparent 1px);
    background-size: 56px 56px;
    -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 90%);
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 90%);
    pointer-events: none;
  }

  /* 配信待機画面 HUD フレーム */
  #lp-root .hero-hud {
    position: absolute;
    inset: 84px 24px 24px;
    pointer-events: none;
    z-index: 2;
    font-family: var(--pixel);
    color: var(--faint);
    font-size: 13px;
    letter-spacing: 0.08em;
  }
  #lp-root .hud-corner {
    position: absolute;
    width: 22px;
    height: 22px;
    border: 2px solid rgba(127, 119, 221, 0.55);
  }
  #lp-root .hud-corner.tl { top: 0; left: 0; border-right: none; border-bottom: none; }
  #lp-root .hud-corner.tr { top: 0; right: 0; border-left: none; border-bottom: none; }
  #lp-root .hud-corner.bl { bottom: 0; left: 0; border-right: none; border-top: none; }
  #lp-root .hud-corner.br { bottom: 0; right: 0; border-left: none; border-top: none; }
  #lp-root .hud-top,
  #lp-root .hud-bottom {
    position: absolute;
    left: 34px;
    right: 34px;
    display: flex;
    justify-content: space-between;
  }
  #lp-root .hud-top { top: 2px; }
  #lp-root .hud-bottom { bottom: 2px; }
  #lp-root .hud-rec {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--live);
  }
  #lp-root .hud-rec i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--live);
    animation: lpBlink 1.6s steps(2, start) infinite;
  }
  #lp-root .hud-clock {
    color: var(--purple-l);
  }

  #lp-root .hero-shell {
    position: relative;
    z-index: 1;
    width: min(1200px, 100%);
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
    align-items: center;
    gap: clamp(32px, 5vw, 72px);
  }
  #lp-root .hero-copy {
    text-align: left;
    max-width: 640px;
  }
  #lp-root .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-family: var(--pixel);
    background: rgba(127, 119, 221, 0.1);
    border: 1px solid rgba(127, 119, 221, 0.45);
    border-radius: 4px;
    padding: 7px 14px;
    font-size: 13px;
    color: var(--purple-l);
    margin-bottom: 26px;
    animation: lpFadeUpInit 0.6s ease both;
  }
  #lp-root .hero-badge-dot {
    width: 8px;
    height: 8px;
    background: var(--live);
    animation: lpBlink 1.6s steps(2, start) infinite;
  }
  #lp-root .hero-title {
    font-family: var(--display);
    font-weight: 900;
    font-size: clamp(28px, 3.4vw, 48px);
    line-height: 1.32;
    letter-spacing: -0.01em;
    margin-bottom: 26px;
    animation: lpFadeUpInit 0.7s 0.1s ease both;
  }
  #lp-root .hero-title .gg {
    color: var(--amber);
    text-shadow: 0 0 16px rgba(239, 159, 39, 0.28);
  }
  #lp-root .hero-title .br {
    display: block;
  }
  #lp-root .hero-sub {
    font-size: clamp(15px, 1.6vw, 18px);
    color: var(--muted);
    max-width: 600px;
    line-height: 1.9;
    margin-bottom: 36px;
    animation: lpFadeUpInit 0.7s 0.2s ease both;
  }
  #lp-root .hero-sub strong {
    color: var(--text);
  }
  #lp-root .hero-btns {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    justify-content: flex-start;
    animation: lpFadeUpInit 0.7s 0.3s ease both;
  }
  #lp-root .hero-note {
    margin-top: 18px;
    font-family: var(--pixel);
    font-size: 12px;
    color: var(--faint);
    letter-spacing: 0.06em;
    animation: lpFadeUpInit 0.7s 0.4s ease both;
  }

  /* ゲームUI風ボタン（押し込みシャドウ） */
  #lp-root .btn-primary {
    background: var(--amber);
    color: #241300;
    border: none;
    border-radius: 12px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    font-size: 16px;
    font-weight: 700;
    padding: 16px 36px;
    cursor: pointer;
    font-family: inherit;
    box-shadow:
      0 5px 0 var(--amber-d),
      0 18px 40px rgba(239, 159, 39, 0.28);
    transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  }
  #lp-root .btn-primary:hover {
    background: var(--amber-l);
    transform: translateY(-2px);
    box-shadow:
      0 7px 0 var(--amber-d),
      0 22px 48px rgba(239, 159, 39, 0.38);
  }
  #lp-root .btn-primary:active {
    transform: translateY(3px);
    box-shadow:
      0 2px 0 var(--amber-d),
      0 10px 24px rgba(239, 159, 39, 0.25);
  }
  #lp-root .btn-secondary {
    background: rgba(127, 119, 221, 0.1);
    color: var(--purple-l);
    border: 1px solid rgba(127, 119, 221, 0.45);
    border-radius: 12px;
    font-size: 16px;
    font-weight: 500;
    padding: 16px 36px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, border-color 0.15s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  #lp-root .btn-secondary:hover {
    background: rgba(127, 119, 221, 0.2);
    border-color: var(--purple-l);
  }

  /* ── HERO 右：今週のスケジュールボード ── */
  #lp-root .hero-board-wrap {
    position: relative;
    animation: lpFadeUpInit 0.8s 0.35s ease both;
  }
  #lp-root .hero-board {
    background: linear-gradient(180deg, var(--surface) 0%, var(--bg-2) 100%);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    box-shadow:
      0 40px 100px rgba(0, 0, 0, 0.55),
      0 0 0 1px rgba(127, 119, 221, 0.08);
  }
  #lp-root .board-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }
  #lp-root .board-title {
    font-family: var(--display);
    font-weight: 900;
    font-size: 18px;
  }
  #lp-root .board-week {
    font-family: var(--pixel);
    font-size: 12px;
    color: var(--amber);
    letter-spacing: 0.08em;
  }
  #lp-root .board-rows {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  #lp-root .board-row {
    display: grid;
    grid-template-columns: 44px 52px 1fr auto;
    align-items: center;
    gap: 12px;
    background: rgba(22, 22, 64, 0.7);
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    padding: 11px 14px;
  }
  #lp-root .board-row.is-collab {
    border-color: rgba(63, 207, 127, 0.45);
    background: rgba(63, 207, 127, 0.06);
  }
  #lp-root .board-day {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  #lp-root .board-day span {
    font-family: var(--pixel);
    font-size: 15px;
    color: var(--text);
  }
  #lp-root .board-time {
    font-family: var(--pixel);
    font-size: 14px;
    color: var(--purple-l);
  }
  #lp-root .board-name {
    font-size: 13px;
    font-weight: 700;
    line-height: 1.4;
    min-width: 0;
  }
  #lp-root .board-tag {
    font-family: var(--pixel);
    font-size: 11px;
    padding: 3px 9px;
    border-radius: 4px;
    white-space: nowrap;
  }
  #lp-root .tag-live {
    background: rgba(255, 77, 109, 0.14);
    color: var(--live);
    border: 1px solid rgba(255, 77, 109, 0.4);
  }
  #lp-root .tag-video {
    background: rgba(239, 159, 39, 0.12);
    color: var(--amber-l);
    border: 1px solid rgba(239, 159, 39, 0.4);
  }
  #lp-root .tag-collab {
    background: rgba(63, 207, 127, 0.12);
    color: var(--green);
    border: 1px solid rgba(63, 207, 127, 0.4);
  }
  #lp-root .board-foot {
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px dashed var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  #lp-root .board-progress-label {
    font-size: 12px;
    color: var(--muted);
  }
  #lp-root .board-progress-label strong {
    font-family: var(--pixel);
    font-size: 15px;
    color: var(--green);
  }
  #lp-root .pixel-bar {
    display: flex;
    gap: 4px;
  }
  #lp-root .pixel-bar i {
    width: 13px;
    height: 11px;
    background: var(--border-soft);
  }
  #lp-root .pixel-bar i.on {
    background: var(--green);
    box-shadow: 0 0 8px rgba(63, 207, 127, 0.5);
  }

  /* 浮遊トースト */
  #lp-root .board-toast {
    position: absolute;
    font-family: var(--pixel);
    font-size: 12px;
    padding: 9px 14px;
    border-radius: 10px;
    background: rgba(10, 10, 38, 0.92);
    border: 1px solid var(--border);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    white-space: nowrap;
    animation: lpToastFloat 5s ease-in-out infinite;
  }
  #lp-root .board-toast.t1 {
    top: -18px;
    right: -14px;
    border-color: rgba(63, 207, 127, 0.5);
    color: var(--green);
  }
  #lp-root .board-toast.t2 {
    bottom: -16px;
    left: -18px;
    border-color: rgba(239, 159, 39, 0.5);
    color: var(--amber-l);
    animation-delay: 2.4s;
  }

  /* ── ヒーロー「カオス→整列」オープニング演出 ──
     JSが .hero-board-wrap に .play を付与した時だけ再生。
     .play なし（JS無効・reduced-motion）ではチップ非表示＋全要素即表示 */
  #lp-root .chaos-layer {
    display: none;
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 5;
  }
  #lp-root .chaos-chip {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: 12px;
    padding: 8px 13px;
    border-radius: 10px;
    background: rgba(10, 10, 38, 0.92);
    border: 1px solid var(--border);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    color: var(--text);
    white-space: nowrap;
    opacity: 0;
  }
  /* --sx/--sy: 散らばり開始オフセット, --sr: 傾き, --pd: 出現遅延, --ad: 吸い込み遅延 */
  #lp-root .chaos-chip.c1 { --sx: -170px; --sy: -130px; --sr: -8deg; --pd: 0.4s;  --ad: 1s; }
  #lp-root .chaos-chip.c2 { --sx: 150px;  --sy: -160px; --sr: 6deg;  --pd: 0.75s; --ad: 1.35s; }
  #lp-root .chaos-chip.c3 { --sx: -190px; --sy: 120px;  --sr: 10deg; --pd: 1.1s;  --ad: 1.7s; }
  #lp-root .chaos-chip.c4 { --sx: 160px;  --sy: 150px;  --sr: -6deg; --pd: 1.45s; --ad: 2.05s; }
  #lp-root .hero-board-wrap.play .chaos-layer {
    display: block;
  }
  #lp-root .hero-board-wrap.play .chaos-chip {
    animation:
      lpChaosPop 0.3s var(--pd) cubic-bezier(0.34, 1.56, 0.64, 1) both,
      lpChaosAbsorb 0.45s var(--ad) ease-in forwards;
  }
  @keyframes lpChaosPop {
    from {
      opacity: 0;
      transform: translate(calc(-50% + var(--sx)), calc(-50% + var(--sy))) rotate(var(--sr)) scale(0.7);
    }
    to {
      opacity: 1;
      transform: translate(calc(-50% + var(--sx)), calc(-50% + var(--sy))) rotate(var(--sr)) scale(1);
    }
  }
  @keyframes lpChaosAbsorb {
    from {
      opacity: 1;
      transform: translate(calc(-50% + var(--sx)), calc(-50% + var(--sy))) rotate(var(--sr)) scale(1);
    }
    to {
      opacity: 0;
      transform: translate(-50%, -50%) rotate(0deg) scale(0.5);
    }
  }
  /* 行の整列（チップ吸い込みに同期） */
  #lp-root .hero-board-wrap.play .board-row {
    opacity: 0;
    animation: lpBoardRowIn 0.5s var(--rd, 1.3s) cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  #lp-root .hero-board-wrap.play .board-rows .board-row:nth-child(1) { --rd: 1.3s; }
  #lp-root .hero-board-wrap.play .board-rows .board-row:nth-child(2) { --rd: 1.65s; }
  #lp-root .hero-board-wrap.play .board-rows .board-row:nth-child(3) { --rd: 2s; }
  #lp-root .hero-board-wrap.play .board-rows .board-row:nth-child(4) { --rd: 2.35s; }
  @keyframes lpBoardRowIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  /* 進捗バー点灯（2.6sから60ms間隔） */
  #lp-root .hero-board-wrap.play .pixel-bar i.on {
    transform: scale(0);
    animation: lpPixelOn 0.3s var(--bd, 2.6s) cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  #lp-root .hero-board-wrap.play .pixel-bar i.on:nth-child(1) { --bd: 2.6s; }
  #lp-root .hero-board-wrap.play .pixel-bar i.on:nth-child(2) { --bd: 2.66s; }
  #lp-root .hero-board-wrap.play .pixel-bar i.on:nth-child(3) { --bd: 2.72s; }
  #lp-root .hero-board-wrap.play .pixel-bar i.on:nth-child(4) { --bd: 2.78s; }
  #lp-root .hero-board-wrap.play .pixel-bar i.on:nth-child(5) { --bd: 2.84s; }
  #lp-root .hero-board-wrap.play .pixel-bar i.on:nth-child(6) { --bd: 2.9s; }
  #lp-root .hero-board-wrap.play .pixel-bar i.on:nth-child(7) { --bd: 2.96s; }
  @keyframes lpPixelOn {
    from { transform: scale(0); }
    to { transform: scale(1); }
  }
  /* トースト：ポップ後に既存の浮遊ループへ接続（popの終端とfloatの始端は同一姿勢） */
  #lp-root .hero-board-wrap.play .board-toast.t1 {
    animation:
      lpToastPop 0.4s 2.9s cubic-bezier(0.34, 1.56, 0.64, 1) both,
      lpToastFloat 5s 3.3s ease-in-out infinite;
  }
  #lp-root .hero-board-wrap.play .board-toast.t2 {
    animation:
      lpToastPop 0.4s 3.3s cubic-bezier(0.34, 1.56, 0.64, 1) both,
      lpToastFloat 5s 3.7s ease-in-out infinite;
  }
  @keyframes lpToastPop {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }

  /* ── ヒーロー全体演出（HUD起動＋終幕グロー） ──
     JSが .hero に .play を付与した時だけ再生。
     .play なし（JS無効・reduced-motion）ではHUDもグローも即・静的表示 */
  #lp-root .hero.play .hud-corner {
    animation: lpHudCornerIn 0.35s ease-out both;
  }
  #lp-root .hero.play .hud-corner.tl { transform-origin: top left; }
  #lp-root .hero.play .hud-corner.tr { transform-origin: top right; }
  #lp-root .hero.play .hud-corner.bl { transform-origin: bottom left; }
  #lp-root .hero.play .hud-corner.br { transform-origin: bottom right; }
  @keyframes lpHudCornerIn {
    from { opacity: 0; transform: scale(0.5); }
    to { opacity: 1; transform: scale(1); }
  }
  #lp-root .hero.play .hud-top,
  #lp-root .hero.play .hud-bottom {
    animation: lpHudBarIn 0.4s 0.25s ease both;
  }
  @keyframes lpHudBarIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  /* ボード演出の着地（約3.7s）に合わせてアンバー強調が一度だけ光る */
  #lp-root .hero.play .hero-title .gg {
    animation: lpGgGlow 0.9s 3.7s ease-in-out 1 backwards;
  }
  @keyframes lpGgGlow {
    0%,
    100% {
      color: var(--amber);
      text-shadow: 0 0 16px rgba(239, 159, 39, 0.28);
    }
    50% {
      color: var(--amber-l);
      text-shadow: 0 0 30px rgba(239, 159, 39, 0.6);
    }
  }

  /* ── TICKER ── */
  #lp-root .ticker {
    border-top: 1px solid var(--border-soft);
    border-bottom: 1px solid var(--border-soft);
    background: var(--bg-2);
    overflow: hidden;
    padding: 13px 0;
  }
  #lp-root .ticker-track {
    display: flex;
    align-items: center;
    gap: 28px;
    width: max-content;
    font-family: var(--pixel);
    font-size: 14px;
    color: var(--muted);
    letter-spacing: 0.06em;
    animation: lpTickerScroll 36s linear infinite;
  }
  #lp-root .ticker-track span {
    white-space: nowrap;
  }
  #lp-root .ticker-track .sep {
    color: var(--amber);
    opacity: 0.7;
  }
  #lp-root .ticker:hover .ticker-track {
    animation-play-state: paused;
  }

  /* ── SECTION COMMON ── */
  #lp-root section {
    padding: 110px 24px;
  }
  #lp-root .section-inner {
    max-width: 1080px;
    margin: 0 auto;
  }
  #lp-root .section-eyebrow {
    font-family: var(--pixel);
    font-size: 14px;
    color: var(--amber);
    letter-spacing: 0.14em;
    margin-bottom: 16px;
  }
  #lp-root .section-title {
    font-family: var(--display);
    font-weight: 900;
    font-size: clamp(26px, 4.2vw, 48px);
    line-height: 1.32;
    letter-spacing: -0.01em;
    margin-bottom: 20px;
  }
  #lp-root .section-sub {
    font-size: clamp(14px, 1.8vw, 17px);
    color: var(--muted);
    max-width: 620px;
    line-height: 1.9;
  }
  #lp-root .section-note {
    font-size: 12.5px;
    color: var(--faint);
    text-align: center;
    margin-top: 28px;
    line-height: 1.7;
  }

  /* ── PROBLEM（散らかった通知メタファー） ── */
  #lp-root .problem {
    background: var(--bg);
  }
  #lp-root .problem-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 18px;
    margin-top: 56px;
  }
  #lp-root .problem-card {
    --tilt: 0deg;
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: 14px;
    padding: 22px;
    transform: rotate(var(--tilt));
    transition:
      opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1),
      border-color 0.25s;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
  }
  #lp-root.lp-anim .problem-card:not(.is-visible) {
    opacity: 0;
    transform: rotate(var(--tilt)) translateY(32px);
  }
  /* マスキングテープ */
  #lp-root .problem-card::before {
    content: '';
    position: absolute;
    top: -11px;
    left: 50%;
    width: 92px;
    height: 24px;
    transform: translateX(-50%) rotate(-2.5deg);
    background: rgba(238, 237, 254, 0.09);
    border-left: 1px dashed rgba(238, 237, 254, 0.18);
    border-right: 1px dashed rgba(238, 237, 254, 0.18);
    backdrop-filter: blur(1px);
    pointer-events: none;
  }
  #lp-root .problem-card:nth-of-type(2)::before {
    transform: translateX(-50%) rotate(2deg);
  }
  #lp-root .problem-card:nth-of-type(3)::before {
    transform: translateX(-50%) rotate(-1.5deg);
  }
  #lp-root .problem-card:nth-of-type(4)::before {
    transform: translateX(-50%) rotate(3deg);
  }
  #lp-root .problem-card:hover {
    transform: rotate(0deg) translateY(-4px);
    border-color: var(--purple);
    /* ホバー中はtransformを俊敏に（is-visible演出のtransitionはhover外の基本ルールが担う） */
    transition:
      opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.25s ease,
      border-color 0.25s;
  }
  #lp-root .problem-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 16px;
  }
  #lp-root .app-chip {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    background: rgba(127, 119, 221, 0.1);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 4px 10px;
  }
  #lp-root .problem-head {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 10px;
    line-height: 1.5;
  }
  #lp-root .problem-text {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.8;
  }
  #lp-root .problem-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin-top: 56px;
    font-size: 14px;
  }
  #lp-root .problem-arrow .line {
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  #lp-root .problem-arrow .label {
    background: rgba(127, 119, 221, 0.12);
    border: 1px solid rgba(127, 119, 221, 0.4);
    border-radius: 99px;
    padding: 10px 24px;
    color: var(--purple-l);
    font-weight: 700;
    white-space: nowrap;
  }
  @media (max-width: 480px) {
    #lp-root .problem-arrow .label {
      white-space: normal;
      text-align: center;
    }
  }

  /* ── FEATURES ── */
  #lp-root .features {
    background: var(--surface);
  }
  #lp-root .feature-blocks {
    display: flex;
    flex-direction: column;
    gap: 100px;
    margin-top: 72px;
  }
  #lp-root .feature-block {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: clamp(36px, 5vw, 64px);
    align-items: center;
  }
  #lp-root .feature-block.rev {
    direction: rtl;
  }
  #lp-root .feature-block.rev > * {
    direction: ltr;
  }
  /* 巨大ゴースト数字（SCENE番号） */
  #lp-root .feature-block > :not(.feat-ghost) {
    position: relative;
    z-index: 1;
  }
  #lp-root .feat-ghost {
    position: absolute;
    top: -96px;
    left: -10px;
    font-family: var(--display);
    font-weight: 900;
    font-size: clamp(90px, 12vw, 150px);
    line-height: 1;
    color: rgba(127, 119, 221, 0.045);
    pointer-events: none;
    user-select: none;
    z-index: 0;
  }
  @supports (-webkit-text-stroke: 1px transparent) {
    #lp-root .feat-ghost {
      color: transparent;
      -webkit-text-stroke: 1.5px rgba(127, 119, 221, 0.12);
    }
  }
  #lp-root .feature-blocks .feature-block:first-child .feat-ghost {
    top: -66px;
  }
  #lp-root .feature-block.rev .feat-ghost {
    left: auto;
    right: -10px;
  }
  #lp-root .feat-label {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--faint);
    margin-bottom: 18px;
  }
  #lp-root .scene-no {
    font-family: var(--pixel);
    font-size: 13px;
    letter-spacing: 0.12em;
    color: var(--amber);
    background: rgba(239, 159, 39, 0.09);
    border: 1px solid rgba(239, 159, 39, 0.4);
    border-radius: 4px;
    padding: 4px 12px;
  }
  #lp-root .feat-title {
    font-family: var(--display);
    font-weight: 900;
    font-size: clamp(21px, 2.8vw, 32px);
    line-height: 1.42;
    margin-bottom: 18px;
  }
  #lp-root .feat-desc {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.9;
    margin-bottom: 24px;
  }
  #lp-root .feat-points {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  #lp-root .feat-point {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 15px;
    color: var(--text);
    line-height: 1.7;
  }
  #lp-root .feat-point-dot {
    width: 19px;
    height: 19px;
    border-radius: 5px;
    background: rgba(127, 119, 221, 0.15);
    border: 1px solid var(--purple);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
    font-size: 10px;
    color: var(--purple-l);
  }

  /* Feature mockups */
  #lp-root .feat-visual {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s;
  }
  #lp-root .feature-block:hover .feat-visual {
    transform: translateY(-6px);
    border-color: rgba(127, 119, 221, 0.55);
  }
  #lp-root .fv-header {
    background: var(--bg-2);
    border-bottom: 1px solid var(--border-soft);
    padding: 13px 18px;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  #lp-root .fv-badge {
    font-family: var(--pixel);
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 4px;
  }
  #lp-root .badge-purple { background: rgba(127, 119, 221, 0.15); color: var(--purple-l); }
  #lp-root .badge-amber { background: rgba(239, 159, 39, 0.15); color: var(--amber-l); }
  #lp-root .badge-live { background: rgba(255, 77, 109, 0.15); color: var(--live); }

  /* カレンダーモック */
  #lp-root .cal-mock {
    padding: 18px;
  }
  #lp-root .cal-week {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
    margin-bottom: 10px;
  }
  #lp-root .cal-week:last-child {
    margin-bottom: 0;
  }
  #lp-root .cal-wday {
    font-family: var(--pixel);
    font-size: 11px;
    color: var(--faint);
    text-align: center;
    padding-bottom: 4px;
  }
  #lp-root .cal-wcell {
    min-height: 68px;
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: 8px;
    padding: 6px;
  }
  #lp-root .cal-wcell.today {
    border-color: var(--purple);
    background: rgba(127, 119, 221, 0.08);
  }
  #lp-root .cal-cell-date {
    font-family: var(--pixel);
    font-size: 11px;
    margin-bottom: 5px;
    color: var(--muted);
  }
  #lp-root .cal-wcell.today .cal-cell-date {
    color: var(--purple-l);
  }
  #lp-root .cal-event {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 5px;
    border-radius: 4px;
    margin-bottom: 3px;
    line-height: 1.3;
  }
  #lp-root .ev-purple { background: rgba(127, 119, 221, 0.2); color: var(--purple-l); }
  #lp-root .ev-amber { background: rgba(239, 159, 39, 0.15); color: var(--amber-l); }
  #lp-root .ev-live { background: rgba(255, 77, 109, 0.15); color: var(--live); }
  #lp-root .ev-green { background: rgba(63, 207, 127, 0.15); color: var(--green); }

  /* コラボモック */
  #lp-root .collab-mock {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  #lp-root .collab-card {
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    padding: 13px 15px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  #lp-root .collab-card.is-done {
    opacity: 0.6;
  }
  #lp-root .collab-av {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }
  #lp-root .av-live { background: rgba(255, 77, 109, 0.2); color: var(--live); }
  #lp-root .av-purple { background: rgba(127, 119, 221, 0.25); color: var(--purple-l); }
  #lp-root .av-green { background: rgba(63, 207, 127, 0.2); color: var(--green); }
  #lp-root .av-amber { background: rgba(239, 159, 39, 0.25); color: var(--amber-l); }
  #lp-root .collab-info {
    flex: 1;
    min-width: 0;
  }
  #lp-root .collab-name {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  #lp-root .collab-date {
    font-size: 11px;
    color: var(--muted);
  }
  #lp-root .collab-btn-row {
    display: flex;
    gap: 6px;
  }
  #lp-root .c-btn {
    border: none;
    border-radius: 7px;
    font-size: 11px;
    font-weight: 700;
    padding: 6px 13px;
    cursor: pointer;
    font-family: inherit;
  }
  #lp-root .c-ok { background: rgba(63, 207, 127, 0.15); color: var(--green); }
  #lp-root .c-ng { background: rgba(255, 77, 109, 0.1); color: var(--live); }
  #lp-root .collab-fixed {
    font-family: var(--pixel);
    font-size: 12px;
    color: var(--green);
  }

  /* カンバンモック */
  #lp-root .kb-mock {
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 9px;
  }
  #lp-root .kb-col-h {
    font-family: var(--pixel);
    font-size: 11px;
    color: var(--faint);
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }
  #lp-root .kb-col-h.h-amber { color: var(--amber); }
  #lp-root .kb-col-h.h-green { color: var(--green); }
  #lp-root .kb-c {
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: 8px;
    padding: 10px 11px;
    margin-bottom: 7px;
  }
  #lp-root .kb-c.is-doing {
    border-color: rgba(239, 159, 39, 0.5);
  }
  #lp-root .kb-c.is-done {
    opacity: 0.55;
  }
  #lp-root .kb-c-title {
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 6px;
    line-height: 1.45;
  }
  #lp-root .kb-c-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  #lp-root .kb-av {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 9px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #lp-root .kb-due {
    font-family: var(--pixel);
    font-size: 11px;
    color: var(--faint);
  }

  /* 通知モック */
  #lp-root .notif-mock {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  #lp-root .notif-row {
    display: flex;
    gap: 11px;
    align-items: flex-start;
    padding: 11px 13px;
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: 10px;
  }
  #lp-root .notif-row.is-read {
    opacity: 0.5;
  }
  #lp-root .notif-icon {
    font-size: 16px;
    flex-shrink: 0;
    margin-top: 1px;
  }
  #lp-root .notif-text {
    font-size: 13px;
    line-height: 1.6;
    color: var(--muted);
  }
  #lp-root .notif-text strong {
    color: var(--text);
  }
  #lp-root .notif-time {
    font-family: var(--pixel);
    font-size: 11px;
    color: var(--faint);
    margin-top: 3px;
  }

  /* ── 実アプリ画像（feature内モック差し替え） ── */
  #lp-root .feat-shot {
    line-height: 0;
  }
  #lp-root .feat-shot img {
    width: 100%;
    height: auto;
    display: block;
  }

  /* ── USECASES ── */
  #lp-root .usecases {
    background: var(--bg);
  }
  #lp-root .usecase-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 18px;
    margin-top: 56px;
  }
  #lp-root .usecase-card {
    background: var(--surface);
    border: 1px solid var(--border-soft);
    border-radius: 16px;
    padding: 26px 24px;
    transition: border-color 0.25s, transform 0.25s;
  }
  #lp-root .usecase-card:hover {
    border-color: var(--purple);
    transform: translateY(-4px);
  }
  #lp-root .usecase-label {
    display: inline-flex;
    align-items: center;
    font-family: var(--pixel);
    font-size: 12px;
    color: var(--purple-l);
    background: rgba(127, 119, 221, 0.12);
    border: 1px solid rgba(127, 119, 221, 0.35);
    border-radius: 4px;
    padding: 4px 11px;
    margin-bottom: 16px;
  }
  #lp-root .usecase-title {
    font-size: 17px;
    font-weight: 700;
    line-height: 1.55;
    margin-bottom: 12px;
  }
  #lp-root .usecase-points {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  #lp-root .usecase-point {
    font-size: 12px;
    color: var(--text);
    line-height: 1.7;
    padding-left: 15px;
    position: relative;
  }
  #lp-root .usecase-point::before {
    content: '';
    position: absolute;
    top: 7px;
    left: 0;
    width: 7px;
    height: 7px;
    background: var(--amber);
  }

  /* ── HOW IT WORKS ── */
  #lp-root .how {
    background: var(--surface);
  }
  #lp-root .how-map {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 620px;
    margin: 44px auto 0;
  }
  /* フェーズ帯 */
  #lp-root .how-phase {
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-weight: 700;
    font-size: 15px;
    border-radius: 10px;
  }
  #lp-root .how-phase.phase-solo {
    background: var(--purple-d);
    color: #fff;
  }
  #lp-root .how-phase.phase-team {
    background: var(--amber);
    color: #241300;
    margin-top: 20px;
  }
  #lp-root .phase-tag {
    font-family: var(--pixel);
    font-size: 11px;
    letter-spacing: 0.1em;
    border: 1px solid currentColor;
    border-radius: 3px;
    padding: 2px 8px;
    opacity: 0.9;
  }
  /* ステップカード（横並び行） */
  #lp-root .how-card {
    background: var(--card);
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    padding: 16px 20px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;
    min-height: auto;
  }
  #lp-root .hc-num {
    font-family: var(--pixel);
    font-size: 12px;
    color: var(--amber);
    letter-spacing: 0.08em;
    width: 64px;
    flex-shrink: 0;
  }
  #lp-root .hc-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  #lp-root .hc-title {
    font-weight: 700;
    font-size: 15.5px;
    line-height: 1.4;
  }
  #lp-root .hc-sub {
    font-size: 12.5px;
    color: var(--faint);
  }

  /* ── PLAN ── */
  #lp-root .plan {
    background: var(--bg);
  }
  #lp-root .plan-inner {
    max-width: 860px;
    margin: 0 auto;
  }
  #lp-root .plan-head {
    text-align: center;
  }
  #lp-root .plan-head .section-sub {
    margin: 0 auto;
  }
  #lp-root .plan-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 52px;
  }
  #lp-root .plan-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 40px 34px;
    position: relative;
    text-align: left;
    display: flex;
    flex-direction: column;
  }
  #lp-root .plan-card.pro {
    border-color: rgba(239, 159, 39, 0.55);
    box-shadow: 0 0 60px rgba(239, 159, 39, 0.09);
  }
  #lp-root .plan-reco {
    position: absolute;
    top: -13px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--pixel);
    background: var(--amber);
    color: #241300;
    font-size: 12px;
    padding: 5px 18px;
    border-radius: 99px;
    white-space: nowrap;
    box-shadow: 0 3px 0 var(--amber-d);
  }
  #lp-root .plan-name {
    font-family: var(--display);
    font-weight: 900;
    font-size: 26px;
    margin-bottom: 10px;
  }
  #lp-root .plan-name.latin {
    font-family: var(--font-zen-kaku-gothic-new), sans-serif;
    font-weight: 900;
    letter-spacing: 0.04em;
  }
  #lp-root .plan-card.pro .plan-name {
    color: var(--amber);
  }
  #lp-root .plan-price {
    font-family: var(--display);
    font-weight: 900;
    font-size: 46px;
    margin-bottom: 8px;
  }
  #lp-root .plan-card.pro .plan-price {
    color: var(--amber);
  }
  #lp-root .plan-price span {
    font-size: 17px;
    color: var(--muted);
    font-family: var(--font-zen-kaku-gothic-new), sans-serif;
    font-weight: 700;
  }
  #lp-root .plan-note {
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 26px;
  }
  #lp-root .plan-items {
    display: flex;
    flex-direction: column;
    gap: 11px;
    margin-bottom: 20px;
  }
  #lp-root .plan-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
  }
  #lp-root .plan-item::before {
    content: '✓';
    color: var(--green);
    font-weight: 700;
    flex-shrink: 0;
  }
  #lp-root .plan-flag {
    font-size: 12px;
    border-radius: 8px;
    padding: 9px 13px;
    margin-bottom: 20px;
  }
  #lp-root .flag-warn {
    color: var(--amber);
    background: rgba(239, 159, 39, 0.09);
  }
  #lp-root .flag-ok {
    color: var(--green);
    background: rgba(63, 207, 127, 0.09);
  }
  #lp-root .plan-cta {
    margin-top: auto;
    width: 100%;
    padding: 16px;
    background: var(--amber);
    color: #241300;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    text-align: center;
    text-decoration: none;
    display: block;
    box-shadow: 0 4px 0 var(--amber-d);
    transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
  }
  #lp-root .plan-cta:hover {
    background: var(--amber-l);
    transform: translateY(-2px);
    box-shadow: 0 6px 0 var(--amber-d);
  }
  #lp-root .plan-cta:active {
    transform: translateY(2px);
    box-shadow: 0 1px 0 var(--amber-d);
  }
  #lp-root .plan-cta.outline {
    background: rgba(127, 119, 221, 0.12);
    color: var(--purple-l);
    box-shadow: none;
    border: 1px solid var(--purple-d);
  }
  #lp-root .plan-cta.outline:hover {
    background: rgba(127, 119, 221, 0.22);
    transform: none;
    box-shadow: none;
  }

  /* ── TESTIMONIALS ── */
  #lp-root .testi {
    background: var(--surface);
  }
  /* BEFORE/AFTER比較リスト */
  #lp-root .ba-list {
    max-width: 880px;
    margin: 48px auto 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  #lp-root .ba-row {
    display: grid;
    grid-template-columns: 1fr 36px 1fr;
    grid-template-rows: auto auto;
    align-items: stretch;
    column-gap: 0;
    row-gap: 10px;
  }
  #lp-root .ba-panel {
    border-radius: 12px;
    padding: 18px 20px;
  }
  #lp-root .ba-panel.before {
    background: var(--surface);
    border: 1px solid var(--border-soft);
  }
  #lp-root .ba-panel.after {
    background: rgba(239, 159, 39, 0.08);
    border: 1px solid rgba(239, 159, 39, 0.4);
  }
  #lp-root .ba-label {
    font-family: var(--pixel);
    font-size: 11px;
    letter-spacing: 0.14em;
    margin-bottom: 8px;
  }
  #lp-root .ba-panel.before .ba-label {
    color: var(--faint);
  }
  #lp-root .ba-panel.after .ba-label {
    color: var(--amber);
  }
  #lp-root .ba-text {
    font-size: 14.5px;
    line-height: 1.7;
  }
  #lp-root .ba-panel.before .ba-text {
    color: var(--faint);
  }
  #lp-root .ba-panel.after .ba-text {
    color: var(--text);
    font-weight: 700;
  }
  #lp-root .ba-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--amber);
    font-size: 20px;
  }
  #lp-root .ba-who {
    grid-column: 1 / 4;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }
  #lp-root .ba-name {
    font-size: 13px;
    font-weight: 700;
  }
  #lp-root .ba-name span {
    display: block;
    font-size: 11.5px;
    color: var(--faint);
    font-weight: 400;
  }
  #lp-root .testi-av {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
  }

  /* ── FINAL CTA ── */
  #lp-root .final-cta {
    background: var(--bg);
    padding: 150px 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  #lp-root .final-cta::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse 60% 60% at 50% 50%,
      rgba(127, 119, 221, 0.16) 0%,
      transparent 70%
    );
    pointer-events: none;
  }
  #lp-root .final-cta-inner {
    position: relative;
    max-width: 720px;
    margin: 0 auto;
  }
  #lp-root .final-hud {
    font-family: var(--pixel);
    font-size: 14px;
    letter-spacing: 0.28em;
    color: var(--faint);
    margin-bottom: 26px;
  }
  #lp-root .final-hud::after {
    content: '▌';
    font-family: var(--pixel);
    font-size: 0.9em;
    color: var(--amber);
    animation: lpBlink 1.6s steps(2, start) infinite;
  }
  #lp-root .final-cta-title {
    font-family: var(--display);
    font-weight: 900;
    font-size: clamp(28px, 4.6vw, 54px);
    line-height: 1.32;
    margin-bottom: 24px;
  }
  #lp-root .final-cta-title .accent {
    color: var(--amber);
    text-shadow: 0 0 16px rgba(239, 159, 39, 0.28);
  }
  #lp-root .final-cta-sub {
    font-size: 16px;
    color: var(--muted);
    margin-bottom: 44px;
    line-height: 1.9;
  }
  #lp-root .final-cta .hero-btns {
    justify-content: center;
    animation: none;
  }

  /* ── FOOTER ── */
  #lp-root footer {
    background: var(--bg-2);
    border-top: 1px solid var(--border-soft);
    padding: 36px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }
  #lp-root .footer-logo {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  #lp-root .footer-icon {
    width: 28px;
    height: 28px;
    border-radius: 7px;
  }
  #lp-root .footer-name {
    font-size: 14px;
    font-weight: 700;
  }
  #lp-root .footer-name span {
    color: var(--amber);
  }
  #lp-root .footer-copy {
    font-family: var(--pixel);
    font-size: 12px;
    color: var(--faint);
  }
  #lp-root .footer-links {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  #lp-root .footer-links a {
    font-size: 12px;
    color: var(--muted);
    text-decoration: none;
    transition: color 0.2s ease;
  }
  #lp-root .footer-links a:hover {
    color: var(--purple-l);
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 1024px) {
    #lp-root .hero-hud {
      display: none;
    }
    #lp-root .hero {
      padding: 120px 28px 90px;
    }
  }
  @media (max-width: 768px) {
    #lp-root nav {
      padding: 0 14px;
      gap: 12px;
    }
    #lp-root .nav-logo {
      gap: 8px;
    }
    #lp-root nav .nav-links,
    #lp-root nav .nav-login {
      display: none;
    }
    #lp-root .nav-name {
      white-space: nowrap;
    }
    #lp-root .hero {
      padding: 104px 20px 76px;
    }
    #lp-root .hero-shell {
      grid-template-columns: 1fr;
      gap: 40px;
    }
    #lp-root .hero-copy {
      max-width: none;
      text-align: center;
    }
    #lp-root .hero-sub {
      margin-left: auto;
      margin-right: auto;
    }
    #lp-root .hero-btns {
      justify-content: center;
    }
    #lp-root .hero-board-wrap {
      max-width: 480px;
      margin: 0 auto;
      width: 100%;
    }
    #lp-root .board-toast.t1 {
      top: -14px;
      right: 4px;
    }
    #lp-root .board-toast.t2 {
      bottom: -14px;
      left: 4px;
    }
    /* チップの散らばりを縮小（ボード外へのはみ出し・横スクロール防止） */
    #lp-root .chaos-chip {
      font-size: 11px;
    }
    #lp-root .chaos-chip.c1 { --sx: -48px; --sy: -60px; }
    #lp-root .chaos-chip.c2 { --sx: 44px;  --sy: -80px; }
    #lp-root .chaos-chip.c3 { --sx: -52px; --sy: 56px; }
    #lp-root .chaos-chip.c4 { --sx: 42px;  --sy: 76px; }
    #lp-root .board-head {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    #lp-root .board-title {
      font-size: 16px;
      white-space: nowrap;
    }
    #lp-root .feature-block {
      grid-template-columns: 1fr;
    }
    #lp-root .feature-block.rev {
      direction: ltr;
    }
    #lp-root .problem-card {
      --tilt: 0deg;
    }
    #lp-root .plan-grid {
      grid-template-columns: 1fr;
    }
    #lp-root footer {
      justify-content: center;
      text-align: center;
    }
    #lp-root section {
      padding: 84px 20px;
    }
  }
  @media (max-width: 640px) {
    #lp-root .ba-row {
      grid-template-columns: 1fr;
      grid-template-rows: auto;
    }
    #lp-root .ba-arrow {
      transform: rotate(90deg);
    }
    #lp-root .ba-who {
      grid-column: auto;
    }
  }
  @media (max-width: 400px) {
    #lp-root .board-row {
      grid-template-columns: 40px 46px 1fr;
    }
    #lp-root .board-tag {
      display: none;
    }
  }

  /* ── REDUCED MOTION ── */
  @media (prefers-reduced-motion: reduce) {
    html:has(#lp-root) {
      scroll-behavior: auto;
    }
    #lp-root.lp-anim .fade-up:not(.is-visible),
    #lp-root.lp-anim .problem-card:not(.is-visible) {
      opacity: 1;
      transform: rotate(var(--tilt, 0deg));
      transition: none;
    }
    #lp-root .hero-badge,
    #lp-root .hero-title,
    #lp-root .hero-sub,
    #lp-root .hero-btns,
    #lp-root .hero-note,
    #lp-root .hero-board-wrap {
      animation: none;
    }
    #lp-root .board-toast,
    #lp-root .hud-rec i,
    #lp-root .hero-badge-dot {
      animation: none;
    }
    /* オープニング演出は再生しない（.playが付いた場合でも静的表示に固定） */
    #lp-root .hero-board-wrap.play .chaos-layer {
      display: none;
    }
    #lp-root .hero-board-wrap.play .board-row,
    #lp-root .hero-board-wrap.play .pixel-bar i.on,
    #lp-root .hero-board-wrap.play .board-toast {
      animation: none;
      opacity: 1;
      transform: none;
    }
    /* HUD起動・終幕グローも再生しない（.playが付いた場合でも静的表示に固定） */
    #lp-root .hero.play .hud-corner,
    #lp-root .hero.play .hud-top,
    #lp-root .hero.play .hud-bottom,
    #lp-root .hero.play .hero-title .gg {
      animation: none;
      opacity: 1;
    }
    #lp-root .ticker-track {
      animation: none;
    }
    /* マーカーは常時描画済み（後方定義の.mkルールに勝つよう詳細度を上げる） */
    html #lp-root .mk {
      transition: none;
    }
    html #lp-root.lp-anim .fade-up:not(.is-visible) .mk {
      background-size: 100% 100%;
    }
    /* 点滅カーソルは表示したまま点滅のみ停止・リスくんの揺れも停止 */
    #lp-root .final-hud::after,
    #lp-root .nav-logo:hover .nav-logo-icon svg {
      animation: none;
    }
  }

  /* デスクトップ用改行（モバイルでは自然な折り返しにする） */
  @media (max-width: 640px) {
    #lp-root .br-d {
      display: none;
    }
  }

  /* ── 強調システム: mk=マーカー / ptc=助詞縮小 / px-ul=ピクセル下線 ── */
  #lp-root .ptc {
    font-size: 0.68em;
    opacity: 0.85;
  }
  #lp-root .mk {
    padding: 0 2px;
    background-image: linear-gradient(
      transparent 60%,
      rgba(239, 159, 39, 0.32) 60%,
      rgba(239, 159, 39, 0.32) 94%,
      transparent 94%
    );
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-position: 0 0;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
    transition: background-size 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.4s;
  }
  /* スクロール到達前はマーカー未描画（fade-up配下のみ。ヒーローサブは常時表示） */
  #lp-root.lp-anim .fade-up:not(.is-visible) .mk {
    background-size: 0% 100%;
  }
  #lp-root .px-ul {
    padding-bottom: 10px;
    background: repeating-linear-gradient(90deg, var(--amber) 0 10px, transparent 10px 16px)
      left bottom / 100% 4px no-repeat;
  }
`;

const LP_HTML = `
    <!-- NAV -->
    <nav>
      <div class="nav-logo">
        <div class="nav-logo-icon">
          <svg width="22" height="22" viewBox="0 0 56 56" fill="none">
            <path d="M30 44 Q16 40 13 25 Q10 12 18 9 Q15 18 20 25 Q24 32 30 35 Q36 38 34 46Z" fill="#AFA9EC" opacity="0.8"/>
            <ellipse cx="32" cy="37" rx="11" ry="9" fill="#EEEDFE"/>
            <ellipse cx="33" cy="23" rx="9" ry="8" fill="#EEEDFE"/>
            <ellipse cx="27" cy="14" rx="3.5" ry="5" fill="#EEEDFE"/>
            <ellipse cx="27" cy="14" rx="2" ry="3" fill="#CECBF6"/>
            <ellipse cx="38" cy="12" rx="3.5" ry="5" fill="#EEEDFE"/>
            <ellipse cx="38" cy="12" rx="2" ry="3" fill="#CECBF6"/>
            <circle cx="30" cy="22" r="1.8" fill="#26215C"/>
            <circle cx="37" cy="22" r="1.8" fill="#26215C"/>
            <ellipse cx="33" cy="26" rx="1.5" ry="1" fill="#534AB7"/>
            <ellipse cx="28" cy="25" rx="2.5" ry="1.5" fill="#EF9F27" opacity="0.5"/>
            <ellipse cx="38" cy="25" rx="2.5" ry="1.5" fill="#EF9F27" opacity="0.5"/>
            <ellipse cx="33" cy="38" rx="3" ry="2" fill="#EF9F27" opacity="0.8"/>
          </svg>
        </div>
        <div class="nav-name">リスケる<span>GG</span></div>
      </div>
      <div class="nav-links">
        <a href="#features">できること</a>
        <a href="#usecases">活用例</a>
        <a href="#plan">料金</a>
      </div>
      <a href="/login" class="nav-login">ログイン</a>
      <a href="/login" class="nav-cta">無料で始める</a>
    </nav>

    <!-- HERO（配信待機画面モチーフ） -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-grid"></div>

      <div class="hero-hud" aria-hidden="true">
        <span class="hud-corner tl"></span>
        <span class="hud-corner tr"></span>
        <span class="hud-corner bl"></span>
        <span class="hud-corner br"></span>
        <div class="hud-top">
          <span class="hud-rec"><i></i>REC</span>
          <span class="hud-clock"><span id="hud-clock">--:--:--</span> JST</span>
        </div>
        <div class="hud-bottom">
          <span>SCHEDULE SYNC ... OK</span>
          <span>TEAM ONLINE 3/3</span>
        </div>
      </div>

      <div class="hero-shell">
        <div class="hero-copy">
          <div class="hero-badge">
            <span class="hero-badge-dot"></span>
            チャンネル運営とチーム連携を1か所で進めるアプリ
          </div>
          <h1 class="hero-title">
            <span class="br">配信前の連絡と調整<span class="ptc">を</span></span>
            <span class="br">ひとつにまとめて</span>
            <span class="br"><span class="gg">配信に集中</span><span class="ptc">できる</span>毎日へ</span>
          </h1>
          <p class="hero-sub">
            配信も、撮影も、動画づくりも、<br/>
            <strong>「毎日のやりとりを、<span class="mk">まるごと一つの場所</span>で管理したい！！——」</strong>
          </p>
          <div class="hero-btns">
            <a href="/login" class="btn-primary">無料で始める →</a>
            <a href="#features" class="btn-secondary">できることを見る</a>
          </div>
          <div class="hero-note">Googleアカウントで10秒で開始 ／ クレジットカード不要</div>
        </div>

        <div class="hero-board-wrap">
          <div class="hero-board">
            <div class="board-head">
              <div class="board-title">今週のスケジュール</div>
              <div class="board-week">WEEK 05.12-05.18</div>
            </div>
            <div class="board-rows">
              <div class="board-row">
                <div class="board-day">火<span>13</span></div>
                <div class="board-time">20:00</div>
                <div class="board-name">Apex ランク配信</div>
                <div class="board-tag tag-live">LIVE</div>
              </div>
              <div class="board-row">
                <div class="board-day">水<span>14</span></div>
                <div class="board-time">19:00</div>
                <div class="board-name">動画「4月まとめ」公開</div>
                <div class="board-tag tag-video">動画</div>
              </div>
              <div class="board-row is-collab">
                <div class="board-day">金<span>16</span></div>
                <div class="board-time">21:00</div>
                <div class="board-name">カズくんGames コラボ</div>
                <div class="board-tag tag-collab">✓ 確定</div>
              </div>
              <div class="board-row">
                <div class="board-day">土<span>17</span></div>
                <div class="board-time">15:00</div>
                <div class="board-name">メン限 雑談配信</div>
                <div class="board-tag tag-live">LIVE</div>
              </div>
            </div>
            <div class="board-foot">
              <div class="board-progress-label">今週のタスク <strong>7/9</strong> 完了</div>
              <div class="pixel-bar" aria-hidden="true">
                <i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i>
              </div>
            </div>
          </div>
          <div class="board-toast t1">✅ サムネイル3本 完了</div>
          <div class="board-toast t2">🤝 コラボの返答が届きました</div>
          <div class="chaos-layer" aria-hidden="true">
            <div class="chaos-chip c1">💬 DM「コラボ、いつにする？」</div>
            <div class="chaos-chip c2">💚 LINE「サムネまだ？」</div>
            <div class="chaos-chip c3">🎮 Discord「告知って誰が出す？」</div>
            <div class="chaos-chip c4">🧠「金曜なにかあった気が…」</div>
          </div>
        </div>
      </div>
    </section>

    <!-- TICKER -->
    <div class="ticker" aria-hidden="true">
      <div class="ticker-track" id="ticker-track">
        <span>✅ タスク「サムネイル3本」完了</span><span class="sep">▸▸</span>
        <span>🤝 コラボ確定 5/16 21:00 カズくんGames</span><span class="sep">▸▸</span>
        <span>🔴 LIVE開始30分前 リマインド送信</span><span class="sep">▸▸</span>
        <span>📅 今週の配信 4枠 登録済み</span><span class="sep">▸▸</span>
        <span>✉ コラボ候補日 3件 送信済み</span><span class="sep">▸▸</span>
        <span>🎬 動画「4月まとめ」編集 進行中</span><span class="sep">▸▸</span>
      </div>
    </div>

    <!-- PROBLEM -->
    <section class="problem" id="problem">
      <div class="section-inner">
        <div class="section-eyebrow fade-up">▸ 心当たり、ありませんか</div>
        <h2 class="section-title fade-up delay-100">活動の幅<span class="ptc">が</span>広がるほど<br/><span class="mk">管理の手間</span><span class="ptc">が</span>積み上がる</h2>
        <p class="section-sub fade-up delay-200">活動以外の、確認と共有と調整で疲弊する。<br class="br-d"/>そんな毎日を、まとめて片づけます。</p>
        <div class="problem-grid">
          <div class="problem-card" style="--tilt: -1.1deg">
            <div class="problem-meta"><span class="app-chip">📅 予定</span></div>
            <div class="problem-head">情報が散乱してしまう</div>
            <div class="problem-text">Googleカレンダー、Discord、DM、メモ帳。散らばるほど、最新の情報を持っているのが誰なのか分からなくなる。</div>
          </div>
          <div class="problem-card" style="--tilt: 0.9deg">
            <div class="problem-meta"><span class="app-chip">🎬 依頼</span></div>
            <div class="problem-head">タスクの依頼をよく忘れる</div>
            <div class="problem-text">編集、サムネ、概要欄、切り抜きの確認。小さな依頼ほどDMの奥に沈んで、担当漏れや締切のズレが生まれます。</div>
          </div>
          <div class="problem-card" style="--tilt: 1.2deg">
            <div class="problem-meta"><span class="app-chip">🤝 調整</span></div>
            <div class="problem-head">コラボ日程の確定までが長い</div>
            <div class="problem-text">候補日を出して、返事を待って、決まったら別ツールへ転記する。この地味な往復が、じわじわ効いてくる。</div>
          </div>
          <div class="problem-card" style="--tilt: -0.8deg">
            <div class="problem-meta"><span class="app-chip">🔔 告知</span></div>
            <div class="problem-head">誰かが覚えている前提に…</div>
            <div class="problem-text">告知も配信前チェックも、気づけば個人の記憶が頼り。忙しい週ほど、どこかが抜けます。</div>
          </div>
        </div>
        <div class="problem-arrow fade-up delay-300">
          <div class="line"></div>
          <div class="label">リスケるGGなら「配信前の管理」をひとまとめに 🐿️</div>
          <div class="line"></div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="features" id="features">
      <div class="section-inner">
        <div class="section-eyebrow fade-up">▸ できること</div>
        <h2 class="section-title fade-up delay-100">チャンネル運営<span class="ptc">に</span><span class="mk">必要な機能</span><span class="ptc">を</span><br/>最低限サポート</h2>
        <p class="section-sub fade-up delay-200">ユースケースごとに機能を整備。<br class="br-d"/>配信も撮影も動画制作も、いつもの流れのままに。</p>
        <div class="feature-blocks">
          <!-- SCENE 01 -->
          <div class="feature-block fade-up">
            <div class="feat-ghost" aria-hidden="true">01</div>
            <div>
              <div class="feat-label"><span class="scene-no">SCENE 01</span>活用シーン</div>
              <h3 class="feat-title">今週の動き<span class="ptc">が</span>、<span class="mk">全員に見える</span></h3>
              <p class="feat-desc">配信、収録、コラボ、撮影日をひとつのカレンダーへ。<br class="br-d"/>登録すれば、編集者もマネージャーも<strong>同じ画面</strong>を見ています。<br class="br-d"/>「今週どこが動くの？」の説明は、もう要りません。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>配信日・コラボ日・撮影日を色分けしてひと目で整理</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>登録した予定は全員にすぐ共有</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>週・月表示で直近も全体も見渡せる</div>
              </div>
            </div>
            <div class="feat-visual">
              <div class="fv-header"><span>📅 スケジュール</span><span class="fv-badge badge-purple">5月 第3週</span></div>
              <div class="feat-shot"><img src="/lp-feat-schedule.png" alt="リスケるGGのスケジュール画面。配信・収録・コラボの予定を週表示カレンダーで色分け表示している" loading="lazy" /></div>
              <!-- ▼ 旧CSSモック（復帰用に保存）。実画像へ差し替え済み。
              <div class="cal-mock">
                <div class="cal-week"><div class="cal-wday">月</div><div class="cal-wday">火</div><div class="cal-wday">水</div><div class="cal-wday">木</div><div class="cal-wday">金</div><div class="cal-wday">土</div><div class="cal-wday">日</div></div>
                <div class="cal-week">
                  <div class="cal-wcell"><div class="cal-cell-date">11</div><div class="cal-event ev-purple">LIVE配信</div></div>
                  <div class="cal-wcell today"><div class="cal-cell-date">12</div><div class="cal-event ev-live">🔴 LIVE中</div><div class="cal-event ev-amber">コラボMTG</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">13</div><div class="cal-event ev-amber">撮影</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">14</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">15</div><div class="cal-event ev-purple">LIVE配信</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">16</div><div class="cal-event ev-green">コラボ確定</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">17</div></div>
                </div>
              </div>
              -->
            </div>
          </div>
          <!-- SCENE 02 -->
          <div class="feature-block rev fade-up">
            <div class="feat-ghost" aria-hidden="true">02</div>
            <div>
              <div class="feat-label"><span class="scene-no">SCENE 02</span>活用シーン</div>
              <h3 class="feat-title">コラボ調整<span class="ptc">を</span>、<span class="mk">迷子にしない</span></h3>
              <p class="feat-desc">候補日を送る。返事が来る。決まったら予定に<strong>自動で反映</strong>。<br class="br-d"/>DMを遡る時間も、転記も、もう要らない。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>候補日を送って、相手はワンタップで返答</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>確定はそのまま予定に反映</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>履歴が残るから「どこまで決まったか」で迷わない</div>
              </div>
            </div>
            <div class="feat-visual">
              <div class="fv-header"><span>🤝 コラボ調整</span><span class="fv-badge badge-amber">2件 返答待ち</span></div>
              <div class="collab-mock">
                <div class="collab-card"><div class="collab-av av-live">KZ</div><div class="collab-info"><div class="collab-name">カズくんGames</div><div class="collab-date">Apex コラボ希望 — 5/18 20:00〜</div></div><div class="collab-btn-row"><button class="c-btn c-ok" type="button">OK</button><button class="c-btn c-ng" type="button">NG</button></div></div>
                <div class="collab-card"><div class="collab-av av-purple">HN</div><div class="collab-info"><div class="collab-name">ひなたch</div><div class="collab-date">雑談コラボ — 5/20 or 5/21</div></div><div class="collab-btn-row"><button class="c-btn c-ok" type="button">OK</button><button class="c-btn c-ng" type="button">NG</button></div></div>
                <div class="collab-card is-done"><div class="collab-av av-green">PK</div><div class="collab-info"><div class="collab-name">ぺこらch</div><div class="collab-date">確定済 — 5/22 21:00〜</div></div><div class="collab-fixed">✓ 確定</div></div>
              </div>
              <!-- ▼ ユーザー撮影後: 上の .collab-mock を削除し、下のコメントを解除する（画像は public/lp-feat-collab.png に配置） -->
              <!-- <div class="feat-shot"><img src="/lp-feat-collab.png" alt="リスケるGGのコラボ調整画面。返答待ちのコラボ依頼を一覧で管理している" loading="lazy" /></div> -->
            </div>
          </div>
          <!-- SCENE 03 -->
          <div class="feature-block fade-up">
            <div class="feat-ghost" aria-hidden="true">03</div>
            <div>
              <div class="feat-label"><span class="scene-no">SCENE 03</span>活用シーン</div>
              <h3 class="feat-title"><span class="mk">わざわざ聞かなくても</span>共有できる</h3>
              <p class="feat-desc">編集、切り抜き、サムネ、概要欄。小さい作業ほど数が多い。<br class="br-d"/>ボードに並べれば、「あれどうなってる？」を<strong>聞かずに済みます</strong>。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>「やること」「進行中」「完了」で作業状況を共有</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>担当と締切をセットで依頼</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>完了は通知でお知らせ</div>
              </div>
            </div>
            <div class="feat-visual">
              <div class="fv-header"><span>▤ タスクボード</span></div>
              <div class="feat-shot"><img src="/lp-feat-tasks.png" alt="リスケるGGのタスク画面。編集・サムネ・告知タスクをカンバン形式で管理している" loading="lazy" /></div>
              <!-- ▼ 旧CSSモック（復帰用に保存）。実画像へ差し替え済み。
              <div class="kb-mock">
                <div>
                  <div class="kb-col-h">TODO</div>
                  <div class="kb-c"><div class="kb-c-title">概要欄テンプレ更新</div><div class="kb-c-foot"><div class="kb-av av-purple">RK</div><div class="kb-due">5/14</div></div></div>
                  <div class="kb-c"><div class="kb-c-title">Shorts台本 3本</div><div class="kb-c-foot"><div class="kb-av av-amber">TK</div><div class="kb-due">5/16</div></div></div>
                </div>
                <div>
                  <div class="kb-col-h h-amber">進行中</div>
                  <div class="kb-c is-doing"><div class="kb-c-title">4月振り返り動画 編集</div><div class="kb-c-foot"><div class="kb-av av-green">SA</div><div class="kb-due">5/13</div></div></div>
                  <div class="kb-c is-doing"><div class="kb-c-title">サムネイル 3本</div><div class="kb-c-foot"><div class="kb-av av-amber">MG</div><div class="kb-due">5/12</div></div></div>
                </div>
                <div>
                  <div class="kb-col-h h-green">完了</div>
                  <div class="kb-c is-done"><div class="kb-c-title">先週LIVE アーカイブ公開</div><div class="kb-c-foot"><div class="kb-av av-purple">RK</div><div class="kb-due">5/11</div></div></div>
                  <div class="kb-c is-done"><div class="kb-c-title">Short素材 撮影 2本</div><div class="kb-c-foot"><div class="kb-av av-purple">RK</div><div class="kb-due">5/12</div></div></div>
                </div>
              </div>
              -->
            </div>
          </div>
          <!-- SCENE 04 -->
          <div class="feature-block rev fade-up">
            <div class="feat-ghost" aria-hidden="true">04</div>
            <div>
              <div class="feat-label"><span class="scene-no">SCENE 04</span>活用シーン</div>
              <h3 class="feat-title">抜け漏れ<span class="ptc">は</span>、<span class="mk">通知が拾う</span></h3>
              <p class="feat-desc">LIVE前のリマインダーも、コラボの返答も、タスクの完了も。<br class="br-d"/><strong>通知が拾ってくれる</strong>から、「誰かが覚えているはず」に頼らずに済みます。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>LIVE開始前に自動リマインダー</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>コラボ返答・タスク完了を即通知 ※</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>ホーム画面に追加していつでも確認</div>
              </div>
            </div>
            <div class="feat-visual">
              <div class="fv-header"><span>🔔 通知センター</span><span class="fv-badge badge-live">3件 未読</span></div>
              <div class="notif-mock">
                <div class="notif-row"><div class="notif-icon">🔴</div><div><div class="notif-text"><strong>LIVE開始まで1時間</strong>です。配信タイトルを確認しましょう。</div><div class="notif-time">19:00 に通知予定</div></div></div>
                <div class="notif-row"><div class="notif-icon">🤝</div><div><div class="notif-text"><strong>カズくんGames</strong> からコラボ打診が届きました。</div><div class="notif-time">2時間前</div></div></div>
                <div class="notif-row"><div class="notif-icon">✅</div><div><div class="notif-text">タスク「サムネイルデザイン」が<strong>完了</strong>しました。</div><div class="notif-time">3時間前</div></div></div>
                <div class="notif-row is-read"><div class="notif-icon">📅</div><div><div class="notif-text"><strong>明日 20:00</strong> にLIVE配信が予定されています。</div><div class="notif-time">昨日</div></div></div>
              </div>
              <!-- ▼ ユーザー撮影後: 上の .notif-mock を削除し、下のコメントを解除する（画像は public/lp-feat-notify.png に配置） -->
              <!-- <div class="feat-shot"><img src="/lp-feat-notify.png" alt="リスケるGGの通知画面。LIVEリマインダーやコラボ返答・タスク完了の通知が届く" loading="lazy" /></div> -->
            </div>
          </div>
        </div>
        <p class="section-note fade-up">※ コラボ返答・タスク完了の通知はPARTYプランの機能です。LIVEリマインダーは全プランで使えます。</p>
      </div>
    </section>

    <!-- USECASES -->
    <section class="usecases" id="usecases">
      <div class="section-inner">
        <div class="section-eyebrow fade-up">▸ 活用例</div>
        <h2 class="section-title fade-up delay-100">あなたのチーム<span class="ptc">なら、</span><br/><span class="mk">こう使える</span></h2>
        <div class="usecase-grid">
          <div class="usecase-card fade-up delay-100">
            <div class="usecase-label">個人配信者</div>
            <div class="usecase-title">配信・撮影・告知を<br/>ひとりでも整理しやすい</div>
            <div class="usecase-points">
              <div class="usecase-point">配信・収録・告知を1か所に</div>
              <div class="usecase-point">頭の中の予定を見える化</div>
              <div class="usecase-point">今週やることを時系列で確認</div>
              <div class="usecase-point">公開作業の抜け漏れを防ぐ</div>
            </div>
          </div>
          <div class="usecase-card fade-up delay-200">
            <div class="usecase-label">配信者 + 編集者</div>
            <div class="usecase-title">依頼と締切を明文化して<br/>確認コストを減らせる</div>
            <div class="usecase-points">
              <div class="usecase-point">編集・サムネの依頼をタスク化</div>
              <div class="usecase-point">担当と締切をセットで共有</div>
              <div class="usecase-point">「これお願いしたっけ？」が消える</div>
              <div class="usecase-point">進捗確認のDM往復を削減</div>
            </div>
          </div>
          <div class="usecase-card fade-up delay-100">
            <div class="usecase-label">コラボ多めの配信者</div>
            <div class="usecase-title">候補日提示から確定までを<br/>迷わず進めやすい</div>
            <div class="usecase-points">
              <div class="usecase-point">複数のコラボ調整を一覧で把握</div>
              <div class="usecase-point">返答待ちをまとめて確認</div>
              <div class="usecase-point">確定したらそのまま予定へ反映</div>
            </div>
          </div>
          <div class="usecase-card fade-up delay-200">
            <div class="usecase-label">マネージャー同席チーム</div>
            <div class="usecase-title">本人・運営・制作が<br/>同じ予定表を見て動ける</div>
            <div class="usecase-points">
              <div class="usecase-point">全員が同じ予定表を見て動ける</div>
              <div class="usecase-point">日程確認が誰かに集中しない</div>
              <div class="usecase-point">配信前の確認をチームで補える</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="how" id="how">
      <div class="section-inner">
        <div class="section-eyebrow fade-up">▸ 使い方</div>
        <h2 class="section-title fade-up delay-100">始め方<span class="ptc">は</span><span class="mk">シンプル</span>。<br/>使い始めた瞬間<span class="ptc">に</span>整理が進む</h2>
        <div class="how-map fade-up delay-200">
          <div class="how-phase phase-solo"><span class="phase-tag">SOLO</span>ひとりで始める</div>
          <div class="how-card sc">
            <div class="hc-num">STEP 1</div>
            <div class="hc-body"><div class="hc-title">Googleでログイン</div><div class="hc-sub">10秒で完了</div></div>
          </div>
          <div class="how-card sc">
            <div class="hc-num">STEP 2</div>
            <div class="hc-body"><div class="hc-title">予定とタスクを登録</div><div class="hc-sub">配信・撮影・公開日を1か所に</div></div>
          </div>
          <div class="how-card sc">
            <div class="hc-num">STEP 3</div>
            <div class="hc-body"><div class="hc-title">コラボもここで調整</div><div class="hc-sub">確定したら自動反映</div></div>
          </div>
          <div class="how-phase phase-team"><span class="phase-tag">TEAM</span>チームに広げる</div>
          <div class="how-card tc">
            <div class="hc-num">STEP 4</div>
            <div class="hc-body"><div class="hc-title">チームを作成</div><div class="hc-sub">チーム名を入れるだけ</div></div>
          </div>
          <div class="how-card tc">
            <div class="hc-num">STEP 5</div>
            <div class="hc-body"><div class="hc-title">コードで招待</div><div class="hc-sub">入力だけで参加完了</div></div>
          </div>
          <div class="how-card tc">
            <div class="hc-num">STEP 6</div>
            <div class="hc-body"><div class="hc-title">担当を割り振る</div><div class="hc-sub">担当と締切をセット</div></div>
          </div>
          <div class="how-card tc">
            <div class="hc-num">STEP 7</div>
            <div class="hc-body"><div class="hc-title">あとは本番に集中</div><div class="hc-sub">進捗と通知はおまかせ</div></div>
          </div>
        </div>
      </div>
    </section>

    <!-- PLAN -->
    <section class="plan" id="plan">
      <div class="plan-inner">
        <div class="plan-head">
          <div class="section-eyebrow fade-up">▸ PLAN SELECT ─ 料金プラン</div>
          <h2 class="section-title fade-up delay-100"><span class="mk">2つのプラン</span><span class="ptc">で</span><br/>どんなチーム<span class="ptc">にも</span>対応</h2>
          <p class="section-sub fade-up delay-200">まずは無料で、自分の整理から。<br class="br-d"/>チームのやりとりが増えてきたら、そのとき広げれば十分です。</p>
        </div>
        <div class="plan-grid">
          <div class="plan-card fade-up delay-100">
            <div class="plan-name latin">LIGHT</div>
            <div class="plan-price">¥0 <span>/ 月</span></div>
            <div class="plan-note">クレジットカード不要・ずっと無料</div>
            <div class="plan-items">
              <div class="plan-item">メンバー 2人まで</div>
              <div class="plan-item">スケジュール登録 無制限</div>
              <div class="plan-item">タスク 月5件まで</div>
              <div class="plan-item">コラボ調整 月3件まで</div>
              <div class="plan-item">LIVEリマインダー通知</div>
              <div class="plan-item">スマホ・PC 両対応</div>
            </div>
            <div class="plan-flag flag-warn">⚠️ 広告・告知枠あり</div>
            <a href="/login" class="plan-cta outline">無料で始める →</a>
          </div>
          <div class="plan-card pro fade-up delay-200">
            <div class="plan-reco">おすすめ</div>
            <div class="plan-name latin">PARTY</div>
            <div class="plan-price">¥500 <span>/ 人・月</span></div>
            <div class="plan-note">14日間無料トライアル</div>
            <div class="plan-items">
              <div class="plan-item">メンバー 無制限</div>
              <div class="plan-item">スケジュール登録 無制限</div>
              <div class="plan-item">タスク 無制限</div>
              <div class="plan-item">コラボ調整 無制限</div>
              <div class="plan-item">全通知（コラボ返答・タスク更新）</div>
              <div class="plan-item">スマホ・PC 両対応</div>
            </div>
            <div class="plan-flag flag-ok">✓ 広告なし</div>
            <a href="/login" class="plan-cta">14日無料で試す →</a>
          </div>
        </div>
        <p class="section-note fade-up">※ PARTYは申し込みから14日間、全機能を無料でお試しできます。トライアル中に解約すれば料金はかかりません。<br class="br-d"/>※ PARTYの料金はメンバーそれぞれが自分の分（¥500/月）を支払います。チームまとめ払いはありません。</p>
      </div>
    </section>

    <!-- TESTIMONIALS -->
    <section class="testi">
      <div class="section-inner">
        <div class="section-eyebrow fade-up">▸ 導入後の変化</div>
        <h2 class="section-title fade-up delay-100">使いはじめて、<br/><span class="mk">何が変わったか</span></h2>
        <div class="ba-list">
          <div class="ba-row fade-up delay-100">
            <div class="ba-panel before"><div class="ba-label">BEFORE</div><div class="ba-text">コラボの日程調整はDMで延々と往復</div></div>
            <div class="ba-arrow" aria-hidden="true">▸</div>
            <div class="ba-panel after"><div class="ba-label">AFTER</div><div class="ba-text">相手はOKをタップするだけ。断然スムーズ</div></div>
            <div class="ba-who"><div class="testi-av av-live">KZ</div><div class="ba-name">カズくんGames<span>Twitch配信者 / フォロワー4.2万</span></div></div>
          </div>
          <div class="ba-row fade-up delay-200">
            <div class="ba-panel before"><div class="ba-label">BEFORE</div><div class="ba-text">編集スタッフとのやりとりでLINEの未読が山積み</div></div>
            <div class="ba-arrow" aria-hidden="true">▸</div>
            <div class="ba-panel after"><div class="ba-label">AFTER</div><div class="ba-text">やりとりはアプリで完結。配信に集中できる</div></div>
            <div class="ba-who"><div class="testi-av av-purple">HN</div><div class="ba-name">ひなたch<span>YouTube配信者 / 登録者1.8万</span></div></div>
          </div>
          <div class="ba-row fade-up delay-300">
            <div class="ba-panel before"><div class="ba-label">BEFORE</div><div class="ba-text">「今週どうする？」とSlackで毎週聞かれる</div></div>
            <div class="ba-arrow" aria-hidden="true">▸</div>
            <div class="ba-panel after"><div class="ba-label">AFTER</div><div class="ba-text">マネージャーと同じ予定表。聞かれることがなくなった</div></div>
            <div class="ba-who"><div class="testi-av av-green">RN</div><div class="ba-name">レイノスゲーム<span>YouTube / Twitch配信者 / 登録者8.6万</span></div></div>
          </div>
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="final-cta">
      <div class="final-cta-inner">
        <div class="final-hud" aria-hidden="true">READY TO STREAM ?</div>
        <h2 class="final-cta-title fade-up">管理のための時間<span class="ptc">を</span>減らして<br/><span class="accent px-ul">配信に集中</span>しよう</h2>
        <p class="final-cta-sub fade-up delay-100">細かい管理はこちらに任せて、あなたとチームは本番へ。</p>
        <div class="hero-btns fade-up delay-200">
          <a href="/login" class="btn-primary">無料で始める →</a>
          <a href="#usecases" class="btn-secondary">活用例をもっと見る</a>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer>
      <div class="footer-logo">
        <div class="nav-logo-icon footer-icon">
          <svg width="18" height="18" viewBox="0 0 56 56" fill="none">
            <ellipse cx="32" cy="37" rx="11" ry="9" fill="#EEEDFE"/>
            <ellipse cx="33" cy="23" rx="9" ry="8" fill="#EEEDFE"/>
            <ellipse cx="27" cy="14" rx="3.5" ry="5" fill="#EEEDFE"/>
            <ellipse cx="38" cy="12" rx="3.5" ry="5" fill="#EEEDFE"/>
            <circle cx="30" cy="22" r="1.8" fill="#26215C"/>
            <circle cx="37" cy="22" r="1.8" fill="#26215C"/>
            <ellipse cx="33" cy="38" rx="3" ry="2" fill="#EF9F27" opacity="0.8"/>
          </svg>
        </div>
        <div class="footer-name">リスケる<span>GG</span></div>
      </div>
      <div class="footer-links">
        <a href="/terms">利用規約</a>
        <a href="/privacy-policy">プライバシーポリシー</a>
        <a href="/tokushoho">特定商取引法に基づく表記</a>
      </div>
      <div class="footer-copy">© 2026 リスケるGG — 撮影も、コラボも、編集もGGなスケジュールを</div>
    </footer>
`;

const LP_SCRIPT = `
(() => {
  const root = document.getElementById('lp-root');
  if (!root || root.dataset.lpInit) return;
  root.dataset.lpInit = '1';

  /* アニメーション有効化フラグ（JS無効環境ではCSSが常時表示のまま） */
  if ('IntersectionObserver' in window) {
    root.classList.add('lp-anim');
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px', threshold: 0.15 }
    );
    root.querySelectorAll('.fade-up, .problem-card').forEach((elem) => {
      observer.observe(elem);
    });
  }

  /* ヒーロー演出（カオス→整列＋HUD起動＋終幕グロー、reduced-motion時は再生しない） */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const boardWrap = root.querySelector('.hero-board-wrap');
    if (boardWrap) boardWrap.classList.add('play');
    const hero = root.querySelector('.hero');
    if (hero) hero.classList.add('play');
  }

  /* HUD時計（JST） */
  const clock = document.getElementById('hud-clock');
  if (clock) {
    const tick = () => {
      clock.textContent = new Date().toLocaleTimeString('ja-JP', {
        hour12: false,
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ティッカーをシームレスにループさせるため内容を複製 */
  const track = document.getElementById('ticker-track');
  if (track) {
    track.innerHTML += track.innerHTML;
  }
})();
`;

export default function LandingPage() {
  return (
    <div
      className={`${zenKakuGothicNew.variable} ${mPlus1.variable} ${dotGothic16.variable}`}
    >
      <style dangerouslySetInnerHTML={{ __html: LP_CSS }} />
      <div id="lp-root" dangerouslySetInnerHTML={{ __html: LP_HTML }} />
      <Script id="lp-init" strategy="afterInteractive">
        {LP_SCRIPT}
      </Script>
    </div>
  );
}
