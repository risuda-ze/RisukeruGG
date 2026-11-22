// docs/DESIGN.md の frontmatter（colors.dark / colors.light）から
// src/app/tokens.css（[data-theme] ブロック）を生成する。
//
//   node scripts/generate-design-tokens.mjs          … tokens.css を書き出す
//   node scripts/generate-design-tokens.mjs --check  … 同期していなければ exit 1
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DESIGN_MD = new URL('../docs/DESIGN.md', import.meta.url);
const TOKENS_CSS = new URL('../src/app/tokens.css', import.meta.url);

/**
 * frontmatter の colors ブロックだけを読む最小パーサ。
 * 対応する形は `key: '#hex'` と `family-x: { tint: '#..', border: '#..', text: '#..' }` の2つ。
 * ponytail: YAML 全体は解釈しない。frontmatter の形を変えるなら yaml パッケージに置き換える。
 * @param {string} markdown
 * @returns {{ themes: Record<string, Record<string, string>>, defaultTheme: string | undefined }}
 */
export function parseColors(markdown) {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  if (!frontmatter) throw new Error('DESIGN.md に frontmatter がありません');

  /** @type {Record<string, Record<string, string>>} */
  const themes = {};
  let inColors = false;
  /** @type {Record<string, string>} */
  let theme = {};
  for (const raw of frontmatter.split(/\r?\n/)) {
    const line = raw.replace(/\s+#\s.*$/, '').trimEnd(); // 行末コメントを除去（'#hex' は残る）
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    if (indent === 0) {
      inColors = line === 'colors:';
      continue;
    }
    if (!inColors) continue;
    const [, key, value] = line.trim().match(/^([\w-]+):\s*(.*)$/) ?? [];
    if (!key) throw new Error(`解釈できない行: ${raw}`);
    if (indent === 2) {
      theme = themes[key] = {};
    } else if (value.startsWith('{')) {
      const family = key.replace(/^family-/, '');
      for (const [, part, hex] of value.matchAll(/([\w-]+):\s*'(#[0-9a-fA-F]{3,8})'/g)) {
        theme[`${family}-${part}`] = hex;
      }
    } else {
      const hex = value.match(/^'(#[0-9a-fA-F]{3,8})'$/)?.[1];
      if (!hex) throw new Error(`色の値を解釈できません: ${raw}`);
      theme[key] = hex;
    }
  }
  return {
    themes,
    defaultTheme: frontmatter.match(/^theme:\s*(\w+)/m)?.[1],
  };
}

/** @param {string} markdown */
export function generateCss(markdown) {
  const { themes, defaultTheme } = parseColors(markdown);
  const names = Object.keys(themes);
  if (!defaultTheme || !names.includes(defaultTheme)) throw new Error(`既定テーマ ${defaultTheme} の色がありません`);
  const keys = Object.keys(themes[defaultTheme]);
  for (const name of names) {
    const missing = keys.filter((k) => !(k in themes[name]));
    const extra = Object.keys(themes[name]).filter((k) => !keys.includes(k));
    if (missing.length || extra.length) {
      throw new Error(`テーマ ${name} のトークンが揃っていません: 不足 [${missing}] 余分 [${extra}]`);
    }
  }

  // 既定テーマを先頭（:root）に置く
  names.sort((a, b) => Number(b === defaultTheme) - Number(a === defaultTheme));
  const blocks = names.map((name) => {
    const selector = name === defaultTheme ? `:root,\n[data-theme='${name}']` : `[data-theme='${name}']`;
    const decls = keys.map((k) => `  --${k}: ${themes[name][k]};`).join('\n');
    return `${selector} {\n${decls}\n  color-scheme: ${name};\n}`;
  });
  return [
    '/* 自動生成ファイル。手で編集しない。',
    '   正本: docs/DESIGN.md の frontmatter / 生成: pnpm tokens */',
    ...blocks,
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = generateCss(readFileSync(DESIGN_MD, 'utf8'));
  if (process.argv.includes('--check')) {
    if (readFileSync(TOKENS_CSS, 'utf8').replace(/\r\n/g, '\n') !== css) {
      console.error('src/app/tokens.css が docs/DESIGN.md と同期していません。pnpm tokens を実行してください。');
      process.exit(1);
    }
    console.log('tokens.css は DESIGN.md と同期しています。');
  } else {
    writeFileSync(TOKENS_CSS, css);
    console.log('src/app/tokens.css を生成しました。');
  }
}
