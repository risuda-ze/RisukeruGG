// collab-data.jsx — コラボ調整: ステータス定義・参加者・コラボ案件・ヘルパー
const { WD_JP } = window;

/* ---------------------------------------------------------------
   ステータス（3段階）
   --------------------------------------------------------------- */
const CB_STATUS = {
  prep:    { key: 'prep',    base: '準備中', zone: 'adjust' },
  recruit: { key: 'recruit', base: '募集中', zone: 'adjust' },
  fixed:   { key: 'fixed',   base: '確定',   zone: 'fixed'  },
};
const CB_STATUS_ORDER = ['prep', 'recruit', 'fixed'];

function statusLabel(key) {
  const s = CB_STATUS[key];
  return s ? s.base : '';
}

/* ---------------------------------------------------------------
   参加者（自メンバー + コラボ相手ゲスト）
   --------------------------------------------------------------- */
const CB_MEMBERS = {
  'アオ':       { tone: 'v', guest: false },
  'ソラ':       { tone: 'c', guest: false },
  'カエ':       { tone: 'o', guest: false },
  'ミナ':       { tone: 'p', guest: false },
  '猫宮ねね':   { tone: 'm', guest: true },
  '蛍ホタル':   { tone: 'g', guest: true },
  '鳴海カイト': { tone: 'c', guest: true },
  '星乃ルカ':   { tone: 'p', guest: true },
  '獅子王ガク': { tone: 'o', guest: true },
};
const CB_MEMBER_OPTIONS = Object.keys(CB_MEMBERS);

/* ---------------------------------------------------------------
   候補日時を作るヘルパー  cand(月, 日, 時, 分, OK, MAYBE, NG)
   --------------------------------------------------------------- */
const cand = (mo, d, h, mi, ok, maybe, ng) => {
  const wd = WD_JP[new Date(2026, mo - 1, d).getDay()];
  return { y: 2026, m: mo, d, wd, h, mi, ok, maybe, ng };
};

/* ---------------------------------------------------------------
   コラボ案件
   --------------------------------------------------------------- */
const COLLABS = [
  {
    id: 1, status: 'recruit',
    title: '猫宮ねね × 3人スクワッド APEX',
    desc: 'APEX 3人スクワッド配信。猫宮ねねさん＋うち2名で参加。視聴者参加型ランクマも検討中。',
    members: ['アオ', 'ソラ', '猫宮ねね'],
    answered: 1, total: 3,
    candidates: [
      cand(6, 7, 21, 0, 2, 1, 0),
      cand(6, 8, 21, 0, 1, 1, 1),
      cand(6, 10, 22, 0, 3, 0, 0),
    ],
    creator: 'アオ', createdAt: '6/2 18:40',
    updater: 'ソラ', updatedAt: '6/4 09:15',
    comments: [
      { id: 1, by: '猫宮ねね', me: false, time: '6/3 20:10', text: '10日の22時が一番動きやすいです！よろしくお願いします🐱' },
      { id: 2, by: 'アオ', me: true,  time: '6/3 20:24', text: 'ありがとうございます！残りメンバーの回答待ってから確定しますね〜' },
    ],
  },
  {
    id: 2, status: 'recruit',
    title: '蛍ホタル デュエット歌枠',
    desc: '合同歌枠リレー。selected曲のキー合わせを事前にすり合わせ。',
    members: ['ミナ', '蛍ホタル'],
    answered: 1, total: 2,
    candidates: [
      cand(6, 9, 20, 0, 1, 0, 0),
      cand(6, 12, 20, 0, 1, 0, 0),
    ],
    creator: 'ミナ', createdAt: '6/1 12:00',
    updater: 'ミナ', updatedAt: '6/3 22:30',
    comments: [
      { id: 1, by: '蛍ホタル', me: false, time: '6/3 21:50', text: '9日空けておきます〜！セトリ後で送ります' },
    ],
  },
  {
    id: 3, status: 'prep',
    title: '大型合同 自作ゲーム実況リレー',
    desc: '5名規模の合同企画。役割分担と進行台本はこれから。日程候補もまず叩き台を用意中。',
    members: ['アオ', 'カエ', '鳴海カイト', '星乃ルカ', '獅子王ガク'],
    answered: 0, total: 5,
    candidates: [
      cand(6, 15, 19, 0, 0, 0, 0),
      cand(6, 16, 19, 0, 0, 0, 0),
    ],
    creator: 'カエ', createdAt: '6/4 10:05',
    updater: 'カエ', updatedAt: '6/4 10:05',
    comments: [],
  },
  {
    id: 4, status: 'prep',
    title: '新人コラボ 初顔合わせ雑談',
    desc: '初コラボの顔合わせ雑談。ゆるめに30〜60分想定。日程はまだ仮。',
    members: ['ソラ', '星乃ルカ'],
    answered: 0, total: 2,
    candidates: [ cand(6, 18, 21, 0, 0, 0, 0) ],
    creator: 'ソラ', createdAt: '6/4 09:40',
    updater: 'ソラ', updatedAt: '6/4 09:40',
    comments: [],
  },
  {
    id: 5, status: 'fixed',
    title: '100万人記念 合同配信',
    desc: '記念配信に各メンバー＋ゲスト集合。タイムテーブルは別途タスクで管理。',
    members: ['アオ', 'ソラ', 'カエ', 'ミナ', '猫宮ねね'],
    answered: 5, total: 5,
    candidates: [ cand(6, 6, 19, 0, 5, 0, 0) ],
    fixedIdx: 0,
    creator: 'アオ', createdAt: '5/28 14:00',
    updater: 'アオ', updatedAt: '6/2 11:20',
    comments: [
      { id: 1, by: 'ミナ', me: false, time: '6/2 11:00', text: '6日19時で全員OKでした！確定しちゃいましょう🎉' },
      { id: 2, by: 'アオ', me: true,  time: '6/2 11:20', text: '確定しました！当日よろしくお願いします〜' },
    ],
  },
  {
    id: 6, status: 'fixed',
    title: 'ホラゲ2人実況コラボ',
    desc: '新作ホラーを2人で。ビビり耐性ゼロ同士の悲鳴コラボ。',
    members: ['ソラ', '鳴海カイト'],
    answered: 2, total: 2,
    candidates: [ cand(6, 11, 21, 0, 2, 0, 0) ],
    fixedIdx: 0,
    creator: 'ソラ', createdAt: '5/30 19:30',
    updater: '鳴海カイト', updatedAt: '6/1 20:10',
    comments: [],
  },
];

/* ---------- ヘルパー ---------- */
const collabsByZone = (zone) => COLLABS.filter((c) => CB_STATUS[c.status].zone === zone);
const remaining    = (c) => Math.max(0, c.total - c.answered);
const fmtCand      = (k) => `${k.m}/${k.d}（${k.wd}） ${String(k.h).padStart(2,'0')}:${String(k.mi).padStart(2,'0')}`;
const fixedCand    = (c) => (c.fixedIdx != null ? c.candidates[c.fixedIdx] : null);

Object.assign(window, {
  CB_STATUS, CB_STATUS_ORDER, statusLabel,
  CB_MEMBERS, CB_MEMBER_OPTIONS, COLLABS,
  collabsByZone, remaining, fmtCand, fixedCand,
});
