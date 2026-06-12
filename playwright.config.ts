import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // CIで実行するスモークテスト（Firebase Emulator不要）
    // ログイン・未認証リダイレクトなどの基本動作を確認する
    {
      name: 'smoke',
      testMatch: [
        '**/e2e/login.spec.ts',
        '**/e2e/schedule.spec.ts',
        '**/e2e/tasks.spec.ts',
        '**/e2e/tasks/task-control-bar.spec.ts',
        '**/e2e/privacy-policy.spec.ts',
        '**/e2e/contact.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    // ローカル専用: Firebase Emulator + Docker + シードデータが必須
    // `pnpm test:e2e --project=emulator` で実行する
    {
      name: 'emulator',
      testMatch: [
        '**/e2e/visual.spec.ts',
        '**/e2e/tasks/task-settings-icon.spec.ts',
        '**/e2e/collabs/collab-ui-redesign.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
