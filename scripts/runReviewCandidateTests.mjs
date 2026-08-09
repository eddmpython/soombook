import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const AUDIT_ROOT = path.resolve(ROOT, '../soombook.out/audit');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm 실행 경로를 찾을 수 없습니다.');

function run(argumentsList) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, ...argumentsList], {
      cwd: ROOT,
      env: process.env,
      shell: false,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`review candidate 검증 실패: npm ${argumentsList.join(' ')}`)),
    );
  });
}

await mkdir(AUDIT_ROOT, { recursive: true });
await Promise.all(
  ['review-desktop', 'review-mobile'].map((project) =>
    rm(path.join(AUDIT_ROOT, `representative-review-browser-${project}.json`), { force: true }),
  ),
);
await run(['run', 'test:review-candidate:browser']);
await run(['run', 'review:decide']);
