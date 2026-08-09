import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PLAYWRIGHT_CLI = path.join(ROOT, 'node_modules/@playwright/test/cli.js');

const child = spawn(
  process.execPath,
  [PLAYWRIGHT_CLI, 'test', '--config=playwright.pages.config.ts', ...process.argv.slice(2)],
  {
    cwd: ROOT,
    env: { ...process.env, SOOMBOOK_PAGES_REUSE_BUILD: 'true' },
    stdio: 'inherit',
    windowsHide: true,
  },
);

child.on('error', (error) => {
  console.error(`Pages browser gate를 시작하지 못했습니다: ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Pages browser gate가 signal ${signal}로 종료됐습니다.`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
