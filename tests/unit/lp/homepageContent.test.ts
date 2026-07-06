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
  test('活用シーン重視の訴求文言と画面イメージを含む', () => {
    expect(heroSection).toContain('<h1 class="hero-title">');
    expect(heroSection).toContain('配信前の連絡と調整を');
    expect(heroSection).toContain('ひとつにまとめて');
    expect(heroSection).toContain('配信に集中できる毎日へ');
    expect(landingPageSource).toContain("url('/lp-settings.png')");
  });

  test('活用例セクションと料金表示を更新している', () => {
    expect(landingPageSource).not.toContain('ユースケース');
    expect(landingPageSource).toContain('想像しやすい活用シーン');
    expect(usecasesSection).toContain('個人配信者');
    expect(usecasesSection).toContain('コラボ多めの配信者');
    expect(usecasesSection).toContain('マネージャー同席チーム');
    expect(landingPageSource).toContain('¥500 <span>/ 人・月</span>');
    expect(landingPageSource).toContain('例）3人チームで ¥1,500 / 月');
  });
});
