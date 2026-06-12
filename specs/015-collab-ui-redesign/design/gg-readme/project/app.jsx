// app.jsx — assemble DesignCanvas + Tweaks
const { DesignCanvas, DCSection, DCArtboard } = window;
const { useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakRadio, TweakColor } = window;
const { CatalogBoard, PCDashboard, MobileDashboard } = window;

// Accent palettes (full ramp + glow rgb) keyed by primary hex.
const ACCENTS = {
  '#7f77dd': { p300:'#a0a0ff', p400:'#8f88e8', p600:'#6b63cc', p700:'#534ab7', p800:'#3b3490', p950:'#130f3a', glow:'127,119,221' },
  '#d957a6': { p300:'#ff9fd8', p400:'#e070b5', p600:'#c0468f', p700:'#9e3675', p800:'#7a2858', p950:'#2e0f24', glow:'217,87,166' },
  '#3fb6e0': { p300:'#8fe0ff', p400:'#5ec5ea', p600:'#2f9bc4', p700:'#2479a0', p800:'#1a5673', p950:'#06222e', glow:'63,182,224' },
  '#5fce6a': { p300:'#a8f0a8', p400:'#76d97e', p600:'#48ad52', p700:'#388a40', p800:'#27622d', p950:'#0a240e', glow:'95,206,106' },
};
const DENSITY_PX = { 'コンパクト': 16.5, '標準': 18, 'ゆったり': 19.5 };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#3fb6e0",
  "glow": 120,
  "density": "ゆったり",
  "textColor": "#ffffff"
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const r = document.documentElement;
  const a = ACCENTS[t.accent] || ACCENTS['#7f77dd'];
  const g = (t.glow ?? 100) / 100;
  r.style.setProperty('--primary', t.accent);
  r.style.setProperty('--primary-500', t.accent);
  r.style.setProperty('--primary-300', a.p300);
  r.style.setProperty('--primary-400', a.p400);
  r.style.setProperty('--primary-600', a.p600);
  r.style.setProperty('--primary-700', a.p700);
  r.style.setProperty('--primary-800', a.p800);
  r.style.setProperty('--primary-900', a.p800);
  r.style.setProperty('--primary-950', a.p950);
  r.style.setProperty('--text-accent', a.p300);
  r.style.setProperty('--glow-mult', String(g));
  r.style.setProperty('--glow-primary', `0 0 ${(16 * g).toFixed(1)}px rgba(${a.glow}, ${(0.5 * Math.min(g, 1.6)).toFixed(2)})`);
  r.style.setProperty('--text-primary', t.textColor);
  r.style.fontSize = (DENSITY_PX[t.density] || 18) + 'px';
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyTweaks(t); }, [t.accent, t.glow, t.density, t.textColor]);

  return (
    <React.Fragment>
      <DesignCanvas style={{ background: '#07071a' }}>
        <DCSection id="components" title="コンポーネント / UIキット" subtitle="ボタン・バッジ・カード・入力・カラートークン">
          <DCArtboard id="catalog" label="UIキット — ボタン & コンポーネント" width={1160} height={2430} style={{ background: 'var(--bg)' }}>
            <CatalogBoard />
          </DCArtboard>
        </DCSection>

        <DCSection id="dashboard" title="ダッシュボード" subtitle="チャンネル数値 · コラボ承認待ち · タスク · チーム — PC & モバイル">
          <DCArtboard id="pc" label="PC — 1440px" width={1440} height={1248} style={{ background: 'var(--bg)' }}>
            <PCDashboard />
          </DCArtboard>
          <DCArtboard id="mobile" label="モバイル — 390px" width={390} height={844} style={{ background: 'var(--bg)' }}>
            <MobileDashboard />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel>
        <TweakSection label="ブランド" />
        <TweakColor label="アクセント" value={t.accent}
          options={['#7f77dd', '#d957a6', '#3fb6e0', '#5fce6a']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="発光・グロー" />
        <TweakSlider label="グロー強度" value={t.glow} min={0} max={180} step={10} unit="%"
          onChange={(v) => setTweak('glow', v)} />
        <TweakSection label="タイポグラフィ" />
        <TweakRadio label="フォント密度" value={t.density}
          options={['コンパクト', '標準', 'ゆったり']}
          onChange={(v) => setTweak('density', v)} />
        <TweakColor label="文字色" value={t.textColor}
          options={['#e4e4ee', '#ffffff', '#efe9e4', '#ece9ff']}
          onChange={(v) => setTweak('textColor', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
