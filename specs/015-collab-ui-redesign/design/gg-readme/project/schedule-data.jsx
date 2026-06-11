// schedule-data.jsx — categories, June 2026 events, calendar layout helpers
// "Today" anchor = 2026-06-04 (木) to match the dashboard's 6/04 stream.

const SCH_TODAY = { y: 2026, m: 6, d: 4 };

const CATS = {
  stream: { key: 'stream', label: '配信',   icon: 'video',  color: '#8f88e8', bg: 'rgba(127,119,221,0.16)' },
  song:   { key: 'song',   label: '歌枠',   icon: 'play',   color: '#ec4f95', bg: 'rgba(236,79,149,0.15)' },
  collab: { key: 'collab', label: 'コラボ', icon: 'collab', color: '#5bc8fa', bg: 'rgba(91,200,250,0.15)' },
  rec:    { key: 'rec',    label: '収録',   icon: 'video',  color: '#ef9f27', bg: 'rgba(239,159,39,0.15)' },
  chat:   { key: 'chat',   label: '雑談',   icon: 'msg',    color: '#3dd68c', bg: 'rgba(61,214,140,0.14)' },
  event:  { key: 'event',  label: '記念',   icon: 'trophy', color: '#c9a3ff', bg: 'rgba(201,163,255,0.16)' },
};
const CAT_ORDER = ['stream', 'song', 'collab', 'rec', 'chat', 'event'];

// helper to build a date
const D = (y, mo, da, h = 0, mi = 0) => new Date(y, mo - 1, da, h, mi);

// id, title, cat, start, end, allDay, member, note
const SCH_EVENTS = [
  { id: 1,  title: '朝活雑談',            cat: 'chat',   start: D(2026,6,1,10,0),  end: D(2026,6,1,11,0),  member: 'アオ', note: 'ゆるっと近況トーク。' },
  { id: 2,  title: 'APEX ソロランク',     cat: 'stream', start: D(2026,6,1,21,0),  end: D(2026,6,1,23,30), member: 'ソラ', note: 'プラチナ帯から。' },
  { id: 3,  title: 'サムネ撮影・収録',     cat: 'rec',    start: D(2026,6,2,14,0),  end: D(2026,6,2,16,0),  member: 'カエ', note: '新シリーズ用の素材撮り。' },
  { id: 4,  title: '弾き語り歌枠',        cat: 'song',   start: D(2026,6,2,20,0),  end: D(2026,6,2,22,0),  member: 'ミナ', note: 'リクエスト中心。' },
  { id: 5,  title: 'コラボ打ち合わせ',    cat: 'collab', start: D(2026,6,3,19,0),  end: D(2026,6,3,20,0),  member: 'アオ', note: '猫宮ねねさんと進行確認。' },
  // multi-day
  { id: 6,  title: '新衣装お披露目 準備週間', cat: 'event', start: D(2026,6,3,0,0), end: D(2026,6,5,23,59), allDay: true, member: 'ミナ', note: 'お披露目配信に向けた仕込み期間。' },
  { id: 7,  title: 'ランチ雑談',          cat: 'chat',   start: D(2026,6,4,12,0),  end: D(2026,6,4,13,0),  member: 'アオ', note: '視聴者とまったり。' },
  { id: 8,  title: '猫宮ねね FPS 3人スク', cat: 'collab', start: D(2026,6,4,21,0),  end: D(2026,6,4,23,30), member: 'ソラ', note: 'APEX 3人スクワッド。要返答案件。' },
  { id: 9,  title: 'デュエット歌枠リレー', cat: 'song',   start: D(2026,6,5,20,0),  end: D(2026,6,5,22,0),  member: 'ミナ', note: '蛍ホタルさんとコラボ。' },
  { id: 10, title: '100万人記念 配信',    cat: 'event',  start: D(2026,6,6,19,0),  end: D(2026,6,6,22,0),  member: 'アオ', note: '特別ゲストあり。' },
  // multi-day
  { id: 11, title: 'リスナー投票キャンペーン', cat: 'stream', start: D(2026,6,6,0,0), end: D(2026,6,9,23,59), allDay: true, member: 'カエ', note: '次回コラボ相手を投票で決定。' },
  { id: 12, title: '雑談・お便り回',      cat: 'chat',   start: D(2026,6,9,22,0),  end: D(2026,6,9,23,30), member: 'アオ', note: 'お便り消化回。' },
  { id: 13, title: 'ホラーゲーム実況',    cat: 'stream', start: D(2026,6,11,21,0), end: D(2026,6,11,23,0), member: 'ソラ', note: '新作ホラー。' },
  { id: 14, title: 'コラボ歌枠',          cat: 'collab', start: D(2026,6,13,20,0), end: D(2026,6,13,22,0), member: 'ミナ', note: '合同歌枠。' },
  { id: 15, title: '週間振り返り配信',    cat: 'stream', start: D(2026,6,14,19,0), end: D(2026,6,14,20,30), member: 'アオ', note: '今週のまとめ。' },
  { id: 16, title: '編集もくもく収録',    cat: 'rec',    start: D(2026,6,16,15,0), end: D(2026,6,16,17,0), member: 'カエ', note: '切り抜き素材の収録。' },
  { id: 17, title: '記念グッズ告知',      cat: 'event',  start: D(2026,6,18,20,0), end: D(2026,6,18,21,0), member: 'ミナ', note: '受注期間スタート。' },
  { id: 18, title: 'APEX ランク詰め',     cat: 'stream', start: D(2026,6,20,21,0), end: D(2026,6,20,23,59), member: 'ソラ', note: 'ダイヤ目標。' },
  { id: 19, title: '月末お疲れ雑談',      cat: 'chat',   start: D(2026,6,27,22,0), end: D(2026,6,27,23,30), member: 'アオ', note: '一か月の振り返り。' },
];

/* ---------- helpers ---------- */
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isMultiDay = (e) => !sameDay(e.start, e.end);
const fmtTime = (dt) => `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
const dayStart = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

// events overlapping a given date (Date at 00:00) split into multi-day & single, each sorted per spec
function eventsForDay(date) {
  const ds = dayStart(date).getTime();
  const multi = SCH_EVENTS.filter((e) => isMultiDay(e) && dayStart(e.start).getTime() <= ds && dayStart(e.end).getTime() >= ds)
    .sort((a, b) => a.start - b.start); // 開始日が早い順
  const single = SCH_EVENTS.filter((e) => !isMultiDay(e) && sameDay(e.start, date))
    .sort((a, b) => a.start - b.start); // 開始時間が早い順
  return { multi, single };
}

// 6-week month matrix (weeks start Sunday)
function monthMatrix(year, month) {
  const first = new Date(year, month - 1, 1);
  const startOffset = first.getDay(); // 0=Sun
  const gridStart = new Date(year, month - 1, 1 - startOffset);
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7 + d);
      days.push({ date: dt, inMonth: dt.getMonth() === month - 1, dow: dt.getDay() });
    }
    weeks.push(days);
  }
  // trim trailing all-out week if 6th is fully outside month
  if (weeks[5].every((c) => !c.inMonth)) weeks.pop();
  return weeks;
}

// multi-day bars for a single week row: returns [{e, colStart(0-6), span, continuesLeft, continuesRight}]
function weekBars(weekDays) {
  const wkStart = dayStart(weekDays[0].date).getTime();
  const wkEnd = dayStart(weekDays[6].date).getTime();
  const bars = SCH_EVENTS
    .filter((e) => isMultiDay(e) && dayStart(e.start).getTime() <= wkEnd && dayStart(e.end).getTime() >= wkStart)
    .sort((a, b) => a.start - b.start);
  return bars.map((e) => {
    const es = dayStart(e.start).getTime(), ee = dayStart(e.end).getTime();
    let colStart = 0, colEnd = 6;
    for (let i = 0; i < 7; i++) {
      const t = dayStart(weekDays[i].date).getTime();
      if (t === es) colStart = i;
      if (t === ee) colEnd = i;
    }
    if (es < wkStart) colStart = 0;
    if (ee > wkEnd) colEnd = 6;
    return { e, colStart, span: colEnd - colStart + 1, continuesLeft: es < wkStart, continuesRight: ee > wkEnd };
  });
}

// week (Sun..Sat) containing a given date
function weekOf(date) {
  const s = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + i));
}

const WD_JP = ['日', '月', '火', '水', '木', '金', '土'];

Object.assign(window, {
  CATS, CAT_ORDER, SCH_EVENTS, SCH_TODAY, WD_JP,
  sameDay, isMultiDay, fmtTime, dayStart, eventsForDay, monthMatrix, weekBars, weekOf,
});
