import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { patchId } from '../../../scripts/agent/lib.mjs';

// git を十数回起動するため、Windows や高負荷時は既定の 5 秒に収まらない（publishReport.test.ts と同じ）
const GIT_TIMEOUT = 60_000;

describe('scripts/agent/lib.mjs の patchId', () => {
  it(
    'リベースしただけなら同じ、差分が変われば別の値になる',
    () => {
      const cwd = mkdtempSync(join(tmpdir(), 'patch-id-'));
      const git = (...a: string[]) => {
        const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], {
          cwd,
          encoding: 'utf8',
        });
        if (r.status !== 0) throw new Error(r.stderr);
        return r.stdout.trim();
      };
      const commit = (file: string, text: string) => {
        writeFileSync(join(cwd, file), text);
        git('add', '-A');
        git('commit', '-m', file);
        return git('rev-parse', 'HEAD');
      };
      git('init', '-b', 'main');
      commit('base.txt', 'base\n');
      git('switch', '-c', 'feature');
      const reviewed = commit('feature.txt', 'reviewed\n');
      git('switch', 'main');
      commit('other.txt', 'other\n');
      git('switch', 'feature');
      git('rebase', 'main');
      const rebased = git('rev-parse', 'HEAD');

      expect(rebased).not.toBe(reviewed);
      expect(patchId('main', reviewed, cwd)).toMatch(/^[0-9a-f]{40}$/);
      expect(patchId('main', rebased, cwd)).toBe(patchId('main', reviewed, cwd));

      const changed = commit('feature.txt', 'changed\n');
      expect(patchId('main', changed, cwd)).not.toBe(patchId('main', reviewed, cwd));
      expect(patchId('main', '0'.repeat(40), cwd)).toBeNull();
    },
    GIT_TIMEOUT
  );
});
