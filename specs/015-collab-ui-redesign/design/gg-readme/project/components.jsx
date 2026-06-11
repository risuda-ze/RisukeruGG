// components.jsx — リスケるGG UI primitives
// Exports to window for use across catalog + dashboards.
const { useState, useEffect, useRef } = React;

/* ----------------------------------------------------------------
   useDismiss — localStorage-backed "hide this forever" flag.
   Returns [off, dismiss(), show()]. Lets experienced users hide a
   help bar permanently while leaving a re-show affordance.
   ---------------------------------------------------------------- */
function useDismiss(key) {
  const k = 'rk-dismiss-' + key;
  const [off, setOff] = useState(() => { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } });
  const set = (v) => { try { v ? localStorage.setItem(k, '1') : localStorage.removeItem(k); } catch (e) {} setOff(v); };
  return [off, () => set(true), () => set(false)];
}

/* ----------------------------------------------------------------
   Icon — stroke-based line glyphs (24x24)
   ---------------------------------------------------------------- */
const ICONS = {
  grid:     'M4 4h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM4 13h7v7H4z',
  calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 9h16M8 3v3M16 3v3',
  collab:   'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M17 11a3 3 0 1 0 0-6M19 20a5.5 5.5 0 0 0-3.5-5.1',
  task:     'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 14l2 2 4-4',
  team:     'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11',
  gear:     'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 14a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 7.6 L4.6 7.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.91 11H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  bell:     'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  search:   'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  plus:     'M12 5v14M5 12h14',
  check:    'M20 6L9 17l-5-5',
  x:        'M18 6L6 18M6 6l12 12',
  chevR:    'M9 6l6 6-6 6',
  chevD:    'M6 9l6 6 6-6',
  chevL:    'M15 6l-6 6 6 6',
  play:     'M6 4l14 8-14 8z',
  video:    'M23 7l-7 5 7 5zM1 6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2z',
  eye:      'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  fire:     'M12 2c1 4 4 5 4 9a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 11 9 9 9 8c2 1 2 3 2 3 1-1 1-5 1-9z',
  trophy:   'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3',
  coin:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9.5 9.5a2.5 2 0 0 1 5 0c0 1.5-2.5 1.5-2.5 2.5M12 15h.01',
  clock:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  arrowUp:  'M12 19V5M5 12l7-7 7 7',
  arrowDn:  'M12 5v14M19 12l-7 7-7-7',
  spark:    'M12 3l1.8 5.6L19 10l-5.2 1.4L12 17l-1.8-5.6L5 10l5.2-1.4zM19 16l.7 2.1L22 19l-2.3.9L19 22l-.7-2.1L16 19l2.3-.9z',
  edit:     'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z',
  more:     'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  filter:   'M22 3H2l8 9.46V19l4 2v-8.54z',
  link:     'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5',
  swap:     'M7 4v13M4 14l3 3 3-3M17 20V7M14 10l3-3 3 3',
  flag:     'M4 22V4a1 1 0 0 1 1-1h12l-2 4 2 4H5M4 13h13',
  msg:      'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z',
  zap:      'M13 2L3 14h9l-1 8 10-12h-9z',
  menu:     'M3 12h18M3 6h18M3 18h18',
  youtube:  'M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22.4 12 31 31 0 0 0 22 8.2zM10 14.5v-5l4.5 2.5z',
  help:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  trash:    'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6M10 11v6M14 11v6',
  logout:   'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
};

function Icon({ name, size = 22, stroke = 2, fill = 'none', style, className }) {
  const d = ICONS[name] || '';
  const filled = fill !== 'none';
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flex: '0 0 auto', ...style }} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/* ----------------------------------------------------------------
   Button
   ---------------------------------------------------------------- */
function Btn({ variant = 'primary', size = 'md', icon, iconRight, children, disabled, full, onClick, type = 'button', title }) {
  const cls = ['btn', `btn--${variant}`];
  if (size === 'sm') cls.push('btn--sm');
  if (size === 'lg') cls.push('btn--lg');
  if (!children && icon) cls.push('btn--icon');
  if (disabled) cls.push('is-disabled');
  return (
    <button type={type} className={cls.join(' ')} disabled={disabled} onClick={onClick} title={title}
      style={full ? { width: '100%' } : undefined}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} className="ic" />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} className="ic" />}
    </button>
  );
}

/* ----------------------------------------------------------------
   Badge / Tag
   ---------------------------------------------------------------- */
function Badge({ variant = 'primary', dot, children }) {
  return (
    <span className={`badge badge--${variant}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}
function Tag({ accent, icon, children }) {
  return (
    <span className={`tag${accent ? ' tag--accent' : ''}`}>
      {icon && <Icon name={icon} size={13} stroke={2.2} />}
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------
   Card
   ---------------------------------------------------------------- */
function Card({ raised, hover, style, className = '', children, onClick }) {
  const cls = ['card'];
  if (raised) cls.push('card--raised');
  if (hover) cls.push('card--hover');
  if (className) cls.push(className);
  return <div className={cls.join(' ')} style={style} onClick={onClick}>{children}</div>;
}

/* ----------------------------------------------------------------
   Field (input)
   ---------------------------------------------------------------- */
function Field({ icon, placeholder, value, defaultValue, focusDemo, type = 'text', onChange, style }) {
  return (
    <label className={`field${focusDemo ? ' field--focusdemo' : ''}`} style={style}>
      {icon && <Icon name={icon} size={18} className="ic" />}
      <input type={type} placeholder={placeholder} value={value} defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined} />
    </label>
  );
}

/* ----------------------------------------------------------------
   Avatar — colored gradient + initials placeholder
   ---------------------------------------------------------------- */
const AV_GRADS = {
  v: 'linear-gradient(135deg,#7f77dd,#534ab7)',
  p: 'linear-gradient(135deg,#f0506e,#a0306e)',
  c: 'linear-gradient(135deg,#5bc8fa,#3b7bcc)',
  g: 'linear-gradient(135deg,#3dd68c,#2a8f6a)',
  o: 'linear-gradient(135deg,#ef9f27,#c06a1a)',
  m: 'linear-gradient(135deg,#a0a0ff,#6b63cc)',
};
function Avatar({ initials = '', tone = 'v', size = 40, ring, status }) {
  return (
    <span className={`avatar${ring ? ' avatar--ring' : ''}`}
      style={{ width: size, height: size, background: AV_GRADS[tone] || AV_GRADS.v, fontSize: size * 0.4 }}>
      <span>{initials}</span>
      {status && <span className={`status status--${status}`} />}
    </span>
  );
}

/* ----------------------------------------------------------------
   Progress
   ---------------------------------------------------------------- */
function Progress({ value = 50, variant, style }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" style={style}>
      <div className={`progress__bar${variant ? ` progress__bar--${variant}` : ''}`} style={{ width: v + '%' }} />
    </div>
  );
}

/* ----------------------------------------------------------------
   Toast
   ---------------------------------------------------------------- */
const TOAST_ICON = { success: 'check', warning: 'bell', danger: 'x', primary: 'spark' };
const TOAST_BG = {
  success: 'var(--success-dim)', warning: 'var(--warning-dim)',
  danger: 'var(--danger-dim)', primary: 'var(--primary-950)',
};
const TOAST_FG = {
  success: 'var(--success)', warning: 'var(--warning)',
  danger: 'var(--danger)', primary: 'var(--primary-300)',
};
function Toast({ variant = 'primary', title, children }) {
  return (
    <div className={`toast toast--${variant}`}>
      <div className="toast__icon" style={{ background: TOAST_BG[variant], color: TOAST_FG[variant] }}>
        <Icon name={TOAST_ICON[variant]} size={18} stroke={2.4} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{title}</div>
        {children && <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>{children}</div>}
      </div>
      <Icon name="x" size={16} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} />
    </div>
  );
}

/* ----------------------------------------------------------------
   Sparkline bars (mini bar chart placeholder)
   ---------------------------------------------------------------- */
function Spark({ data, height = 40, hotLast }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((d, i) => (
        <div key={i} className={`sparkbar${hotLast && i === data.length - 1 ? ' sparkbar--hot' : ''}`}
          style={{ height: `${Math.max(8, (d / max) * 100)}%`, flex: 1 }} />
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------
   Dropdown / pulldown menu
   ---------------------------------------------------------------- */
function Dropdown({ options = [], value, placeholder = '選択…', size, align = 'left', icon, up, scroll, onChange, style }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(value ?? null);
  const ref = useRef(null);
  useEffect(() => { setSel(value ?? null); }, [value]);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const choose = (o) => { setSel(o); setOpen(false); onChange && onChange(o); };
  const menuCls = ['dropdown__menu'];
  if (align === 'right') menuCls.push('dropdown__menu--right');
  if (up) menuCls.push('dropdown__menu--up');
  if (scroll) menuCls.push('dropdown__menu--scroll');
  return (
    <div className="dropdown" ref={ref} style={style}>
      <button type="button" className={`dropdown__trigger${size === 'sm' ? ' dropdown__trigger--sm' : ''}${open ? ' is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', color: sel ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} style={{ color: 'var(--text-muted)' }} />}
          {sel ?? placeholder}
        </span>
        <Icon name="chevD" size={size === 'sm' ? 15 : 17} className="ic" />
      </button>
      {open &&
        <div className={menuCls.join(' ')}>
          {options.map((o) =>
            <button key={o} type="button" className={`dropdown__item${o === sel ? ' is-active' : ''}`} onClick={() => choose(o)}>
              <span>{o}</span>
              {o === sel && <Icon name="check" size={15} stroke={2.6} className="ic dropdown__check" />}
            </button>
          )}
        </div>
      }
    </div>
  );
}

/* ----------------------------------------------------------------
   Mini calendar
   ---------------------------------------------------------------- */
function MiniCalendar({ year = 2026, month = 6, selected = null, today = null, defaultTime = '19:00', hideTime = false, compact = false, noReadout = false, onPick = null }) {
  const [ym, setYm] = useState({ y: year, m: month });
  const [sel, setSel] = useState(selected);
  const [time, setTime] = useState(() => {
    const [h, m] = String(defaultTime).split(':');
    return { h: (h || '19').padStart(2, '0'), m: (m || '00').padStart(2, '0') };
  });
  const first = new Date(ym.y, ym.m - 1, 1).getDay();
  const days = new Date(ym.y, ym.m, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const wd = ['日', '月', '火', '水', '木', '金', '土'];
  const shift = (d) => setYm(({ y, m }) => {
    let nm = m + d, ny = y;
    if (nm < 1) { nm = 12; ny--; } else if (nm > 12) { nm = 1; ny++; }
    return { y: ny, m: nm };
  });
  const isCur = ym.y === year && ym.m === month;
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const mins = ['00', '15', '30', '45'];
  const dow = sel != null ? wd[new Date(ym.y, ym.m - 1, sel).getDay()] : null;
  const [text, setText] = useState('');
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    if (sel != null && !edited) setText(`${ym.y}年${ym.m}月${sel}日（${dow}）${hideTime ? '' : ' ' + time.h + ':' + time.m}`);
  }, [sel, time.h, time.m, ym.y, ym.m, dow, edited, hideTime]);
  const pickRef = useRef(onPick); pickRef.current = onPick;
  useEffect(() => {
    if (sel != null && pickRef.current) pickRef.current({ y: ym.y, m: ym.m, d: sel, dow, h: time.h, mi: time.m });
  }, [sel, time.h, time.m, ym.y, ym.m, dow]);
  return (
    <div className={`minical${compact ? ' minical--compact' : ''}`}>
      <div className="minical__head">
        <button type="button" className="minical__nav" onClick={() => shift(-1)} title="前の月"><Icon name="chevL" size={15} /></button>
        <span className="minical__title">{ym.y}年 {ym.m}月</span>
        <button type="button" className="minical__nav" onClick={() => shift(1)} title="次の月"><Icon name="chevR" size={15} /></button>
      </div>
      <div className="minical__grid">
        {wd.map((d, i) => <span key={d} className={`minical__wd${i === 0 ? ' is-sun' : i === 6 ? ' is-sat' : ''}`}>{d}</span>)}
        {cells.map((d, i) => d === null
          ? <span key={'e' + i} />
          : <button key={i} type="button"
              className={`minical__day${sel === d && isCur ? ' is-sel' : ''}${today === d && isCur ? ' is-today' : ''}`}
              onClick={() => setSel(d)}>
              {d}
            </button>
        )}
      </div>
      <div className="minical__time" style={hideTime ? { display: 'none' } : undefined}>
        <span className="minical__time-label"><Icon name="clock" size={16} stroke={2} />時刻</span>
        <div className="minical__time-fields">
          <Dropdown size="sm" up scroll value={`${time.h}時`} options={hours.map((h) => `${h}時`)}
            onChange={(v) => setTime((t) => ({ ...t, h: v.replace('時', '') }))} style={{ flex: 1 }} />
          <span className="minical__colon">:</span>
          <Dropdown size="sm" up scroll align="right" value={`${time.m}分`} options={mins.map((m) => `${m}分`)}
            onChange={(v) => setTime((t) => ({ ...t, m: v.replace('分', '') }))} style={{ flex: 1 }} />
        </div>
      </div>
      {!noReadout &&
        <label className="minical__readout">
          <Icon name="calendar" size={15} stroke={2} />
          <input type="text" value={text} placeholder="日付を選択 または 直接入力"
            onChange={(e) => { setText(e.target.value); setEdited(true); }} />
        </label>
      }
    </div>
  );
}

/* ----------------------------------------------------------------
   DateField — text box + calendar-icon that pops a MiniCalendar
   ---------------------------------------------------------------- */
const _WD = ['日', '月', '火', '水', '木', '金', '土'];
function DateField({ year = 2026, month = 6, selected = null, today = null, defaultTime = '19:00', hideTime = false, placeholder = '日付を選択', accent }) {
  const [open, setOpen] = useState(false);
  const init = selected != null
    ? { y: year, m: month, d: selected, dow: _WD[new Date(year, month - 1, selected).getDay()],
        h: String(defaultTime).split(':')[0].padStart(2, '0'), mi: (String(defaultTime).split(':')[1] || '00').padStart(2, '0') }
    : null;
  const [pick, setPick] = useState(init);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const text = pick ? `${pick.y}年${pick.m}月${pick.d}日（${pick.dow}）${hideTime ? '' : '　' + pick.h + ':' + pick.mi}` : '';
  return (
    <div className={`datefield${open ? ' is-open' : ''}`} ref={ref}>
      <Icon name="calendar" size={17} stroke={2} className="datefield__lead" />
      <input type="text" className="datefield__input" value={text} placeholder={placeholder} readOnly
        onClick={() => setOpen((o) => !o)} />
      <button type="button" className="datefield__btn" title="カレンダーを開く" onClick={() => setOpen((o) => !o)}>
        <Icon name="chevD" size={16} className="datefield__chev" />
      </button>
      {open &&
        <div className="datefield__pop">
          <MiniCalendar noReadout compact hideTime={hideTime}
            year={pick ? pick.y : year} month={pick ? pick.m : month}
            selected={pick ? pick.d : selected} today={today}
            defaultTime={pick ? `${pick.h}:${pick.mi}` : defaultTime}
            onPick={setPick} />
        </div>
      }
    </div>
  );
}

/* ----------------------------------------------------------------
   Section label
   ---------------------------------------------------------------- */
function SectionLabel({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span className="label-cap">{children}</span>
      {action}
    </div>
  );
}

Object.assign(window, {
  Icon, Btn, Badge, Tag, Card, Field, Avatar, Progress, Toast, Spark, SectionLabel,
  Dropdown, MiniCalendar, DateField, useDismiss,
});
