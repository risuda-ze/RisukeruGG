// collab-mobile.jsx — モバイル (390px) コラボ調整: 一覧 + 詳細フォーム
const { Icon, Btn, Avatar } = window;
const { MobileToolbar, AdBanner, AIFab, useDismiss } = window;
const { CB_MEMBERS, COLLABS, collabsByZone, remaining, fmtCand, fixedCand, statusLabel } = window;
const { CollabDetailForm } = window;
const { useState } = React;

/* ---------- ステータスバー ---------- */
function MCStatus() {
  return (
    <div style={{ height: 38, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px',
      fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
      <span className="mono">9:41</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
        <Icon name="play" size={13} fill="solid" />
        <Icon name="msg" size={13} />
        <span className="mono" style={{ fontSize: '0.74rem' }}>84%</span>
      </span>
    </div>
  );
}

/* ---------- コラボカード（モバイル用） ---------- */
function MCollabCard({ collab, onOpen }) {
  const isFixed = collab.status === 'fixed';
  const rem = remaining(collab);
  const fx  = fixedCand(collab);
  const pct = collab.total ? Math.round((collab.answered / collab.total) * 100) : 0;

  return (
    <div className={`mcbcard${isFixed ? ' mcbcard--fixed' : ''}`} onClick={() => onOpen(collab)}>
      <div className="mcbcard__top">
        <span className="mcbcard__title">{collab.title}</span>
        <span className={`cbbadge cbbadge--${collab.status} mcbcard__badge`}>
          <span className="cbbadge__dot" />
          <span className="cbbadge__main">{statusLabel(collab.status)}</span>
        </span>
      </div>

      <div className="mcbcard__sub">
        {isFixed && fx
          ? <span className="mcbcard__date">
              <Icon name="check" size={12} stroke={2.4} style={{ color: 'var(--success)' }} />{fmtCand(fx)}
            </span>
          : <span className="mcbcard__date">
              <Icon name="calendar" size={12} stroke={2} />候補 {collab.candidates.length} 日程
            </span>}
        <span className="dot-sep" />
        <span>{collab.members.length} 名参加</span>
      </div>

      {!isFixed && (
        <div className="mcbcard__foot">
          <div className="mcbcard__bar">
            <div className="mcbcard__fill" style={{ width: pct + '%' }} />
          </div>
          <span className="mcbcard__resp">
            {rem === 0
              ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>全員回答済み ✓</span>
              : <span>残り <b style={{ color: 'var(--cb-accent)' }}>{rem}</b> 人 / {collab.total}人中</span>}
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- 一覧画面 ---------- */
function CollabMobileBoard({ onOpen, onAdd }) {
  const [zone, setZone] = useState('adjust');
  const [hintOff, dismissHint, showHint] = useDismiss('cb-m-hint');

  const adjustList = collabsByZone('adjust');
  const fixedList  = collabsByZone('fixed');
  const list = zone === 'adjust' ? adjustList : fixedList;

  return (
    <React.Fragment>
      {/* ヘッダー */}
      <div className="mtop">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mtop__title">コラボ調整</div>
          <div className="mtop__desc">合同配信・コラボの日程調整を管理</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`helptoggle${hintOff ? '' : ' is-on'}`} style={{ width: 34, height: 34 }}
            onClick={() => hintOff ? showHint() : dismissHint()} title="操作ヘルプ">
            <Icon name="help" size={17} stroke={2} />
          </button>
          <div style={{ position: 'relative' }}>
            <button className="btn btn--subtle btn--icon btn--sm" title="通知">
              <Icon name="bell" size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ゾーン切替ピル */}
      <div className="mtpills">
        <button className={`mtpill${zone === 'adjust' ? ' is-on' : ''}`} onClick={() => setZone('adjust')}>
          <span className="mtpill__dot" style={{ background: 'var(--cb-accent)', borderRadius: 3 }} />
          調整中
          <span className="mtpill__n">{adjustList.length}</span>
        </button>
        <button className={`mtpill${zone === 'fixed' ? ' is-on' : ''}`} onClick={() => setZone('fixed')}>
          <span className="mtpill__dot" style={{ background: 'var(--success)', borderRadius: 3 }} />
          確定済み
          <span className="mtpill__n">{fixedList.length}</span>
        </button>
      </div>

      {/* ヒント */}
      {!hintOff && (
        <div className="hint hint--closable" style={{ margin: '0 16px 10px' }}>
          <Icon name="help" size={15} stroke={2} />
          <span>カードをタップで詳細・編集。「日程確定」ボタンで予定を固定できます。</span>
          <button className="hint__x" onClick={dismissHint} title="今後表示しない">
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {/* カード一覧 */}
      <div className="mtlist">
        <div className="mtlist__hd">
          <span className="mtlist__bar" style={{ background: zone === 'adjust' ? 'var(--cb-accent)' : 'var(--success)' }} />
          <span className="mtlist__name">{zone === 'adjust' ? '調整中のコラボ' : '予定確定したコラボ'}</span>
          <span className="mtlist__count">{list.length} 件</span>
        </div>
        {list.length === 0 && (
          <div className="kbcol__empty" style={{ textAlign: 'left' }}>
            {zone === 'adjust' ? '調整中の案件はありません' : '確定した案件はありません'}
          </div>
        )}
        {list.map((c) => <MCollabCard key={c.id} collab={c} onOpen={onOpen} />)}
      </div>
    </React.Fragment>
  );
}

/* ---------- 詳細画面 ---------- */
function CollabMobileDetail({ collab, onBack }) {
  return (
    <React.Fragment>
      <div className="mtop" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: 12, flex: '0 0 auto' }}>
        <button className="btn btn--subtle btn--icon btn--sm" onClick={onBack}>
          <Icon name="chevL" size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mtop__title">{collab ? 'コラボを編集' : 'コラボ調整開始'}</div>
          <div className="mtop__desc">内容を入力して保存</div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <CollabDetailForm collab={collab} onCancel={onBack} onSave={onBack} onDelete={onBack} />
      </div>
    </React.Fragment>
  );
}

/* ---------- 組み立て ---------- */
function CollabAppMobile({ initialView = 'board' }) {
  const [screen, setScreen]   = useState(initialView);
  const [editing, setEditing] = useState(initialView === 'detail' ? COLLABS[0] : null);
  const [showAd, setShowAd]   = useState(true);

  const openCollab = (c) => { setEditing(c); setScreen('detail'); };
  const openAdd    = ()  => { setEditing(null); setScreen('detail'); };
  const back       = ()  => setScreen('board');

  return (
    <div className="rk sch sch--mobile cb--fps" style={{ flexDirection: 'column' }}>
      <MCStatus />
      {showAd && <AdBanner top onClose={() => setShowAd(false)} />}

      {screen === 'board'
        ? <React.Fragment>
            <CollabMobileBoard onOpen={openCollab} onAdd={openAdd} />
            <Btn variant="primary" icon="plus" onClick={openAdd}
              style={{ position: 'absolute', left: 16, right: 16, bottom: 80, width: 'auto' }} full>
              コラボ調整開始
            </Btn>
            <AIFab style={{ bottom: 148, right: 16, width: 44, height: 44 }} />
          </React.Fragment>
        : <CollabMobileDetail collab={editing} onBack={back} />}

      <MobileToolbar active="collab" />
    </div>
  );
}

Object.assign(window, { CollabAppMobile });
