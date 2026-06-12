// catalog.jsx — component / button catalog artboard
const { Icon, Btn, Badge, Tag, Card, Field, Avatar, Progress, Toast, Spark, Dropdown, MiniCalendar } = window;

function Panel({ title, span = 1, children, pad = 24 }) {
  return (
    <div className="card" style={{ gridColumn: `span ${span}`, padding: pad, display: 'flex', flexDirection: 'column' }}>
      <div className="label-cap" style={{ marginBottom: 18 }}>{title}</div>
      {children}
    </div>
  );
}
function Row({ children, gap = 12, style }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap, ...style }}>{children}</div>;
}
function StateChip({ children }) {
  return <span style={{ fontSize: '0.66rem', fontFamily: 'var(--font-head)', fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--text-muted)', width: 64, flex: '0 0 auto' }}>{children}</span>;
}

function NavDemo() {
  const items = [
    { ic: 'grid', label: 'ホーム' }, { ic: 'calendar', label: '予定' },
    { ic: 'collab', label: 'コラボ' }, { ic: 'task', label: 'タスク' }, { ic: 'team', label: 'チーム' },
  ];
  const [active, setActive] = React.useState(2);
  return (
    <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <div className="bottomnav">
        {items.map((it, i) => (
          <button key={i} className={`navitem${i === active ? ' navitem--active' : ''}`} onClick={() => setActive(i)}>
            {i === active && <span className="navitem__pill" />}
            <Icon name={it.ic} size={21} stroke={2} />
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CatalogBoard() {
  const swatches = [
    ['--bg', '#0a0a18', 'bg'], ['--surface', '#11112a', 'surface'],
    ['--card', '#16163a', 'card'], ['--card-raised', '#1c1c42', 'raised'],
  ];
  const ramp = ['--primary-300', '--primary-400', '--primary-500', '--primary-600', '--primary-700', '--primary-800', '--primary-950'];
  const semantics = [['--success', 'success'], ['--warning', 'warning'], ['--danger', 'danger'], ['--info', 'info']];
  const motion = [
    ['Button · hover', 'bg + glow', 'instant'], ['Card · hover', 'translateY(-2)', 'fast'],
    ['Badge · 出現', 'pop', 'spring'], ['Modal · 開く', 'slide-up + fade', 'slow'],
    ['Toast · 出現', 'slide-in-left', 'spring'], ['Nav · 選択', 'pop', 'spring'],
  ];

  return (
    <div className="rk" style={{ width: 1160, padding: 40, background: 'var(--bg)' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <Logo />
            <span className="badge badge--primary" style={{ animation: 'none' }}>UI KIT v1.0</span>
          </div>
          <h2 style={{ fontSize: '2.45rem', fontWeight: 700, letterSpacing: '-0.01em' }}>コンポーネント & ボタン</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6, fontSize: '0.95rem' }}>
            ダーク × ネオンパープル。発光は hover・active・通知のみ — 常時グローは使わない。
          </p>
        </div>
        <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.7 }}>
          <div>Heading — <span style={{ color: 'var(--text-secondary)' }}>Space Grotesk</span></div>
          <div>Body — <span style={{ color: 'var(--text-secondary)' }}>Zen Kaku Gothic New</span></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>

        {/* Buttons */}
        <Panel title="Buttons — Variant" span={2}>
          <Row gap={12} style={{ marginBottom: 18 }}>
            <Btn variant="primary" icon="plus">予定を追加</Btn>
            <Btn variant="ghost" icon="swap">リスケ調整</Btn>
            <Btn variant="success" icon="check">承認</Btn>
            <Btn variant="danger" icon="x">却下</Btn>
            <Btn variant="subtle" icon="filter">絞り込み</Btn>
          </Row>
          <hr className="divider" style={{ margin: '4px 0 18px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Row gap={10}><StateChip>Default</StateChip><Btn variant="primary">配信開始</Btn><Btn variant="ghost">あとで</Btn></Row>
            <Row gap={10}><StateChip>Hover</StateChip>
              <button className="btn btn--primary" style={{ background: 'var(--primary-600)', boxShadow: 'var(--glow-primary)' }}>配信開始</button>
              <button className="btn btn--ghost" style={{ background: 'var(--primary-950)', boxShadow: 'var(--glow-primary)' }}>あとで</button>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>+ glow / lightness +8%</span>
            </Row>
            <Row gap={10}><StateChip>Active</StateChip>
              <button className="btn btn--primary" style={{ background: 'var(--primary-700)', transform: 'scale(0.96)' }}>配信開始</button>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>scale(0.96) + primary-700</span>
            </Row>
            <Row gap={10}><StateChip>Disabled</StateChip><Btn variant="primary" disabled>配信開始</Btn><Btn variant="ghost" disabled>あとで</Btn></Row>
          </div>
        </Panel>

        {/* Sizes + icon */}
        <Panel title="Size & Icon">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Row gap={10}><StateChip>SM</StateChip><Btn variant="primary" size="sm">Small</Btn></Row>
            <Row gap={10}><StateChip>MD</StateChip><Btn variant="primary" size="md">Medium</Btn></Row>
            <Row gap={10}><StateChip>LG</StateChip><Btn variant="primary" size="lg">Large</Btn></Row>
          </div>
          <hr className="divider" style={{ margin: '18px 0' }} />
          <Row gap={10}>
            <Btn variant="primary" icon="plus" title="追加" />
            <Btn variant="ghost" icon="bell" title="通知" />
            <Btn variant="subtle" icon="more" title="メニュー" />
            <Btn variant="subtle" size="sm" icon="edit" title="編集" />
          </Row>
        </Panel>

        {/* Badges & tags */}
        <Panel title="Badge & Tag">
          <Row gap={8} style={{ marginBottom: 16 }}>
            <Badge variant="primary">予定</Badge>
            <Badge variant="success" dot>配信中</Badge>
            <Badge variant="warning" dot>調整中</Badge>
            <Badge variant="danger" dot>要リスケ</Badge>
            <Badge variant="info">録画</Badge>
            <Badge variant="neutral">下書き</Badge>
          </Row>
          <Row gap={8}>
            <Tag accent icon="link">コラボ</Tag>
            <Tag icon="fire">FPS</Tag>
            <Tag icon="video">雑談</Tag>
            <Tag>歌枠</Tag>
          </Row>
        </Panel>

        {/* Fields */}
        <Panel title="Input / Field">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field icon="search" placeholder="配信タイトルを検索…" />
            <div>
              <Field icon="calendar" defaultValue="2026/06/02 21:00" focusDemo />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-accent)', marginTop: 6, display: 'block' }}>focus — primary border + glow</span>
            </div>
            <Field placeholder="無効化された入力" />
          </div>
        </Panel>

        {/* Avatars */}
        <Panel title="Avatar">
          <Row gap={16} style={{ marginBottom: 16 }}>
            <Avatar initials="リス" tone="v" status="live" ring />
            <Avatar initials="GG" tone="g" status="on" />
            <Avatar initials="ねこ" tone="p" status="idle" />
            <Avatar initials="美" tone="c" status="off" />
            <Avatar initials="蛍" tone="o" />
          </Row>
          <Row gap={10}>
            <Badge variant="danger" dot>LIVE</Badge>
            <Badge variant="success" dot>オンライン</Badge>
            <Badge variant="warning" dot>離席</Badge>
          </Row>
        </Panel>

        {/* Progress */}
        <Panel title="Progress & Meter">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Meter label="台本準備" value={82} />
            <Meter label="サムネ制作" value={45} variant="warning" />
            <Meter label="告知ツイート" value={100} variant="success" />
          </div>
        </Panel>

        {/* Cards */}
        <Panel title="Card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600 }}>標準カード</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>card / border / shadow-md</div>
            </div>
            <div className="card card--raised card--hover" style={{ padding: 16 }}>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600 }}>レイズド＋hover</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>ホバーで translateY(-2px)</div>
            </div>
          </div>
        </Panel>

        {/* Toasts */}
        <Panel title="Toast">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Toast variant="success" title="コラボ承認済み">猫宮さんとの枠を確定しました</Toast>
            <Toast variant="warning" title="予定が重複">21:00 の枠が2件あります</Toast>
          </div>
        </Panel>

        {/* Bottom nav */}
        <Panel title="Bottom Navigation">
          <NavDemo />
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 12 }}>選択で pop + primary-950 ピル。タップで切替できます。</div>
        </Panel>

        {/* Dropdown */}
        <Panel title="Dropdown — プルダウン">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Dropdown icon="filter" placeholder="配信カテゴリ" options={['FPS / APEX', '歌枠', '雑談', 'コラボ', '記念配信']} />
            <Dropdown value="14日" options={['7日', '14日', '30日', '90日']} />
            <div style={{ display: 'flex', gap: 10 }}>
              <Dropdown size="sm" value="新しい順" options={['新しい順', '古い順', '人気順']} style={{ flex: 1 }} />
              <Dropdown size="sm" align="right" placeholder="担当" options={['アオイ', 'カエデ', 'ソラ', 'ミナ']} style={{ flex: 1 }} />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>クリックで開閉・外側クリックで閉じる</span>
          </div>
        </Panel>

        {/* Mini calendar */}
        <Panel title="Date & Time — 日時指定">
          <MiniCalendar year={2026} month={6} selected={4} today={4} defaultTime="19:00" />
        </Panel>

        {/* Hover color shift */}
        <Panel title="Hover — 色変化（暖色→青）">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { initials: 'ねね', tone: 'p', name: '猫宮ねね', tag: 'FPS', badge: '要返答' },
              { initials: '蛍', tone: 'o', name: '蛍ホタル', tag: '歌枠', badge: '調整中', warn: true },
            ].map((r, i) => (
              <div key={i} className="hovershift" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px' }}>
                <Avatar initials={r.initials} tone={r.tone} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: '0.88rem' }}>{r.name}</span>
                    <Tag accent>{r.tag}</Tag>
                  </div>
                </div>
                <Badge variant={r.warn ? 'warning' : 'danger'} dot>{r.badge}</Badge>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 10 }}>ホバーすると暖色のアイコン・タグ・バッジが青へ遷移します。</div>
        </Panel>

        {/* Colors */}
        <Panel title="Color — Surfaces & Primary" span={2}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {swatches.map(([v, hex, name]) => (
              <div key={v}>
                <div className="swatch" style={{ background: `var(${v})` }} />
                <div style={{ fontSize: '0.74rem', marginTop: 6, color: 'var(--text-secondary)' }}>{name}</div>
                <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{hex}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {ramp.map((v) => <div key={v} style={{ flex: 1, height: 34, borderRadius: 6, background: `var(${v})` }} />)}
          </div>
          <Row gap={10}>
            {semantics.map(([v, name]) => (
              <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 16, height: 16, borderRadius: 5, background: `var(${v})`, boxShadow: `0 0 10px var(${v})` }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{name}</span>
              </div>
            ))}
          </Row>
        </Panel>

        {/* Motion */}
        <Panel title="Motion Reference">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {motion.map(([k, anim, dur], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '9px 0', borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-accent)' }}>{anim}</span>
                  <span className="kbd">{dur}</span>
                </span>
              </div>
            ))}
          </div>
        </Panel>

      </div>
    </div>
  );
}

function Meter({ label, value, variant }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{value}%</span>
      </div>
      <Progress value={value} variant={variant} />
    </div>
  );
}

function Logo() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, whiteSpace: 'nowrap' }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, flex: '0 0 auto', background: 'linear-gradient(135deg,var(--primary-400),var(--primary-700))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-primary)' }}>
        <Icon name="zap" size={18} fill="solid" style={{ color: '#fff' }} />
      </span>
      <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
        リスケる<span style={{ color: 'var(--primary-300)' }}>GG</span>
      </span>
    </span>
  );
}

Object.assign(window, { CatalogBoard, Logo, Meter });
