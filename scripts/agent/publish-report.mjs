// 使い方: node scripts/agent/publish-report.mjs --sha <SHA> --dir <レポートディレクトリ> [PR番号]
// 最終二次レビュー後の人間向けレポート（<dir>/report.md と画像）を review-reports ブランチに置き、
// PR コメントとして投稿する。guard hook により review-auditor だけが実行できる。
// 変更内容に応じた必須節が無ければ投稿しない（画面の変更 → スクリーンショット、lint/E2E 定義の変更 → 変更レポート）。
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  cpSync,
  rmSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sh, ghJson, args, reportMarker, stripMarkers } from './lib.mjs';

const BRANCH = 'review-reports';
// 画面に影響する変更
const UI_RE = /^(src\/(app|components|hooks|stores)\/|src\/.*\.css$|public\/)/;
// lint / E2E / CI の定義
const DEF_RE =
  /^(eslint\.config\.mjs|eslint-rules\/|playwright\.config\.ts|tests\/e2e\/|\.github\/workflows\/|\.github\/rulesets\/)/;
const SECTIONS = { ui: '## 画面の変更', def: '## lint / E2E 定義の変更' };

const { values: v, positionals } = args({ sha: { type: 'string' }, dir: { type: 'string' } });
if (!v.sha || !v.dir || !existsSync(join(v.dir, 'report.md'))) {
  console.error('--sha <SHA> --dir <report.md を含むディレクトリ> が必須');
  process.exit(1);
}
const pr = ghJson(['pr', 'view', ...positionals, '--json', 'number,headRefOid']);
if (!pr.headRefOid.startsWith(v.sha)) {
  console.error(
    `HEAD が ${pr.headRefOid.slice(0, 7)} に進んでいる。最終レビューセットからやり直す。`
  );
  process.exit(1);
}

let report = stripMarkers(readFileSync(join(v.dir, 'report.md'), 'utf8'));
const changed = sh('gh', ['pr', 'diff', String(pr.number), '--name-only'])
  .stdout.split('\n')
  .map((s) => s.trim())
  .filter(Boolean);
const images = readdirSync(v.dir).filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f));
const missing = [];
if (changed.some((f) => UI_RE.test(f))) {
  if (!report.includes(SECTIONS.ui))
    missing.push(`「${SECTIONS.ui}」節（画面に影響するファイルが変更されている）`);
  if (!images.length) missing.push('スクリーンショット（ディレクトリに画像がない）');
}
const defs = changed.filter((f) => DEF_RE.test(f));
if (defs.length && !report.includes(SECTIONS.def)) {
  missing.push(`「${SECTIONS.def}」節（${defs.join(', ')} が変更されている）`);
}
if (missing.length) {
  console.error(
    `レポートに不足がある: ${missing.join(' / ')}。final-report スキルのテンプレートで書き直す。`
  );
  process.exit(1);
}

// review-reports ブランチ（main/develop と履歴を共有しない専用ブランチ）の pr-<番号>/ に置く
const repo = ghJson(['repo', 'view', '--json', 'nameWithOwner']).nameWithOwner;
const wt = mkdtempSync(join(tmpdir(), 'review-reports-'));
const exists = sh('git', ['ls-remote', '--heads', 'origin', BRANCH]).stdout.trim();
if (exists) {
  sh('git', ['fetch', 'origin', BRANCH]);
  sh('git', ['worktree', 'add', '--force', '-B', BRANCH, wt, `origin/${BRANCH}`]);
} else {
  sh('git', ['worktree', 'add', '--force', '--detach', wt]);
  sh('git', ['-C', wt, 'switch', '--orphan', BRANCH]);
}
try {
  const dest = join(wt, `pr-${pr.number}`);
  rmSync(dest, { recursive: true, force: true });
  cpSync(v.dir, dest, { recursive: true });
  sh('git', ['-C', wt, 'add', '-A']);
  sh('git', ['-C', wt, 'commit', '-m', `report: PR #${pr.number} @ ${pr.headRefOid.slice(0, 7)}`], {
    allowFail: true,
  });
  sh('git', ['-C', wt, 'push', 'origin', BRANCH]);
} finally {
  sh('git', ['worktree', 'remove', '--force', wt], { allowFail: true });
}

// 画像の相対パスを review-reports ブランチ上の URL に置き換えて PR コメントに載せる
const base = `https://github.com/${repo}/blob/${BRANCH}/pr-${pr.number}`;
for (const img of images) report = report.replaceAll(`(${img})`, `(${base}/${img}?raw=true)`);
const tmp = join(mkdtempSync(join(tmpdir(), 'report-')), 'body.md');
writeFileSync(
  tmp,
  `${report.trim()}\n\n---\nレポート一式: ${base}\n\n${reportMarker(pr.headRefOid)}\n`
);
sh('gh', ['pr', 'comment', String(pr.number), '--body-file', tmp]);
console.log(`PR #${pr.number} に最終レポートを投稿した: ${base}`);
