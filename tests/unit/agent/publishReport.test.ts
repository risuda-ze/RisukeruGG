import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sh, pushDirToBranch } from '../../../scripts/agent/lib.mjs';

const LIB_URL = pathToFileURL(resolve('scripts/agent/lib.mjs')).href;

describe('saveReportFromStdin', () => {
  const run = (dir: string, input: string) =>
    spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { saveReportFromStdin } from ${JSON.stringify(LIB_URL)}; saveReportFromStdin(process.argv[1]);`,
        dir,
      ],
      { input, encoding: 'utf8' }
    );

  it('標準入力の本文を、無いディレクトリも作って report.md に保存する', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'stdin-report-')), 'pr-1');
    const body = '# 最終レポート\n\n| セット | 範囲 |\n「引用」 $(echo x) `gh pr merge`\n';
    expect(run(dir, body).status).toBe(0);
    expect(readFileSync(join(dir, 'report.md'), 'utf8')).toBe(body);
  });

  it('本文が空なら失敗する', () => {
    const r = run(mkdtempSync(join(tmpdir(), 'stdin-report-')), ' \n');
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain('本文が空');
  });
});

// git を何十回も起動するため、Windows では既定の 5 秒に収まらない
const GIT_TIMEOUT = 60_000;

describe('pushDirToBranch', () => {
  // 一時リポジトリと bare リモートを作り、report.md を 1 つ置く
  const setup = () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-lib-'));
    const remote = join(root, 'remote.git');
    const repo = join(root, 'repo');
    const src = join(root, 'src');
    sh('git', ['init', '--bare', remote]);
    sh('git', ['init', repo]);
    const git = (...a: string[]) => sh('git', ['-C', repo, ...a]).stdout.trim();
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'test');
    git('config', 'commit.gpgsign', 'false');
    git('remote', 'add', 'origin', remote);
    git('commit', '--allow-empty', '-m', 'init');
    mkdirSync(src);
    writeFileSync(join(src, 'report.md'), 'v1');
    const remoteGit = (...a: string[]) => sh('git', ['-C', remote, ...a]).stdout.trim();
    const push = (destName: string, message: string) =>
      pushDirToBranch({ repo, branch: 'review-reports', srcDir: src, destName, message });
    return { root, repo, src, git, remoteGit, push };
  };

  it(
    'リモートにブランチが無い初回は orphan で作り、2回目以降は追記する。差分が無くても失敗しない',
    () => {
      const { src, remoteGit, push } = setup();

      // 初回: 空白と # を含むメッセージでコミットされ、main と履歴を共有しない
      push('pr-1', 'report: PR #1 @ abc1234');
      expect(remoteGit('log', '--format=%s', 'review-reports')).toBe('report: PR #1 @ abc1234');
      expect(remoteGit('show', 'review-reports:pr-1/report.md')).toBe('v1');

      // 同じ内容の再投稿: コミットは増えず、失敗もしない
      push('pr-1', 'report: PR #1 @ abc1234');
      expect(remoteGit('rev-list', '--count', 'review-reports')).toBe('1');

      // 別 PR: 既存のブランチに積む
      writeFileSync(join(src, 'report.md'), 'v2');
      push('pr-2', 'report: PR #2 @ def5678');
      expect(remoteGit('rev-list', '--count', 'review-reports')).toBe('2');
      expect(remoteGit('show', 'review-reports:pr-1/report.md')).toBe('v1');
      expect(remoteGit('show', 'review-reports:pr-2/report.md')).toBe('v2');
    },
    GIT_TIMEOUT
  );

  it(
    'push が失敗したら例外を投げる',
    () => {
      const { root, git, push } = setup();
      // 取得はできるが push 先が存在しないリモート
      git('remote', 'set-url', '--push', 'origin', join(root, 'no-such.git'));
      expect(() => push('pr-1', 'm')).toThrow(/ push origin review-reports が失敗/);
    },
    GIT_TIMEOUT
  );

  it(
    '初回に commit 後の push だけ失敗しても、再実行で push でき、一時ワークツリーも残らない',
    () => {
      const { root, git, remoteGit, push } = setup();
      const remote = join(root, 'remote.git');
      git('remote', 'set-url', '--push', 'origin', join(root, 'no-such.git'));
      expect(() => push('pr-1', 'report: PR #1 @ abc1234')).toThrow(/ push origin review-reports/);
      expect(git('branch', '--list', 'review-reports')).not.toBe('');

      git('remote', 'set-url', '--push', 'origin', remote);
      push('pr-1', 'report: PR #1 @ abc1234');
      expect(remoteGit('log', '--format=%s', 'review-reports')).toBe('report: PR #1 @ abc1234');
      expect(remoteGit('show', 'review-reports:pr-1/report.md')).toBe('v1');
      expect(git('worktree', 'list').split('\n')).toHaveLength(1);
    },
    GIT_TIMEOUT
  );

  it(
    'commit が失敗したら例外を投げ、push しない',
    () => {
      const { repo, remoteGit, push } = setup();
      writeFileSync(join(repo, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\nexit 1\n', {
        mode: 0o755,
      });
      expect(() => push('pr-1', 'report: PR #1 @ abc1234')).toThrow(
        / commit -m report: PR #1 @ abc1234 が失敗/
      );
      expect(remoteGit('branch', '--list', 'review-reports')).toBe('');
    },
    GIT_TIMEOUT
  );
});
