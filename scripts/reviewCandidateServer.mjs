import { spawn } from 'node:child_process';
import process from 'node:process';

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm CLI 경로를 확인할 수 없습니다.');
const environment = {
  ...process.env,
  SOOMBOOK_BUILD_PROFILE: 'review-candidate',
  SOOMBOOK_PREVIEW_PORT: '4175',
  SOOMBOOK_REVIEW_BUILD: 'true',
  VITE_SOOMBOOK_FIXTURE_SLUG: 'tiger-full-review',
};

function run(argumentsList) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, ...argumentsList], {
      cwd: process.cwd(),
      env: environment,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`review server 준비 실패: ${argumentsList}`)),
    );
  });
}

await run(['run', 'build:review-candidate']);
const preview = spawn(
  process.execPath,
  [npmCli, 'run', 'preview', '--workspace=@soombook/reader-web'],
  { cwd: process.cwd(), env: environment, stdio: 'inherit' },
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => preview.kill(signal));
preview.once('error', (error) => {
  throw error;
});
preview.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
