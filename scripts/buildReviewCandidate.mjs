import { spawn } from 'node:child_process';
import process from 'node:process';

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm 실행 경로를 찾을 수 없습니다.');

function run(argumentsList, environment = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, ...argumentsList], {
      cwd: process.cwd(),
      env: environment,
      shell: false,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`review candidate build command 실패: ${argumentsList.join(' ')}`)),
    );
  });
}

await run(['run', 'check:review-candidate']);
await run(['run', 'check:representative-review']);
await run(['run', 'build', '--workspace=@soombook/reader-web'], {
  ...process.env,
  SOOMBOOK_BUILD_PROFILE: 'review-candidate',
  SOOMBOOK_REVIEW_BUILD: 'true',
  SOOMBOOK_SOURCE_MAP: 'false',
  VITE_SOOMBOOK_FIXTURE_SLUG: 'tiger-full-review',
});
await run(['run', 'check:pack-build'], {
  ...process.env,
  SOOMBOOK_BUILD_PROFILE: 'review-candidate',
  SOOMBOOK_REVIEW_BUILD: 'true',
  SOOMBOOK_SOURCE_MAP: 'false',
  VITE_SOOMBOOK_FIXTURE_SLUG: 'tiger-full-review',
});
await run(['run', 'check:review-build']);
