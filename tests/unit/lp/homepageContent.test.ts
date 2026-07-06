import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const landingPageSource = readFileSync(
  resolve(__dirname, '../../../src/app/page.tsx'),
  'utf8',
);
const heroSection = landingPageSource.match(/<section class="hero">[\s\S]*?<\/section>/)?.[0] ?? '';
const usecasesSection =
  landingPageSource.match(/<section class="usecases" id="usecases">[\s\S]*?<\/section>/)?.[0] ?? '';

describe('LandingPage LP content', () => {
  test('ユースケース重視の訴求文言を含む', () => {
    expect(heroSection).toContain('<h1 class="hero-title">');
    expect(heroSection).toContain('配信前の連絡と調整を');
    expect(heroSection).toContain('ひとつにまとめて');
    expect(heroSection).toContain('配信に集中できる毎日へ');
  });

  test('活用例セクションの主要ユースケースを含む', () => {
    expect(usecasesSection).toContain('個人配信者');
    expect(usecasesSection).toContain('コラボ多めの配信者');
    expect(usecasesSection).toContain('マネージャー同席チーム');
  });
});
