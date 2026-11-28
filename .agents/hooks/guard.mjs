// PreToolUse(Bash|PowerShell) ガード。違反コマンドを exit 2 で拒否し、理由と正しい手順を返す。
// ルールの正本はこのファイル。AGENTS.md には「hooks が拒否する」とだけ書く。
// ponytail: コマンド文字列の正規表現判定。エイリアスやスクリプト経由の迂回は防げない。最終防衛線は GitHub ruleset。
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const REVIEWERS = ['code-reviewer', 'spec-reviewer', 'review-auditor'];
const PROTECTED = ['main', 'develop'];
const MARKER = /<!--\s*review:/;

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';
const cwd = input.cwd ?? process.cwd();
// プラグインのエージェントは "risukeru-agents:orchestrator" 形式。メインセッションでは undefined
const agent = (input.agent_type ?? '').split(':').pop();

function deny(reason) {
  process.stderr.write(`[guard] ${reason}\n`);
  process.exit(2);
}

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...opts,
  });
}

function currentBranch() {
  return run('git', ['branch', '--show-current']).stdout.trim();
}

// deny ではなくユーザーに許可を求める理由（null なら確認不要）
let askReason = null;

// ヒアドキュメントの本文（<<EOF / <<'EOF' / <<"EOF" / <<-EOF 〜 終端行）を取り除く。本文はデータでコマンドではない。
// 引用符の中・コメントの中の << は演算子ではないので無視する。終端行は前後の空白を除いて比べる（bash より早く本文を終える側に倒し、
// 本文の後ろのコマンドを判定から外さない）。終端が無ければ bash と同じく最後まで本文として扱う。
// 終端語は英字か _ で始まる語だけ認める。それ以外の形は取り除かず判定する（拒否側に倒す）。
// ponytail: 行単位の引用符判定。複数行にまたがる引用符の中の << や算術式 $(( a << b )) はヒアドキュメントと誤認し、
// 後続行を判定から外す。エージェントが書く形では起きない前提。必要になったら字句解析にする
function stripHeredocs(cmd) {
  const out = [];
  const pending = [];
  for (const line of cmd.split('\n')) {
    if (pending.length) {
      if (line.trim() === pending[0]) pending.shift();
      continue;
    }
    out.push(line);
    const bare = line
      .replace(/(?<!<)<<(-?)\s*(['"])([A-Za-z_]\w*)\2/g, '<<$1$3')
      .replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, '')
      // 語頭の # 以降はコメント。コメント内の << でヒアドキュメントは始まらない
      .replace(/(^|[\s;&|()])#.*$/, '$1');
    for (const m of bare.matchAll(/(?<!<)<<-?\s*([A-Za-z_]\w*)(?=[\s;&|<>]|$)/g))
      pending.push(m[1]);
  }
  return out.join('\n');
}

// && || ; | 改行 で分割して1コマンドずつ判定する
const segments = stripHeredocs(command)
  .split(/&&|\|\||[;|\n]/)
  .map((s) => s.trim())
  .filter(Boolean);

for (const seg of segments) {
  const isGit = (sub) => new RegExp(`\\bgit\\b(\\s+-[Cc]\\s+\\S+)*\\s+${sub}\\b`).test(seg);
  const isGh = (sub) => new RegExp(`\\bgh\\s+${sub}\\b`).test(seg);

  if (/\bgit\b/.test(seg) && /--no-verify\b/.test(seg)) {
    deny('--no-verify は禁止。hook が落ちた原因を直す。');
  }

  if (isGit('commit') && PROTECTED.includes(currentBranch())) {
    deny(
      `${currentBranch()} への直接 commit は禁止。develop から feature/* ブランチを切って作業する。`
    );
  }

  if (isGit('push')) {
    // force push は拒否せずユーザー確認に回す（他の判定を通過した後に ask を返す）
    if (/--force|\s-f(\s|$)|\s\+\S/.test(seg)) askReason = 'force push を実行しようとしている。';
    if (PROTECTED.includes(currentBranch()) || /[\s:](main|develop)(\s|$)/.test(seg)) {
      deny('main / develop への push は禁止。feature/* ブランチを push して PR を作る。');
    }
    // push 前に CI と同じ検証を通す（CI の Lint & TypeScript / Unit Tests と同じスクリプト）
    const r = run('pnpm', ['verify'], { stdio: ['ignore', 'pipe', 'pipe'] });
    if (r.status !== 0) {
      const out = `${r.stdout}\n${r.stderr}`.trim().split('\n').slice(-40).join('\n');
      deny(`pnpm verify が失敗したので push を拒否した。直してから再度 push する。\n${out}`);
    }
  }

  if (isGh('pr\\s+create') && !/(--base|-B)[\s=]+develop\b/.test(seg)) {
    deny(
      'PR の base は develop を明示する（--base develop）。main への PR はリリース時に人が作る。'
    );
  }

  if (isGh('pr\\s+merge')) {
    if (agent !== 'orchestrator') {
      deny(
        `gh pr merge は orchestrator だけが実行できる（実行者: ${agent || 'メインセッション'}）。`
      );
    }
    if (/--squash|--rebase|\s-[sr](\s|$)/.test(seg) || !/--merge|\s-m(\s|$)/.test(seg)) {
      deny('マージは --merge（merge commit）だけ。squash は main/develop 間の競合原因になる。');
    }
    if (/--auto|--admin/.test(seg)) {
      deny(
        '--auto / --admin は禁止。auto-merge 中の追加 push が再レビューなしでマージされるため。CI 完了を待ってから --merge する。'
      );
    }
    const pr = seg.match(/\bmerge\s+(\S+)/)?.[1];
    const check = resolve(cwd, 'scripts/agent/check-review.mjs');
    const r = run('node', [check, ...(pr && !pr.startsWith('-') ? [pr] : [])]);
    if (r.status !== 0) deny(`${r.stdout}${r.stderr}`.trim());
  }

  // 最終レポートは review-auditor だけが投稿できる
  if (/publish-report\.mjs/.test(seg) && agent !== 'review-auditor') {
    deny(
      `publish-report は review-auditor だけが実行できる（実行者: ${agent || 'メインセッション'}）。`
    );
  }

  // レビュー合格マーカーは post-review.mjs 経由でレビュアーだけが書ける
  if (/post-review\.mjs|publish-report\.mjs/.test(seg)) {
    if (!REVIEWERS.includes(agent)) {
      deny(
        `post-review はレビュアー（${REVIEWERS.join(' / ')}）だけが実行できる（実行者: ${agent || 'メインセッション'}）。`
      );
    }
  } else if (/\bgh\b/.test(seg)) {
    if (MARKER.test(seg))
      deny('review マーカーを直接書くことは禁止。レビュー結果は post-review.mjs で投稿する。');
    const file = seg
      .match(/(?:--body-file|-F)[\s=]+("[^"]+"|'[^']+'|\S+)/)?.[1]
      ?.replace(/^["']|["']$/g, '');
    if (
      file &&
      file !== '-' &&
      existsSync(resolve(cwd, file)) &&
      MARKER.test(readFileSync(resolve(cwd, file), 'utf8'))
    ) {
      deny('review マーカーを含む本文の投稿は禁止。レビュー結果は post-review.mjs で投稿する。');
    }
  }
}

if (askReason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: `[guard] ${askReason}`,
      },
    })
  );
}
process.exit(0);
