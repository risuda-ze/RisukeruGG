// OGP 画像生成スクリプト
//
// リポジトリ内の既存ロゴ（public/icon-512x512.png）を使い、
// ブランドカラーのダークパープル背景 ＋ ロゴ ＋ アプリ名 ＋ キャッチコピーを
// 合成した 1200×630 の OGP 画像（public/og-image.png）を生成する。
//
// 再生成方法:
//   node scripts/generate-og-image.mjs
//
// 依存: sharp（devDependencies）。SVG をラスタライズし、ロゴ PNG を合成する。

import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const WIDTH = 1200;
const HEIGHT = 630;

// ── ブランドカラー（LP / globals.css と統一） ─────────────────
const COLORS = {
  bg: '#0a0a18',
  surface: '#10102a',
  purple: '#7f77dd',
  purpleLight: '#b0aaf8',
  purpleDark: '#534ab7',
  amber: '#ef9f27',
  text: '#eeeeff',
  muted: '#8f8fc9',
};

// ── 背景 ＋ テキストの SVG ────────────────────────────────────
// ロゴは別途 PNG として合成するため、右側に余白を確保している。
const backgroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.bg}"/>
      <stop offset="100%" stop-color="${COLORS.surface}"/>
    </linearGradient>
    <radialGradient id="glow" cx="18%" cy="30%" r="60%">
      <stop offset="0%" stop-color="${COLORS.purpleDark}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${COLORS.purpleDark}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowAmber" cx="90%" cy="88%" r="45%">
      <stop offset="0%" stop-color="${COLORS.amber}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${COLORS.amber}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- 背景 -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glowAmber)"/>

  <!-- 外周アクセント枠 -->
  <rect x="0" y="0" width="${WIDTH}" height="6" fill="${COLORS.purpleDark}"/>
  <rect x="0" y="${HEIGHT - 6}" width="${WIDTH}" height="6" fill="${COLORS.amber}" opacity="0.8"/>

  <!-- アプリ名 -->
  <text x="80" y="210" font-family="Yu Gothic, 'Yu Gothic UI', Meiryo, sans-serif"
        font-size="62" font-weight="700" fill="${COLORS.text}">リスケる<tspan fill="${COLORS.amber}">GG</tspan></text>

  <!-- キャッチコピー -->
  <text x="80" y="330" font-family="Yu Gothic, 'Yu Gothic UI', Meiryo, sans-serif"
        font-size="52" font-weight="700" fill="${COLORS.text}">撮影も、コラボも、編集も</text>
  <text x="80" y="404" font-family="Yu Gothic, 'Yu Gothic UI', Meiryo, sans-serif"
        font-size="52" font-weight="700" fill="${COLORS.purpleLight}">GGなスケジュールを</text>

  <!-- 説明 -->
  <text x="82" y="486" font-family="Yu Gothic, 'Yu Gothic UI', Meiryo, sans-serif"
        font-size="26" font-weight="400" fill="${COLORS.muted}">配信者特化のチームスケジュール管理・コラボ日程調整・制作タスク管理</text>
</svg>
`;

async function main() {
  const logoPath = join(projectRoot, 'public', 'icon-512x512.png');
  const outPath = join(projectRoot, 'public', 'og-image.png');

  // ロゴを右側に収まるサイズへリサイズ（元 744×600、アスペクト比維持）
  const logo = await sharp(logoPath)
    .resize({ width: 380, height: 380, fit: 'inside' })
    .toBuffer();
  const logoMeta = await sharp(logo).metadata();

  // 右側中央に配置
  const logoLeft = Math.round(WIDTH - logoMeta.width - 90);
  const logoTop = Math.round((HEIGHT - logoMeta.height) / 2);

  await sharp(Buffer.from(backgroundSvg))
    .composite([{ input: logo, left: logoLeft, top: logoTop }])
    .png()
    .toFile(outPath);

  console.log(`OGP 画像を生成しました: ${outPath} (${WIDTH}x${HEIGHT})`);
}

main().catch((err) => {
  console.error('OGP 画像の生成に失敗しました:', err);
  process.exit(1);
});
