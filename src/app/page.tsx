import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'リスケるGG — 撮影も、コラボも、編集もGGなスケジュールを',
  description: '配信者向けチームスケジュール管理アプリ',
};

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
    font-family: 'Zen Kaku Gothic New', sans-serif;
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
    font-family: 'Dela Gothic One', sans-serif;
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
    font-family: 'Dela Gothic One', sans-serif;
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
    font-family: 'Dela Gothic One', sans-serif;
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
    font-family: 'Dela Gothic One', sans-serif;
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
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 28px;
    margin-bottom: 8px;
  }
  #lp-root .plan-price {
    font-family: 'Dela Gothic One', sans-serif;
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
    font-family: 'Dela Gothic One', sans-serif;
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
        ゲーム配信者のための予定管理アプリ
      </div>
      <h1 class="hero-title">
        <span class="br">撮影も、コラボも、</span>
        <span class="br">編集も<span class="gg">GG</span>な</span>
        <span class="br">スケジュールを</span>
      </h1>
      <p class="hero-sub">
        配信スケジュールの管理からコラボ調整、編集タスクまで——<br/>
        <strong>配信者とチームが必要なものだけ</strong>を、ひとつのアプリにまとめました。
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
        <h2 class="section-title">配信者の「あるある」を<br/>全部解決</h2>
        <p class="section-sub">専用ツールがないせいで、本来配信に使うべき時間が管理業務に消えていませんか？</p>
        <div class="problem-grid">
          <div class="problem-card"><div class="problem-icon">📅</div><div class="problem-head">コラボの日程がDMだらけ</div><div class="problem-text">TwitterのDMやDiscordで調整して、結局どこかに記録が残っていない。当日になって「あれ、何時だっけ？」が起きる。</div></div>
          <div class="problem-card"><div class="problem-icon">🎬</div><div class="problem-head">編集スタッフへの連絡が大変</div><div class="problem-text">「この動画いつアップ？」「サムネどうする？」——毎回LINEやDMで確認しているうちに、締切を過ぎてしまう。</div></div>
          <div class="problem-card"><div class="problem-icon">🔔</div><div class="problem-head">告知を忘れる・ミスる</div><div class="problem-text">配信前の告知ツイートを忘れたり、時間を間違えてツイートしたり。ファンへの信頼が少しずつ削れていく。</div></div>
          <div class="problem-card"><div class="problem-icon">😰</div><div class="problem-head">スケジュールが頭の中にしかない</div><div class="problem-text">配信日・コラボ日・撮影日がすべて自分の頭の中。スタッフや共同作業者に毎回ゼロから説明する。</div></div>
        </div>
        <div class="problem-arrow">
          <div class="line"></div>
          <div class="label">リスケるGGなら全部まとめて解決 🐿️</div>
          <div class="line"></div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="features" id="features">
      <div class="section-inner">
        <div class="section-eyebrow">機能紹介</div>
        <h2 class="section-title">必要なものだけ。<br/>全部入ってる。</h2>
        <p class="section-sub">「あれば便利」じゃなく「これがないと困る」機能だけを厳選。複雑な設定なし、すぐ使えます。</p>
        <div class="feature-blocks">
          <!-- 機能1 -->
          <div class="feature-block">
            <div>
              <div class="feat-label">機能 01</div>
              <h3 class="feat-title">配信スケジュールを<br/>チーム全員で共有</h3>
              <p class="feat-desc">今週どの日にLIVEするか、コラボはいつか——カレンダーにまとめるだけでスタッフ全員が同じ情報を見られます。もう毎回連絡しなくて大丈夫。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>配信日・コラボ日・撮影日を色分けして管理</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>登録した予定がチーム全員にリアルタイムで反映</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>週表示・月表示を切り替えて全体を把握</div>
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
              <div class="feat-label">機能 02</div>
              <h3 class="feat-title">コラボ打診から確定まで<br/>アプリ内で完結</h3>
              <p class="feat-desc">「この日どう？」「その日はちょっと…」——DM往復をなくして、候補日を提示するだけで相手がOK/NGを返せます。確定した日程は自動でカレンダーに入ります。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>候補日を複数提示して相手がワンタップで返答</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>確定した日程が自動でスケジュールに追加</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>コラボ履歴が残るので過去のやりとりも確認可能</div>
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
              <div class="feat-label">機能 03</div>
              <h3 class="feat-title">編集・サムネ・告知——<br/>作業の進み具合を見える化</h3>
              <p class="feat-desc">「あの動画の編集、どこまで進んでる？」を毎回聞かなくても大丈夫。カードを動かすだけで進捗が全員に伝わります。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>「やること」「進行中」「完了」の3ステップで管理</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>担当者・締切日を設定してスタッフに依頼</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>完了したら自動で通知が届く</div>
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
              <div class="feat-label">機能 04</div>
              <h3 class="feat-title">大事なことを<br/>見逃さない通知</h3>
              <p class="feat-desc">LIVE前のリマインダーは無料でも届きます。PARTYプランならコラボの返答やタスク完了もリアルタイムで通知。配信者とチームの全員が同じ情報を同じタイミングで受け取れます。</p>
              <div class="feat-points">
                <div class="feat-point"><div class="feat-point-dot">✓</div>LIVE開始前に自動リマインダー（全プラン）</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>コラボ返答・タスク完了を即通知（PARTYプラン）</div>
                <div class="feat-point"><div class="feat-point-dot">✓</div>スマホのホーム画面にアプリとして追加可能</div>
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

    <!-- HOW IT WORKS -->
    <section class="how" id="how">
      <div class="section-inner">
        <div class="section-eyebrow">使い方</div>
        <h2 class="section-title">3ステップで<br/>今日から使える</h2>
        <p class="section-sub">アカウント作成から実際に使い始めるまで、5分もかかりません。難しい設定は一切なし。</p>
        <div class="how-steps">
          <div class="how-step"><div class="how-num">1</div><div class="how-step-title">Googleで<br/>ログイン</div><div class="how-step-text">Googleアカウントがあればすぐ始められます。パスワード登録も不要。</div></div>
          <div class="how-step"><div class="how-num">2</div><div class="how-step-title">チームを作って<br/>メンバーを招待</div><div class="how-step-text">編集スタッフ、マネージャーをリンクで招待するだけ。すぐに共有カレンダーが使えます。</div></div>
          <div class="how-step"><div class="how-num">3</div><div class="how-step-title">配信枠を登録して<br/>GGスタート</div><div class="how-step-text">今週の配信予定を入れるだけ。コラボ調整もタスク管理も、全部ここから。</div></div>
        </div>
      </div>
    </section>

    <!-- PLAN -->
    <section class="plan" id="plan">
      <div class="plan-inner">
        <div style="text-align:center">
          <div class="section-eyebrow">料金プラン</div>
          <h2 class="section-title">2つのプランで<br/>どんなチームにも対応</h2>
          <p class="section-sub" style="margin:0 auto">まずはLIGHTで無料スタート。チームが動き始めたらPARTYへ。</p>
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
        <div class="section-eyebrow">ユーザーの声</div>
        <h2 class="section-title">使った配信者から<br/>届いた声</h2>
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
        <h2 class="final-cta-title">今日から配信に<br/><span class="accent">全集中</span>しよう</h2>
        <p class="final-cta-sub">スケジュール管理、コラボ調整、チーム連携——<br/>面倒なことはリスケるGGに任せて、あなたは配信だけ考えていてください。</p>
        <div class="hero-btns">
          <a href="/login" class="btn-primary">無料で始める →</a>
          <a href="#features" class="btn-secondary">機能をもっと見る</a>
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
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Dela+Gothic+One&display=swap"
        rel="stylesheet"
      />
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: LP_CSS }} />
      <div
        id="lp-root"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: LP_HTML }}
      />
    </>
  );
}
