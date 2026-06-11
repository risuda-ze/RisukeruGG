// task-pc.jsx — PC task board (kanban) + task detail popup (with chat-style comments)
const { Icon, Btn, Avatar, Dropdown, DateField, useDismiss } = window;
const { Sidebar, TopBar, AdBanner, AIFab } = window;
const { STATUSES, TCATS, TCAT_ORDER, MEMBERS, T_TODAY, tasksByStatus, dueInfo, fmtDue } = window;
const { useState } = React;

/* ---------- task card ---------- */
function TaskCard({ task, i, onOpen, onDelete }) {
  const c = TCATS[task.cat];
  const di = dueInfo(task.due);
  const done = task.status === 'done';
  const chipCls = done ? 'tchip--done' : `tchip--${di.level}`;
  const chipTxt = done ? '完了' : di.chip;
  return (
    <div className={`tcard${done ? ' tcard--done' : ''}`} style={{ '--tc': c.color, animationDelay: `${i * 40}ms` }}
      onClick={() => onOpen(task)}>
      <span className="tcat" style={{ '--tcat': c.color, '--tcat-bg': c.bg }}>
        <Icon name={c.icon} size={12} stroke={2.2} />{c.label}
      </span>
      <div className="tcard__title">{task.title}</div>
      <div className="tcard__foot">
        <span className="tcard__who">
          <Avatar initials={task.who} tone={MEMBERS[task.who].tone} size={24} />
          <span className="tcard__whoname">{task.who}</span>
        </span>
        <span className="tcard__due">
          <Icon name="clock" size={13} stroke={2} />{fmtDue(task.due)}
        </span>
        <span className={`tcard__chip ${chipCls}`}>{chipTxt}</span>
        <span className="tcard__actions">
          <button className="tcard__act" title="編集" onClick={(e) => { e.stopPropagation(); onOpen(task); }}>
            <Icon name="edit" size={15} stroke={2} />
          </button>
          <button className="tcard__act tcard__act--del" title="削除" onClick={(e) => { e.stopPropagation(); onDelete(task); }}>
            <Icon name="trash" size={15} stroke={2} />
          </button>
        </span>
      </div>
    </div>
  );
}

/* ---------- kanban column ---------- */
function KanbanColumn({ status, onAdd, onOpen, onDelete }) {
  const tasks = tasksByStatus(status.key);
  return (
    <div className="kbcol">
      <div className="kbcol__hd">
        <span className="kbcol__bar" style={{ background: status.color }} />
        <span className="kbcol__name">{status.label}</span>
        <span className="kbcol__count">{tasks.length}</span>
        <button className="kbcol__menu" title="この列を編集"><Icon name="more" size={18} /></button>
      </div>
      <div className="kbcol__body">
        {tasks.length === 0 && <div className="kbcol__empty">タスクはありません</div>}
        {tasks.map((t, i) => <TaskCard key={t.id} task={t} i={i} onOpen={onOpen} onDelete={onDelete} />)}
        <button className="kbcol__add" onClick={() => onAdd(status)}>
          <Icon name="plus" size={15} stroke={2.4} />タスクを追加
        </button>
      </div>
    </div>
  );
}

/* ---------- kanban board screen ---------- */
function TaskBoard({ onAdd, onOpen, onDelete }) {
  const [hintOff, dismissHint, showHint] = useDismiss('task-board-hint');
  const total = window.TASKS.length;
  return (
    <div className="sch__body">
      <div className="tboardhd">
        <span className="tboardhd__title">カンバンボード <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '1rem' }}>全 {total} 件</span></span>
        <div className="tboardhd__right">
          <Btn variant="primary" icon="plus" onClick={() => onAdd(null)}>タスクを追加</Btn>
          <Btn variant="subtle" icon="gear">ステータス・カテゴリ設定</Btn>
          <button className={`helptoggle${hintOff ? '' : ' is-on'}`} onClick={() => hintOff ? showHint() : dismissHint()}
            title={hintOff ? '操作ヘルプを表示' : '操作ヘルプを非表示'}><Icon name="help" size={19} stroke={2} /></button>
        </div>
      </div>
      {!hintOff &&
        <div className="hint hint--closable" style={{ marginBottom: 14 }}>
          <Icon name="help" size={16} stroke={2} />
          <span>カードを<b>クリック</b>すると編集、各列の<b>＋</b>で新規追加。カードは<b>期限が近い順</b>に自動で並びます。<b>ステータス列</b>と<b>カテゴリ</b>は自由に追加・編集できます。</span>
          <button className="hint__x" onClick={dismissHint} title="今後表示しない"><Icon name="x" size={15} /></button>
        </div>
      }
      <div className="kbwrap">
        <div className="kbscroll">
          <div className="kb">
            {STATUSES.map((s) => <KanbanColumn key={s.key} status={s} onAdd={onAdd} onOpen={onOpen} onDelete={onDelete} />)}
            <button className="kbcol kbcol--add" title="新しいステータス列を追加"><Icon name="plus" size={18} stroke={2.4} />ステータス列を追加</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- chat-style comment / memo ---------- */
function TaskChat({ comments = [] }) {
  return (
    <div className="tchat">
      {comments.length === 0
        ? <div className="tchat__empty"><Icon name="msg" size={16} stroke={2} />まだコメントはありません。下の入力欄からメンバーに連絡できます。</div>
        : <div className="tchat__list">
            {comments.map((m) => (
              <div key={m.id} className={`tchat__msg${m.me ? ' tchat__msg--me' : ''}`}>
                <Avatar initials={m.by} tone={(MEMBERS[m.by] || { tone: 'm' }).tone} size={32} />
                <div className="tchat__body">
                  <div className="tchat__meta">
                    <span className="tchat__name">{m.by}</span>
                    <span className="tchat__time">{m.time}</span>
                  </div>
                  <div className="tchat__bubble">{m.text}</div>
                </div>
              </div>
            ))}
          </div>
      }
      <div className="tchat__inputrow">
        <label className="tchat__field">
          <Icon name="edit" size={16} stroke={2} style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="コメント・メモを入力…" />
        </label>
        <button className="tchat__send" title="送信"><Icon name="arrowUp" size={18} stroke={2.4} /></button>
      </div>
    </div>
  );
}

/* ---------- task detail form (popup body) — 2 columns: inputs | comments ---------- */
function TaskDetailForm({ task, onCancel, onSave, onDelete }) {
  const isNew = !task;
  const [allDay, setAllDay] = useState(false);
  const [cat, setCat] = useState(task ? TCATS[task.cat].label : null);
  const [status, setStatus] = useState(task ? STATUSES.find((s) => s.key === task.status).label : STATUSES[0].label);
  const dd = task ? task.due : T_TODAY;

  return (
    <div className="sform sform--task">
      <div className="sform__split">
        {/* LEFT — 入力項目 */}
        <div className="tdcol tdcol--main">
          <div className="sform__row">
            <label className="sform__label"><Icon name="edit" size={15} stroke={2} />タイトル<span className="sform__req">*</span></label>
            <input className="sform__title-input" defaultValue={task ? task.title : ''} placeholder="例）APEXコラボ サムネ作成" />
          </div>

          <div className="sform__grid2">
            <div className="sform__row" style={{ marginBottom: 0 }}>
              <label className="sform__label"><Icon name="filter" size={15} stroke={2} />カテゴリ<span className="sform__req">*</span></label>
              <Dropdown value={cat} placeholder="カテゴリを選択" icon="grid"
                options={TCAT_ORDER.map((k) => TCATS[k].label)} onChange={setCat} />
            </div>
            <div className="sform__row" style={{ marginBottom: 0 }}>
              <label className="sform__label"><Icon name="task" size={15} stroke={2} />ステータス<span className="sform__req">*</span></label>
              <Dropdown value={status} placeholder="ステータスを選択" icon="task"
                options={STATUSES.map((s) => s.label)} onChange={setStatus} />
            </div>
          </div>

          <div className="sform__row" style={{ marginTop: 22 }}>
            <div className="sform__labelrow">
              <label className="sform__label" style={{ marginBottom: 0 }}><Icon name="flag" size={15} stroke={2} />締切日時<span className="sform__req">*</span></label>
              <label className={`allday${allDay ? ' is-on' : ''}`} onClick={() => setAllDay((v) => !v)}>
                <span className="allday__txt">終日</span>
                <span className="allday__sw" />
              </label>
            </div>
            <DateField hideTime={allDay} year={dd.getFullYear()} month={dd.getMonth() + 1}
              selected={dd.getDate()} today={4} defaultTime="18:00" />
          </div>

          <div className="sform__row" style={{ marginTop: 22, marginBottom: 4 }}>
            <label className="sform__label"><Icon name="msg" size={15} stroke={2} />説明</label>
            <textarea defaultValue={task ? task.desc : ''} placeholder="作業内容・参考リンク・依頼メモなど" />
          </div>
        </div>

        {/* RIGHT — コメント / メモ */}
        <div className="tdcol tdcol--chat">
          <label className="sform__label"><Icon name="collab" size={15} stroke={2} />コメント / メモ</label>
          <TaskChat comments={task ? task.comments : []} />
        </div>
      </div>

      <div className="sform__footer">
        {!isNew && <Btn variant="danger" icon="trash" onClick={onDelete}>削除</Btn>}
        <div className="sform__footer-right">
          <Btn variant="subtle" onClick={onCancel}>キャンセル</Btn>
          <Btn variant="primary" icon="check" onClick={onSave}>保存</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------- task detail popup (modal) ---------- */
function TaskModal({ task, onClose }) {
  const isNew = !task;
  return (
    <div className="smodal">
      <div className="smodal__scrim" onClick={onClose} />
      <div className="smodal__card smodal__card--task" role="dialog">
        <div className="smodal__hd">
          <div style={{ minWidth: 0 }}>
            <h2 className="smodal__title"><Icon name={isNew ? 'plus' : 'edit'} size={18} stroke={2} />{isNew ? 'タスクを追加' : 'タスクを編集'}</h2>
            <p className="smodal__sub">{isNew ? '新しいタスクの内容を入力して保存してください。' : '内容を編集して保存。コメント欄でメンバーと連絡できます。'}</p>
          </div>
          <button className="smodal__close" onClick={onClose} title="閉じる"><Icon name="x" size={19} /></button>
        </div>
        <TaskDetailForm task={task} onCancel={onClose} onSave={onClose} onDelete={onClose} />
      </div>
    </div>
  );
}

/* ---------- assembled PC app ---------- */
function TaskAppPC({ initialView = 'board' }) {
  const [modal, setModal] = useState(initialView === 'detail' ? { task: window.TASKS[4] } : null);
  const [showAd, setShowAd] = useState(true);

  const openAdd = () => setModal({ task: null });
  const openTask = (t) => setModal({ task: t });
  const close = () => setModal(null);

  return (
    <div className="rk sch">
      <Sidebar active="task" />
      <div className="sch__main">
        <TopBar title="タスク管理" desc={<React.Fragment><Icon name="task" size={14} style={{ color: 'var(--text-muted)' }} />配信・編集・告知タスクをカンバン形式で管理。</React.Fragment>} />
        <TaskBoard onAdd={openAdd} onOpen={openTask} onDelete={() => {}} />
        {showAd && <AdBanner onClose={() => setShowAd(false)} />}
        <AIFab style={{ bottom: showAd ? 70 : 28 }} />
      </div>
      {modal && <TaskModal task={modal.task} onClose={close} />}
    </div>
  );
}

Object.assign(window, { TaskAppPC, TaskDetailForm, TaskModal, TaskChat, TaskCard });
