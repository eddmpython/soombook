import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const ROOT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = path.resolve(ROOT_DIRECTORY, '../soombook.out/playwright-remote');
const BASE_URL = process.env.PLAYWRIGHT_PAGES_BASE_URL;

if (!BASE_URL?.startsWith('https://') || !BASE_URL.endsWith('/')) {
  throw new Error('PLAYWRIGHT_PAGES_BASE_URL은 trailing slash가 있는 HTTPS URL이어야 합니다.');
}

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts', 'pages/**/*.spec.ts'],
  fullyParallel: false,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  reporter: [['line'], ['html', { outputFolder: path.join(OUTPUT_ROOT, 'report'), open: 'never' }]],
  outputDir: path.join(OUTPUT_ROOT, 'results'),
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ko-KR',
    colorScheme: 'light',
  },
  projects: [
    {
      name: 'remote-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
