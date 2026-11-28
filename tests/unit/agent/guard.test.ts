import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// guard を hook と同じく stdin の JSON で起動する。cwd は git 管理外なので現在のブランチは空になる
const GUARD = resolve('.agents/hooks/guard.mjs');
const cwd = mkdtempSync(join(tmpdir(), 'guard-'));
const guard = (command: string) =>
  spawnSync(process.execPath, [GUARD], {
    input: JSON.stringify({ tool_input: { command }, cwd }),
    encoding: 'utf8',
  });

describe('guard.mjs のヒアドキュメント', () => {
  it.each([
    ['<<EOF', 'cat > a.md <<EOF\n手順: gh pr merge 1 --merge\nEOF'],
    ["<<'EOF'", "gh issue create --body-file - <<'EOF'\ngh pr merge 1\ngit push origin main\nEOF"],
    ['<<"EOF"', 'cat <<"EOF" > a.md\ngit commit --no-verify\nEOF'],
    ['<<-EOF', 'cat <<-EOF > a.md\n\tnode scripts/agent/post-review.mjs\n\tEOF'],
    ['$(cat <<EOF)', 'echo "$(cat <<\'EOF\'\ngh pr merge 1\nEOF\n)"'],
    ['2つのヒアドキュメント', 'cat <<A <<B\ngh pr merge 1\nA\ngh pr merge 2\nB'],
  ])('%s の本文はコマンドとして判定しない', (_, command) => {
    const r = guard(command);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it.each([
    ['終端行の後ろ', 'cat <<EOF > a.md\nx\nEOF\ngh pr merge 1 --merge'],
    ['開始行の同じ行', 'cat <<EOF > a.md && gh pr merge 1 --merge\nx\nEOF'],
    ['引用符の中の <<', 'echo "<<EOF"\ngh pr merge 1 --merge'],
    ['here-string <<<', 'cat <<<EOF\ngh pr merge 1 --merge'],
    ['ヒアドキュメントなし', 'gh pr merge 1 --merge'],
  ])('%s の gh pr merge は従来どおり拒否する', (_, command) => {
    const r = guard(command);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('gh pr merge は orchestrator だけ');
  });
});
