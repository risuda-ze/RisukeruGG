// エージェント用スクリプトの共通処理
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

export function sh(cmd, args, { allowFail = false } = {}) {
  // シェルを介さない。shell: true は引数を引用符なしで連結するため、Windows で空白を含む引数が分割される。
  // 呼び出すのは gh / git（Windows でも .exe）だけ。.cmd のコマンドは起動できず、r.error で失敗する
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.error) throw new Error(`${cmd} を起動できない: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} が失敗: ${r.stderr || r.stdout}`);
  }
  return r;
}

// 標準入力の本文を <dir>/report.md に保存する。
// サブエージェントは Write ツールで report.md を作れないため、Bash のヒアドキュメントで本文を受け取る
export function saveReportFromStdin(dir) {
  const body = readFileSync(0, 'utf8');
  if (!body.trim()) throw new Error('標準入力のレポート本文が空');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'report.md'), body);
}

// srcDir の中身を、ブランチ branch の destName/ に置いて origin へ push する。
// branch がリモートに無ければ、履歴を共有しない orphan ブランチとして作る。repo は作業するリポジトリ
export function pushDirToBranch({ repo = '.', branch, srcDir, destName, message }) {
  const git = (a, opts) => sh('git', ['-C', repo, ...a], opts);
  const wt = mkdtempSync(join(tmpdir(), `${branch}-`));
  try {
    if (git(['ls-remote', '--heads', 'origin', branch]).stdout.trim()) {
      git(['fetch', 'origin', branch]);
      git(['worktree', 'add', '--force', '-B', branch, wt, `origin/${branch}`]);
    } else {
      git(['worktree', 'add', '--force', '--detach', wt]);
      // 前回 commit 後に push だけ失敗すると、ローカルに同名ブランチが残り switch --orphan が失敗する。
      // リモートに無いブランチは未公開なので作り直す（中身は srcDir から毎回コピーし直す）。
      // 前回の一時ワークツリーが後始末に失敗して残っていると branch -D できないので、先に外す。
      // 外すのはこの関数が作る一時ワークツリー（tmpdir 直下の `${branch}-*`）だけ。それ以外は branch -D の失敗で知らせる
      const ours = (p) =>
        dirname(resolve(p)) === resolve(tmpdir()) && basename(p).startsWith(`${branch}-`);
      for (const block of git(['worktree', 'list', '--porcelain']).stdout.split(/\n\n/)) {
        const path = block.match(/^worktree (.+)$/m)?.[1];
        if (path && block.split('\n').includes(`branch refs/heads/${branch}`) && ours(path)) {
          git(['worktree', 'remove', '--force', path]);
        }
      }
      if (
        git(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`], { allowFail: true })
          .status === 0
      ) {
        git(['branch', '-D', branch]);
      }
      sh('git', ['-C', wt, 'switch', '--orphan', branch]);
    }
    const dest = join(wt, destName);
    rmSync(dest, { recursive: true, force: true });
    cpSync(srcDir, dest, { recursive: true });
    sh('git', ['-C', wt, 'add', '-A']);
    // 同じ内容の再投稿では差分が無い。そのときだけ commit を省く（commit の失敗は握りつぶさない）
    if (sh('git', ['-C', wt, 'status', '--porcelain']).stdout.trim()) {
      sh('git', ['-C', wt, 'commit', '-m', message]);
    }
    sh('git', ['-C', wt, 'push', 'origin', branch]);
  } finally {
    // 一時ワークツリーの後始末。失敗しても push の成否は変わらず、次回は残ったワークツリーを外して作り直せる
    git(['worktree', 'remove', '--force', wt], { allowFail: true });
  }
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
