import { spawn } from 'node:child_process';
import process from 'node:process';

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error('npm CLI 경로를 확인할 수 없습니다. npm run test:audio-fixture로 실행하세요.');
}
const fixtureEnvironment = {
  ...process.env,
  SOOMBOOK_BUILD_PROFILE: 'audio-fixture',
  SOOMBOOK_INTERNAL_FIXTURE_BUILD: 'true',
  SOOMBOOK_PREVIEW_PORT: '4174',
  VITE_SOOMBOOK_FIXTURE_SLUG: 'lantern-demo',
};

function run(argumentsList, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, ...argumentsList], {
      cwd: process.cwd(),
      env: fixtureEnvironment,
      stdio: 'inherit',
      ...options,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve(child);
      else reject(new Error(`audio fixture command 실패: code=${code}, signal=${signal}`));
    });
  });
}

await run(['run', 'build', '--workspace=@soombook/reader-web']);
await run(['run', 'check:pack-build']);

const preview = spawn(
  process.execPath,
  [npmCli, 'run', 'preview', '--workspace=@soombook/reader-web'],
  {
    cwd: process.cwd(),
    env: fixtureEnvironment,
    stdio: 'inherit',
  },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    preview.kill(signal);
  });
}

preview.once('error', (error) => {
  throw error;
});
preview.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
