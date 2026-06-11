// collab-pc.jsx — PC コラボ調整: 一覧（調整中/確定ゾーン）+ 詳細ポップアップ
const { Icon, Btn, Avatar, Dropdown } = window;
const { Sidebar, TopBar, AdBanner, AIFab } = window;
const { CB_STATUS, CB_STATUS_ORDER, statusLabel, CB_MEMBERS, CB_MEMBER_OPTIONS,
        COLLABS, collabsByZone, remaining, fmtCand, fixedCand } = window;
const { WD_JP } = window;
const { useState } = React;

/* ---------- コメント / メモ（チャット形式・.tchat を再利用） ---------- */
function CollabChat({ comments = [] }) {
  return (
    <div className="tchat">
      {comments.length === 0
        ? <div className="tchat__empty"><Icon name="msg" size={16} stroke={2} />まだコメントはありません。下の入力欄から参加者に連絡できます。</div>
        : <div className="tchat__list">
            {comments.map((m) => (
              <div key={m.id} className={`tchat__msg${m.me ? ' tchat__msg--me' : ''}`}>
                <Avatar initials={m.by.slice(0, 2)} tone={(CB_MEMBERS[m.by] || { tone: 'm' }).tone} size={32} />
                <div className="tchat__body">
                  <div className="tchat__meta"><span className="tchat__name">{m.by}</span><span className="tchat__time">{m.time}</span></div>
                  <div className="tchat__bubble">{m.text}</div>
                </div>
              </div>
            ))}
          </div>}
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

/* ---------- ステータスバッジ ---------- */
function CollabBadge({ status }) {
  const label = statusLabel(status);
  return (
    <span className={`cbbadge cbbadge--${status}`}>
      <span className="cbbadge__dot" />
      <span className="cbbadge__main">{label}</span>
    </span>
  );
}

/* ---------- 参加者アバター（重ね） ---------- */
function PartyAvatars({ members, max = 4 }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div className="cbava">
      <div className="cbava__stack">
        {shown.map((n) => <Avatar key={n} initials={n.slice(0, 2)} tone={(CB_MEMBERS[n] || {}).tone || 'm'} size={32} />)}
        {extra > 0 && <span className="cbava__more">+{extra}</span>}
      </div>
      <span className="cbava__count">{members.length}名</span>
    </div>
  );
}

/* ---------- コラボ行カード ---------- */
function CollabRow({ collab, onOpen, onDelete }) {
  const isFixed = collab.status === 'fixed';
  const rem = remaining(collab);
  const fx = fixedCand(collab);
  const pct = collab.total ? Math.round((collab.answered / collab.total) * 100) : 0;
  return (
    <div className={`cbrow${isFixed ? ' cbrow--fixed' : ''}`} onClick={() => onOpen(collab)}>
      <span className="cbrow__emblem">
        <Icon name={isFixed ? 'check' : 'collab'} size={20} stroke={2.2} />
      </span>

      <div className="cbrow__main">
        <div className="cbrow__titlerow">
          <span className="cbrow__title">{collab.title}</span>
          <CollabBadge status={collab.status} />
        </div>
        <div className="cbrow__sub">
          {isFixed && fx
            ? <span className="cbrow__date"><Icon name="calendar" size={13} stroke={2} />{fmtCand(fx)}</span>
            : <span><Icon name="calendar" size={12} stroke={2} style={{ verticalAlign: '-2px', marginRight: 4 }} />候補 {collab.candidates.length} 日程</span>}
          <span className="dot-sep" />
          <span>参加 {collab.members.length} 名</span>
          <span className="dot-sep" />
          <span>作成: {collab.creator}</span>
        </div>
      </div>

      <PartyAvatars members={collab.members} />

      {isFixed
        ? <div className="cbresp">
            <span className="cbresp__label">日程確定</span>
            <span className="cbresp__fixed">
              <Icon name="check" size={15} stroke={2.6} />
              <span className="cbresp__fixed-d">{fx ? fmtCand(fx) : '確定済み'}</span>
            </span>
          </div>
        : <div className={`cbresp${rem === 0 ? ' cbresp--done' : ''}`}>
            <span className="cbresp__label">{rem === 0 ? '全員回答済み' : '残り回答者数'}</span>
            <span className="cbresp__big">
              <span className="cbresp__n">{rem === 0 ? '✓' : rem}</span>
              {rem !== 0 && <span className="cbresp__unit">人 / {collab.total}人中</span>}
            </span>
            <span className="cbresp__bar"><span className="cbresp__fill" style={{ width: pct + '%' }} /></span>
          </div>}

      <div className="cbrow__actions" onClick={(e) => e.stopPropagation()}>
        <button className="cbrow__act cbrow__act--detail" title="詳細を開く" onClick={() => onOpen(collab)}>
          <Icon name="edit" size={15} stroke={2} />詳細
        </button>
        <button className="cbrow__act cbrow__act--del" title="削除" onClick={() => onDelete(collab)}>
          <Icon name="trash" size={16} stroke={2} />
        </button>
      </div>
    </div>
  );
}

/* ---------- ゾーン ---------- */
function CollabZone({ zone, onOpen, onDelete }) {
  const list = collabsByZone(zone);
  const isFixed = zone === 'fixed';
  const title = isFixed ? '予定確定したコラボ' : '調整中のコラボ';
  const desc  = isFixed ? '日程が確定した案件です。' : '日程調整・募集中の案件。行をクリックで詳細・編集。';
  return (
    <section className={`cbzone${isFixed ? ' cbzone--fixed' : ''}`}>
      <div className="cbzone__hd">
        <span className="cbzone__mark"><Icon name={isFixed ? 'check' : 'collab'} size={15} stroke={2.2} /></span>
        <span className="cbzone__title">{title}</span>
        <span className="cbzone__count">{list.length}</span>
        <span className="cbzone__desc">{desc}</span>
      </div>
      <div className="cbzone__list">
        {list.length === 0
          ? <div className="cbzone__empty"><Icon name="collab" size={16} stroke={2} />まだ案件はありません。</div>
          : list.map((c) => <CollabRow key={c.id} collab={c} onOpen={onOpen} onDelete={onDelete} />)}
      </div>
    </section>
  );
}

/* ---------- 一覧ボード ---------- */
function CollabBoard({ onAdd, onOpen, onDelete }) {
  const [hintOff, setHintOff] = useState(false);
  return (
    <div className="cbboard">
      <div className="cbscroll">
        <div className="cbbanner">
          <span className="cbbanner__emblem">
            <Icon name="zap" size={24} stroke={2.2} />
          </span>
          <div className="cbbanner__txt">
            <div className="cbbanner__title">コラボ<span className="accent">調整</span></div>
            <div className="cbbanner__tag">他チャンネルとの合同配信・コラボの日程調整と募集を管理。</div>
          </div>
          <div className="cbbanner__actions">
            <button className={`helptoggle${hintOff ? '' : ' is-on'}`} onClick={() => setHintOff((v) => !v)} title="操作ヘルプ">
              <Icon name="help" size={19} stroke={2} />
            </button>
            <Btn variant="primary" icon="plus" onClick={() => onAdd()}>コラボ調整開始</Btn>
          </div>
        </div>

        {!hintOff && (
          <div className="hint hint--closable" style={{ flex: '0 0 auto' }}>
            <Icon name="help" size={16} stroke={2} />
            <span>「コラボ調整開始」で新規作成。カードの<b>詳細</b>から日程候補に回答を集め、<b>残り回答者数</b>が0になったら詳細画面で<b>日程を確定</b>できます。確定した案件は下のゾーンへ移動します。</span>
            <button className="hint__x" onClick={() => setHintOff(true)} title="今後表示しない"><Icon name="x" size={15} /></button>
          </div>
        )}

        <CollabZone zone="adjust" onOpen={onOpen} onDelete={onDelete} />
        <CollabZone zone="fixed"  onOpen={onOpen} onDelete={onDelete} />
      </div>
    </div>
  );
}

/* ---------- 候補日時エディタ ---------- */
function CandidateEditor({ collab }) {
  const [list, setList]       = useState(collab ? collab.candidates.map((c, i) => ({ ...c, _id: i })) : []);
  const [fixedId, setFixedId] = useState(collab && collab.fixedIdx != null ? collab.fixedIdx : null);
  const [adding, setAdding]   = useState(false);
  const [newDate, setNewDate] = useState('2026-06-10');
  const [newTime, setNewTime] = useState('21:00');

  const confirmAdd = () => {
    if (!newDate) return;
    const [y, m, d] = newDate.split('-').map(Number);
    const [h, mi]   = newTime.split(':').map(Number);
    const wd = WD_JP[new Date(y, m - 1, d).getDay()];
    setList((l) => [...l, { y, m, d, wd, h, mi: mi || 0, ok: 0, maybe: 0, ng: 0, _id: Date.now() }]);
    setAdding(false);
  };

  const del = (id) => {
    setList((l) => l.filter((x) => x._id !== id));
    if (fixedId === id) setFixedId(null);
  };

  return (
    <div className="cbcand">
      <div className="cbcand__list">
        {list.length === 0 && !adding && (
          <div className="cbzone__empty" style={{ padding: 12 }}>
            <Icon name="calendar" size={15} stroke={2} />候補日時を1つ以上追加してください。
          </div>
        )}

        {list.map((c, i) => {
          const isFx      = fixedId === c._id;
          const hasTally  = c.ok + c.maybe + c.ng > 0;
          return (
            <div key={c._id} className="cbcand__item">
              <span className="cbcand__rank">{i + 1}</span>
              <span className="cbcand__when">{fmtCand(c)}</span>
              {hasTally && (
                <span className="cbcand__tally">
                  <span className="cbcand__t cbcand__t--ok">○{c.ok}</span>
                  <span className="cbcand__t cbcand__t--maybe">△{c.maybe}</span>
                  <span className="cbcand__t cbcand__t--ng">×{c.ng}</span>
                </span>
              )}
              <button type="button" className={`cbcand__confirm${isFx ? ' is-fixed' : ''}`}
                onClick={() => setFixedId(isFx ? null : c._id)}>
                {isFx ? '✓ この日程で確定' : '日程確定'}
              </button>
              <button type="button" className="cbcand__x" title="候補を削除" onClick={() => del(c._id)}>
                <Icon name="x" size={15} />
              </button>
            </div>
          );
        })}

        {adding && (
          <div className="cbcand__addinline">
            <input type="date" className="cbcand__dateinput"
              value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <input type="time" className="cbcand__timeinput"
              value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            <button type="button" className="cbcand__addconfirm" onClick={confirmAdd}>
              <Icon name="check" size={14} stroke={2.4} />追加
            </button>
            <button type="button" className="cbcand__x" onClick={() => setAdding(false)}>
              <Icon name="x" size={15} />
            </button>
          </div>
        )}
      </div>

      {!adding && (
        <button type="button" className="cbcand__addrow" onClick={() => setAdding(true)}>
          <Icon name="plus" size={15} stroke={2.4} />候補日時を追加
        </button>
      )}
    </div>
  );
}

/* ---------- 参加者エディタ ---------- */
function ParticipantEditor({ collab }) {
  const [list, setList] = useState(collab ? [...collab.members] : []);
  const [sel, setSel]   = useState(null);
  const [text, setText] = useState('');
  const add = () => {
    const name = text.trim() || sel;
    if (!name || list.includes(name)) { setText(''); return; }
    setList((l) => [...l, name]); setText(''); setSel(null);
  };
  const del = (n) => setList((l) => l.filter((x) => x !== n));
  return (
    <div className="cbpart">
      <div className="cbpart__addrow">
        <Dropdown value={sel} placeholder="メンバーを選択" icon="team" scroll options={CB_MEMBER_OPTIONS} onChange={setSel} />
        <label className="field">
          <Icon name="edit" size={17} className="ic" />
          <input type="text" placeholder="または名前を直接入力（ゲスト）" value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        </label>
        <Btn variant="subtle" icon="plus" onClick={add}>追加</Btn>
      </div>
      <div className="cbpart__list">
        {list.length === 0 && <span style={{ fontSize: '0.82rem', color: 'var(--text-disabled)' }}>参加者を1名以上追加してください。</span>}
        {list.map((n) => {
          const m = CB_MEMBERS[n];
          const guest = !m || m.guest;
          return (
            <span key={n} className="cbchip">
              <Avatar initials={n.slice(0, 2)} tone={(m || {}).tone || 'm'} size={26} />
              <span className="cbchip__name">{n}</span>
              {guest && <span className="cbchip__guest">ゲスト</span>}
              <button type="button" className="cbchip__x" title="外す" onClick={() => del(n)}>
                <Icon name="x" size={13} />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 詳細フォーム ---------- */
function CollabDetailForm({ collab, onCancel, onSave, onDelete }) {
  const isNew     = !collab;
  const statusOpts = CB_STATUS_ORDER.map((k) => statusLabel(k));
  const curStatus  = statusLabel(collab ? collab.status : 'prep');
  const [status, setStatus] = useState(curStatus);
  const [copied, setCopied] = useState(false);
  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="cbform">
      <div className="cbform__split">
        {/* 左：入力項目 */}
        <div className="cbcol cbcol--main">
          <div className="sform__row">
            <label className="sform__label"><Icon name="edit" size={15} stroke={2} />タイトル<span className="sform__req">*</span></label>
            <input className="sform__title-input" defaultValue={collab ? collab.title : ''} placeholder="例）猫宮ねね × 3人スクワッド APEX" />
          </div>

          <div className="sform__row">
            <label className="sform__label"><Icon name="flag" size={15} stroke={2} />ステータス<span className="sform__req">*</span></label>
            <Dropdown value={status} placeholder="ステータスを選択" icon="flag" options={statusOpts} onChange={setStatus} style={{ maxWidth: 280 }} />
          </div>

          <div className="sform__row">
            <label className="sform__label"><Icon name="msg" size={15} stroke={2} />内容</label>
            <textarea defaultValue={collab ? collab.desc : ''} placeholder="企画内容・配信形式・準備メモなど" />
          </div>

          <div className="sform__row">
            <label className="sform__label">
              <Icon name="calendar" size={15} stroke={2} />候補日時<span className="sform__req">*</span>
              <span style={{ fontWeight: 500, fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: 6 }}>1日程以上</span>
            </label>
            <CandidateEditor collab={collab} />
          </div>

          <div className="sform__row">
            <label className="sform__label"><Icon name="team" size={15} stroke={2} />参加者<span className="sform__req">*</span></label>
            <ParticipantEditor collab={collab} />
          </div>


        </div>

        {/* 右：コメント / メモ */}
        <div className="cbcol cbcol--chat">
          <label className="sform__label"><Icon name="msg" size={15} stroke={2} />コメント / メモ</label>
          <CollabChat comments={collab ? collab.comments : []} />
        </div>
      </div>

      <div className="cbfooter">
        <span className="cbfooter__note"><Icon name="help" size={14} stroke={2} /><span className="sform__req">*</span> は必須項目です</span>
        <Btn variant="subtle" icon="link" onClick={copyUrl}>{copied ? 'コピーしました！' : 'URLをコピー'}</Btn>
        <Btn variant="primary" icon="check" onClick={onSave}>保存</Btn>
        {!isNew && <Btn variant="danger" icon="trash" onClick={onDelete}>削除</Btn>}
        <Btn variant="subtle" onClick={onCancel}>キャンセル</Btn>
      </div>
    </div>
  );
}

/* ---------- 詳細モーダル ---------- */
function CollabModal({ collab, onClose }) {
  const isNew = !collab;
  return (
    <div className="smodal">
      <div className="smodal__scrim" onClick={onClose} />
      <div className="smodal__card smodal__card--collab" role="dialog">
        <div className="smodal__hd">
          <div style={{ minWidth: 0 }}>
            <h2 className="smodal__title">
              <Icon name={isNew ? 'plus' : 'edit'} size={18} stroke={2} />
              {isNew ? 'コラボ調整を新規作成' : 'コラボ調整を編集'}
            </h2>
            <p className="smodal__sub">
              {isNew
                ? '内容・候補日時・参加者を入力して保存。必須項目を埋めると保存できます。'
                : '内容を編集して保存。候補日時の「日程確定」で予定を確定できます。'}
            </p>
          </div>
          <button className="smodal__close" onClick={onClose} title="閉じる"><Icon name="x" size={19} /></button>
        </div>
        <CollabDetailForm collab={collab} onCancel={onClose} onSave={onClose} onDelete={onClose} />
      </div>
    </div>
  );
}

/* ---------- 組み立て（PC） ---------- */
function CollabAppPC({ initialView = 'board' }) {
  const [modal, setModal]   = useState(initialView === 'detail' ? { collab: COLLABS[0] } : null);
  const [showAd, setShowAd] = useState(true);
  const open  = (c) => setModal({ collab: c });
  const add   = ()  => setModal({ collab: null });
  const close = ()  => setModal(null);
  return (
    <div className="rk sch cb--fps">
      <Sidebar active="collab" />
      <div className="sch__main">
        <TopBar title="コラボ調整"
          desc={<React.Fragment><Icon name="collab" size={14} style={{ color: 'var(--text-muted)' }} />他チャンネルとの合同配信・コラボの日程調整と募集を管理。</React.Fragment>} />
        <CollabBoard onAdd={add} onOpen={open} onDelete={() => {}} />
        {showAd && <AdBanner onClose={() => setShowAd(false)} />}
        <AIFab style={{ bottom: showAd ? 70 : 28 }} />
      </div>
      {modal && <CollabModal collab={modal.collab} onClose={close} />}
    </div>
  );
}

Object.assign(window, { CollabAppPC, CollabBoard, CollabRow, CollabModal, CollabDetailForm });
