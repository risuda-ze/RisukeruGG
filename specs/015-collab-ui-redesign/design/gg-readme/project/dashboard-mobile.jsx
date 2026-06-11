// dashboard-mobile.jsx — mobile dashboard artboard
const { Icon, Btn, Badge, Tag, Avatar, Progress, Spark } = window;
const { DASH, TASK_META } = window;

function MStat({ s }) {
  return (
    <div className="card" style={{ padding: 15, minWidth: 158, flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--primary-950)', border: '1px solid var(--primary-800)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-300)' }}>
          <Icon name={s.ic} size={16} stroke={2} />
        </span>
        <div style={{ width: 44, height: 20 }}><Spark data={s.spark} height={20} hotLast /></div>
      </span>
      <span className="label-jp label-jp--sm">{s.label}</span>
      <span className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--font-head)',
        color: s.up === null ? 'var(--warning)' : 'var(--success)' }}>
        {s.up !== null && <Icon name="arrowUp" size={12} stroke={2.6} />}{s.delta}
      </span>
    </div>
  );
}

function MSectionHead({ title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px' }}>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{title}</h3>
      {action}
    </div>
  );
}

function MCollab({ c }) {
  return (
    <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <Avatar initials={c.initials} tone={c.tone} size={44} ring={c.urgent} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{c.name}</span>
          <Tag accent icon={c.tagIc}>{c.tag}</Tag>
        </div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="calendar" size={13} style={{ color: 'var(--text-muted)' }} /><span className="mono">{c.date}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: '0 0 auto' }}>
        <Btn variant="success" size="sm" icon="check" title="承認" />
        <Btn variant="subtle" size="sm" icon="x" title="却下" />
      </div>
    </div>
  );
}

function MTask({ t }) {
  const m = TASK_META[t.status];
  const done = t.status === 'done';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0' }}>
      <span style={{ width: 21, height: 21, borderRadius: 7, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1.5px solid ${done ? 'var(--success)' : 'var(--border-light)'}`, background: done ? 'var(--success)' : 'transparent' }}>
        {done && <Icon name="check" size={12} stroke={3} style={{ color: '#062417' }} />}
      </span>
      <span style={{ flex: 1, fontSize: '0.86rem', color: done ? 'var(--text-muted)' : 'var(--text-primary)',
        textDecoration: done ? 'line-through' : 'none' }}>{t.t}</span>
      <Badge variant={m.variant}>{m.label}</Badge>
    </div>
  );
}

function MMember({ m }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0' }}>
      <Avatar initials={m.initials} tone={m.tone} size={36} status={m.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.85rem' }}>{m.name}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--warning)', fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.78rem' }}>
            <Icon name="coin" size={13} stroke={2} />{m.pts}
          </span>
        </div>
        <Progress value={m.prog} variant={m.prog >= 80 ? 'success' : m.prog < 50 ? 'warning' : undefined} />
      </div>
    </div>
  );
}

function MBottomNav() {
  const items = [
    { ic: 'grid', label: 'ホーム' }, { ic: 'calendar', label: '予定' },
    { ic: 'plus', label: '', fab: true }, { ic: 'collab', label: 'コラボ', badge: 2 }, { ic: 'team', label: 'チーム' },
  ];
  const [active, setActive] = React.useState(0);
  return (
    <div className="bottomnav" style={{ flex: '0 0 auto', position: 'relative', paddingBottom: 6 }}>
      {items.map((it, i) => {
        if (it.fab) return (
          <button key={i} className="navitem" style={{ flex: '0 0 auto', width: 64 }}>
            <span style={{ width: 50, height: 50, borderRadius: 16, marginTop: -22, background: 'var(--primary)', boxShadow: 'var(--glow-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: '3px solid var(--surface)' }}>
              <Icon name="plus" size={24} stroke={2.4} />
            </span>
          </button>
        );
        return (
          <button key={i} className={`navitem${i === active ? ' navitem--active' : ''}`} onClick={() => setActive(i)} style={{ position: 'relative' }}>
            {i === active && <span className="navitem__pill" />}
            <span style={{ position: 'relative' }}>
              <Icon name={it.ic} size={21} stroke={2} />
              {it.badge && <span style={{ position: 'absolute', top: -5, right: -8, minWidth: 15, height: 15, padding: '0 4px', borderRadius: 8,
                background: 'var(--danger)', color: '#fff', fontSize: '0.58rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.badge}</span>}
            </span>
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MobileDashboard() {
  return (
    <div className="rk" style={{ width: 390, height: 844, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* status bar */}
      <div style={{ height: 40, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px',
        fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
        <span className="mono">21:30</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
          <Icon name="play" size={13} fill="solid" /><Icon name="msg" size={13} /><span className="mono" style={{ fontSize: '0.74rem' }}>84%</span>
        </span>
      </div>

      {/* header */}
      <div style={{ flex: '0 0 auto', padding: '6px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar initials="リG" tone="v" size={44} status="live" ring />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>おかえり</div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.1 }}>リスGG</div>
        </div>
        <div style={{ position: 'relative' }}>
          <button className="btn btn--subtle btn--icon btn--sm" title="通知"><Icon name="bell" size={18} /></button>
          <span className="notif" style={{ top: -3, right: -3 }}>3</span>
        </div>
      </div>

      {/* scroll body */}
      <div className="scroll-x" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 20px 24px' }}>
        {/* stat scroller */}
        <div className="scroll-x" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px 22px', padding: '4px 20px' }}>
          {DASH.stats.map((s, i) => <MStat key={i} s={s} />)}
        </div>

        {/* next stream hero */}
        <div className="card card--raised" style={{ padding: 20, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(127,119,221,0.35), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Badge variant="danger" dot>次の配信</Badge>
            <Tag icon="fire">APEX コラボ</Tag>
          </div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.2rem', marginBottom: 4 }}>猫宮ねね と FPS 3人スク</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <Icon name="calendar" size={14} style={{ color: 'var(--text-muted)' }} /><span className="mono">6/04 (木) 21:00</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['02', '日'], ['04', '時'], ['18', '分']].map(([n, u]) => (
              <div key={u} style={{ flex: 1, background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '10px 0', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-accent)', lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>{u}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="primary" icon="video" full>配信準備</Btn>
            <Btn variant="ghost" icon="swap" title="リスケ" />
          </div>
        </div>

        {/* collab */}
        <MSectionHead title="承認待ち" action={<Badge variant="warning" dot>3件</Badge>} />
        {DASH.collabs.slice(0, 2).map((c, i) => <MCollab key={i} c={c} />)}

        {/* tasks */}
        <MSectionHead title="今日のタスク" action={<span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>1 / 5</span>} />
        <div className="card" style={{ padding: '6px 16px', marginBottom: 24 }}>
          {DASH.tasks.slice(0, 4).map((t, i) => (
            <React.Fragment key={i}>{i > 0 && <hr className="divider" />}<MTask t={t} /></React.Fragment>
          ))}
        </div>

        {/* team */}
        <MSectionHead title="チーム" action={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-accent)', fontSize: '0.78rem', fontFamily: 'var(--font-head)', fontWeight: 600 }}><Icon name="trophy" size={14} />ランク</span>} />
        <div className="card" style={{ padding: '6px 16px' }}>
          {DASH.members.slice(0, 3).map((m, i) => (
            <React.Fragment key={i}>{i > 0 && <hr className="divider" />}<MMember m={m} /></React.Fragment>
          ))}
        </div>
      </div>

      <MBottomNav />
    </div>
  );
}

Object.assign(window, { MobileDashboard });
