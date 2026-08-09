import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const ROOT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = path.resolve(ROOT_DIRECTORY, '../soombook.out/playwright-pages');
const REUSE_PAGES_BUILD = process.env.SOOMBOOK_PAGES_REUSE_BUILD === 'true';

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts', 'pages/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [['line'], ['html', { outputFolder: path.join(OUTPUT_ROOT, 'report'), open: 'never' }]],
  outputDir: path.join(OUTPUT_ROOT, 'results'),
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:4173/soombook/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ko-KR',
    colorScheme: 'light',
  },
  projects: [
    {
      name: 'pages-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'pages-mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: REUSE_PAGES_BUILD
      ? 'npm run check:pages-build && npm run preview:pages'
      : 'npm run build:pages && npm run preview:pages',
    url: 'http://127.0.0.1:4173/soombook/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
