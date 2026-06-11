// schedule-chrome.jsx — shared shell: Logo, Sidebar, TopBar, AdBanner, AIFab, MobileToolbar
const { Icon, Btn, Avatar } = window;
const { useState, useRef, useEffect } = React;

function SLogo() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, whiteSpace: 'nowrap' }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, flex: '0 0 auto', background: 'linear-gradient(135deg,var(--primary-400),var(--primary-700))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-primary)' }}>
        <Icon name="zap" size={18} fill="solid" style={{ color: '#fff' }} />
      </span>
      <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.01em' }}>
        リスケる<span style={{ color: 'var(--primary-300)' }}>GG</span>
      </span>
    </span>
  );
}

// nav model — 大項目 (groups) + 小項目 (items)
const SNAV = [
  { group: 'メイン', icon: 'grid', items: [
    { key: 'ai', label: 'AIに相談', icon: 'spark' },
    { key: 'schedule', label: 'スケジュール', icon: 'calendar' },
    { key: 'task', label: 'タスク管理', icon: 'task' },
    { key: 'collab', label: 'コラボ調整', icon: 'collab', badge: 2 },
  ] },
  { group: '設定', icon: 'gear', items: [
    { key: 'team', label: 'チーム管理', icon: 'team' },
    { key: 'notif', label: '通知管理', icon: 'bell' },
    { key: 'me', label: '個人設定', icon: 'gear' },
  ] },
  { group: '各種連携', icon: 'link', items: [
    { key: 'discord', label: 'Discord連携', icon: 'msg' },
    { key: 'youtube', label: 'Youtube連携', icon: 'youtube' },
    { key: 'x', label: 'X（旧Twitter）', icon: 'x' },
  ] },
];

function Sidebar({ active = 'schedule' }) {
  const [act, setAct] = useState(active);
  return (
    <aside className="snav">
      <div className="snav__logo"><SLogo /></div>
      {SNAV.map((g) => (
        <React.Fragment key={g.group}>
          <div className="snav__group">
            <div className="snav__grouphd"><Icon name={g.icon} size={13} stroke={2} />{g.group}</div>
            {g.items.map((it) => (
              <button key={it.key} className={`snav__item${act === it.key ? ' is-active' : ''}`} onClick={() => setAct(it.key)}>
                <Icon name={it.icon} size={18} stroke={2} className="ic" />
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.badge && <span className="snav__badge">{it.badge}</span>}
              </button>
            ))}
          </div>
          {/* お問い合わせ — 大項目（子なし・直遷移）。設定グループの直下に配置 */}
          {g.group === '設定' &&
            <button className={`snav__cat${act === 'contact' ? ' is-active' : ''}`} onClick={() => setAct('contact')}>
              <Icon name="help" size={14} stroke={2} className="snav__cat-ic" />
              <span style={{ flex: 1 }}>お問い合わせ</span>
              <Icon name="chevR" size={14} className="snav__cat-arrow" />
            </button>
          }
        </React.Fragment>
      ))}
    </aside>
  );
}

/* account menu — top-right avatar trigger + dropdown */
function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const items = [
    { label: 'プロフィール', icon: 'team' },
    { label: '個人設定', icon: 'gear' },
    { label: '通知管理', icon: 'bell' },
  ];
  return (
    <div className="acctmenu" ref={ref}>
      <button className={`acctmenu__trigger${open ? ' is-open' : ''}`} onClick={() => setOpen((o) => !o)} title="アカウント">
        <Avatar initials="リG" tone="v" size={38} status="live" ring />
        <Icon name="chevD" size={14} className="acctmenu__chev" />
      </button>
      {open &&
        <div className="acctmenu__menu">
          <div className="acctmenu__head">
            <Avatar initials="リG" tone="v" size={44} status="live" ring />
            <div style={{ minWidth: 0 }}>
              <div className="acctmenu__name">リスGG</div>
              <div className="acctmenu__status"><span className="acctmenu__dot" />配信準備中</div>
            </div>
          </div>
          <div className="acctmenu__sep" />
          {items.map((it) => (
            <button key={it.label} className="dropdown__item" onClick={() => setOpen(false)}>
              <Icon name={it.icon} size={16} className="ic" /><span>{it.label}</span>
            </button>
          ))}
          <div className="acctmenu__sep" />
          <button className="dropdown__item acctmenu__logout" onClick={() => setOpen(false)}>
            <Icon name="logout" size={16} className="ic" /><span>ログアウト</span>
          </button>
        </div>
      }
    </div>
  );
}

function TopBar({ title, desc, onContact }) {
  return (
    <div className="stop">
      <div style={{ minWidth: 0 }}>
        <h1 className="stop__title">{title}</h1>
        <p className="stop__desc">{desc}</p>
      </div>
      <div className="stop__actions">
        <Btn variant="subtle" size="sm" icon="help" onClick={onContact}>お問い合わせ</Btn>
        <div style={{ position: 'relative' }}>
          <button className="btn btn--subtle btn--icon" title="通知"><Icon name="bell" size={19} /></button>
          <span className="notif">3</span>
        </div>
        <AccountMenu />
      </div>
    </div>
  );
}

function AdBanner({ top, onClose }) {
  return (
    <div className={`adbar${top ? ' adbar--top' : ''}`}>
      <span className="adbar__tag">AD</span>
      <span className="adbar__txt">広告スペース — ここにバナー広告が表示されます</span>
      <span className="adbar__x" title="閉じる" onClick={onClose}><Icon name="x" size={15} /></span>
    </div>
  );
}

function AIFab({ style }) {
  return (
    <button className="aifab" title="AIに相談" style={style}>
      <Icon name="spark" size={24} fill="solid" />
      <span className="aifab__tip">AIに相談</span>
    </button>
  );
}

/* mobile bottom toolbar + その他 drawer */
const MTB_ITEMS = [
  { key: 'schedule', label: 'スケジュール', icon: 'calendar' },
  { key: 'task', label: 'タスク', icon: 'task' },
  { key: 'ai', label: 'AIに相談', icon: 'spark', ai: true },
  { key: 'collab', label: 'コラボ', icon: 'collab', badge: 2 },
  { key: 'more', label: 'その他', icon: 'more' },
];
const MORE_ITEMS = [
  { label: 'チーム管理', icon: 'team' }, { label: '通知管理', icon: 'bell' },
  { label: '個人設定', icon: 'gear' }, { label: 'Discord連携', icon: 'msg' },
  { label: 'Youtube連携', icon: 'youtube' }, { label: 'X（旧Twitter）', icon: 'x' },
  { label: 'お問い合わせ', icon: 'help' },
];

function MobileToolbar({ active = 'schedule' }) {
  const [act, setAct] = useState(active);
  const [drawer, setDrawer] = useState(false);
  return (
    <React.Fragment>
      {drawer &&
        <div className="mdrawer">
          <div className="mdrawer__scrim" onClick={() => setDrawer(false)} />
          <div className="mdrawer__panel">
            <div className="mdrawer__hd">
              <SLogo />
              <button className="btn btn--subtle btn--icon btn--sm" onClick={() => setDrawer(false)}><Icon name="x" size={16} /></button>
            </div>
            {MORE_ITEMS.map((it) => (
              <button key={it.label} className="snav__item" onClick={() => setDrawer(false)}>
                <Icon name={it.icon} size={18} stroke={2} className="ic" />
                <span>{it.label}</span>
              </button>
            ))}
          </div>
        </div>
      }
      <div className="mtb">
        {MTB_ITEMS.map((it) => {
          if (it.ai) return (
            <button key={it.key} className="mtb__item mtb__ai" onClick={() => setAct('ai')}>
              <span className="mtb__aibtn"><Icon name="spark" size={23} fill="solid" /></span>
              <span className="mtb__ailabel">{it.label}</span>
            </button>
          );
          const on = act === it.key;
          return (
            <button key={it.key} className={`mtb__item${on ? ' is-active' : ''}`}
              onClick={() => it.key === 'more' ? setDrawer(true) : setAct(it.key)}>
              {on && <span className="mtb__pill" />}
              <span style={{ position: 'relative' }}>
                <Icon name={it.icon} size={21} stroke={2} />
                {it.badge && <span style={{ position: 'absolute', top: -5, right: -8, minWidth: 14, height: 14, padding: '0 3px', borderRadius: 7,
                  background: 'var(--danger)', color: '#fff', fontSize: '0.54rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.badge}</span>}
              </span>
              <span>{it.label}</span>
            </button>
          );
        })}
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { SLogo, Sidebar, TopBar, AdBanner, AIFab, MobileToolbar });
