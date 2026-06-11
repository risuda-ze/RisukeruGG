// schedule-pc.jsx — PC schedule: month/week calendar + detail form
const { Icon, Btn, Badge, Tag, Field, Avatar, Dropdown, MiniCalendar, DateField, useDismiss } = window;
const { Sidebar, TopBar, AdBanner, AIFab } = window;
const { CATS, CAT_ORDER, WD_JP, SCH_TODAY, fmtTime, eventsForDay, monthMatrix, weekBars, weekOf, sameDay, dayStart } = window;
const { useState } = React;

const todayDate = new Date(SCH_TODAY.y, SCH_TODAY.m - 1, SCH_TODAY.d);
const evtVars = (cat) => ({ '--evt': CATS[cat].color, '--evt-bg': CATS[cat].bg });

/* ---------- inline event chip (month cell) ---------- */
function EvtChip({ e, i, onOpen }) {
  const c = CATS[e.cat];
  return (
    <div className="evt" style={{ ...evtVars(e.cat), animationDelay: `${i * 35}ms` }}
    onClick={(ev) => {ev.stopPropagation();onOpen(e);}} title={`${fmtTime(e.start)} ${e.title}`}>
      <Icon name={c.icon} size={12} stroke={2.2} />
      <span className="evt__time">{fmtTime(e.start)}</span>
      <span className="evt__title">{e.title}</span>
    </div>);

}

/* ---------- day cell tooltip ---------- */
function DayTip({ date }) {
  const { multi, single } = eventsForDay(date);
  const all = [...multi, ...single];
  return (
    <div className="caltip">
      <div className="caltip__hd"><Icon name="calendar" size={14} stroke={2} />{date.getMonth() + 1}月{date.getDate()}日（{WD_JP[date.getDay()]}）の予定</div>
      {all.length === 0 && <div className="caltip__empty">予定はありません</div>}
      {all.map((e) =>
      <div key={e.id} className="caltip__row">
          <span className="caltip__dot" style={{ background: CATS[e.cat].color }} />
          <span className="caltip__time">{e.allDay ? '終日' : fmtTime(e.start)}</span>
          <span className="caltip__t">{e.title}</span>
        </div>
      )}
    </div>);

}

/* ---------- month view ---------- */
function MonthView({ cursor, showMembers, onDateClick, onAddDay, onOpen }) {
  const weeks = monthMatrix(cursor.getFullYear(), cursor.getMonth() + 1);
  const visible = (e) => showMembers || e.member === 'アオ';
  return (
    <div className="cal">
      <div className="cal__wd">
        {WD_JP.map((d, i) => <span key={d} className={i === 0 ? 'is-sun' : i === 6 ? 'is-sat' : ''}>{d}</span>)}
      </div>
      <div className="cal__weeks">
        {weeks.map((wk, wi) => {
          const bars = weekBars(wk).filter((b) => visible(b.e));
          return (
            <div key={wi} className="calweek">
              {/* date numbers always on top */}
              <div className="calweek__dates">
                {wk.map((cell, ci) => {
                  const isToday = sameDay(cell.date, todayDate);
                  const dcls = ['caldate'];
                  if (ci === 0) dcls.push('caldate--sun');if (ci === 6) dcls.push('caldate--sat');
                  if (isToday) dcls.push('caldate--today');
                  return (
                    <div key={ci} className={`calweek__datecell${!cell.inMonth ? ' calcell--out' : ''}`}>
                      <span className={dcls.join(' ')}>
                        <button className="caldate__btn" onClick={(ev) => {ev.stopPropagation();onDateClick(cell.date);}}
                        title={`${cell.date.getMonth() + 1}/${cell.date.getDate()} の週を表示`}>{cell.date.getDate()}</button>
                        <DayTip date={cell.date} />
                      </span>
                    </div>);

                })}
              </div>
              {/* multi-day bars sit below the dates, above single events */}
              {bars.length > 0 &&
              <div className="calweek__bars">
                  {bars.map((b, bi) =>
                <div key={b.e.id} className="evt evt--bar" style={{ ...evtVars(b.e.cat), gridColumn: `${b.colStart + 1} / span ${b.span}`, gridRow: bi + 1, animationDelay: `${bi * 40}ms` }}
                onClick={(ev) => {ev.stopPropagation();onOpen(b.e);}} title={b.e.title}>
                      <Icon name={CATS[b.e.cat].icon} size={12} stroke={2.2} />
                      <span className="evt__title">{b.continuesLeft ? '◂ ' : ''}{b.e.title}{b.continuesRight ? ' ▸' : ''}</span>
                    </div>
                )}
                </div>
              }
              <div className="calweek__cells">
                {wk.map((cell, ci) => {
                  const { single } = eventsForDay(cell.date);
                  const vis = single.filter(visible);
                  const cls = ['calcell'];
                  if (!cell.inMonth) cls.push('calcell--out');
                  const shown = vis.slice(0, 2),extra = vis.length - shown.length;
                  return (
                    <div key={ci} className={cls.join(' ')} onClick={() => onAddDay(cell.date)}>
                      {shown.map((e, i) => <EvtChip key={e.id} e={e} i={i} onOpen={onOpen} />)}
                      {extra > 0 && <span className="evt--more" onClick={(ev) => {ev.stopPropagation();onDateClick(cell.date);}}>+{extra} 件</span>}
                    </div>);

                })}
              </div>
            </div>);

        })}
      </div>
    </div>);

}

/* ---------- week view ---------- */
function WeekView({ cursor, showMembers, onDateClick, onAddDay, onOpen }) {
  const days = weekOf(cursor);
  const visible = (e) => showMembers || e.member === 'アオ';
  return (
    <div className="calweekview">
      <div className="cwv__head">
        {days.map((d, i) => {
          const isToday = sameDay(d, todayDate);
          return (
            <button key={i} className={`cwv__daybtn${isToday ? ' is-today' : ''}`} onClick={() => onDateClick(d)} title="この日に予定を追加">
              <span className={`cwv__wd${i === 0 ? ' is-sun' : i === 6 ? ' is-sat' : ''}`}>{WD_JP[d.getDay()]}</span>
              <span className="cwv__dnum">{d.getDate()}</span>
            </button>);

        })}
      </div>
      <div className="cwv__cols">
        {days.map((d, i) => {
          const { multi, single } = eventsForDay(d);
          const items = [...multi.filter(visible), ...single.filter(visible)];
          const isToday = sameDay(d, todayDate);
          return (
            <div key={i} className={`cwv__col${isToday ? ' is-today' : ''}`} onClick={() => onAddDay(d)}>
              {items.length === 0 && <span className="cwv__emptyhint">＋ 追加</span>}
              {items.map((e, idx) => {
                const c = CATS[e.cat];
                const bar = e.allDay && multi.includes(e);
                return (
                  <div key={e.id} className={`cwv__evt${bar ? ' cwv__evt--bar' : ''}`} style={{ ...evtVars(e.cat), animationDelay: `${idx * 40}ms` }}
                  onClick={(ev) => {ev.stopPropagation();onOpen(e);}}>
                    <div className="cwv__evt-top">
                      <Icon name={c.icon} size={13} stroke={2.2} />
                      <span className="cwv__evt-time">{bar ? '終日' : fmtTime(e.start)}</span>
                    </div>
                    <span className="cwv__evt-title">{e.title}</span>
                  </div>);

              })}
            </div>);

        })}
      </div>
    </div>);

}

/* ---------- calendar screen (list) ---------- */
function ScheduleCalendar({ onAdd, onOpen }) {
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(todayDate);
  const [showMembers, setShowMembers] = useState(true);

  const shift = (dir) => {
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));else
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + dir * 7));
  };
  const goDate = (d) => {setCursor(d);setView('week');};
  const [hintOff, dismissHint, showHint] = useDismiss('sch-cal-hint');
  const label = `${cursor.getFullYear()}年 ${cursor.getMonth() + 1}月`;
  const wk = view === 'week' ? weekOf(cursor) : null;
  const weekRange = wk ? `${wk[0].getMonth() + 1}/${wk[0].getDate()} – ${wk[6].getMonth() + 1}/${wk[6].getDate()}` : null;

  return (
    <div className="sch__body">
      <div className="calhd">
        <div className="segtoggle">
          <button className={view === 'week' ? 'is-on' : ''} onClick={() => setView('week')}>週</button>
          <button className={view === 'month' ? 'is-on' : ''} onClick={() => setView('month')}>月</button>
        </div>
        <span className="calhd__month">{label}{weekRange && <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '1rem', marginLeft: 10 }}>{weekRange}</span>}</span>
        <div className="calhd__right">
          <Btn variant="primary" icon="plus" onClick={() => onAdd(null)}>予定を追加</Btn>
          <Btn variant={showMembers ? 'subtle' : 'ghost'} icon={showMembers ? 'eye' : 'team'} onClick={() => setShowMembers((s) => !s)}>
            {showMembers ? 'メンバー表示中' : '自分のみ'}
          </Btn>
          <div className="datenav">
            <button className="datenav__arrow" onClick={() => shift(-1)} title={view === 'month' ? '前の月' : '前の週'}><Icon name="chevL" size={18} /></button>
            <button className="datenav__today" onClick={() => setCursor(todayDate)}>今日</button>
            <button className="datenav__arrow" onClick={() => shift(1)} title={view === 'month' ? '次の月' : '次の週'}><Icon name="chevR" size={18} /></button>
          </div>
          <button className={`helptoggle${hintOff ? '' : ' is-on'}`} onClick={() => hintOff ? showHint() : dismissHint()}
          title={hintOff ? '操作ヘルプを表示' : '操作ヘルプを非表示'}><Icon name="help" size={19} stroke={2} /></button>
        </div>
      </div>
      {!hintOff &&
      <div className="hint hint--closable" style={{ marginBottom: 14 }}>
          <Icon name="help" size={16} stroke={2} />
          <span>日付の数字を<b>クリック</b>するとその週へ。数字に<b>カーソルを合わせる</b>と当日の予定一覧。空きマスや「予定を追加」で新規作成できます。</span>
          <button className="hint__x" onClick={dismissHint} title="今後表示しない"><Icon name="x" size={15} /></button>
        </div>
      }
      <div className="calwrap">
        {view === 'month' ?
        <MonthView cursor={cursor} showMembers={showMembers} onDateClick={goDate} onAddDay={(d) => onAdd(d)} onOpen={onOpen} /> :
        <WeekView cursor={cursor} showMembers={showMembers} onDateClick={(d) => onAdd(d)} onAddDay={(d) => onAdd(d)} onOpen={onOpen} />}
      </div>
    </div>);

}

/* ---------- detail form (body of the popup) ---------- */
function DetailForm({ event, onCancel, onSave, onDelete }) {
  const isNew = !event;
  const [allDay, setAllDay] = useState(event ? !!event.allDay : false);
  const [cat, setCat] = useState(event ? CATS[event.cat].label : null);
  const sd = event ? event.start : todayDate;
  const ed = event ? event.end : todayDate;

  return (
    <div className="sform">
      <div className="sform__inner">
        <div className="sform__row">
          <label className="sform__label"><Icon name="edit" size={15} stroke={2} />タイトル<span className="sform__req">*</span></label>
          <input className="sform__title-input" defaultValue={event ? event.title : ''} placeholder="例）APEX 3人スクワッド コラボ配信" />
        </div>

        <div className="sform__row">
          <label className="sform__label"><Icon name="filter" size={15} stroke={2} />カテゴリ<span className="sform__req">*</span></label>
          <Dropdown value={cat} placeholder="カテゴリを選択" icon="grid"
          options={CAT_ORDER.map((k) => CATS[k].label)} onChange={setCat} style={{ maxWidth: 320 }} />
        </div>

        <div className="sform__grid2">
          <div className="sform__row" style={{ marginBottom: 0 }}>
            <div className="sform__labelrow">
              <label className="sform__label" style={{ marginBottom: 0 }}><Icon name="calendar" size={15} stroke={2} />開始日時<span className="sform__req">*</span></label>
              <label className={`allday${allDay ? ' is-on' : ''}`} onClick={() => setAllDay((v) => !v)}>
                <span className="allday__txt">終日</span>
                <span className="allday__sw" />
              </label>
            </div>
            <DateField hideTime={allDay} year={sd.getFullYear()} month={sd.getMonth() + 1}
            selected={sd.getDate()} today={SCH_TODAY.d} defaultTime={event ? fmtTime(event.start) : '21:00'} />
          </div>
          <div className="sform__row" style={{ marginBottom: 0 }}>
            <div className="sform__labelrow">
              <label className="sform__label" style={{ marginBottom: 0 }}><Icon name="clock" size={15} stroke={2} />終了日時</label>
            </div>
            <DateField hideTime={allDay} year={ed.getFullYear()} month={ed.getMonth() + 1}
            selected={ed.getDate()} today={SCH_TODAY.d} defaultTime={event ? fmtTime(event.end) : '23:30'} />
          </div>
        </div>

        <div className="sform__row" style={{ marginTop: 22 }}>
          <label className="sform__label"><Icon name="msg" size={15} stroke={2} />説明</label>
          <textarea defaultValue={event ? event.note : ''} placeholder="配信内容・コラボ相手・告知メモなど" />
        </div>
      </div>

      <div className="sform__footer">
        {!isNew && <Btn variant="danger" icon="trash" onClick={onDelete}>削除</Btn>}
        <div className="sform__footer-right">
          <Btn variant="subtle" onClick={onCancel}>キャンセル</Btn>
          <Btn variant="primary" icon="check" onClick={onSave}>保存</Btn>
        </div>
      </div>
    </div>);

}

/* ---------- detail popup (modal over the calendar) ---------- */
function ScheduleModal({ event, onClose }) {
  const isNew = !event;
  return (
    <div className="smodal">
      <div className="smodal__scrim" onClick={onClose} />
      <div className="smodal__card" role="dialog">
        <div className="smodal__hd">
          <div style={{ minWidth: 0 }}>
            <h2 className="smodal__title"><Icon name={isNew ? 'plus' : 'edit'} size={18} stroke={2} />{isNew ? '予定を追加' : '予定を編集'}</h2>
            <p className="smodal__sub">{isNew ? '新しい予定の内容を入力して保存してください。' : '予定の内容を編集して保存してください。'}</p>
          </div>
          <button className="smodal__close" onClick={onClose} title="閉じる"><Icon name="x" size={19} /></button>
        </div>
        <DetailForm event={event} onCancel={onClose} onSave={onClose} onDelete={onClose} />
      </div>
    </div>);

}

/* ---------- assembled PC app ---------- */
function ScheduleAppPC({ initialView = 'list' }) {
  const [modal, setModal] = useState(initialView === 'detail' ? { event: window.SCH_EVENTS[7] } : null);
  const [showAd, setShowAd] = useState(true);

  const openAdd = () => setModal({ event: null });
  const openEvt = (e) => setModal({ event: e });
  const close = () => setModal(null);

  return (
    <div className="rk sch">
      <Sidebar active="schedule" />
      <div className="sch__main">
        <TopBar title="スケジュール" desc={<React.Fragment><Icon name="calendar" size={14} style={{ color: 'var(--text-muted)' }} />配信・収録・コラボの予定をまとめて管理。</React.Fragment>} />
        <ScheduleCalendar onAdd={openAdd} onOpen={openEvt} />
        {showAd && <AdBanner onClose={() => setShowAd(false)} />}
        <AIFab style={{ bottom: showAd ? 70 : 28 }} />
      </div>
      {modal && <ScheduleModal event={modal.event} onClose={close} />}
    </div>);

}

Object.assign(window, { ScheduleAppPC, DetailForm, ScheduleModal, evtVars });