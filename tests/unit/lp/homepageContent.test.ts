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
  test('ヒーローに訴求文言とスケジュールボードのモックを含む', () => {
    expect(heroSection).toContain('<h1 class="hero-title">');
    // 助詞は span 分割されるため、意味を持つ本文のみを検証する
    expect(heroSection).toContain('配信前の連絡と調整');
    expect(heroSection).toContain('ひとつにまとめて');
    expect(heroSection).toContain('配信に集中');
    // 旧LPのスクリーンショット画像に代わり、インラインのスケジュールボードを表示する
    expect(heroSection).toContain('hero-board');
    expect(heroSection).toContain('今週のスケジュール');
  });

  test('活用シーン・活用例セクションと料金表示を含む', () => {
    expect(landingPageSource).toContain('SCENE 01');
    expect(landingPageSource).toContain('活用シーン');
    expect(usecasesSection).toContain('個人配信者');
    expect(usecasesSection).toContain('配信者 + 編集者');
    expect(usecasesSection).toContain('コラボ多めの配信者');
    expect(usecasesSection).toContain('マネージャー同席チーム');
    expect(landingPageSource).toContain('¥0 <span>/ 月</span>');
    expect(landingPageSource).toContain('¥500 <span>/ 人・月</span>');
    // PARTYはメンバー個別払い（まとめ払いなし）の注記を維持する
    expect(landingPageSource).toContain('¥500/月');
  });
});
