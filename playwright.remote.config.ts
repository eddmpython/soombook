import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const ROOT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = path.resolve(ROOT_DIRECTORY, '../soombook.out/playwright-remote');
const BASE_URL = process.env.PLAYWRIGHT_PAGES_BASE_URL;

if (!BASE_URL?.startsWith('https://') || !BASE_URL.endsWith('/')) {
  throw new Error('PLAYWRIGHT_PAGES_BASE_URL은 trailing slash가 있는 HTTPS URL이어야 합니다.');
}
if (new URL(BASE_URL).pathname !== '/soombook/') {
  throw new Error('PLAYWRIGHT_PAGES_BASE_URL은 /soombook/ 배포 경로여야 합니다.');
}
for (const [name, pattern] of [
  ['SOOMBOOK_EXPECTED_RELEASE_SHA', /^[0-9a-f]{40}$/u],
  ['SOOMBOOK_EXPECTED_ARTIFACT_DIGEST', /^[0-9a-f]{64}$/u],
  ['SOOMBOOK_EXPECTED_BOOK_PACK_DIGEST', /^sha256-[0-9a-f]{64}$/u],
  ['SOOMBOOK_EXPECTED_PACK_CONTENT_DIGEST', /^sha256-[0-9a-f]{64}$/u],
] as const) {
  if (!pattern.test(process.env[name] ?? '')) {
    throw new Error(`${name} remote release identity가 없습니다.`);
  }
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
