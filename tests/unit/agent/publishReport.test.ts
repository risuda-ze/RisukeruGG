import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sh, pushDirToBranch } from '../../../scripts/agent/lib.mjs';

const LIB_URL = pathToFileURL(resolve('scripts/agent/lib.mjs')).href;
const GUARD = resolve('.agents/hooks/guard.mjs');
const SCRIPT = 'node scripts/agent/publish-report.mjs --sha abc1234 --dir review-artifacts/pr-1';

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
  it(
    'リモートにブランチが無い初回は orphan で作り、2回目以降は追記する。差分が無くても失敗しない',
    () => {
      const root = mkdtempSync(join(tmpdir(), 'push-dir-'));
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

      const push = (destName: string, message: string) =>
        pushDirToBranch({ repo, branch: 'review-reports', srcDir: src, destName, message });
      const remoteGit = (...a: string[]) => sh('git', ['-C', remote, ...a]).stdout.trim();

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
      const root = mkdtempSync(join(tmpdir(), 'push-dir-'));
      const repo = join(root, 'repo');
      const src = join(root, 'src');
      sh('git', ['init', '--bare', join(root, 'remote.git')]);
      sh('git', ['init', repo]);
      const git = (...a: string[]) => sh('git', ['-C', repo, ...a]);
      git('config', 'user.email', 'test@example.com');
      git('config', 'user.name', 'test');
      git('config', 'commit.gpgsign', 'false');
      // 取得はできるが push 先が存在しないリモート
      git('remote', 'add', 'origin', join(root, 'remote.git'));
      git('remote', 'set-url', '--push', 'origin', join(root, 'no-such.git'));
      git('commit', '--allow-empty', '-m', 'init');
      mkdirSync(src);
      writeFileSync(join(src, 'report.md'), 'v1');
      expect(() =>
        pushDirToBranch({
          repo,
          branch: 'review-reports',
          srcDir: src,
          destName: 'pr-1',
          message: 'm',
        })
      ).toThrow(/push/);
    },
    GIT_TIMEOUT
  );
});

describe('guard: 最終レポート本文のヒアドキュメント', () => {
  const guard = (agent: string, command: string) =>
    spawnSync(process.execPath, [GUARD], {
      input: JSON.stringify({ tool_input: { command }, agent_type: `risukeru-agents:${agent}` }),
      encoding: 'utf8',
    });
  const body =
    '# 最終レポート\n\n| 一次 | 二次 |\nマージは `gh pr merge 1 --squash` ではなく --merge で行う';

  it('review-auditor は、本文にコマンドの記述があっても投稿できる', () => {
    expect(guard('review-auditor', `${SCRIPT} --stdin <<'EOF'\n${body}\nEOF`).status).toBe(0);
  });

  it('review-auditor 以外は拒否する', () => {
    const r = guard('implementer', `${SCRIPT} --stdin <<'EOF'\n${body}\nEOF`);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('review-auditor だけ');
  });

  it('ヒアドキュメントの後ろのコマンドと、引用符なしの区切り語の本文は判定を続ける', () => {
    const after = `${SCRIPT} --stdin <<'EOF'\n本文\nEOF\ngh pr merge 1 --merge`;
    expect(guard('review-auditor', after).status).toBe(2);
    expect(guard('review-auditor', `${SCRIPT} --stdin <<EOF\n${body}\nEOF`).status).toBe(2);
  });
});
