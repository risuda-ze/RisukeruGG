// task-data.jsx — task statuses (kanban columns), categories, tasks, helpers
// Reuses SCH_TODAY (2026-06-04 木) + dayStart from schedule-data.jsx.
const { SCH_TODAY, WD_JP, dayStart } = window;

/* ---- ステータス列（ユーザーが自由に設定できる想定） ---- */
const STATUSES = [
  { key: 'todo',   label: '未着手',       color: '#7a7ab0' },
  { key: 'doing',  label: '進行中',       color: '#5bc8fa' },
  { key: 'review', label: 'レビュー待ち', color: '#ef9f27' },
  { key: 'done',   label: '完了',         color: '#3dd68c' },
];

/* ---- タスクカテゴリ（ユーザーが自由に設定できる想定） ---- */
const TCATS = {
  edit:   { key: 'edit',   label: '動画編集',   icon: 'video',    color: '#8f88e8', bg: 'rgba(127,119,221,0.16)' },
  prep:   { key: 'prep',   label: '配信準備',   icon: 'calendar', color: '#5bc8fa', bg: 'rgba(91,200,250,0.15)' },
  thumb:  { key: 'thumb',  label: 'サムネ作成', icon: 'eye',      color: '#ec4f95', bg: 'rgba(236,79,149,0.15)' },
  sns:    { key: 'sns',    label: '告知・SNS',  icon: 'msg',      color: '#3dd68c', bg: 'rgba(61,214,140,0.14)' },
  admin:  { key: 'admin',  label: '事務・経理', icon: 'coin',     color: '#ef9f27', bg: 'rgba(239,159,39,0.15)' },
  collab: { key: 'collab', label: 'コラボ調整', icon: 'collab',   color: '#c9a3ff', bg: 'rgba(201,163,255,0.16)' },
};
const TCAT_ORDER = ['edit', 'prep', 'thumb', 'sns', 'admin', 'collab'];

/* ---- 担当者 ---- */
const MEMBERS = {
  'アオ': { tone: 'v' }, 'ソラ': { tone: 'c' },
  'カエ': { tone: 'o' }, 'ミナ': { tone: 'p' },
};

const D = (mo, da) => new Date(2026, mo - 1, da);

/* id, title, cat, status, who, start, due, desc, comments[] */
const TASKS = [
  // --- 未着手 ---
  { id: 1, title: '次回コラボ用 ゲーム選定', cat: 'prep', status: 'todo', who: 'アオ',
    start: D(6, 2), due: D(6, 3), desc: '猫宮ねねさんとのコラボで遊ぶタイトル候補を3つに絞る。',
    comments: [
      { id: 1, by: 'ソラ', me: false, time: '6/2 18:20', text: 'APEXかVALORANTどっちがいいですかね？' },
      { id: 2, by: 'アオ', me: true,  time: '6/2 18:25', text: '視聴者投票で決めたいので両方候補に入れときましょう！' },
    ] },
  { id: 2, title: '6月オープニング動画 編集', cat: 'edit', status: 'todo', who: 'カエ',
    start: D(6, 5), due: D(6, 8), desc: '新シリーズ用の15秒OP。BGMは確定済み。', comments: [] },
  { id: 3, title: 'グッズ受注ページ 校正', cat: 'admin', status: 'todo', who: 'ミナ',
    start: D(6, 8), due: D(6, 12), desc: '価格・サイズ表記・送料の最終チェック。', comments: [] },
  { id: 4, title: '月末振り返り配信 台本作成', cat: 'prep', status: 'todo', who: 'アオ',
    start: D(6, 20), due: D(6, 27), desc: '今月のハイライトまとめ。', comments: [] },

  // --- 進行中 ---
  { id: 5, title: 'APEXコラボ サムネ作成', cat: 'thumb', status: 'doing', who: 'ソラ',
    start: D(6, 3), due: D(6, 5), desc: '3人スクワッド配信用。立ち絵は支給済み、ロゴ配置を調整中。',
    comments: [
      { id: 1, by: 'アオ', me: true,  time: '6/3 21:10', text: '文字大きめでお願いします〜サムネ映え重視で！' },
      { id: 2, by: 'ソラ', me: false, time: '6/4 09:40', text: 'ラフ上げました。赤背景バージョンも作ってみます。' },
      { id: 3, by: 'アオ', me: true,  time: '6/4 10:02', text: '赤いいですね！そっちで進めましょう👍' },
    ] },
  { id: 6, title: '100万人記念 告知バナー', cat: 'sns', status: 'doing', who: 'アオ',
    start: D(6, 3), due: D(6, 6), desc: 'X / Discord 用の横長バナー。', comments: [] },
  { id: 7, title: '先週配信の切り抜き編集', cat: 'edit', status: 'doing', who: 'カエ',
    start: D(6, 4), due: D(6, 9), desc: 'ソロランク回のおもしろシーン3本。', comments: [] },

  // --- レビュー待ち ---
  { id: 8, title: 'コラボ依頼DM 文面チェック', cat: 'collab', status: 'review', who: 'アオ',
    start: D(6, 3), due: D(6, 5), desc: '蛍ホタルさん宛て。失礼がないか確認お願いします。',
    comments: [
      { id: 1, by: 'ミナ', me: false, time: '6/4 11:00', text: '日程の希望も一緒に伝えた方が親切かも？' },
    ] },
  { id: 9, title: '記念グッズ デザイン入稿', cat: 'thumb', status: 'review', who: 'ミナ',
    start: D(6, 4), due: D(6, 7), desc: '入稿データの解像度を最終確認。', comments: [] },

  // --- 完了 ---
  { id: 10, title: '6/1 ソロランク配信 アーカイブ整理', cat: 'edit', status: 'done', who: 'ソラ',
    start: D(6, 1), due: D(6, 2), desc: 'チャプター付け・概要欄記入まで完了。', comments: [] },
  { id: 11, title: 'Discord告知 投稿', cat: 'sns', status: 'done', who: 'アオ',
    start: D(6, 1), due: D(6, 1), desc: '今週の配信予定をお知らせ。', comments: [] },
  { id: 12, title: '収録機材 セッティング', cat: 'prep', status: 'done', who: 'カエ',
    start: D(6, 2), due: D(6, 3), desc: 'マイク・照明の動作確認済み。', comments: [] },
];

/* 今日 = 6/4 */
const T_TODAY = new Date(SCH_TODAY.y, SCH_TODAY.m - 1, SCH_TODAY.d);

/* 期限が近いもの順（昇順）にソートしてステータス別に返す */
function tasksByStatus(statusKey) {
  return TASKS.filter((t) => t.status === statusKey).sort((a, b) => a.due - b.due);
}

/* 期限の緊急度 */
function dueInfo(due) {
  const diff = Math.round((dayStart(due) - dayStart(T_TODAY)) / 86400000);
  if (diff < 0)  return { level: 'over',   chip: `${-diff}日超過` };
  if (diff === 0) return { level: 'today',  chip: '今日まで' };
  if (diff <= 2) return { level: 'soon',   chip: `残り${diff}日` };
  return { level: 'normal', chip: `残り${diff}日` };
}

/* 6/8（月） 形式 */
const fmtDue = (d) => `${d.getMonth() + 1}/${d.getDate()}（${WD_JP[d.getDay()]}）`;

Object.assign(window, {
  STATUSES, TCATS, TCAT_ORDER, MEMBERS, TASKS, T_TODAY,
  tasksByStatus, dueInfo, fmtDue,
});
