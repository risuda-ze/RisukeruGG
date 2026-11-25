import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sh, pushDirToBranch } from '../../../scripts/agent/lib.mjs';

const LIB_URL = pathToFileURL(resolve('scripts/agent/lib.mjs')).href;
const GUARD = resolve('.agents/hooks/guard.mjs');

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

describe('guard: 最終レポート本文のヒアドキュメント', () => {
  const N = 'publish-report.mjs';
  const S = `node scripts/agent/${N} --sha abc1234 --dir review-artifacts/pr-1 --stdin`;
  // 判定されれば必ず拒否される（pnpm verify や gh を呼ぶ前に拒否される）コマンド
  const P = 'git push origin main';
  const guard = (agent: string, command: string) =>
    spawnSync(process.execPath, [GUARD], {
      input: JSON.stringify({ tool_input: { command }, agent_type: `risukeru-agents:${agent}` }),
      encoding: 'utf8',
    });

  // [入力の形, コマンド, review-auditor での終了コード（0 = 通過 / 2 = 拒否）]
  // 「実行される」= その形を bash で動かすと P の行がコマンドとして実行される。実行される形は必ず 2
  const cases: [string, string, number][] = [
    // PR #294 の一次レビューで確かめた 25 入力
    ['01 基本形（本文に P）', `${S} <<'EOF'\n本文\n${P}\nEOF`, 0],
    ['02 終端後に P（実行される）', `${S} <<'EOF'\n本文\nEOF\n${P}`, 2],
    ["03 <<-'EOF'", `${S} <<-'EOF'\n本文\n${P}\nEOF`, 2],
    ["04 区切り語が EOFX になる <<'EOF'X（実行される）", `${S} <<'EOF'X\n本文\nEOFX\n${P}\nEOF`, 2],
    ["05 区切り語の一部だけ引用 <<E'O'F", `${S} <<E'O'F\n本文\n${P}\nEOF`, 2],
    ['06 同じ行で ; P（実行される）', `${S} <<'EOF'; ${P}\n本文\nEOF`, 2],
    ['07 同じ行で && P（実行される）', `${S} <<'EOF' && ${P}\n本文\nEOF`, 2],
    ['08 cat が本文を bash へ流す（実行される）', `cat - ${N} <<'EOF' | bash\n${P}\nEOF`, 2],
    ['09 終端していない（EOF2）', `${S} <<'EOF'\n本文\nEOF2\n${P}`, 2],
    ['10 字下げした EOF は終端でない', `${S} <<'EOF'\n本文\n EOF\n${P}\nEOF`, 0],
    ['11 末尾空白の EOF は終端でない', `${S} <<'EOF'\n本文\nEOF \n${P}\nEOF`, 0],
    ["12 複数 <<'A' <<'B' の後ろに P（実行される）", `${S} <<'A' <<'B'\nx\nA\ny\nB\n${P}`, 2],
    ["13 複数 <<'B' <<'A'", `${S} <<'B' <<'A'\nx\nA\n${P}\nB`, 2],
    [
      '14 別コマンドのヒアドキュメントの後ろに P（実行される）',
      `${S} <<'EOF'\n本文\nEOF\ncat <<'EOF'\ny\nEOF\n${P}`,
      2,
    ],
    ['15 echo の引数に名前', `echo ${N} <<'EOF'\n${P}\nEOF`, 2],
    ['16 bash -s の引数に名前（実行される）', `bash -s ${N} <<'EOF'\n${P}\nEOF`, 2],
    ['17 コメント行に名前（実行される）', `# ${N} <<'EOF'\n${P}\nEOF`, 2],
    ['18 二重引用符の文字列に名前（実行される）', `echo "${N} <<'EOF'"\n${P}\nEOF`, 2],
    ['19 行末のバックスラッシュで継続（実行される）', `${S} <<'EOF' \\\n; ${P}\n本文\nEOF`, 2],
    [
      '20 別コマンドのヒアドキュメント本文に名前（実行される）',
      `cat <<'X'\n${N} <<'EOF'\nX\n${P}\nEOF`,
      2,
    ],
    ['21 CRLF（実行される）', `${S} <<'EOF'\r\n本文\r\nEOF\r\n${P}`, 2],
    ['22 引用符なし', `${S} <<EOF\n本文\n${P}\nEOF`, 2],
    ['23 二重引用符の区切り語', `${S} <<"EOF"\n本文\n${P}\nEOF`, 2],
    ['24 同じ行で & P（実行される）', `${S} <<'EOF' & ${P}\n本文\nEOF`, 2],
    ['25 本文に $(P)（引用符付きなので展開されない）', `${S} <<'EOF'\n$(${P})\nEOF`, 0],
    // 実装時に足した入力
    ['26 空のヒアドキュメントの後ろに P と EOF（実行される）', `${S} <<'EOF'\nEOF\n${P}\nEOF`, 2],
    ["27 ヒアストリング <<<'EOF'（実行される）", `${S} <<<'EOF'\n${P}\nEOF`, 2],
    [
      '28 node - は標準入力をスクリプトとして実行する',
      `node - scripts/agent/${N} <<'EOF'\n${P}\nEOF`,
      2,
    ],
    ['29 node を関数で差し替える（実行される）', `node() { bash; }\n${S} <<'EOF'\n${P}\nEOF`, 2],
    ['30 1 行目だけ CRLF（実行される）', `${S} <<'EOF'\r\n本文\nEOF\r\n${P}\nEOF`, 2],
    ['31 行頭の空白や cd を前に付けた形は外さない', `cd . && ${S} <<'EOF'\n${P}\nEOF`, 2],
    ['32 行末にリダイレクトを足した形は外さない', `${S} <<'EOF' 2>&1\n${P}\nEOF`, 2],
    [
      '33 --dir が review-artifacts/pr-<番号> でない',
      `${S.replace('pr-1', '"$(bash)"')} <<'EOF'\n${P}\nEOF`,
      2,
    ],
    ['34 PR 番号を付けた正規の形', `${S} 294 <<'EOF'\n本文\n${P}\nEOF`, 0],
    ['35 EOF を含むが EOF だけではない行は本文', `${S} <<'EOF'\nxEOF\nEOF.\n${P}\nEOF`, 0],
    ['36 本文の後ろに別のコマンドが続く（実行される）', `${S} <<'EOF'\n本文\nEOF\nEOF\n${P}`, 2],
  ];

  it.each(cases)('review-auditor: %s', (_name, command, expected) => {
    expect(guard('review-auditor', command).status).toBe(expected);
  });

  it(
    'review-auditor 以外は、どの形でも拒否する',
    () => {
      for (const [name, command] of cases) {
        expect(guard('implementer', command).status, name).toBe(2);
      }
      // メインセッション（agent_type なし）も拒否する
      const main = spawnSync(process.execPath, [GUARD], {
        input: JSON.stringify({ tool_input: { command: cases[0][1] } }),
        encoding: 'utf8',
      });
      expect(main.status).toBe(2);
      expect(main.stderr).toContain('review-auditor だけ');
    },
    GIT_TIMEOUT
  );

  it('本文にコマンドの記述やレポートの表があっても投稿できる', () => {
    const body =
      '# 最終レポート\n\n| 一次 | 二次 |\nマージは `gh pr merge 1 --squash` ではなく --merge で行う';
    expect(guard('review-auditor', `${S} <<'EOF'\n${body}\nEOF`).status).toBe(0);
  });
});
