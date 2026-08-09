import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const ROOT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = path.resolve(ROOT_DIRECTORY, '../soombook.out/playwright-audio');

export default defineConfig({
  testDir: './tests/audio',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['line'], ['html', { outputFolder: path.join(OUTPUT_ROOT, 'report'), open: 'never' }]],
  outputDir: path.join(OUTPUT_ROOT, 'results'),
  timeout: 45_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4174/',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ko-KR',
  },
  webServer: {
    command: 'node scripts/audioFixtureServer.mjs',
    url: 'http://127.0.0.1:4174/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
