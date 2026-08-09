import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const ROOT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = path.resolve(ROOT_DIRECTORY, '../soombook.out/playwright-device-matrix');

export default defineConfig({
  testDir: './tests/device',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['line'], ['html', { outputFolder: path.join(OUTPUT_ROOT, 'report'), open: 'never' }]],
  outputDir: path.join(OUTPUT_ROOT, 'results'),
  timeout: 120_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: 'http://127.0.0.1:4175/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ko-KR',
  },
  projects: [
    {
      name: 'device-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'device-firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'device-webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'device-css-root-font-scale-200-synthetic',
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 844 } },
    },
    {
      name: 'device-forced-colors',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'device-reduced-motion',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'device-high-contrast',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: 'device-emulated-touch',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: 'node scripts/reviewCandidateServer.mjs',
    url: 'http://127.0.0.1:4175/',
    reuseExistingServer:
      !process.env.CI && process.env.SOOMBOOK_DEVICE_MATRIX_STRICT_SERVER !== 'true',
    timeout: 120_000,
  },
});
