import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = path.resolve(ROOT, '../soombook.out/playwright-pwa-update');

export default defineConfig({
  testDir: './tests/pwa',
  fullyParallel: false,
  workers: 1,
  reporter: [['line']],
  outputDir: path.join(OUTPUT_ROOT, 'results'),
  timeout: 90_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4176/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build:pwa-update-fixtures && node scripts/pwaUpdateServer.mjs',
    url: 'http://127.0.0.1:4176/__soombook_version__',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
