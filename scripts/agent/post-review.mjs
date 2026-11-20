// 使い方: node scripts/agent/post-review.mjs --kind primary|audit --verdict pass|fail --scope delta|full --sha <レビューしたSHA> --body-file <報告.md> [PR番号]
// レビュー報告を PR コメントとして投稿し、判定マーカーを付ける。
// guard hook によりレビュアーエージェントだけが実行できる。
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sh, ghJson, args, marker, stripMarkers } from './lib.mjs';

const { values: v, positionals } = args({
  kind: { type: 'string' },
  verdict: { type: 'string' },
  scope: { type: 'string' },
  sha: { type: 'string' },
  'body-file': { type: 'string' },
});
if (
  !['primary', 'audit'].includes(v.kind) ||
  !['pass', 'fail'].includes(v.verdict) ||
  !['delta', 'full'].includes(v.scope) ||
  !v.sha ||
  !v['body-file']
) {
  console.error(
    '--kind primary|audit --verdict pass|fail --scope delta|full --sha <SHA> --body-file <path> が必須'
  );
  process.exit(1);
}
const pr = ghJson(['pr', 'view', ...positionals, '--json', 'number,headRefOid']);
// レビュー中に push されていたら、レビューしたコードと HEAD が食い違うので投稿しない
if (!pr.headRefOid.startsWith(v.sha)) {
  console.error(
    `HEAD が ${pr.headRefOid.slice(0, 7)} に進んでいる（レビュー対象 ${v.sha.slice(0, 7)}）。最新の HEAD をレビューし直す。`
  );
  process.exit(1);
}
const report = stripMarkers(readFileSync(v['body-file'], 'utf8'));
const tmp = join(mkdtempSync(join(tmpdir(), 'review-')), 'body.md');
writeFileSync(tmp, `${report.trim()}\n\n${marker(v.kind, v.verdict, pr.headRefOid, v.scope)}\n`);
sh('gh', ['pr', 'comment', String(pr.number), '--body-file', tmp]);
console.log(`PR #${pr.number} に ${v.kind} ${v.verdict} を投稿した`);
