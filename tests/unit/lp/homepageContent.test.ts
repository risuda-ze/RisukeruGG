import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const landingPageSource = readFileSync(
  resolve(__dirname, '../../../src/app/page.tsx'),
  'utf8',
);

describe('LandingPage LP content', () => {
  test('ユースケース重視の訴求文言を含む', () => {
    expect(landingPageSource).toMatch(
      /<section class="hero">[\s\S]*配信前の連絡と調整を[\s\S]*ひとつにまとめて[\s\S]*配信に集中できる毎日へ/,
    );
  });

  test('活用例セクションの主要ユースケースを含む', () => {
    expect(landingPageSource).toMatch(/<section class="usecases" id="usecases">[\s\S]*個人配信者/);
    expect(landingPageSource).toContain('コラボ多めの配信者');
    expect(landingPageSource).toContain('マネージャー同席チーム');
  });
});
