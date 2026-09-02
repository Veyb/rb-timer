import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { STORAGE_STATE_PATH } from './e2e/fixtures/constants';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Pace actions for a human to follow in --headed mode, e.g.
    // `SLOWMO=500 pnpm test:e2e:headed`. Unset/0 by default — no effect
    // (and pointless) in the normal headless run.
    launchOptions: {
      slowMo: Number(process.env.SLOWMO) || 0,
    },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        storageState: path.resolve(__dirname, STORAGE_STATE_PATH),
      },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'pnpm dev',
      cwd: path.resolve(__dirname, '../backend'),
      url: 'http://localhost:1337',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev',
      cwd: __dirname,
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
