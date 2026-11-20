// 使い方: node scripts/agent/check-review.mjs [PR番号]
// 現在の HEAD SHA に対して、PR 全体を対象にした最終レビューセット（一次・二次とも scope=full で pass）と
// 人間向けレポートが揃っていれば exit 0。guard hook が gh pr merge の前に呼ぶ。
import { ghJson, args, MARKER_RE, REPORT_RE } from './lib.mjs';

const { positionals } = args({});
const pr = ghJson(['pr', 'view', ...positionals, '--json', 'number,headRefOid,comments']);
const head = pr.headRefOid;
const latest = {};
let report = false;
for (const c of pr.comments) {
  for (const [, kind, verdict, sha, scope] of c.body.matchAll(MARKER_RE)) {
    if (sha === head) latest[kind] = { verdict, scope }; // 後のコメントで上書き = 最新の判定
  }
  for (const [, sha] of c.body.matchAll(REPORT_RE)) if (sha === head) report = true;
}
const problems = [];
for (const [kind, who] of [
  ['primary', '一次（code-reviewer / spec-reviewer）'],
  ['audit', '二次（review-auditor）'],
]) {
  const l = latest[kind];
  if (l?.verdict !== 'pass') problems.push(`${who}レビューの合格がない`);
  else if (l.scope !== 'full')
    problems.push(`${who}の最新レビューが PR 全体（scope=full）を対象にしていない`);
}
if (!report) problems.push('最終レポート（publish-report.mjs）が投稿されていない');
if (problems.length) {
  console.log(
    `PR #${pr.number} の HEAD ${head.slice(0, 7)}: ${problems.join('。')}。AGENTS.md「レビューセット」の最終セットを行う。`
  );
  process.exit(1);
}
console.log(`PR #${pr.number}: 最終レビューセット合格・レポート投稿済み（${head.slice(0, 7)}）`);
