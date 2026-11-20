// 使い方: node scripts/agent/file-issue.mjs --kind task|finding --title <タイトル> --body-file <本文.md>
// 同じタイトルの open Issue があればコメント追記、なければ作成する。発見元のブランチ・PR を本文に付ける。
//   task:    作業中に見つけた範囲外の課題（ラベル agent-found）
//   finding: レビューで出た共通指摘（ラベル review-finding）。コメント数 = 発生回数
import { readFileSync } from 'node:fs';
import { sh, ghJson, args } from './lib.mjs';

const LABELS = {
  task: {
    name: 'agent-found',
    color: 'FBCA04',
    desc: 'エージェントが作業中に見つけた範囲外の課題',
  },
  finding: { name: 'review-finding', color: 'D93F0B', desc: 'レビューの共通指摘（lint 化候補）' },
};
const { values: v } = args({
  kind: { type: 'string' },
  title: { type: 'string' },
  'body-file': { type: 'string' },
});
const label = LABELS[v.kind];
if (!label || !v.title || !v['body-file']) {
  console.error('--kind task|finding --title <タイトル> --body-file <path> が必須');
  process.exit(1);
}

const branch = sh('git', ['branch', '--show-current']).stdout.trim();
const prUrl = sh('gh', ['pr', 'view', '--json', 'url', '-q', '.url'], {
  allowFail: true,
}).stdout.trim();
const body = `${readFileSync(v['body-file'], 'utf8').trim()}\n\n---\n発見元: ブランチ \`${branch}\`${prUrl ? ` / ${prUrl}` : ''}`;

sh('gh', [
  'label',
  'create',
  label.name,
  '--color',
  label.color,
  '--description',
  label.desc,
  '--force',
]);
const title = v.title.trim();
const dup = ghJson([
  'issue',
  'list',
  '--state',
  'open',
  '--label',
  label.name,
  '--search',
  `${title} in:title`,
  '--json',
  'number,title,url',
]).find((i) => i.title.trim().toLowerCase() === title.toLowerCase());

if (dup) {
  sh('gh', ['issue', 'comment', String(dup.number), '--body', body]);
  console.log(`既存 Issue に追記: ${dup.url}`);
} else {
  console.log(
    sh('gh', [
      'issue',
      'create',
      '--title',
      title,
      '--label',
      label.name,
      '--body',
      body,
    ]).stdout.trim()
  );
}
