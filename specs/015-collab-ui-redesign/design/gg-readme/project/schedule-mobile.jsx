// schedule-mobile.jsx — responsive (390px) schedule: month grid / agenda + detail
const { Icon, Btn, Avatar } = window;
const { MobileToolbar, AdBanner, AIFab, DetailForm, useDismiss } = window;
const { CATS, WD_JP, SCH_TODAY, fmtTime, eventsForDay, monthMatrix, weekOf, sameDay } = window;
const { useState } = React;

const mToday = new Date(SCH_TODAY.y, SCH_TODAY.m - 1, SCH_TODAY.d);
const mVars = (cat) => ({ '--evt': CATS[cat].color, '--evt-bg': CATS[cat].bg });

/* status bar */
function MStatus() {
  return (
    <div style={{ height: 38, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px',
      fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
      <span className="mono">9:41</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
        <Icon name="play" size={13} fill="solid" /><Icon name="msg" size={13} /><span className="mono" style={{ fontSize: '0.74rem' }}>84%</span>
      </span>
    </div>
  );
}

/* month mini-grid */
function MMonth({ cursor, onPickDay }) {
  const weeks = monthMatrix(cursor.getFullYear(), cursor.getMonth() + 1);
  return (
    <div className="mmonth">
      <div className="mmonth__wd">{WD_JP.map((d) => <span key={d}>{d}</span>)}</div>
      {weeks.map((wk, wi) => (
        <div key={wi} className="mmonth__grid">
          {wk.map((cell, ci) => {
            const { multi, single } = eventsForDay(cell.date);
            const dots = [...multi, ...single].slice(0, 4);
            const isToday = sameDay(cell.date, mToday);
            const cls = ['mmcell'];
            if (!cell.inMonth) cls.push('mmcell--out');
            if (isToday) cls.push('mmcell--today');
            return (
              <button key={ci} className={cls.join(' ')} onClick={() => onPickDay(cell.date)}>
                <span className="mmcell__n">{cell.date.getDate()}</span>
                <span className="mmcell__dots">{dots.map((e, i) => <span key={i} className="mmcell__dot" style={{ background: CATS[e.cat].color }} />)}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* agenda (week list of days) */
function MAgenda({ cursor, onOpen, onAdd }) {
  const days = weekOf(cursor);
  return (
    <div className="magenda">
      {days.map((d, i) => {
        const { multi, single } = eventsForDay(d);
        const items = [...multi, ...single];
        const isToday = sameDay(d, mToday);
        return (
          <div key={i} className="maday">
            <div className="maday__hd">
              <span className="maday__num" style={{ color: i === 0 ? 'var(--danger)' : i === 6 ? 'var(--info)' : undefined }}>{d.getDate()}</span>
              <span className="maday__wd">{WD_JP[d.getDay()]}曜日</span>
              {isToday && <span className="maday__today">今日</span>}
              <Icon name="plus" size={16} style={{ color: 'var(--text-muted)', marginLeft: 'auto', cursor: 'pointer' }} onClick={() => onAdd(d)} />
            </div>
            {items.length === 0 && <div className="maday__empty">予定なし</div>}
            {items.map((e, idx) => {
              const c = CATS[e.cat];
              const bar = e.allDay && multi.includes(e);
              return (
                <div key={e.id} className="mevt" style={{ ...mVars(e.cat), animationDelay: `${idx * 35}ms` }} onClick={() => onOpen(e)}>
                  <Icon name={c.icon} size={16} stroke={2.2} />
                  <span className="mevt__time">{bar ? '終日' : fmtTime(e.start)}</span>
                  <span className="mevt__title">{e.title}</span>
                  {bar && <span className="mevt__bar">継続</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ScheduleAppMobile({ initialView = 'list' }) {
  const [screen, setScreen] = useState(initialView);
  const [editing, setEditing] = useState(initialView === 'detail' ? window.SCH_EVENTS[7] : null);
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(mToday);
  const [showAd, setShowAd] = useState(true);

  const shift = (dir) => {
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + dir * 7));
  };
  const pickDay = (d) => { setCursor(d); setView('week'); };
  const openAdd = () => { setEditing(null); setScreen('detail'); };
  const openEvt = (e) => { setEditing(e); setScreen('detail'); };
  const back = () => setScreen('list');
  const label = `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`;
  const [hintOff, dismissHint, showHint] = useDismiss('sch-m-hint');

  return (
    <div className="rk sch sch--mobile" style={{ flexDirection: 'column' }}>
      <MStatus />
      {showAd && <AdBanner top onClose={() => setShowAd(false)} />}

      {screen === 'list'
        ? <React.Fragment>
            <div className="mtop">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mtop__title">スケジュール</div>
                <div className="mtop__desc">配信・コラボの予定を管理 · 今日 6/4(木)</div>
              </div>
              <div style={{ position: 'relative', display: 'flex', gap: 6 }}>
                <button className={`helptoggle${hintOff ? '' : ' is-on'}`} style={{ width: 34, height: 34 }}
                  onClick={() => hintOff ? showHint() : dismissHint()} title="操作ヘルプ"><Icon name="help" size={17} stroke={2} /></button>
                <div style={{ position: 'relative' }}>
                  <button className="btn btn--subtle btn--icon btn--sm" title="通知"><Icon name="bell" size={18} /></button>
                  <span className="notif" style={{ top: -3, right: -3 }}>3</span>
                </div>
              </div>
            </div>
            <div className="mcalhd">
              <div className="mseg">
                <button className={view === 'week' ? 'is-on' : ''} onClick={() => setView('week')}>週</button>
                <button className={view === 'month' ? 'is-on' : ''} onClick={() => setView('month')}>月</button>
              </div>
              <span className="mcalhd__month">{label}</span>
              <div className="datenav" style={{ marginLeft: 'auto' }}>
                <button className="datenav__arrow" style={{ width: 30, height: 30 }} onClick={() => shift(-1)}><Icon name="chevL" size={16} /></button>
                <button className="datenav__today" style={{ height: 30, padding: '0 10px', fontSize: '0.76rem' }} onClick={() => setCursor(mToday)}>今日</button>
                <button className="datenav__arrow" style={{ width: 30, height: 30 }} onClick={() => shift(1)}><Icon name="chevR" size={16} /></button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {view === 'month'
                ? <React.Fragment>
                    <MMonth cursor={cursor} onPickDay={pickDay} />
                    {!hintOff &&
                      <div className="hint hint--closable" style={{ margin: '14px 16px' }}>
                        <Icon name="help" size={15} stroke={2} />
                        <span>日付をタップすると<b>その日の予定</b>を確認・追加できます。</span>
                        <button className="hint__x" onClick={dismissHint} title="今後表示しない"><Icon name="x" size={14} /></button>
                      </div>
                    }
                  </React.Fragment>
                : <MAgenda cursor={cursor} onOpen={openEvt} onAdd={() => openAdd()} />}
            </div>
            <Btn variant="primary" icon="plus" onClick={openAdd}
              style={{ position: 'absolute', left: 16, right: 16, bottom: 80, width: 'auto' }} full>予定を追加</Btn>
          </React.Fragment>
        : <React.Fragment>
            <div className="mtop" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: 12 }}>
              <button className="btn btn--subtle btn--icon btn--sm" onClick={back}><Icon name="chevL" size={18} /></button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mtop__title">{editing ? '予定を編集' : '予定を追加'}</div>
                <div className="mtop__desc">内容を入力して保存</div>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: 14 }}>
              <DetailForm event={editing} onCancel={back} onSave={back} onDelete={back} />
            </div>
          </React.Fragment>
      }

      {screen === 'list' && <AIFab style={{ bottom: 150, right: 16, width: 44, height: 44 }} />}
      <MobileToolbar active="schedule" />
    </div>
  );
}

Object.assign(window, { ScheduleAppMobile });
