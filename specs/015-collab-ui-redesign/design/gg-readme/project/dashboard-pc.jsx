// dashboard-pc.jsx — PC dashboard artboard + shared data/widgets
const { Icon, Btn, Badge, Tag, Card, Field, Avatar, Progress, Spark, Logo, Dropdown, MiniCalendar } = window;

/* ---------------- shared data ---------------- */
const DASH = {
  stats: [
  { ic: 'team', label: '登録者数', value: '128,400', delta: '+2,410', up: true, spark: [12, 18, 15, 22, 20, 28, 34], sub: '今週' },
  { ic: 'play', label: '総再生数', value: '4.92M', delta: '+312K', up: true, spark: [20, 22, 19, 26, 30, 28, 38], sub: '今週' },
  { ic: 'video', label: '配信時間', value: '18.5h', delta: '+3.2h', up: true, spark: [8, 12, 10, 14, 9, 16, 18], sub: '今週' },
  { ic: 'collab', label: 'コラボ進行', value: '5', delta: '2件承認待ち', up: null, spark: [2, 3, 2, 4, 3, 5, 5], sub: '進行中' }],

  growth: [42, 48, 46, 55, 52, 60, 58, 67, 64, 72, 70, 82, 88, 96],
  collabs: [
  { initials: 'ねね', tone: 'p', name: '猫宮ねね', tag: 'FPS コラボ', tagIc: 'fire', date: '6/04 (木) 21:00', note: 'APEX 3人スク', urgent: true },
  { initials: '蛍', tone: 'o', name: '蛍ホタル', tag: '歌枠', tagIc: 'video', date: '6/06 (土) 20:00', note: 'デュエット配信' },
  { initials: '美', tone: 'c', name: '美兎みう', tag: '雑談', tagIc: 'msg', date: '6/09 (火) 22:00', note: '記念コラボ' }],

  tasks: [
  { t: '6/4 配信のサムネ作成', who: 'ソラ', tone: 'c', status: 'progress' },
  { t: 'コラボ台本チェック', who: 'ミナ', tone: 'm', status: 'done' },
  { t: '告知ツイート予約', who: 'アオイ', tone: 'v', status: 'todo' },
  { t: 'BGM・SE 選定', who: 'カエデ', tone: 'g', status: 'progress' },
  { t: 'サムネ A/B 投票集計', who: 'ソラ', tone: 'c', status: 'todo' }],

  members: [
  { initials: 'アオ', tone: 'v', name: 'アオイ', role: 'マネージャー', prog: 88, pts: '2,140', status: 'on' },
  { initials: 'カエ', tone: 'g', name: 'カエデ', role: '動画編集', prog: 62, pts: '1,580', status: 'on' },
  { initials: 'ソラ', tone: 'c', name: 'ソラ', role: 'デザイン', prog: 45, pts: '1,920', status: 'idle' },
  { initials: 'ミナ', tone: 'm', name: 'ミナ', role: '構成・台本', prog: 95, pts: '2,460', status: 'off' }]

};

const TASK_META = {
  done: { label: '完了', variant: 'success', ic: 'check' },
  progress: { label: '進行中', variant: 'warning', ic: 'clock' },
  todo: { label: '未着手', variant: 'neutral', ic: 'flag' }
};

/* ---------------- shared widgets ---------------- */
function StatCard({ s }) {
  return (
    <div className="card card--hover" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, borderColor: "var(--card-border)", backgroundColor: "rgb(27, 27, 55)" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: "1" }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--primary-950)', border: '1px solid var(--primary-800)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-300)' }}>
            <Icon name={s.ic} size={18} stroke={2} />
          </span>
          <span className="label-jp">{s.label}</span>
        </span>
        <div style={{ width: 64, height: 26 }}><Spark data={s.spark} height={26} hotLast /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <span className="mono" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {s.up !== null &&
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: s.up ? 'var(--success)' : 'var(--danger)',
          fontWeight: 600, fontSize: '0.8rem', fontFamily: 'var(--font-head)' }}>
            <Icon name={s.up ? 'arrowUp' : 'arrowDn'} size={14} stroke={2.6} />{s.delta}
          </span>
        }
        {s.up === null && <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.8rem', fontFamily: 'var(--font-head)' }}>{s.delta}</span>}
        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{s.sub}</span>
      </div>
    </div>);

}

function CollabRow({ c, compact }) {
  return (
    <div className="hovershift" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: compact ? '12px' : '14px 12px', margin: '0 -12px' }}>
      <Avatar initials={c.initials} tone={c.tone} size={compact ? 40 : 46} ring={c.urgent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{c.name}</span>
          <Tag accent icon={c.tagIc}>{c.tag}</Tag>
          {c.urgent && <Badge variant="danger" dot>要返答</Badge>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
          <Icon name="calendar" size={14} style={{ color: 'var(--text-muted)' }} />
          <span className="mono">{c.date}</span>
          <span className="dot-sep" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.note}</span>
        </div>
      </div>
      {!compact &&
      <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
          <Btn variant="success" size="sm" icon="check">承認</Btn>
          <Btn variant="subtle" size="sm" icon="swap">リスケ</Btn>
          <Btn variant="subtle" size="sm" icon="x" title="却下" />
        </div>
      }
      {compact && <Btn variant="success" size="sm" icon="check" title="承認" />}
    </div>);

}

function TaskRow({ t }) {
  const m = TASK_META[t.status];
  const done = t.status === 'done';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0' }}>
      <span style={{ width: 22, height: 22, borderRadius: 7, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${done ? 'var(--success)' : 'var(--border-light)'}`, background: done ? 'var(--success)' : 'transparent' }}>
        {done && <Icon name="check" size={13} stroke={3} style={{ color: '#062417' }} />}
      </span>
      <span style={{ flex: 1, fontSize: '0.9rem', color: done ? 'var(--text-muted)' : 'var(--text-primary)',
        textDecoration: done ? 'line-through' : 'none' }}>{t.t}</span>
      <Avatar initials={t.who.slice(0, 2)} tone={t.tone} size={26} />
      <Badge variant={m.variant}>{m.label}</Badge>
    </div>);

}

function MemberRow({ m }) {
  return (
    <div className="hovershift" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 12px', margin: '0 -12px' }}>
      <Avatar initials={m.initials} tone={m.tone} size={42} status={m.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.92rem', whiteSpace: 'nowrap' }}>{m.name}</span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{m.role}</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--warning)', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.82rem' }}>
            <Icon name="coin" size={15} stroke={2} />{m.pts}<span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.72rem' }}>pt</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Progress value={m.prog} variant={m.prog >= 80 ? 'success' : m.prog < 50 ? 'warning' : undefined} style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', width: 34, textAlign: 'right' }}>{m.prog}%</span>
        </div>
      </div>
    </div>);

}

function GrowthChart({ data, height = 150 }) {
  const max = Math.max(...data),min = Math.min(...data);
  const W = 100,H = 100;
  const pts = data.map((d, i) => [i / (data.length - 1) * W, H - (d - min) / (max - min) * H]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <div style={{ position: 'relative', height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-400)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--primary-400)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#gfill)" />
        <path d={line} fill="none" stroke="var(--primary-300)" strokeWidth="2" vectorEffect="non-scaling-stroke"
        style={{ filter: 'drop-shadow(0 0 6px rgba(127,119,221,0.7))' }} />
      </svg>
    </div>);

}

/* ---------------- sidebar / topbar ---------------- */
const NAV = [
{ ic: 'grid', label: 'ダッシュボード' }, { ic: 'calendar', label: 'スケジュール' },
{ ic: 'collab', label: 'コラボ調整', badge: 2 }, { ic: 'task', label: 'タスク' },
{ ic: 'team', label: 'チーム' }, { ic: 'spark', label: '分析' }];

function Sidebar() {
  const [active, setActive] = React.useState(0);
  return (
    <aside style={{ width: 240, background: 'var(--surface)', borderRight: '1px solid var(--card-border)', padding: '28px 16px',
      display: 'flex', flexDirection: 'column', flex: '0 0 auto' }}>
      <div style={{ padding: '0 8px 24px' }}><Logo /></div>
      <div className="nav-section">メニュー</div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map((n, i) => {
          const isActive = i === active;
          return (
            <div key={i} className={`navlink${isActive ? ' navlink--active' : ''}`} onClick={() => setActive(i)}>
              <Icon name={n.ic} size={20} stroke={2} className="ic" />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge && <span style={{ minWidth: 20, height: 20, borderRadius: 10,
                background: isActive ? 'rgba(255,255,255,0.22)' : 'var(--danger)', color: '#fff',
                fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{n.badge}</span>}
            </div>);

        })}
      </nav>
      <div style={{ flex: 1 }} />
      <div className="card card--raised" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 11 }}>
        <Avatar initials="リG" tone="v" size={40} status="live" ring />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.85rem' }}>リスGG</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="dot" style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--danger)' }} />配信準備中
          </div>
        </div>
        <Icon name="gear" size={18} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} />
      </div>
    </aside>);

}

function Topbar() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
      <div style={{ flex: 1 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
          おかえり、リスGG <span style={{ color: 'var(--text-muted)' }}>👋</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
          5月30日(金) · 次の配信まで <span style={{ color: 'var(--text-accent)', fontWeight: 600 }} className="mono">2日4時間</span> · 承認待ち <span style={{ color: 'var(--warning)', fontWeight: 600 }}>2件</span>
        </p>
      </div>
      <Field icon="search" placeholder="検索…" style={{ width: 240, height: 44 }} />
      <div style={{ position: 'relative' }}>
        <Btn variant="subtle" icon="bell" title="通知" />
        <span className="notif">3</span>
      </div>
      <Btn variant="primary" icon="plus">予定を追加</Btn>
    </div>);

}

/* ---------------- assembled PC dashboard ---------------- */
function PanelHead({ title, sub, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
      <div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{title}</h3>
        {sub && <p className="label-jp label-jp--sm" style={{ marginTop: 3, fontWeight: 400, color: 'var(--text-secondary)' }}>{sub}</p>}
      </div>
      {action}
    </div>);

}

function PCDashboard() {
  return (
    <div className="rk" style={{ width: 1440, height: 1248, display: 'flex', background: 'var(--bg)', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '28px 32px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Topbar />

        {/* stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 20 }}>
          {DASH.stats.map((s, i) => <StatCard key={i} s={s} />)}
        </div>

        {/* two-column body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 20, flex: 1, minHeight: 0 }}>
          {/* left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <PanelHead title="チャンネル成長" sub="登録者数 — 過去14日"
              action={<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge variant="success" dot>+8.4%</Badge>
                  <Dropdown size="sm" align="right" value="14日" options={['7日', '14日', '30日', '90日']} style={{ width: 92 }} />
                </div>} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '12px 0 16px' }}>
                <span className="mono" style={{ fontSize: '2.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>128,400</span>
                <span style={{ color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Icon name="arrowUp" size={16} stroke={2.6} />+9,840 <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.82rem' }}>今月</span>
                </span>
              </div>
              <GrowthChart data={DASH.growth} height={150} />
            </div>

            <div className="card" style={{ padding: 24, flex: 1 }}>
              <PanelHead title="コラボ依頼・承認待ち" sub="返答するとカレンダーに自動反映"
              action={<Badge variant="warning" dot>3件</Badge>} />
              <div style={{ marginTop: 8 }}>
                {DASH.collabs.map((c, i) =>
                <React.Fragment key={i}>
                    {i > 0 && <hr className="divider" />}
                    <CollabRow c={c} />
                  </React.Fragment>
                )}
              </div>
            </div>
          </div>

          {/* right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 24 }}>
              <PanelHead title="今日のタスク"
              action={<span className="mono" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>1 / 5 完了</span>} />
              <Progress value={20} style={{ margin: '4px 0 10px' }} />
              <div>
                {DASH.tasks.map((t, i) =>
                <React.Fragment key={i}>
                    {i > 0 && <hr className="divider" />}
                    <TaskRow t={t} />
                  </React.Fragment>
                )}
              </div>
              <Btn variant="ghost" size="sm" icon="plus" full>タスクを追加</Btn>
            </div>

            <div className="card" style={{ padding: 24, flex: 1 }}>
              <PanelHead title="チームメンバー" sub="担当進捗 & 保有ポイント"
              action={<Btn variant="subtle" size="sm" icon="trophy">ランク</Btn>} />
              <div style={{ marginTop: 6 }}>
                {DASH.members.map((m, i) =>
                <React.Fragment key={i}>
                    {i > 0 && <hr className="divider" />}
                    <MemberRow m={m} />
                  </React.Fragment>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>);

}

Object.assign(window, {
  DASH, TASK_META, StatCard, CollabRow, TaskRow, MemberRow, GrowthChart, PanelHead, PCDashboard
});