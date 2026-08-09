import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from '@playwright/test';

const ROOT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = process.env.SOOMBOOK_PERFORMANCE_PROFILE === 'pages' ? 'pages' : 'root';
const OUTPUT_ROOT = path.resolve(
  ROOT_DIRECTORY,
  `../soombook.out/playwright-performance/${PROFILE}`,
);
const isPages = PROFILE === 'pages';

export default defineConfig({
  testDir: './tests/performance',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [['line'], ['html', { outputFolder: path.join(OUTPUT_ROOT, 'report'), open: 'never' }]],
  outputDir: path.join(OUTPUT_ROOT, 'results'),
  timeout: 180_000,
  use: {
    baseURL: isPages ? 'http://127.0.0.1:4173/soombook/' : 'http://127.0.0.1:4173/',
    browserName: 'chromium',
    colorScheme: 'light',
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    locale: 'ko-KR',
    screenshot: 'off',
    serviceWorkers: 'block',
    trace: 'off',
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: isPages ? 'npm run preview:pages' : 'npm run preview',
    reuseExistingServer: false,
    timeout: 120_000,
    url: isPages ? 'http://127.0.0.1:4173/soombook/' : 'http://127.0.0.1:4173/',
  },
});
