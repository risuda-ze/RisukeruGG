import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateCss, parseColors } from '../../../scripts/generate-design-tokens.mjs';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n');

describe('デザイントークン生成', () => {
  it('tokens.css が DESIGN.md の frontmatter と同期している', () => {
    expect(read('src/app/tokens.css')).toBe(generateCss(read('docs/DESIGN.md')));
  });

  it('両テーマが同じ役割名を持ち、ファミリーは tint / border / text に展開される', () => {
    const { themes, defaultTheme } = parseColors(read('docs/DESIGN.md'));
    expect(defaultTheme).toBe('dark');
    expect(Object.keys(themes.light)).toEqual(Object.keys(themes.dark));
    expect(themes.dark.canvas).toBe('#100c1c');
    expect(themes.light['pink-border']).toBe('#a54b7a');
  });

  it('片方のテーマにしか無いトークンは生成時にエラーにする', () => {
    const broken = read('docs/DESIGN.md').replace("    live: '#e14f4c'", "    live2: '#e14f4c'");
    expect(() => generateCss(broken)).toThrow(/揃っていません/);
  });
});
