// エージェント用スクリプトの共通処理
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

export function sh(cmd, args, { allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status !== 0 && !allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} が失敗: ${r.stderr || r.stdout}`);
  }
  return r;
}

export function ghJson(args) {
  return JSON.parse(sh('gh', args).stdout);
}

export function args(options) {
  return parseArgs({ options, allowPositionals: true });
}

// レビュー結果マーカー。post-review.mjs / publish-report.mjs が書き、check-review.mjs が読む。
//   scope=delta: 前回レビュー以降の修正差分だけを見たセット / scope=full: PR 全体を見た最終セット
export const MARKER_RE =
  /<!--\s*review:(primary|audit)\s+(pass|fail)\s+sha=([0-9a-f]{40})\s+scope=(delta|full)\s*-->/g;
export const marker = (kind, verdict, sha, scope) =>
  `<!-- review:${kind} ${verdict} sha=${sha} scope=${scope} -->`;
export const REPORT_RE = /<!--\s*review:report\s+sha=([0-9a-f]{40})\s*-->/g;
export const reportMarker = (sha) => `<!-- review:report sha=${sha} -->`;
// 書き込み前に既存マーカーを除去する（偽装防止）
export const stripMarkers = (s) => s.replace(/<!--\s*review:[^>]*-->/g, '');

// PR の変更内容の識別子（base との merge-base からの差分の patch-id）。リベースしても差分が同じなら変わらない。
// 差分を取れない（コミットが手元に無いなど）・差分が空のときは null
export function patchId(base, sha, cwd = process.cwd()) {
  const git = (a, input) =>
    spawnSync('git', a, { cwd, encoding: 'utf8', input, maxBuffer: Infinity });
  const diff = git(['diff', `${base}...${sha}`]);
  if (diff.status !== 0) return null;
  return git(['patch-id', '--stable'], diff.stdout).stdout.split(' ')[0] || null;
}
