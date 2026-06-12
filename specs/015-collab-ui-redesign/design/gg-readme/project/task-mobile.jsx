// task-mobile.jsx — responsive (390px) task board: status pills + card list + detail
const { Icon, Btn, Avatar } = window;
const { MobileToolbar, AdBanner, AIFab } = window;
const { STATUSES, TCATS, MEMBERS, tasksByStatus, dueInfo, fmtDue, useDismiss } = window;
const { TaskDetailForm, TaskCard } = window;
const { useState } = React;

/* status bar */
function MTStatus() {
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

function TaskAppMobile({ initialView = 'board' }) {
  const [screen, setScreen] = useState(initialView);
  const [editing, setEditing] = useState(initialView === 'detail' ? window.TASKS[4] : null);
  const [activeStatus, setActiveStatus] = useState('doing');
  const [showAd, setShowAd] = useState(true);
  const [hintOff, dismissHint, showHint] = useDismiss('task-m-hint');

  const openAdd = () => { setEditing(null); setScreen('detail'); };
  const openTask = (t) => { setEditing(t); setScreen('detail'); };
  const back = () => setScreen('board');

  const status = STATUSES.find((s) => s.key === activeStatus);
  const tasks = tasksByStatus(activeStatus);

  return (
    <div className="rk sch sch--mobile" style={{ flexDirection: 'column' }}>
      <MTStatus />
      {showAd && <AdBanner top onClose={() => setShowAd(false)} />}

      {screen === 'board'
        ? <React.Fragment>
            <div className="mtop">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mtop__title">タスク管理</div>
                <div className="mtop__desc">配信・編集・告知タスクを管理 · 全 {window.TASKS.length} 件</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className={`helptoggle${hintOff ? '' : ' is-on'}`} style={{ width: 34, height: 34 }}
                  onClick={() => hintOff ? showHint() : dismissHint()} title="操作ヘルプ"><Icon name="help" size={17} stroke={2} /></button>
                <div style={{ position: 'relative' }}>
                  <button className="btn btn--subtle btn--icon btn--sm" title="通知"><Icon name="bell" size={18} /></button>
                  <span className="notif" style={{ top: -3, right: -3 }}>3</span>
                </div>
              </div>
            </div>

            {/* status pills (= columns) */}
            <div className="mtpills">
              {STATUSES.map((s) => {
                const n = tasksByStatus(s.key).length;
                return (
                  <button key={s.key} className={`mtpill${activeStatus === s.key ? ' is-on' : ''}`} onClick={() => setActiveStatus(s.key)}>
                    <span className="mtpill__dot" style={{ background: s.color }} />{s.label}<span className="mtpill__n">{n}</span>
                  </button>
                );
              })}
            </div>

            {!hintOff &&
              <div className="hint hint--closable" style={{ margin: '0 16px 12px' }}>
                <Icon name="help" size={15} stroke={2} />
                <span>上の<b>ステータス</b>を切替えて確認。カードを<b>タップ</b>で編集、<b>期限が近い順</b>に並びます。</span>
                <button className="hint__x" onClick={dismissHint} title="今後表示しない"><Icon name="x" size={14} /></button>
              </div>
            }

            <div className="mtlist">
              <div className="mtlist__hd">
                <span className="mtlist__bar" style={{ background: status.color }} />
                <span className="mtlist__name">{status.label}</span>
                <span className="mtlist__count">{tasks.length} 件</span>
              </div>
              {tasks.length === 0 && <div className="kbcol__empty" style={{ textAlign: 'left' }}>このステータスのタスクはありません</div>}
              {tasks.map((t, i) => <TaskCard key={t.id} task={t} i={i} onOpen={openTask} onDelete={() => {}} />)}
            </div>

            <Btn variant="primary" icon="plus" onClick={openAdd}
              style={{ position: 'absolute', left: 16, right: 16, bottom: 80, width: 'auto' }} full>タスクを追加</Btn>
          </React.Fragment>
        : <React.Fragment>
            <div className="mtop" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: 12 }}>
              <button className="btn btn--subtle btn--icon btn--sm" onClick={back}><Icon name="chevL" size={18} /></button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mtop__title">{editing ? 'タスクを編集' : 'タスクを追加'}</div>
                <div className="mtop__desc">内容を入力して保存</div>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingTop: 14 }}>
              <TaskDetailForm task={editing} onCancel={back} onSave={back} onDelete={back} />
            </div>
          </React.Fragment>
      }

      {screen === 'board' && <AIFab style={{ bottom: 150, right: 16, width: 44, height: 44 }} />}
      <MobileToolbar active="task" />
    </div>
  );
}

Object.assign(window, { TaskAppMobile });
