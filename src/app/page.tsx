import type { Metadata } from 'next';
import { Dela_Gothic_One, Zen_Kaku_Gothic_New } from 'next/font/google';

export const metadata: Metadata = {
  title: 'リスケるGG — 配信者・チームのスケジュール管理アプリ',
  description: '配信スケジュール・コラボ調整・タスク管理を一元化。配信者とチームのための専用スケジュール管理アプリ。',
};

const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700', '900'],
  variable: '--font-zen-kaku-gothic-new',
  preload: false,
});

const delaGothicOne = Dela_Gothic_One({
  weight: '400',
  variable: '--font-dela-gothic-one',
  preload: false,
});

const LP_CSS = `
  :root {
    /* ── Material Design 3 Dark Color System ── */
    /* Surface hierarchy */
    --bg: #090916;
    --surface: #0f0f22;
    --surface-v: #161630;
    --card: #1c1c3e;
    --card-hi: #21214a;
    --border: #2c2c5c;
    --border-v: #1e1e48;

    /* Primary — violet/purple */
    --primary: #c5bfff;
    --primary-c: #3d31b4;
    --on-primary: #0a0071;
    --on-primary-c: #e4dfff;
    --purple: #9b95f5;
    --purple-l: #c5bfff;
    --purple-d: #3d31b4;

    /* Secondary — warm amber */
    --secondary: #f9be5a;
    --secondary-c: #7c4b00;
    --on-secondary: #3e2400;
    --on-secondary-c: #ffddb8;
    --amber: #f9be5a;
    --amber-l: #fddfa0;
    --amber-d: #9c5e00;

    /* Tertiary — teal green */
    --green: #4ddaae;
    --green-c: #005140;

    /* Error / live */
    --live: #ff6b8a;
    --live-c: #7a001e;

    /* Text */
    --text: #eaeaff;
    --text-v: #b8b8e0;
    --muted: #6e6e9e;

    /* Elevation tokens (MD3-style tonal + shadow) */
    --elev-1: 0 1px 3px rgba(0,0,0,.35), 0 2px 6px rgba(0,0,0,.2);
    --elev-2: 0 2px 8px rgba(0,0,0,.4),  0 4px 16px rgba(0,0,0,.28);
    --elev-3: 0 4px 16px rgba(0,0,0,.45), 0 8px 32px rgba(0,0,0,.32);
    --elev-4: 0 8px 32px rgba(0,0,0,.5),  0 16px 56px rgba(0,0,0,.38);

    /* Shape scale (MD3) */
    --r-xs: 4px;
    --r-sm: 8px;
    --r-md: 12px;
    --r-lg: 16px;
    --r-xl: 24px;
    --r-2xl: 28px;
    --r-full: 100px;
  }

  #lp-root * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  #lp-root {
    font-family: var(--font-zen-kaku-gothic-new), sans-serif;
    background: var(--bg);
    color: var(--text);
    overflow-x: hidden;
    min-height: 100vh;
  }

  /* ── NAV ── */
  #lp-root nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    height: 64px;
    background: rgba(9, 9, 22, 0.88);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-v);
    display: flex;
    align-items: center;
    padding: 0 36px;
    gap: 24px;
  }
  #lp-root .nav-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    text-decoration: none;
  }
  #lp-root .nav-logo-icon {
    width: 36px; height: 36px;
    background: var(--primary-c);
    border-radius: var(--r-md);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 16px rgba(61, 49, 180, .4);
  }
  #lp-root .nav-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
  }
  #lp-root .nav-name span { color: var(--amber); }
  #lp-root .nav-links {
    display: flex;
    gap: 28px;
  }
  #lp-root .nav-links a {
    font-size: 13px;
    color: var(--muted);
    text-decoration: none;
    letter-spacing: .02em;
    transition: color .15s;
    padding: 4px 0;
    border-bottom: 1.5px solid transparent;
    transition: color .15s, border-color .15s;
  }
  #lp-root .nav-links a:hover {
    color: var(--text);
    border-bottom-color: var(--primary);
  }
  #lp-root .nav-login {
    font-size: 13px;
    color: var(--text-v);
    text-decoration: none;
    padding: 8px 16px;
    border-radius: var(--r-full);
    border: 1px solid var(--border);
    transition: color .15s, border-color .15s, background .15s;
    white-space: nowrap;
    letter-spacing: .02em;
  }
  #lp-root .nav-login:hover {
    color: var(--text);
    border-color: var(--primary);
    background: rgba(197, 191, 255, .06);
  }
  /* MD3 Filled button */
  #lp-root .nav-cta {
    background: var(--amber);
    color: #1a0800;
    border: none;
    border-radius: var(--r-full);
    font-size: 13px;
    font-weight: 700;
    padding: 9px 22px;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: .04em;
    transition: background .15s, box-shadow .15s;
    white-space: nowrap;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    box-shadow: var(--elev-1);
  }
  #lp-root .nav-cta:hover {
    background: var(--amber-l);
    box-shadow: var(--elev-2);
  }

  /* ── HERO ── */
  #lp-root .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 112px 24px 88px;
    overflow: hidden;
    text-align: center;
  }
  #lp-root .hero-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 70% 55% at 50% 15%, rgba(61,49,180,.22) 0%, transparent 60%),
      radial-gradient(ellipse 45% 40% at 80% 80%, rgba(249,190,90,.10) 0%, transparent 50%),
      radial-gradient(ellipse 30% 30% at 15% 70%, rgba(77,218,174,.07) 0%, transparent 50%);
    pointer-events: none;
  }
  #lp-root .hero-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(197,191,255,.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(197,191,255,.05) 1px, transparent 1px);
    background-size: 64px 64px;
    pointer-events: none;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent);
    -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent);
  }
  #lp-root .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(61, 49, 180, .18);
    border: 1px solid rgba(197, 191, 255, .28);
    border-radius: var(--r-full);
    padding: 6px 18px;
    font-size: 12px;
    font-weight: 500;
    color: var(--purple-l);
    margin-bottom: 32px;
    letter-spacing: .03em;
    animation: fadeUp .6s ease both;
  }
  #lp-root .hero-badge-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--live);
    animation: pulse 1.4s infinite;
    flex-shrink: 0;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: .4; transform: scale(.8); }
  }
  #lp-root .hero-title {
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: clamp(38px, 7.5vw, 84px);
    line-height: 1.05;
    letter-spacing: -.02em;
    margin-bottom: 24px;
    animation: fadeUp .7s .1s ease both;
  }
  #lp-root .hero-title .gg { color: var(--amber); }
  #lp-root .hero-title .br { display: block; }
  #lp-root .hero-sub {
    font-size: clamp(15px, 2.4vw, 20px);
    color: var(--text-v);
    max-width: 600px;
    line-height: 1.75;
    margin-bottom: 44px;
    animation: fadeUp .7s .2s ease both;
  }
  #lp-root .hero-sub strong { color: var(--text); font-weight: 600; }
  #lp-root .hero-btns {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
    animation: fadeUp .7s .3s ease both;
    margin-bottom: 72px;
  }
  /* MD3 Filled button */
  #lp-root .btn-primary {
    background: var(--amber);
    color: #1a0800;
    border: none;
    border-radius: var(--r-full);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    font-weight: 700;
    padding: 14px 36px;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: .04em;
    transition: background .15s, box-shadow .15s, transform .1s;
    box-shadow: 0 4px 16px rgba(249,190,90,.35), var(--elev-2);
  }
  #lp-root .btn-primary:hover {
    background: var(--amber-l);
    box-shadow: 0 6px 24px rgba(249,190,90,.5), var(--elev-3);
    transform: translateY(-1px);
  }
  /* MD3 Tonal button */
  #lp-root .btn-secondary {
    background: rgba(61, 49, 180, .18);
    color: var(--purple-l);
    border: 1px solid rgba(197, 191, 255, .28);
    border-radius: var(--r-full);
    font-size: 15px;
    font-weight: 600;
    padding: 14px 36px;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: .03em;
    transition: background .15s, border-color .15s, transform .1s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  #lp-root .btn-secondary:hover {
    background: rgba(61, 49, 180, .28);
    border-color: rgba(197, 191, 255, .45);
    transform: translateY(-1px);
  }

  /* ── Hero mockup ── */
  #lp-root .hero-mockup {
    width: min(780px, 100%);
    background: var(--surface-v);
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    overflow: hidden;
    box-shadow:
      0 48px 120px rgba(0,0,0,.65),
      0 0 0 1px var(--border-v),
      0 -1px 0 rgba(197,191,255,.08) inset;
    animation: fadeUp .8s .4s ease both;
  }
  #lp-root .mockup-bar {
    height: 38px;
    background: var(--card);
    border-bottom: 1px solid var(--border-v);
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 7px;
  }
  #lp-root .mockup-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
  }
  #lp-root .mockup-url {
    flex: 1;
    margin: 0 12px;
    background: var(--surface);
    border: 1px solid var(--border-v);
    border-radius: var(--r-sm);
    height: 22px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    font-size: 10px;
    color: var(--muted);
    letter-spacing: .02em;
  }
  #lp-root .mockup-body {
    display: grid;
    grid-template-columns: 180px 1fr;
    height: 360px;
  }
  #lp-root .mock-sidebar {
    background: var(--card);
    border-right: 1px solid var(--border-v);
    padding: 16px 0;
  }
  #lp-root .mock-s-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 14px 14px;
    border-bottom: 1px solid var(--border-v);
    margin-bottom: 10px;
  }
  #lp-root .mock-s-icon {
    width: 28px; height: 28px;
    background: var(--primary-c);
    border-radius: var(--r-sm);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #lp-root .mock-s-name { font-size: 12px; font-weight: 700; }
  #lp-root .mock-s-name span { color: var(--amber); }
  #lp-root .mock-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 8px;
  }
  #lp-root .mock-nav-item {
    padding: 7px 10px;
    border-radius: var(--r-full);
    font-size: 11px;
    color: var(--muted);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #lp-root .mock-nav-item.active {
    background: rgba(61, 49, 180, .22);
    color: var(--purple-l);
  }
  #lp-root .mock-content { padding: 16px; overflow: hidden; }
  #lp-root .mock-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }
  #lp-root .mock-stat {
    background: var(--card);
    border: 1px solid var(--border-v);
    border-radius: var(--r-md);
    padding: 10px 12px;
  }
  #lp-root .mock-stat-l { font-size: 9px; color: var(--muted); margin-bottom: 4px; }
  #lp-root .mock-stat-v { font-size: 18px; font-weight: 700; }
  #lp-root .mock-2col {
    display: grid;
    grid-template-columns: 1fr 140px;
    gap: 10px;
  }
  #lp-root .mock-cal {
    background: var(--card);
    border: 1px solid var(--border-v);
    border-radius: var(--r-md);
    padding: 12px;
  }
  #lp-root .mock-cal-title { font-size: 10px; font-weight: 700; margin-bottom: 10px; color: var(--muted); }
  #lp-root .mock-cal-days { display: flex; gap: 5px; }
  #lp-root .mock-day {
    flex: 1;
    background: var(--surface-v);
    border: 1px solid var(--border-v);
    border-radius: var(--r-sm);
    padding: 6px 2px;
    text-align: center;
  }
  #lp-root .mock-day.today {
    background: var(--primary-c);
    border-color: var(--primary);
  }
  #lp-root .mock-day-d { font-size: 9px; color: var(--muted); }
  #lp-root .mock-day.today .mock-day-d { color: var(--purple-l); }
  #lp-root .mock-day-n { font-size: 13px; font-weight: 700; }
  #lp-root .mock-day-dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    margin: 3px auto 0;
  }
  #lp-root .mock-tasks {
    background: var(--card);
    border: 1px solid var(--border-v);
    border-radius: var(--r-md);
    padding: 12px;
  }
  #lp-root .mock-tasks-title { font-size: 10px; font-weight: 700; margin-bottom: 8px; color: var(--muted); }
  #lp-root .mock-task {
    padding: 7px 8px;
    background: var(--surface-v);
    border: 1px solid var(--border-v);
    border-radius: var(--r-sm);
    font-size: 10px;
    margin-bottom: 5px;
  }
  #lp-root .mock-task-tag {
    display: inline-block;
    font-size: 9px;
    padding: 2px 7px;
    border-radius: var(--r-full);
    margin-top: 3px;
    font-weight: 600;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── SECTION COMMON ── */
  #lp-root section { padding: 104px 24px; }
  #lp-root .section-inner { max-width: 1060px; margin: 0 auto; }
  #lp-root .section-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: var(--amber);
    letter-spacing: .18em;
    text-transform: uppercase;
    margin-bottom: 16px;
    background: rgba(249,190,90,.08);
    border: 1px solid rgba(249,190,90,.22);
    border-radius: var(--r-full);
    padding: 4px 14px;
  }
  #lp-root .section-title {
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: clamp(28px, 5vw, 54px);
    line-height: 1.1;
    letter-spacing: -.02em;
    margin-bottom: 20px;
  }
  #lp-root .section-sub {
    font-size: clamp(14px, 2vw, 17px);
    color: var(--text-v);
    max-width: 560px;
    line-height: 1.85;
  }

  /* ── PROBLEM ── */
  #lp-root .problem { background: var(--bg); }
  #lp-root .problem-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(288px, 1fr));
    gap: 16px;
    margin-top: 56px;
  }
  #lp-root .problem-card {
    background: var(--surface-v);
    border: 1px solid var(--border-v);
    border-radius: var(--r-2xl);
    padding: 28px;
    position: relative;
    overflow: hidden;
    transition: border-color .2s, box-shadow .2s, transform .2s;
    cursor: default;
  }
  #lp-root .problem-card:hover {
    border-color: var(--primary);
    box-shadow: 0 8px 32px rgba(61,49,180,.2), var(--elev-2);
    transform: translateY(-2px);
  }
  #lp-root .problem-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--primary-c), transparent);
    border-radius: var(--r-2xl) var(--r-2xl) 0 0;
  }
  #lp-root .problem-icon { font-size: 30px; margin-bottom: 16px; }
  #lp-root .problem-head { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
  #lp-root .problem-text { font-size: 13px; color: var(--text-v); line-height: 1.75; }
  #lp-root .problem-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin: 52px 0 0;
    font-size: 14px;
    color: var(--muted);
  }
  #lp-root .problem-arrow .line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border), transparent);
  }
  #lp-root .problem-arrow .label {
    background: rgba(61,49,180,.15);
    border: 1px solid rgba(197,191,255,.25);
    border-radius: var(--r-full);
    padding: 9px 24px;
    color: var(--purple-l);
    font-weight: 700;
    white-space: nowrap;
    font-size: 14px;
    box-shadow: var(--elev-1);
  }

  /* ── FEATURES ── */
  #lp-root .features { background: var(--surface); }
  #lp-root .feature-blocks {
    display: flex;
    flex-direction: column;
    gap: 88px;
    margin-top: 64px;
  }
  #lp-root .feature-block {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    align-items: center;
  }
  #lp-root .feature-block.rev { direction: rtl; }
  #lp-root .feature-block.rev > * { direction: ltr; }
  #lp-root .feat-label {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    color: var(--amber);
    background: rgba(249,190,90,.1);
    border: 1px solid rgba(249,190,90,.25);
    border-radius: var(--r-full);
    padding: 4px 14px;
    letter-spacing: .1em;
    margin-bottom: 18px;
  }
  #lp-root .feat-title {
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: clamp(22px, 3.5vw, 36px);
    line-height: 1.15;
    margin-bottom: 18px;
  }
  #lp-root .feat-desc {
    font-size: 14px;
    color: var(--text-v);
    line-height: 1.85;
    margin-bottom: 24px;
  }
  #lp-root .feat-points { display: flex; flex-direction: column; gap: 12px; }
  #lp-root .feat-point {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    color: var(--text);
    line-height: 1.6;
  }
  #lp-root .feat-point-dot {
    width: 20px; height: 20px;
    border-radius: 50%;
    background: rgba(61,49,180,.2);
    border: 1px solid var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
    font-size: 10px;
    color: var(--purple-l);
  }

  /* Feature mockups */
  #lp-root .feat-visual {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--r-xl);
    overflow: hidden;
    box-shadow: var(--elev-3);
  }
  #lp-root .fv-header {
    background: var(--surface-v);
    border-bottom: 1px solid var(--border-v);
    padding: 13px 16px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  #lp-root .fv-badge {
    font-size: 10px;
    padding: 3px 10px;
    border-radius: var(--r-full);
    font-weight: 700;
  }

  /* Calendar mockup */
  #lp-root .cal-mock { padding: 16px; }
  #lp-root .cal-week {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
    margin-bottom: 10px;
  }
  #lp-root .cal-wday {
    font-size: 9px;
    color: var(--muted);
    text-align: center;
    padding-bottom: 4px;
    letter-spacing: .04em;
  }
  #lp-root .cal-wcell {
    min-height: 62px;
    background: var(--surface-v);
    border: 1px solid var(--border-v);
    border-radius: var(--r-sm);
    padding: 5px;
  }
  #lp-root .cal-wcell.today {
    border-color: var(--primary-c);
    background: rgba(61,49,180,.1);
  }
  #lp-root .cal-cell-date { font-size: 10px; font-weight: 700; margin-bottom: 4px; }
  #lp-root .cal-event {
    font-size: 9px;
    padding: 2px 5px;
    border-radius: 4px;
    margin-bottom: 2px;
    line-height: 1.3;
    font-weight: 500;
  }

  /* Collab mockup */
  #lp-root .collab-mock {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  #lp-root .collab-card {
    background: var(--surface-v);
    border: 1px solid var(--border-v);
    border-radius: var(--r-lg);
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  #lp-root .collab-av {
    width: 36px; height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }
  #lp-root .collab-info { flex: 1; }
  #lp-root .collab-name { font-size: 13px; font-weight: 500; margin-bottom: 2px; }
  #lp-root .collab-date { font-size: 11px; color: var(--muted); }
  #lp-root .collab-btn-row { display: flex; gap: 5px; }
  #lp-root .c-btn {
    border: none;
    border-radius: var(--r-full);
    font-size: 11px;
    font-weight: 700;
    padding: 5px 12px;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: .04em;
  }

  /* Kanban mockup */
  #lp-root .kb-mock {
    padding: 14px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  #lp-root .kb-col-h {
    font-size: 10px;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: .08em;
    text-transform: uppercase;
    margin-bottom: 7px;
  }
  #lp-root .kb-c {
    background: var(--surface-v);
    border: 1px solid var(--border-v);
    border-radius: var(--r-md);
    padding: 9px 10px;
    margin-bottom: 6px;
  }
  #lp-root .kb-c-title { font-size: 11px; font-weight: 500; margin-bottom: 5px; line-height: 1.4; }
  #lp-root .kb-c-foot { display: flex; align-items: center; justify-content: space-between; }
  #lp-root .kb-av {
    width: 18px; height: 18px;
    border-radius: 50%;
    font-size: 8px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #lp-root .kb-due { font-size: 9px; color: var(--muted); }

  /* Notify mockup */
  #lp-root .notif-mock {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  #lp-root .notif-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    background: var(--surface-v);
    border: 1px solid var(--border-v);
    border-radius: var(--r-lg);
  }
  #lp-root .notif-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  #lp-root .notif-text { font-size: 12px; line-height: 1.55; color: var(--text-v); }
  #lp-root .notif-text strong { color: var(--text); }
  #lp-root .notif-time { font-size: 10px; color: var(--muted); margin-top: 2px; }

  /* ── HOW IT WORKS ── */
  #lp-root .how { background: var(--bg); }
  #lp-root .how-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0;
    margin-top: 56px;
    position: relative;
  }
  #lp-root .how-steps::before {
    content: '';
    position: absolute;
    top: 31px;
    left: 12%; right: 12%;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent);
    z-index: 0;
  }
  #lp-root .how-step {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0 24px;
  }
  #lp-root .how-num {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: var(--card);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: 22px;
    color: var(--purple-l);
    margin-bottom: 22px;
    position: relative;
    box-shadow: 0 0 24px rgba(61,49,180,.2), var(--elev-1);
  }
  #lp-root .how-num::after {
    content: '';
    position: absolute;
    inset: -5px;
    border-radius: 50%;
    border: 1px solid rgba(197,191,255,.22);
  }
  #lp-root .how-step-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
  #lp-root .how-step-text { font-size: 13px; color: var(--text-v); line-height: 1.75; }

  /* ── PLAN ── */
  #lp-root .plan { background: var(--surface); }
  #lp-root .plan-2col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 48px;
  }
  #lp-root .plan-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--r-2xl);
    padding: 36px 32px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: box-shadow .2s, transform .2s;
  }
  #lp-root .plan-card:hover {
    box-shadow: var(--elev-3);
    transform: translateY(-2px);
  }
  #lp-root .plan-card-featured {
    border-color: var(--primary);
    box-shadow: 0 0 0 1px var(--primary-c), var(--elev-2);
    background: linear-gradient(160deg, var(--card) 60%, rgba(61,49,180,.12));
  }
  #lp-root .plan-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--primary-c), var(--amber));
    border-radius: var(--r-2xl) var(--r-2xl) 0 0;
  }
  #lp-root .plan-badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--amber);
    color: #1a0800;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 18px;
    border-radius: var(--r-full);
    white-space: nowrap;
    letter-spacing: .06em;
    box-shadow: 0 2px 8px rgba(249,190,90,.4);
  }
  #lp-root .plan-name {
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: 26px;
    margin-bottom: 10px;
    letter-spacing: .02em;
  }
  #lp-root .plan-price {
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: 48px;
    color: var(--amber);
    margin-bottom: 4px;
    line-height: 1;
  }
  #lp-root .plan-price span { font-size: 18px; color: var(--muted); }
  #lp-root .plan-note { font-size: 13px; color: var(--muted); margin-bottom: 24px; }
  #lp-root .plan-divider {
    height: 1px;
    background: var(--border-v);
    margin-bottom: 20px;
  }
  #lp-root .plan-items {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-bottom: 28px;
    flex: 1;
  }
  #lp-root .plan-item {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 13px;
    color: var(--text-v);
  }
  #lp-root .plan-item-check {
    width: 18px; height: 18px;
    border-radius: 50%;
    background: rgba(77,218,174,.15);
    border: 1px solid var(--green);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    color: var(--green);
    flex-shrink: 0;
  }
  /* MD3 Filled button (full width) */
  #lp-root .plan-cta {
    width: 100%;
    padding: 15px;
    background: var(--amber);
    color: #1a0800;
    border: none;
    border-radius: var(--r-full);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: .06em;
    transition: background .15s, box-shadow .15s, transform .1s;
    box-shadow: 0 4px 16px rgba(249,190,90,.3);
  }
  #lp-root .plan-cta:hover {
    background: var(--amber-l);
    box-shadow: 0 6px 24px rgba(249,190,90,.45);
    transform: translateY(-1px);
  }
  /* MD3 Outlined button */
  #lp-root .plan-cta-outline {
    width: 100%;
    padding: 15px;
    background: transparent;
    color: var(--purple-l);
    border: 1px solid var(--primary);
    border-radius: var(--r-full);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: .04em;
    transition: background .15s, box-shadow .15s, transform .1s;
  }
  #lp-root .plan-cta-outline:hover {
    background: rgba(61,49,180,.12);
    box-shadow: var(--elev-1);
    transform: translateY(-1px);
  }
  #lp-root .plan-sub { font-size: 12px; color: var(--muted); margin-top: 12px; text-align: center; }
  #lp-root .plan-notice {
    font-size: 12px;
    border-radius: var(--r-md);
    padding: 8px 12px;
    margin-bottom: 16px;
  }

  /* ── TESTIMONIALS ── */
  #lp-root .testi { background: var(--bg); }
  #lp-root .testi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(288px, 1fr));
    gap: 16px;
    margin-top: 56px;
  }
  #lp-root .testi-card {
    background: var(--surface-v);
    border: 1px solid var(--border-v);
    border-radius: var(--r-2xl);
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 0;
    transition: box-shadow .2s, transform .2s;
    cursor: default;
  }
  #lp-root .testi-card:hover {
    box-shadow: var(--elev-2);
    transform: translateY(-2px);
  }
  #lp-root .testi-quote {
    font-size: 32px;
    color: var(--primary);
    opacity: .4;
    line-height: 1;
    margin-bottom: 4px;
    font-family: Georgia, serif;
  }
  #lp-root .testi-stars { font-size: 14px; color: var(--amber); margin-bottom: 12px; letter-spacing: .08em; }
  #lp-root .testi-text {
    font-size: 14px;
    line-height: 1.85;
    color: var(--text-v);
    margin-bottom: 20px;
    flex: 1;
  }
  #lp-root .testi-user { display: flex; align-items: center; gap: 12px; }
  #lp-root .testi-av {
    width: 40px; height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }
  #lp-root .testi-name { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
  #lp-root .testi-role { font-size: 11px; color: var(--muted); }

  /* ── FINAL CTA ── */
  #lp-root .final-cta {
    background: var(--bg);
    padding: 128px 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  #lp-root .final-cta::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 60% 55% at 50% 50%, rgba(61,49,180,.16) 0%, transparent 70%),
      radial-gradient(ellipse 30% 30% at 70% 70%, rgba(249,190,90,.07) 0%, transparent 50%);
    pointer-events: none;
  }
  #lp-root .final-cta-title {
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: clamp(30px, 5vw, 58px);
    line-height: 1.1;
    margin-bottom: 24px;
  }
  #lp-root .final-cta-title .accent { color: var(--amber); }
  #lp-root .final-cta-sub {
    font-size: 16px;
    color: var(--text-v);
    margin-bottom: 44px;
    line-height: 1.8;
    max-width: 520px;
    margin-left: auto;
    margin-right: auto;
  }

  /* ── FOOTER ── */
  #lp-root footer {
    background: var(--surface);
    border-top: 1px solid var(--border-v);
    padding: 32px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }
  #lp-root .footer-logo { display: flex; align-items: center; gap: 10px; }
  #lp-root .footer-name { font-size: 14px; font-weight: 700; }
  #lp-root .footer-name span { color: var(--amber); }
  #lp-root .footer-links {
    display: flex;
    gap: 24px;
  }
  #lp-root .footer-links a {
    font-size: 12px;
    color: var(--muted);
    text-decoration: none;
    transition: color .15s;
  }
  #lp-root .footer-links a:hover { color: var(--text-v); }
  #lp-root .footer-copy { font-size: 12px; color: var(--muted); }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    #lp-root nav { padding: 0 20px; gap: 12px; }
    #lp-root nav .nav-links { display: none; }
    #lp-root .feature-block {
      grid-template-columns: 1fr;
      gap: 32px;
    }
    #lp-root .feature-block.rev { direction: ltr; }
    #lp-root .mockup-body { grid-template-columns: 1fr; }
    #lp-root .mock-sidebar { display: none; }
    #lp-root .how-steps::before { display: none; }
    #lp-root .plan-2col { grid-template-columns: 1fr; }
    #lp-root footer {
      justify-content: center;
      text-align: center;
      padding: 24px 20px;
    }
    #lp-root .footer-links { display: none; }
  }
`;

const LP_HTML = `
    <!-- NAV -->
    <nav>
      <a href="/" class="nav-logo" aria-label="リスケるGG — ホームへ戻る">
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
      </a>
      <div class="nav-links">
        <a href="#features">機能</a>
        <a href="#how">使い方</a>
        <a href="#plan">料金</a>
      </div>
      <a href="/login" class="nav-login">ログイン</a>
      <a href="/login" class="nav-cta">無料で始める</a>
    </nav>

    <!-- HERO -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-grid"></div>
      <div class="hero-badge">
        <div class="hero-badge-dot"></div>
        ゲーム配信者・クリエイター向けスケジュール管理アプリ
      </div>
      <h1 class="hero-title">
        <span class="br">撮影も、コラボも、</span>
        <span class="br">編集も<span class="gg">GG</span>な</span>
        <span class="br">スケジュールを</span>
      </h1>
      <p class="hero-sub">
        配信スケジュールの管理からコラボ調整・編集タスクまで——<br/>
        <strong>配信者とチームに必要なすべてを</strong>、ひとつのアプリにまとめました。
      </p>
      <div class="hero-btns">
        <a href="/login" class="btn-primary">無料で始める →</a>
        <a href="#features" class="btn-secondary">機能を見る</a>
      </div>
      <div class="hero-mockup">
        <div class="mockup-bar">
          <div class="mockup-dot" style="background:#ff5f56"></div>
          <div class="mockup-dot" style="background:#ffbd2e"></div>
          <div class="mockup-dot" style="background:#27c93f"></div>
          <div class="mockup-url">risukeru.gg/dashboard</div>
        </div>
        <div class="mockup-body">
          <div class="mock-sidebar">
            <div class="mock-s-logo">
              <div class="mock-s-icon">
                <svg width="16" height="16" viewBox="0 0 56 56" fill="none">
                  <ellipse cx="32" cy="37" rx="11" ry="9" fill="#EEEDFE"/>
                  <ellipse cx="33" cy="23" rx="9" ry="8" fill="#EEEDFE"/>
                  <ellipse cx="27" cy="14" rx="3.5" ry="5" fill="#EEEDFE"/>
                  <ellipse cx="38" cy="12" rx="3.5" ry="5" fill="#EEEDFE"/>
                  <circle cx="30" cy="22" r="1.8" fill="#26215C"/>
                  <circle cx="37" cy="22" r="1.8" fill="#26215C"/>
                  <ellipse cx="33" cy="38" rx="3" ry="2" fill="#EF9F27" opacity="0.8"/>
                </svg>
              </div>
              <div class="mock-s-name">リスケる<span>GG</span></div>
            </div>
            <div class="mock-nav">
              <div class="mock-nav-item active">▦ ダッシュボード</div>
              <div class="mock-nav-item">◷ スケジュール</div>
              <div class="mock-nav-item">▤ タスク</div>
              <div class="mock-nav-item">⊕ コラボ調整</div>
              <div class="mock-nav-item">◎ チーム</div>
            </div>
          </div>
          <div class="mock-content">
            <div class="mock-stats">
              <div class="mock-stat">
                <div class="mock-stat-l">今月の配信</div>
                <div class="mock-stat-v" style="color:var(--purple-l)">18</div>
              </div>
              <div class="mock-stat">
                <div class="mock-stat-l">コラボ予定</div>
                <div class="mock-stat-v" style="color:var(--amber-l)">4</div>
              </div>
              <div class="mock-stat">
                <div class="mock-stat-l">LIVE視聴者</div>
                <div class="mock-stat-v" style="color:var(--live)">1,204</div>
              </div>
              <div class="mock-stat">
                <div class="mock-stat-l">タスク完了</div>
                <div class="mock-stat-v" style="color:var(--green)">72%</div>
              </div>
            </div>
            <div class="mock-2col">
              <div class="mock-cal">
                <div class="mock-cal-title">今週のスケジュール</div>
                <div class="mock-cal-days">
                  <div class="mock-day"><div class="mock-day-d">月</div><div class="mock-day-n">11</div><div class="mock-day-dot" style="background:var(--purple)"></div></div>
                  <div class="mock-day today"><div class="mock-day-d">火</div><div class="mock-day-n">12</div><div class="mock-day-dot" style="background:var(--amber)"></div></div>
                  <div class="mock-day"><div class="mock-day-d">水</div><div class="mock-day-n">13</div><div class="mock-day-dot" style="background:var(--amber)"></div></div>
                  <div class="mock-day"><div class="mock-day-d">木</div><div class="mock-day-n">14</div><div class="mock-day-dot" style="background:transparent"></div></div>
                  <div class="mock-day"><div class="mock-day-d">金</div><div class="mock-day-n">15</div><div class="mock-day-dot" style="background:var(--live)"></div></div>
                  <div class="mock-day"><div class="mock-day-d">土</div><div class="mock-day-n">16</div><div class="mock-day-dot" style="background:var(--purple)"></div></div>
                  <div class="mock-day"><div class="mock-day-d">日</div><div class="mock-day-n">17</div><div class="mock-day-dot" style="background:transparent"></div></div>
                </div>
              </div>
              <div class="mock-tasks">
                <div class="mock-tasks-title">本日のタスク</div>
                <div class="mock-task">サムネ確認<div><span class="mock-task-tag" style="background:rgba(61,49,180,0.25);color:var(--purple-l)">編集</span></div></div>
                <div class="mock-task">LIVE配信 20:00〜<div><span class="mock-task-tag" style="background:rgba(255,107,138,0.18);color:var(--live)">LIVE</span></div></div>
                <div class="mock-task">コラボ打ち合わせ<div><span class="mock-task-tag" style="background:rgba(249,190,90,0.15);color:var(--amber-l)">コラボ</span></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- PROBLEM -->
    <section class="problem" id="problem">
      <div class="section-inner">
        <div class="section-eyebrow">こんなお悩みはありませんか？</div>
        <h2 class="section-title">配信者のお悩みを<br/>まるごと解決</h2>
        <p class="section-sub">専用ツールがないために、本来配信に充てるべき時間が管理業務に奪われていませんか？</p>
        <div class="problem-grid">
          <div class="problem-card">
            <div class="problem-icon">📅</div>
            <div class="problem-head">コラボの日程調整がDMだらけ</div>
            <div class="problem-text">TwitterのDMやDiscordで調整しても、どこにも記録が残らない。当日になって「あれ、何時からだっけ？」が起きてしまう。</div>
          </div>
          <div class="problem-card">
            <div class="problem-icon">🎬</div>
            <div class="problem-head">編集スタッフへの連絡が煩雑</div>
            <div class="problem-text">「この動画いつアップ？」「サムネはどうする？」——毎回LINEやDMで確認しているうちに、いつの間にか締切を過ぎてしまう。</div>
          </div>
          <div class="problem-card">
            <div class="problem-icon">🔔</div>
            <div class="problem-head">告知を忘れたり、時間を間違えたり</div>
            <div class="problem-text">配信前の告知ツイートを忘れたり、時間を誤ってツイートしたり。そのたびにファンからの信頼が少しずつ損なわれていく。</div>
          </div>
          <div class="problem-card">
            <div class="problem-icon">😰</div>
            <div class="problem-head">スケジュールが頭の中にしかない</div>
            <div class="problem-text">配信日・コラボ日・撮影日がすべて自分の頭の中だけにある。スタッフや共同作業者に毎回ゼロから説明しなければならない。</div>
          </div>
        </div>
        <div class="problem-arrow">
          <div class="line"></div>
          <div class="label">リスケるGGなら、これらをまとめて解決できます 🐿️</div>
          <div class="line"></div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="features" id="features">
      <div class="section-inner">
        <div class="section-eyebrow">機能紹介</div>
        <h2 class="section-title">必要なものだけ。<br/>全部入っている。</h2>
        <p class="section-sub">「あれば便利」ではなく「これがないと困る」機能だけを厳選。複雑な設定は不要で、すぐに使い始められます。</p>
        <div class="feature-blocks">
          <!-- 機能1 -->
          <div class="feature-block">
            <div>
              <div class="feat-label">機能 01</div>
              <h3 class="feat-title">配信スケジュールを<br/>チーム全員で共有</h3>
              <p class="feat-desc">今週どの日にLIVEするか、コラボはいつか——カレンダーにまとめるだけで、スタッフ全員が同じ情報を確認できます。毎回連絡する手間は不要です。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>配信日・コラボ日・撮影日を色分けして一元管理</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>登録した予定がチーム全員にリアルタイムで反映</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>週表示・月表示の切り替えで全体を把握</div>
              </div>
            </div>
            <div class="feat-visual">
              <div class="fv-header"><span>📅 スケジュール</span><span class="fv-badge" style="background:rgba(61,49,180,0.2);color:var(--purple-l)">5月 第3週</span></div>
              <div class="cal-mock">
                <div class="cal-week"><div class="cal-wday">月</div><div class="cal-wday">火</div><div class="cal-wday">水</div><div class="cal-wday">木</div><div class="cal-wday">金</div><div class="cal-wday">土</div><div class="cal-wday">日</div></div>
                <div class="cal-week">
                  <div class="cal-wcell"><div class="cal-cell-date">11</div><div class="cal-event" style="background:rgba(61,49,180,0.2);color:var(--purple-l)">LIVE配信</div></div>
                  <div class="cal-wcell today"><div class="cal-cell-date" style="color:var(--purple-l)">12</div><div class="cal-event" style="background:rgba(255,107,138,0.18);color:var(--live)">🔴 LIVE中</div><div class="cal-event" style="background:rgba(249,190,90,0.15);color:var(--amber-l)">コラボMTG</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">13</div><div class="cal-event" style="background:rgba(249,190,90,0.15);color:var(--amber-l)">撮影</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">14</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">15</div><div class="cal-event" style="background:rgba(61,49,180,0.2);color:var(--purple-l)">LIVE配信</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">16</div><div class="cal-event" style="background:rgba(77,218,174,0.15);color:var(--green)">コラボ確定</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">17</div></div>
                </div>
              </div>
            </div>
          </div>
          <!-- 機能2 -->
          <div class="feature-block rev">
            <div>
              <div class="feat-label">機能 02</div>
              <h3 class="feat-title">コラボ打診から確定まで<br/>アプリ内で完結</h3>
              <p class="feat-desc">「この日はどうですか？」「その日は難しいです…」——DM往復をなくして、候補日を提示するだけで相手がOK/NGを返せます。確定した日程は自動でカレンダーに追加されます。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>候補日を複数提示して、相手がワンタップで返答</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>確定した日程が自動でスケジュールに追加</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>コラボ履歴が残るので過去のやりとりも確認可能</div>
              </div>
            </div>
            <div class="feat-visual">
              <div class="fv-header"><span>🤝 コラボ調整</span><span class="fv-badge" style="background:rgba(249,190,90,0.15);color:var(--amber-l)">2件 返答待ち</span></div>
              <div class="collab-mock">
                <div class="collab-card"><div class="collab-av" style="background:rgba(255,107,138,0.2);color:var(--live)">KZ</div><div class="collab-info"><div class="collab-name">カズくんGames</div><div class="collab-date">Apex コラボ希望 — 5/18 20:00〜</div></div><div class="collab-btn-row"><button class="c-btn" style="background:rgba(77,218,174,0.15);color:var(--green)">OK</button><button class="c-btn" style="background:rgba(255,107,138,0.12);color:var(--live)">NG</button></div></div>
                <div class="collab-card"><div class="collab-av" style="background:rgba(61,49,180,0.2);color:var(--purple-l)">HN</div><div class="collab-info"><div class="collab-name">ひなたch</div><div class="collab-date">雑談コラボ — 5/20 or 5/21</div></div><div class="collab-btn-row"><button class="c-btn" style="background:rgba(77,218,174,0.15);color:var(--green)">OK</button><button class="c-btn" style="background:rgba(255,107,138,0.12);color:var(--live)">NG</button></div></div>
                <div class="collab-card" style="opacity:0.6"><div class="collab-av" style="background:rgba(77,218,174,0.2);color:var(--green)">PK</div><div class="collab-info"><div class="collab-name">ぺこらch</div><div class="collab-date">確定済 — 5/22 21:00〜</div></div><div style="font-size:11px;color:var(--green);font-weight:700">✓ 確定</div></div>
              </div>
            </div>
          </div>
          <!-- 機能3 -->
          <div class="feature-block">
            <div>
              <div class="feat-label">機能 03</div>
              <h3 class="feat-title">編集・サムネ・告知——<br/>作業の進捗を一目で把握</h3>
              <p class="feat-desc">「あの動画の編集、どこまで進んでいる？」をわざわざ聞かなくて大丈夫。カードを動かすだけで進捗がチーム全員に伝わります。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>「未着手」「進行中」「完了」の3ステップで管理</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>担当者・締切日を設定してスタッフに依頼</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>タスクが完了すると自動で通知が届く</div>
              </div>
            </div>
            <div class="feat-visual">
              <div class="fv-header"><span>▤ タスクボード</span></div>
              <div class="kb-mock">
                <div>
                  <div class="kb-col-h">未着手</div>
                  <div class="kb-c"><div class="kb-c-title">概要欄テンプレ更新</div><div class="kb-c-foot"><div class="kb-av" style="background:rgba(61,49,180,0.3);color:var(--purple-l)">RK</div><div class="kb-due">5/14</div></div></div>
                  <div class="kb-c"><div class="kb-c-title">Shorts台本 3本</div><div class="kb-c-foot"><div class="kb-av" style="background:rgba(249,190,90,0.3);color:var(--amber-l)">TK</div><div class="kb-due">5/16</div></div></div>
                </div>
                <div>
                  <div class="kb-col-h" style="color:var(--amber)">進行中</div>
                  <div class="kb-c" style="border-color:var(--amber-d)"><div class="kb-c-title">4月振り返り動画 編集</div><div class="kb-c-foot"><div class="kb-av" style="background:rgba(77,218,174,0.3);color:var(--green)">SA</div><div class="kb-due">5/13</div></div></div>
                  <div class="kb-c" style="border-color:var(--amber-d)"><div class="kb-c-title">サムネイル 3本</div><div class="kb-c-foot"><div class="kb-av" style="background:rgba(249,190,90,0.3);color:var(--amber-l)">MG</div><div class="kb-due">5/12</div></div></div>
                </div>
                <div>
                  <div class="kb-col-h" style="color:var(--green)">完了</div>
                  <div class="kb-c" style="opacity:0.55"><div class="kb-c-title">先週LIVE アーカイブ公開</div><div class="kb-c-foot"><div class="kb-av" style="background:rgba(61,49,180,0.3);color:var(--purple-l)">RK</div><div class="kb-due">5/11</div></div></div>
                  <div class="kb-c" style="opacity:0.55"><div class="kb-c-title">Short素材 撮影 2本</div><div class="kb-c-foot"><div class="kb-av" style="background:rgba(61,49,180,0.3);color:var(--purple-l)">RK</div><div class="kb-due">5/12</div></div></div>
                </div>
              </div>
            </div>
          </div>
          <!-- 機能4 -->
          <div class="feature-block rev">
            <div>
              <div class="feat-label">機能 04</div>
              <h3 class="feat-title">大切なことを<br/>見逃さない通知</h3>
              <p class="feat-desc">LIVEの直前リマインダーは無料プランでもご利用いただけます。PARTYプランでは、コラボの返答やタスク完了もリアルタイムで通知。配信者とチーム全員が、同じ情報を同じタイミングで受け取れます。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>LIVE開始前の自動リマインダー（全プラン共通）</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>コラボ返答・タスク完了を即時通知（PARTYプラン）</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>スマートフォンのホーム画面にアプリとして追加可能</div>
              </div>
            </div>
            <div class="feat-visual">
              <div class="fv-header"><span>🔔 通知センター</span><span class="fv-badge" style="background:rgba(255,107,138,0.15);color:var(--live)">3件 未読</span></div>
              <div class="notif-mock">
                <div class="notif-row"><div class="notif-icon">🔴</div><div><div class="notif-text"><strong>LIVE開始まで1時間</strong>です。配信タイトルをご確認ください。</div><div class="notif-time">全プラン — 19:00 に通知予定</div></div></div>
                <div class="notif-row"><div class="notif-icon">🤝</div><div><div class="notif-text"><strong>カズくんGames</strong> からコラボ打診が届いています。</div><div class="notif-time">PARTYプランのみ — 2時間前</div></div></div>
                <div class="notif-row"><div class="notif-icon">✅</div><div><div class="notif-text">タスク「サムネイルデザイン」が<strong>完了</strong>しました。</div><div class="notif-time">PARTYプランのみ — 3時間前</div></div></div>
                <div class="notif-row" style="opacity:0.5"><div class="notif-icon">📅</div><div><div class="notif-text"><strong>明日 20:00</strong> にLIVE配信が予定されています。</div><div class="notif-time">全プラン — 昨日</div></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="how" id="how">
      <div class="section-inner">
        <div class="section-eyebrow">使い方</div>
        <h2 class="section-title">3ステップで<br/>今日から使える</h2>
        <p class="section-sub">アカウント作成から使い始めるまで5分とかかりません。煩雑な設定は一切不要です。</p>
        <div class="how-steps">
          <div class="how-step">
            <div class="how-num">1</div>
            <div class="how-step-title">Googleで<br/>ログイン</div>
            <div class="how-step-text">Googleアカウントがあればすぐに始められます。パスワードの登録も不要です。</div>
          </div>
          <div class="how-step">
            <div class="how-num">2</div>
            <div class="how-step-title">チームを作って<br/>メンバーを招待</div>
            <div class="how-step-text">編集スタッフやマネージャーをリンクで招待するだけ。すぐに共有カレンダーが使えるようになります。</div>
          </div>
          <div class="how-step">
            <div class="how-num">3</div>
            <div class="how-step-title">配信枠を登録して<br/>GGスタート</div>
            <div class="how-step-text">今週の配信予定を入れるだけ。コラボ調整もタスク管理も、すべてここから始まります。</div>
          </div>
        </div>
      </div>
    </section>

    <!-- PLAN -->
    <section class="plan" id="plan">
      <div class="section-inner">
        <div style="text-align:center">
          <div class="section-eyebrow">料金プラン</div>
          <h2 class="section-title">2つのプランで<br/>どんなチームにも対応</h2>
          <p class="section-sub" style="margin:0 auto">まずはLIGHTプランで無料スタート。チームが本格稼動してきたらPARTYプランへ。</p>
        </div>
        <div class="plan-2col">
          <!-- LIGHT -->
          <div class="plan-card">
            <div class="plan-name">LIGHT</div>
            <div class="plan-price">¥0 <span>/ 月</span></div>
            <div class="plan-note">クレジットカード不要・ずっと無料</div>
            <div class="plan-divider"></div>
            <div class="plan-items">
              <div class="plan-item"><div class="plan-item-check" aria-hidden="true">✓</div>メンバー 2人まで</div>
              <div class="plan-item"><div class="plan-item-check" aria-hidden="true">✓</div>スケジュール登録 無制限</div>
              <div class="plan-item"><div class="plan-item-check" aria-hidden="true">✓</div>タスク 月5件まで</div>
              <div class="plan-item"><div class="plan-item-check" aria-hidden="true">✓</div>コラボ調整 月3件まで</div>
              <div class="plan-item"><div class="plan-item-check" aria-hidden="true">✓</div>LIVEリマインダー通知</div>
              <div class="plan-item"><div class="plan-item-check" aria-hidden="true">✓</div>スマートフォン・PC 両対応</div>
            </div>
            <div class="plan-notice" style="font-size:12px;color:#f9be5a;background:rgba(249,190,90,0.08);border:1px solid rgba(249,190,90,0.2)">⚠️ バナー広告あり</div>
            <a href="/login" class="plan-cta-outline" aria-label="LIGHTプランで無料で始める">無料で始める</a>
          </div>
          <!-- PARTY -->
          <div class="plan-card plan-card-featured">
            <div class="plan-badge">おすすめ</div>
            <div class="plan-name">PARTY</div>
            <div class="plan-price">¥1,500 <span>/ 人・月</span></div>
            <div class="plan-note">メンバー各自払い · 14日間無料トライアル</div>
            <div class="plan-divider"></div>
            <div class="plan-items">
              <div class="plan-item"><div class="plan-item-check" aria-hidden="true">✓</div>メンバー 無制限</div>
              <div class="plan-item"><div class="plan-item-check" aria-hidden="true">✓</div>スケジュール登録 無制限</div>
              <div class="plan-item"><div class="plan-item-check" aria-hidden="true">✓</div>タスク 無制限</div>
              <div class="plan-item"><div class="plan-item-check" aria-hidden="true">✓</div>コラボ調整 無制限</div>
              <div class="plan-item"><div class="plan-item-check" aria-hidden="true">✓</div>全通知（コラボ返答・タスク更新）</div>
              <div class="plan-item"><div class="plan-item-check" aria-hidden="true">✓</div>スマートフォン・PC 両対応</div>
            </div>
            <div class="plan-notice" style="font-size:12px;color:var(--green);background:rgba(77,218,174,0.08);border:1px solid rgba(77,218,174,0.2)">✓ 広告なし</div>
            <button class="plan-cta" aria-label="PARTYプランを14日間無料で試す">14日間無料で試す →</button>
            <div class="plan-sub">例）3人チームで ¥4,500 / 月</div>
          </div>
        </div>
      </div>
    </section>

    <!-- TESTIMONIALS -->
    <section class="testi">
      <div class="section-inner">
        <div class="section-eyebrow">ユーザーの声</div>
        <h2 class="section-title">ご利用の配信者から<br/>届いた声</h2>
        <div class="testi-grid">
          <div class="testi-card">
            <div class="testi-quote">"</div>
            <div class="testi-stars">★★★★★</div>
            <div class="testi-text">「コラボの日程調整がDMでなくなっただけで、管理がとても楽になりました。相手もOKをタップするだけなので、やりとりがスムーズです。」</div>
            <div class="testi-user">
              <div class="testi-av" style="background:rgba(255,107,138,0.2);color:var(--live)">KZ</div>
              <div>
                <div class="testi-name">カズくんGames</div>
                <div class="testi-role">Twitch配信者 / フォロワー4.2万</div>
              </div>
            </div>
          </div>
          <div class="testi-card">
            <div class="testi-quote">"</div>
            <div class="testi-stars">★★★★★</div>
            <div class="testi-text">「編集スタッフとのやりとりがすべてここで完結するようになってから、LINEの未読件数が激減しました。配信に集中できる時間が増えています。」</div>
            <div class="testi-user">
              <div class="testi-av" style="background:rgba(61,49,180,0.2);color:var(--purple-l)">HN</div>
              <div>
                <div class="testi-name">ひなたch</div>
                <div class="testi-role">YouTube配信者 / 登録者1.8万</div>
              </div>
            </div>
          </div>
          <div class="testi-card">
            <div class="testi-quote">"</div>
            <div class="testi-stars">★★★★☆</div>
            <div class="testi-text">「スケジュールをマネージャーと共有できるのがとても助かっています。『今週どうする？』とSlackで聞かれることがなくなりました。」</div>
            <div class="testi-user">
              <div class="testi-av" style="background:rgba(77,218,174,0.2);color:var(--green)">RN</div>
              <div>
                <div class="testi-name">レイノスゲーム</div>
                <div class="testi-role">YouTube / Twitch配信者 / 登録者8.6万</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="final-cta">
      <div class="section-inner" style="max-width:700px;margin:0 auto;position:relative;z-index:1">
        <h2 class="final-cta-title">今日から配信に<br/><span class="accent">全力を尽くそう</span></h2>
        <p class="final-cta-sub">スケジュール管理、コラボ調整、チーム連携——<br/>面倒なことはリスケるGGにお任せください。あなたは配信に集中できます。</p>
        <div class="hero-btns">
          <a href="/login" class="btn-primary">無料で始める →</a>
          <a href="#features" class="btn-secondary">機能をもっと見る</a>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer>
      <div class="footer-logo">
        <div class="nav-logo-icon" style="width:28px;height:28px;border-radius:8px">
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
        <a href="#features">機能</a>
        <a href="#how">使い方</a>
        <a href="#plan">料金</a>
        <a href="/privacy-policy">プライバシーポリシー</a>
      </div>
      <div class="footer-copy">© 2026 リスケるGG</div>
    </footer>
`;

export default function LandingPage() {
  return (
    <div className={`${zenKakuGothicNew.variable} ${delaGothicOne.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: LP_CSS }} />
      <div id="lp-root" dangerouslySetInnerHTML={{ __html: LP_HTML }} />
    </div>
  );
}
