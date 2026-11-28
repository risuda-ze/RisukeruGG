import { describe, it, expect } from 'vitest';
import { sh } from '../../../scripts/agent/lib.mjs';

describe('scripts/agent/lib.mjs の sh', () => {
  it('空白・改行・引用符を含む引数を分割せずに渡す', () => {
    const values = ['テスト タイトル in:title', '1 行目\n2 行目', 'say "hello" & echo x'];
    const r = sh(process.execPath, [
      '-e',
      'process.stdout.write(JSON.stringify(process.argv.slice(1)))',
      ...values,
    ]);
    expect(JSON.parse(r.stdout)).toEqual(values);
  });

  it('終了コードが 0 以外なら例外を投げ、allowFail なら結果を返す', () => {
    const fail = ['-e', 'process.exit(3)'];
    expect(() => sh(process.execPath, fail)).toThrow();
    expect(sh(process.execPath, fail, { allowFail: true }).status).toBe(3);
  });

  it('コマンドを起動できないときは allowFail でも例外を投げる', () => {
    expect(() => sh('no-such-command-for-test', [], { allowFail: true })).toThrow(/起動できない/);
  });
});
