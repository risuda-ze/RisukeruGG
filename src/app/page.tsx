import type { Metadata } from 'next';
import { Dela_Gothic_One, Zen_Kaku_Gothic_New } from 'next/font/google';

export const metadata: Metadata = {
  title: 'リスケるGG — 撮影も、コラボも、編集もGGなスケジュールを',
  description: '配信者向けチームスケジュール管理アプリ',
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
    --bg: #08081a;
    --surface: #10102a;
    --card: #16163a;
    --border: #28285a;
    --purple: #7f77dd;
    --purple-l: #b0aaf8;
    --purple-d: #534ab7;
    --amber: #ef9f27;
    --amber-l: #fac775;
    --text: #eeeeff;
    --muted: #6666aa;
    --live: #ff4d6d;
    --green: #3fcf7f;
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
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    height: 60px;
    background: rgba(8, 8, 26, 0.85);
    backdrop-filter: blur(16px);
    border-bottom: 0.5px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 32px;
    gap: 20px;
  }
  #lp-root .nav-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }
  #lp-root .nav-logo-icon {
    width: 34px;
    height: 34px;
    background: var(--purple-d);
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #lp-root .nav-name {
    font-size: 15px;
    font-weight: 700;
  }
  #lp-root .nav-name span {
    color: var(--amber);
  }
  #lp-root .nav-links {
    display: flex;
    gap: 24px;
  }
  #lp-root .nav-links a {
    font-size: 13px;
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
    padding: 7px 14px;
    border-radius: 8px;
    border: 0.5px solid var(--border);
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  #lp-root .nav-login:hover {
    color: var(--text);
    border-color: var(--muted);
  }
  #lp-root .nav-cta {
    background: var(--amber);
    color: #1a0800;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    padding: 8px 20px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
    white-space: nowrap;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  #lp-root .nav-cta:hover {
    background: var(--amber-l);
  }

  /* ── HERO ── */
  #lp-root .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 100px 24px 80px;
    overflow: hidden;
    text-align: center;
  }
  #lp-root .hero-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        ellipse 80% 60% at 50% 20%,
        rgba(127, 119, 221, 0.18) 0%,
        transparent 60%
      ),
      radial-gradient(ellipse 40% 40% at 80% 80%, rgba(239, 159, 39, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }
  #lp-root .hero-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(127, 119, 221, 0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(127, 119, 221, 0.06) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none;
  }
  #lp-root .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(127, 119, 221, 0.12);
    border: 0.5px solid rgba(127, 119, 221, 0.4);
    border-radius: 99px;
    padding: 6px 16px;
    font-size: 12px;
    color: var(--purple-l);
    margin-bottom: 28px;
    animation: fadeUp 0.6s ease both;
  }
  #lp-root .hero-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--live);
    animation: pulse 1.4s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  #lp-root .hero-title {
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: clamp(36px, 7vw, 80px);
    line-height: 1.05;
    letter-spacing: -0.02em;
    margin-bottom: 20px;
    animation: fadeUp 0.7s 0.1s ease both;
  }
  #lp-root .hero-title .gg {
    color: var(--amber);
  }
  #lp-root .hero-title .br {
    display: block;
  }
  #lp-root .hero-sub {
    font-size: clamp(15px, 2.5vw, 20px);
    color: var(--muted);
    max-width: 580px;
    line-height: 1.7;
    margin-bottom: 40px;
    animation: fadeUp 0.7s 0.2s ease both;
  }
  #lp-root .hero-sub strong {
    color: var(--text);
  }
  #lp-root .hero-btns {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
    animation: fadeUp 0.7s 0.3s ease both;
    margin-bottom: 64px;
  }
  #lp-root .btn-primary {
    background: var(--amber);
    color: #1a0800;
    border: none;
    border-radius: 10px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    font-size: 15px;
    font-weight: 700;
    padding: 14px 32px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    box-shadow: 0 0 32px rgba(239, 159, 39, 0.3);
  }
  #lp-root .btn-primary:hover {
    background: var(--amber-l);
    box-shadow: 0 0 48px rgba(239, 159, 39, 0.5);
  }
  #lp-root .btn-secondary {
    background: rgba(127, 119, 221, 0.12);
    color: var(--purple-l);
    border: 0.5px solid rgba(127, 119, 221, 0.4);
    border-radius: 10px;
    font-size: 15px;
    font-weight: 500;
    padding: 14px 32px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  #lp-root .btn-secondary:hover {
    background: rgba(127, 119, 221, 0.2);
  }

  /* Hero mockup */
  #lp-root .hero-mockup {
    width: min(760px, 100%);
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    box-shadow:
      0 40px 120px rgba(0, 0, 0, 0.6),
      0 0 0 0.5px var(--border);
    animation: fadeUp 0.8s 0.4s ease both;
  }
  #lp-root .mockup-bar {
    height: 36px;
    background: var(--card);
    border-bottom: 0.5px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 7px;
  }
  #lp-root .mockup-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  #lp-root .mockup-url {
    flex: 1;
    margin: 0 12px;
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 5px;
    height: 20px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    font-size: 10px;
    color: var(--muted);
  }
  #lp-root .mockup-body {
    display: grid;
    grid-template-columns: 180px 1fr;
    height: 360px;
  }
  #lp-root .mock-sidebar {
    background: var(--card);
    border-right: 0.5px solid var(--border);
    padding: 16px 0;
  }
  #lp-root .mock-s-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 14px 14px;
    border-bottom: 0.5px solid var(--border);
    margin-bottom: 10px;
  }
  #lp-root .mock-s-icon {
    width: 28px;
    height: 28px;
    background: var(--purple-d);
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #lp-root .mock-s-name {
    font-size: 12px;
    font-weight: 700;
  }
  #lp-root .mock-s-name span {
    color: var(--amber);
  }
  #lp-root .mock-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 8px;
  }
  #lp-root .mock-nav-item {
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 11px;
    color: var(--muted);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #lp-root .mock-nav-item.active {
    background: rgba(127, 119, 221, 0.15);
    color: var(--purple-l);
  }
  #lp-root .mock-content {
    padding: 16px;
    overflow: hidden;
  }
  #lp-root .mock-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }
  #lp-root .mock-stat {
    background: var(--card);
    border: 0.5px solid var(--border);
    border-radius: 8px;
    padding: 10px 12px;
  }
  #lp-root .mock-stat-l {
    font-size: 9px;
    color: var(--muted);
    margin-bottom: 4px;
  }
  #lp-root .mock-stat-v {
    font-size: 18px;
    font-weight: 700;
  }
  #lp-root .mock-2col {
    display: grid;
    grid-template-columns: 1fr 140px;
    gap: 10px;
  }
  #lp-root .mock-cal {
    background: var(--card);
    border: 0.5px solid var(--border);
    border-radius: 8px;
    padding: 12px;
  }
  #lp-root .mock-cal-title {
    font-size: 10px;
    font-weight: 700;
    margin-bottom: 10px;
    color: var(--muted);
  }
  #lp-root .mock-cal-days {
    display: flex;
    gap: 5px;
  }
  #lp-root .mock-day {
    flex: 1;
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 6px;
    padding: 6px 2px;
    text-align: center;
  }
  #lp-root .mock-day.today {
    background: var(--purple-d);
    border-color: var(--purple);
  }
  #lp-root .mock-day-d {
    font-size: 9px;
    color: var(--muted);
  }
  #lp-root .mock-day.today .mock-day-d {
    color: var(--purple-l);
  }
  #lp-root .mock-day-n {
    font-size: 13px;
    font-weight: 700;
  }
  #lp-root .mock-day-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    margin: 3px auto 0;
  }
  #lp-root .mock-tasks {
    background: var(--card);
    border: 0.5px solid var(--border);
    border-radius: 8px;
    padding: 12px;
  }
  #lp-root .mock-tasks-title {
    font-size: 10px;
    font-weight: 700;
    margin-bottom: 8px;
    color: var(--muted);
  }
  #lp-root .mock-task {
    padding: 7px 8px;
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 6px;
    font-size: 10px;
    margin-bottom: 5px;
  }
  #lp-root .mock-task-tag {
    display: inline-block;
    font-size: 9px;
    padding: 1px 6px;
    border-radius: 99px;
    margin-top: 3px;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ── SECTION COMMON ── */
  #lp-root section {
    padding: 100px 24px;
  }
  #lp-root .section-inner {
    max-width: 1040px;
    margin: 0 auto;
  }
  #lp-root .section-eyebrow {
    font-size: 12px;
    font-weight: 700;
    color: var(--amber);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  #lp-root .section-title {
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: clamp(28px, 5vw, 52px);
    line-height: 1.1;
    letter-spacing: -0.02em;
    margin-bottom: 18px;
  }
  #lp-root .section-sub {
    font-size: clamp(14px, 2vw, 17px);
    color: var(--muted);
    max-width: 560px;
    line-height: 1.8;
  }

  /* ── PROBLEM ── */
  #lp-root .problem {
    background: var(--bg);
  }
  #lp-root .problem-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-top: 52px;
  }
  #lp-root .problem-card {
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 14px;
    padding: 24px 24px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s;
  }
  #lp-root .problem-card:hover {
    border-color: var(--purple);
  }
  #lp-root .problem-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, var(--purple), transparent);
  }
  #lp-root .problem-icon {
    font-size: 28px;
    margin-bottom: 14px;
  }
  #lp-root .problem-head {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  #lp-root .problem-text {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.7;
  }
  #lp-root .problem-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 48px 0 0;
    font-size: 14px;
    color: var(--muted);
  }
  #lp-root .problem-arrow .line {
    flex: 1;
    height: 0.5px;
    background: var(--border);
  }
  #lp-root .problem-arrow .label {
    background: rgba(127, 119, 221, 0.12);
    border: 0.5px solid rgba(127, 119, 221, 0.3);
    border-radius: 99px;
    padding: 8px 20px;
    color: var(--purple-l);
    font-weight: 700;
    white-space: nowrap;
  }

  /* ── FEATURES ── */
  #lp-root .features {
    background: var(--surface);
  }
  #lp-root .feature-blocks {
    display: flex;
    flex-direction: column;
    gap: 80px;
    margin-top: 60px;
  }
  #lp-root .feature-block {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
  }
  #lp-root .feature-block.rev {
    direction: rtl;
  }
  #lp-root .feature-block.rev > * {
    direction: ltr;
  }
  #lp-root .feat-label {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    color: var(--amber);
    background: rgba(239, 159, 39, 0.1);
    border: 0.5px solid rgba(239, 159, 39, 0.3);
    border-radius: 99px;
    padding: 4px 12px;
    letter-spacing: 0.08em;
    margin-bottom: 16px;
  }
  #lp-root .feat-title {
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: clamp(22px, 3.5vw, 36px);
    line-height: 1.15;
    margin-bottom: 16px;
  }
  #lp-root .feat-desc {
    font-size: 14px;
    color: var(--muted);
    line-height: 1.8;
    margin-bottom: 20px;
  }
  #lp-root .feat-points {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  #lp-root .feat-point {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    color: var(--text);
    line-height: 1.6;
  }
  #lp-root .feat-point-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(127, 119, 221, 0.15);
    border: 0.5px solid var(--purple);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
    font-size: 9px;
    color: var(--purple-l);
  }

  /* ── USECASES ── */
  #lp-root .usecases {
    background: var(--bg);
  }
  #lp-root .usecase-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-top: 52px;
  }
  #lp-root .usecase-card {
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 16px;
    padding: 24px;
  }
  #lp-root .usecase-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: var(--purple-l);
    background: rgba(127, 119, 221, 0.12);
    border: 0.5px solid rgba(127, 119, 221, 0.28);
    border-radius: 99px;
    padding: 4px 10px;
    margin-bottom: 14px;
  }
  #lp-root .usecase-title {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.5;
    margin-bottom: 12px;
  }
  #lp-root .usecase-text {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.8;
    margin-bottom: 16px;
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
    padding-left: 14px;
    position: relative;
  }
  #lp-root .usecase-point::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--amber);
  }

  /* Feature mockups */
  #lp-root .feat-visual {
    background: var(--card);
    border: 0.5px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }
  #lp-root .fv-header {
    background: var(--surface);
    border-bottom: 0.5px solid var(--border);
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  #lp-root .fv-badge {
    font-size: 10px;
    padding: 3px 9px;
    border-radius: 99px;
    font-weight: 700;
  }

  /* Cal mockup */
  #lp-root .cal-mock {
    padding: 16px;
  }
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
  }
  #lp-root .cal-wcell {
    min-height: 62px;
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 7px;
    padding: 5px;
  }
  #lp-root .cal-wcell.today {
    border-color: var(--purple-d);
    background: rgba(127, 119, 221, 0.07);
  }
  #lp-root .cal-cell-date {
    font-size: 10px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  #lp-root .cal-event {
    font-size: 9px;
    padding: 2px 5px;
    border-radius: 4px;
    margin-bottom: 2px;
    line-height: 1.3;
  }

  /* Collab mockup */
  #lp-root .collab-mock {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  #lp-root .collab-card {
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  #lp-root .collab-av {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }
  #lp-root .collab-info {
    flex: 1;
  }
  #lp-root .collab-name {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 2px;
  }
  #lp-root .collab-date {
    font-size: 11px;
    color: var(--muted);
  }
  #lp-root .collab-btn-row {
    display: flex;
    gap: 5px;
  }
  #lp-root .c-btn {
    border: none;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    padding: 5px 11px;
    cursor: pointer;
    font-family: inherit;
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
    letter-spacing: 0.06em;
    margin-bottom: 7px;
  }
  #lp-root .kb-c {
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 7px;
    padding: 9px 10px;
    margin-bottom: 6px;
  }
  #lp-root .kb-c-title {
    font-size: 11px;
    font-weight: 500;
    margin-bottom: 5px;
    line-height: 1.4;
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
    font-size: 8px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #lp-root .kb-due {
    font-size: 9px;
    color: var(--muted);
  }

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
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 9px;
  }
  #lp-root .notif-icon {
    font-size: 16px;
    flex-shrink: 0;
    margin-top: 1px;
  }
  #lp-root .notif-text {
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted);
  }
  #lp-root .notif-text strong {
    color: var(--text);
  }
  #lp-root .notif-time {
    font-size: 10px;
    color: var(--muted);
    margin-top: 2px;
  }

  /* ── HOW IT WORKS ── */
  #lp-root .how {
    background: var(--bg);
  }
  #lp-root .how-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0;
    margin-top: 52px;
    position: relative;
  }
  #lp-root .how-steps::before {
    content: '';
    position: absolute;
    top: 32px;
    left: 10%;
    right: 10%;
    height: 0.5px;
    background: var(--border);
    z-index: 0;
  }
  #lp-root .how-step {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0 20px;
  }
  #lp-root .how-num {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--card);
    border: 0.5px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: 22px;
    color: var(--purple-l);
    margin-bottom: 20px;
    position: relative;
  }
  #lp-root .how-num::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 0.5px solid rgba(127, 119, 221, 0.3);
  }
  #lp-root .how-step-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  #lp-root .how-step-text {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.7;
  }

  /* ── PLAN ── */
  #lp-root .plan {
    background: var(--surface);
  }
  #lp-root .plan-inner {
    max-width: 700px;
    margin: 0 auto;
    text-align: center;
  }
  #lp-root .plan-card {
    background: var(--card);
    border: 0.5px solid var(--border);
    border-radius: 20px;
    padding: 40px;
    margin-top: 48px;
    position: relative;
    overflow: hidden;
  }
  #lp-root .plan-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--purple), var(--amber));
  }
  #lp-root .plan-name {
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: 28px;
    margin-bottom: 8px;
  }
  #lp-root .plan-price {
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: 52px;
    color: var(--amber);
    margin-bottom: 6px;
  }
  #lp-root .plan-price span {
    font-size: 20px;
    color: var(--muted);
  }
  #lp-root .plan-note {
    font-size: 13px;
    color: var(--muted);
    margin-bottom: 28px;
  }
  #lp-root .plan-items {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    text-align: left;
    margin-bottom: 32px;
  }
  #lp-root .plan-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }
  #lp-root .plan-item::before {
    content: '✓';
    color: var(--green);
    font-weight: 700;
  }
  #lp-root .plan-cta {
    width: 100%;
    padding: 16px;
    background: var(--amber);
    color: #1a0800;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    box-shadow: 0 0 40px rgba(239, 159, 39, 0.25);
  }
  #lp-root .plan-cta:hover {
    background: var(--amber-l);
    box-shadow: 0 0 60px rgba(239, 159, 39, 0.4);
  }
  #lp-root .plan-sub {
    font-size: 12px;
    color: var(--muted);
    margin-top: 12px;
  }

  /* ── TESTIMONIALS ── */
  #lp-root .testi {
    background: var(--bg);
  }
  #lp-root .testi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-top: 52px;
  }
  #lp-root .testi-card {
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 14px;
    padding: 24px;
  }
  #lp-root .testi-stars {
    font-size: 14px;
    color: var(--amber);
    margin-bottom: 12px;
  }
  #lp-root .testi-text {
    font-size: 14px;
    line-height: 1.8;
    color: var(--text);
    margin-bottom: 16px;
  }
  #lp-root .testi-user {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  #lp-root .testi-av {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
  }
  #lp-root .testi-name {
    font-size: 13px;
    font-weight: 700;
  }
  #lp-root .testi-role {
    font-size: 11px;
    color: var(--muted);
  }

  /* ── CTA ── */
  #lp-root .final-cta {
    background: var(--bg);
    padding: 120px 24px;
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
      rgba(127, 119, 221, 0.15) 0%,
      transparent 70%
    );
    pointer-events: none;
  }
  #lp-root .final-cta-title {
    font-family: var(--font-dela-gothic-one), sans-serif;
    font-size: clamp(28px, 5vw, 56px);
    line-height: 1.1;
    margin-bottom: 20px;
  }
  #lp-root .final-cta-title .accent {
    color: var(--amber);
  }
  #lp-root .final-cta-sub {
    font-size: 16px;
    color: var(--muted);
    margin-bottom: 40px;
    line-height: 1.7;
  }

  /* ── FOOTER ── */
  #lp-root footer {
    background: var(--surface);
    border-top: 0.5px solid var(--border);
    padding: 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
  }
  #lp-root .footer-logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  #lp-root .footer-name {
    font-size: 14px;
    font-weight: 700;
  }
  #lp-root .footer-name span {
    color: var(--amber);
  }
  #lp-root .footer-copy {
    font-size: 12px;
    color: var(--muted);
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    #lp-root nav .nav-links {
      display: none;
    }
    #lp-root .feature-block {
      grid-template-columns: 1fr;
    }
    #lp-root .feature-block.rev {
      direction: ltr;
    }
    #lp-root .mockup-body {
      grid-template-columns: 1fr;
    }
    #lp-root .mock-sidebar {
      display: none;
    }
    #lp-root .how-steps::before {
      display: none;
    }
    #lp-root .plan-items {
      grid-template-columns: 1fr;
    }
    #lp-root footer {
      justify-content: center;
      text-align: center;
    }
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

    <!-- HERO -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-grid"></div>
      <div class="hero-badge">
        <div class="hero-badge-dot"></div>
        配信準備とチーム連携を1か所で進めるアプリ
      </div>
      <h1 class="hero-title">
        <span class="br">配信前の連絡と調整を</span>
        <span class="br">ひとつにまとめて</span>
        <span class="br">配信に集中できる毎日へ</span>
      </h1>
      <p class="hero-sub">
        今週の配信予定、コラボ候補日、編集依頼、告知準備まで——<br/>
        <strong>配信活動で実際に発生するやりとり</strong>をまとめて、配信者もスタッフも同じ画面で動けます。
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
                  <div class="mock-day"><div class="mock-day-d">水</div><div class="mock-day-n">13</div><div class="mock-day-dot" style="background:var(--amber-d)"></div></div>
                  <div class="mock-day"><div class="mock-day-d">木</div><div class="mock-day-n">14</div><div class="mock-day-dot" style="background:transparent"></div></div>
                  <div class="mock-day"><div class="mock-day-d">金</div><div class="mock-day-n">15</div><div class="mock-day-dot" style="background:var(--live)"></div></div>
                  <div class="mock-day"><div class="mock-day-d">土</div><div class="mock-day-n">16</div><div class="mock-day-dot" style="background:var(--purple)"></div></div>
                  <div class="mock-day"><div class="mock-day-d">日</div><div class="mock-day-n">17</div><div class="mock-day-dot" style="background:transparent"></div></div>
                </div>
              </div>
              <div class="mock-tasks">
                <div class="mock-tasks-title">本日のタスク</div>
                <div class="mock-task">サムネ確認<div><span class="mock-task-tag" style="background:rgba(127,119,221,0.2);color:var(--purple-l)">編集</span></div></div>
                <div class="mock-task">LIVE配信 20:00〜<div><span class="mock-task-tag" style="background:rgba(255,77,109,0.15);color:var(--live)">LIVE</span></div></div>
                <div class="mock-task">コラボ打ち合わせ<div><span class="mock-task-tag" style="background:rgba(239,159,39,0.15);color:var(--amber-l)">コラボ</span></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- PROBLEM -->
    <section class="problem" id="problem">
      <div class="section-inner">
        <div class="section-eyebrow">こんな悩みありませんか？</div>
        <h2 class="section-title">配信以外の作業が増えるほど<br/>管理の手間が積み上がる</h2>
        <p class="section-sub">配信の本番より前に、確認・共有・調整で時間を使い切ってしまう。そんな日常をまとめて整理するためのLPに変えます。</p>
        <div class="problem-grid">
          <div class="problem-card"><div class="problem-icon">📅</div><div class="problem-head">予定が複数ツールに散らばる</div><div class="problem-text">Googleカレンダー、Discord、DM、メモ帳に情報が分散して、チームの誰が最新情報を持っているのか分からなくなる。</div></div>
          <div class="problem-card"><div class="problem-icon">🎬</div><div class="problem-head">制作タスクの依頼が口頭やDMに流れる</div><div class="problem-text">編集、サムネ、概要欄、切り抜き確認などの細かい依頼が流れて、担当漏れや締切の認識違いが起きやすい。</div></div>
          <div class="problem-card"><div class="problem-icon">🤝</div><div class="problem-head">コラボ日程の確定までが長い</div><div class="problem-text">候補日を出しても返信待ちが続き、確定後にまた別ツールへ転記する。地味な往復が積み重なっていく。</div></div>
          <div class="problem-card"><div class="problem-icon">🔔</div><div class="problem-head">「誰かが覚えている前提」で回っている</div><div class="problem-text">告知、配信前確認、返答待ち、公開作業などが個人の記憶頼みになり、忙しい週ほど抜け漏れが起きやすい。</div></div>
        </div>
        <div class="problem-arrow">
          <div class="line"></div>
          <div class="label">リスケるGGなら「配信前の管理」をひとまとめに 🐿️</div>
          <div class="line"></div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="features" id="features">
      <div class="section-inner">
        <div class="section-eyebrow">できること</div>
        <h2 class="section-title">配信活動のよくある場面を<br/>そのままアプリで回せる</h2>
        <p class="section-sub">単なる機能一覧ではなく、配信者とチームが毎週やっていることを前提に、必要な流れをそのまままとめています。</p>
        <div class="feature-blocks">
          <!-- 機能1 -->
          <div class="feature-block">
            <div>
              <div class="feat-label">ユースケース 01</div>
              <h3 class="feat-title">今週の配信予定を<br/>チーム全員で同時に把握できる</h3>
              <p class="feat-desc">配信枠、収録、コラボ、撮影日をひとつのカレンダーにまとめることで、「今週どこが動くのか」を毎回説明しなくて済みます。配信者が登録した内容を、編集者やマネージャーも同じ温度感で確認できます。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>配信日・コラボ日・撮影日を色分けしてひと目で整理</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>登録した予定がチーム全員にリアルタイムで共有される</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>週表示・月表示を切り替えて直近も全体像も見渡せる</div>
              </div>
            </div>
            <div class="feat-visual">
              <div class="fv-header"><span>📅 スケジュール</span><span class="fv-badge" style="background:rgba(127,119,221,0.15);color:var(--purple-l)">5月 第3週</span></div>
              <div class="cal-mock">
                <div class="cal-week"><div class="cal-wday">月</div><div class="cal-wday">火</div><div class="cal-wday">水</div><div class="cal-wday">木</div><div class="cal-wday">金</div><div class="cal-wday">土</div><div class="cal-wday">日</div></div>
                <div class="cal-week">
                  <div class="cal-wcell"><div class="cal-cell-date">11</div><div class="cal-event" style="background:rgba(127,119,221,0.2);color:var(--purple-l)">LIVE配信</div></div>
                  <div class="cal-wcell today"><div class="cal-cell-date" style="color:var(--purple-l)">12</div><div class="cal-event" style="background:rgba(255,77,109,0.15);color:var(--live)">🔴 LIVE中</div><div class="cal-event" style="background:rgba(239,159,39,0.15);color:var(--amber-l)">コラボMTG</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">13</div><div class="cal-event" style="background:rgba(239,159,39,0.15);color:var(--amber-l)">撮影</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">14</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">15</div><div class="cal-event" style="background:rgba(127,119,221,0.2);color:var(--purple-l)">LIVE配信</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">16</div><div class="cal-event" style="background:rgba(63,207,127,0.15);color:var(--green)">コラボ確定</div></div>
                  <div class="cal-wcell"><div class="cal-cell-date">17</div></div>
                </div>
              </div>
            </div>
          </div>
          <!-- 機能2 -->
          <div class="feature-block rev">
            <div>
              <div class="feat-label">ユースケース 02</div>
              <h3 class="feat-title">コラボ候補日の打診から<br/>確定までを迷子にしない</h3>
              <p class="feat-desc">候補日を投げて、返事を待って、確定後に予定へ反映する。コラボ調整で毎回発生する流れをそのまま扱えるので、DMを遡って確認したり、確定内容を別ツールへ転記したりする手間が減ります。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>候補日を複数提示して相手がワンタップで返答</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>確定した日程がそのままスケジュールへ反映される</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>やりとりの履歴が残るので「どこまで決まったか」を見失わない</div>
              </div>
            </div>
            <div class="feat-visual">
              <div class="fv-header"><span>🤝 コラボ調整</span><span class="fv-badge" style="background:rgba(239,159,39,0.15);color:var(--amber-l)">2件 返答待ち</span></div>
              <div class="collab-mock">
                <div class="collab-card"><div class="collab-av" style="background:rgba(255,77,109,0.2);color:#ff4d6d">KZ</div><div class="collab-info"><div class="collab-name">カズくんGames</div><div class="collab-date">Apex コラボ希望 — 5/18 20:00〜</div></div><div class="collab-btn-row"><button class="c-btn" style="background:rgba(63,207,127,0.15);color:var(--green)">OK</button><button class="c-btn" style="background:rgba(255,77,109,0.1);color:var(--live)">NG</button></div></div>
                <div class="collab-card"><div class="collab-av" style="background:rgba(127,119,221,0.2);color:var(--purple-l)">HN</div><div class="collab-info"><div class="collab-name">ひなたch</div><div class="collab-date">雑談コラボ — 5/20 or 5/21</div></div><div class="collab-btn-row"><button class="c-btn" style="background:rgba(63,207,127,0.15);color:var(--green)">OK</button><button class="c-btn" style="background:rgba(255,77,109,0.1);color:var(--live)">NG</button></div></div>
                <div class="collab-card" style="opacity:0.6"><div class="collab-av" style="background:rgba(63,207,127,0.2);color:var(--green)">PK</div><div class="collab-info"><div class="collab-name">ぺこらch</div><div class="collab-date">確定済 — 5/22 21:00〜</div></div><div style="font-size:11px;color:var(--green);font-weight:700">✓ 確定</div></div>
              </div>
            </div>
          </div>
          <!-- 機能3 -->
          <div class="feature-block">
            <div>
              <div class="feat-label">ユースケース 03</div>
              <h3 class="feat-title">編集・サムネ・告知の進み具合を<br/>聞かなくても共有できる</h3>
              <p class="feat-desc">動画編集、切り抜き、告知画像、概要欄更新などの作業は、小さくても数が多いもの。タスクとして見える化しておけば、配信者が毎回進捗確認をしなくても、チーム全体で「今どこまで進んでいるか」が分かります。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>「やること」「進行中」「完了」で作業状況を共有</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>担当者・締切日を設定して依頼内容を明確にできる</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>完了通知までつなげて確認漏れを減らせる</div>
              </div>
            </div>
            <div class="feat-visual">
              <div class="fv-header"><span>▤ タスクボード</span></div>
              <div class="kb-mock">
                <div>
                  <div class="kb-col-h">TODO</div>
                  <div class="kb-c"><div class="kb-c-title">概要欄テンプレ更新</div><div class="kb-c-foot"><div class="kb-av" style="background:rgba(127,119,221,0.3);color:var(--purple-l)">RK</div><div class="kb-due">5/14</div></div></div>
                  <div class="kb-c"><div class="kb-c-title">Shorts台本 3本</div><div class="kb-c-foot"><div class="kb-av" style="background:rgba(239,159,39,0.3);color:var(--amber-l)">TK</div><div class="kb-due">5/16</div></div></div>
                </div>
                <div>
                  <div class="kb-col-h" style="color:var(--amber)">進行中</div>
                  <div class="kb-c" style="border-color:var(--amber-d)"><div class="kb-c-title">4月振り返り動画 編集</div><div class="kb-c-foot"><div class="kb-av" style="background:rgba(63,207,127,0.3);color:var(--green)">SA</div><div class="kb-due">5/13</div></div></div>
                  <div class="kb-c" style="border-color:var(--amber-d)"><div class="kb-c-title">サムネイル 3本</div><div class="kb-c-foot"><div class="kb-av" style="background:rgba(239,159,39,0.3);color:var(--amber-l)">MG</div><div class="kb-due">5/12</div></div></div>
                </div>
                <div>
                  <div class="kb-col-h" style="color:var(--green)">完了</div>
                  <div class="kb-c" style="opacity:0.55"><div class="kb-c-title">先週LIVE アーカイブ公開</div><div class="kb-c-foot"><div class="kb-av" style="background:rgba(127,119,221,0.3);color:var(--purple-l)">RK</div><div class="kb-due">5/11</div></div></div>
                  <div class="kb-c" style="opacity:0.55"><div class="kb-c-title">Short素材 撮影 2本</div><div class="kb-c-foot"><div class="kb-av" style="background:rgba(127,119,221,0.3);color:var(--purple-l)">RK</div><div class="kb-due">5/12</div></div></div>
                </div>
              </div>
            </div>
          </div>
          <!-- 機能4 -->
          <div class="feature-block rev">
            <div>
              <div class="feat-label">ユースケース 04</div>
              <h3 class="feat-title">返答待ちや直前確認を<br/>通知で拾って抜け漏れを防げる</h3>
              <p class="feat-desc">忙しい週ほど、確認するべきことは増えていきます。LIVE前のリマインダーに加えて、コラボ返答やタスク完了も拾えるので、「誰かが覚えているはず」に頼らない運用へ変えられます。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>LIVE開始前に自動リマインダー（全プラン）</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>コラボ返答・タスク完了を即通知（PARTYプラン）</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>スマホのホーム画面に追加して、日常の確認導線を短くできる</div>
              </div>
            </div>
            <div class="feat-visual">
              <div class="fv-header"><span>🔔 通知センター</span><span class="fv-badge" style="background:rgba(255,77,109,0.15);color:var(--live)">3件 未読</span></div>
              <div class="notif-mock">
                <div class="notif-row"><div class="notif-icon">🔴</div><div><div class="notif-text"><strong>LIVE開始まで1時間</strong>です。配信タイトルを確認しましょう。</div><div class="notif-time">全プラン — 19:00 に通知予定</div></div></div>
                <div class="notif-row"><div class="notif-icon">🤝</div><div><div class="notif-text"><strong>カズくんGames</strong> からコラボ打診が届きました。</div><div class="notif-time">PARTYプランのみ — 2時間前</div></div></div>
                <div class="notif-row"><div class="notif-icon">✅</div><div><div class="notif-text">タスク「サムネイルデザイン」が<strong>完了</strong>しました。</div><div class="notif-time">PARTYプランのみ — 3時間前</div></div></div>
                <div class="notif-row" style="opacity:0.5"><div class="notif-icon">📅</div><div><div class="notif-text"><strong>明日 20:00</strong> にLIVE配信が予定されています。</div><div class="notif-time">全プラン — 昨日</div></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- USECASES -->
    <section class="usecases" id="usecases">
      <div class="section-inner">
        <div class="section-eyebrow">活用例</div>
        <h2 class="section-title">「自分たちならどう使うか」が<br/>想像しやすいユースケース</h2>
        <p class="section-sub">個人配信から小規模チーム運営まで、配信活動の規模に合わせて導入しやすい使い方をまとめました。</p>
        <div class="usecase-grid">
          <div class="usecase-card">
            <div class="usecase-label">個人配信者</div>
            <div class="usecase-title">配信・撮影・告知を<br/>ひとりでも整理しやすい</div>
            <div class="usecase-text">配信日、収録日、ショート動画の投稿、告知タイミングを1か所に並べて管理できます。頭の中だけで回していた予定を可視化するだけでも、週ごとの負荷がかなり変わります。</div>
            <div class="usecase-points">
              <div class="usecase-point">今週やることを時系列で見直せる</div>
              <div class="usecase-point">告知や公開作業の抜け漏れを減らせる</div>
            </div>
          </div>
          <div class="usecase-card">
            <div class="usecase-label">配信者 + 編集者</div>
            <div class="usecase-title">依頼と締切を明文化して<br/>確認コストを減らせる</div>
            <div class="usecase-text">動画編集、サムネ制作、概要欄調整などをタスク化することで、「これお願いしたっけ？」を減らせます。配信者と編集者の認識差を埋めるのに向いています。</div>
            <div class="usecase-points">
              <div class="usecase-point">担当者と締切をセットで共有できる</div>
              <div class="usecase-point">進捗確認のためのDM往復を減らせる</div>
            </div>
          </div>
          <div class="usecase-card">
            <div class="usecase-label">コラボ多めの配信者</div>
            <div class="usecase-title">候補日提示から確定までを<br/>迷わず進めやすい</div>
            <div class="usecase-text">複数の相手と同時進行でコラボ調整しているときでも、誰に何を送って、どこまで返事が来ているかを追いやすくなります。確定後の予定反映までつながるのが強みです。</div>
            <div class="usecase-points">
              <div class="usecase-point">返答待ちの案件をまとめて確認できる</div>
              <div class="usecase-point">確定内容の転記漏れを防ぎやすい</div>
            </div>
          </div>
          <div class="usecase-card">
            <div class="usecase-label">マネージャー同席チーム</div>
            <div class="usecase-title">本人・運営・制作が<br/>同じ予定表を見て動ける</div>
            <div class="usecase-text">配信者本人だけでなく、マネージャーや運営スタッフも同じ情報を見られるため、日程確認の属人化を防げます。口頭確認に頼らず、チーム運営を安定させたいケースに向いています。</div>
            <div class="usecase-points">
              <div class="usecase-point">連絡窓口が増えても情報が散りにくい</div>
              <div class="usecase-point">配信前確認の抜け漏れをチームで補える</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="how" id="how">
      <div class="section-inner">
        <div class="section-eyebrow">使い方</div>
        <h2 class="section-title">始め方はシンプル。<br/>使い始めた瞬間に整理が進む</h2>
        <p class="section-sub">最初の設定は軽く、価値はすぐに体感できる構成です。配信活動に必要な情報を入れたその日から、チームの見え方が変わります。</p>
        <div class="how-steps">
          <div class="how-step"><div class="how-num">1</div><div class="how-step-title">Googleで<br/>ログイン</div><div class="how-step-text">Googleアカウントですぐ開始。思い立ったタイミングで、まずは自分の予定整理から着手できます。</div></div>
          <div class="how-step"><div class="how-num">2</div><div class="how-step-title">チームを作って<br/>メンバーを招待</div><div class="how-step-text">編集スタッフやマネージャーを招待すれば、同じカレンダーとタスクを見ながら会話できます。</div></div>
          <div class="how-step"><div class="how-num">3</div><div class="how-step-title">予定と作業を登録して<br/>運用スタート</div><div class="how-step-text">今週の配信予定や依頼中の作業を入れるだけで、確認・共有・調整の流れがひとつにまとまります。</div></div>
        </div>
      </div>
    </section>

    <!-- PLAN -->
    <section class="plan" id="plan">
      <div class="plan-inner">
        <div style="text-align:center">
          <div class="section-eyebrow">料金プラン</div>
          <h2 class="section-title">2つのプランで<br/>どんなチームにも対応</h2>
          <p class="section-sub" style="margin:0 auto">まずは個人や少人数の整理から始めて、連携量が増えたら拡張できます。導入段階に合わせて選びやすい料金です。</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:40px">
          <div class="plan-card" style="position:relative">
            <div class="plan-name">LIGHT</div>
            <div class="plan-price">¥0 <span>/ 月</span></div>
            <div class="plan-note">クレジットカード不要・ずっと無料</div>
            <div class="plan-items" style="margin-bottom:8px">
              <div class="plan-item">メンバー 2人まで</div>
              <div class="plan-item">スケジュール登録 無制限</div>
              <div class="plan-item">タスク 月5件まで</div>
              <div class="plan-item">コラボ調整 月3件まで</div>
              <div class="plan-item">LIVEリマインダー通知</div>
              <div class="plan-item">スマホ・PC 両対応</div>
            </div>
            <div style="font-size:12px;color:#ef9f27;background:rgba(239,159,39,0.1);border-radius:8px;padding:8px 12px;margin-bottom:16px">⚠️ バナー広告あり</div>
            <button class="plan-cta" style="background:rgba(127,119,221,0.15);color:#a0a0ff;box-shadow:none">無料で始める →</button>
          </div>
          <div class="plan-card" style="position:relative">
            <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#ef9f27;color:#1a0800;font-size:11px;font-weight:700;padding:4px 16px;border-radius:99px;white-space:nowrap">おすすめ</div>
            <div class="plan-name">PARTY</div>
            <div class="plan-price">¥1,500 <span>/ 人・月</span></div>
            <div class="plan-note">メンバー全員が個別に支払う方式 · 14日間無料</div>
            <div class="plan-items" style="margin-bottom:8px">
              <div class="plan-item">メンバー 無制限</div>
              <div class="plan-item">スケジュール登録 無制限</div>
              <div class="plan-item">タスク 無制限</div>
              <div class="plan-item">コラボ調整 無制限</div>
              <div class="plan-item">全通知（コラボ返答・タスク更新）</div>
              <div class="plan-item">スマホ・PC 両対応</div>
            </div>
            <div style="font-size:12px;color:#3fcf7f;background:rgba(63,207,127,0.1);border-radius:8px;padding:8px 12px;margin-bottom:16px">✓ 広告なし</div>
            <button class="plan-cta">14日無料で試す →</button>
            <div class="plan-sub">例）3人チームで ¥4,500 / 月</div>
          </div>
        </div>
      </div>
    </section>

    <!-- TESTIMONIALS -->
    <section class="testi">
      <div class="section-inner">
        <div class="section-eyebrow">導入後の変化</div>
        <h2 class="section-title">「何がラクになったか」が<br/>伝わるユーザーの声</h2>
        <div class="testi-grid">
          <div class="testi-card"><div class="testi-stars">★★★★★</div><div class="testi-text">「コラボの日程調整がDMじゃなくなっただけで、めちゃくちゃ楽になりました。相手もOKをタップするだけなので断然スムーズ。」</div><div class="testi-user"><div class="testi-av" style="background:rgba(255,77,109,0.2);color:var(--live)">KZ</div><div><div class="testi-name">カズくんGames</div><div class="testi-role">Twitch配信者 / フォロワー4.2万</div></div></div></div>
          <div class="testi-card"><div class="testi-stars">★★★★★</div><div class="testi-text">「編集スタッフとのやりとりが全部ここで完結するようになってから、LINEの未読が激減しました。配信に集中できるようになった！」</div><div class="testi-user"><div class="testi-av" style="background:rgba(127,119,221,0.2);color:var(--purple-l)">HN</div><div><div class="testi-name">ひなたch</div><div class="testi-role">YouTube配信者 / 登録者1.8万</div></div></div></div>
          <div class="testi-card"><div class="testi-stars">★★★★☆</div><div class="testi-text">「スケジュールをマネージャーと共有できるのがすごく助かってます。『今週どうする？』ってSlackで聞かれることがなくなった。」</div><div class="testi-user"><div class="testi-av" style="background:rgba(63,207,127,0.2);color:var(--green)">RN</div><div><div class="testi-name">レイノスゲーム</div><div class="testi-role">YouTube / Twitch配信者 / 登録者8.6万</div></div></div></div>
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="final-cta">
      <div class="section-inner" style="max-width:700px;margin:0 auto">
        <h2 class="final-cta-title">管理のための時間を減らして<br/><span class="accent">配信に集中</span>しよう</h2>
        <p class="final-cta-sub">予定共有、コラボ調整、制作進行、通知確認——<br/>配信前後の細かい管理を整理して、あなたとチームが本番に集中できる状態をつくります。</p>
        <div class="hero-btns">
          <a href="/login" class="btn-primary">無料で始める →</a>
          <a href="#usecases" class="btn-secondary">活用例をもっと見る</a>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer>
      <div class="footer-logo">
        <div class="nav-logo-icon" style="width:28px;height:28px;border-radius:7px">
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
      <div class="footer-copy">© 2026 リスケるGG — 撮影も、コラボも、編集もGGなスケジュールを</div>
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
