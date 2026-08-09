import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath가 없어 고정된 npm build를 시작할 수 없습니다.');

async function buildVersion(version) {
  const buildEnvironment = {
    ...process.env,
    SOOMBOOK_BUILD_PROFILE: `pwa-update-${version}`,
    SOOMBOOK_PUBLIC_BASE: '/',
    SOOMBOOK_INTERNAL_FIXTURE_BUILD: 'false',
    SOOMBOOK_REVIEW_BUILD: 'false',
    SOOMBOOK_PUBLISHED_BUILD: 'false',
    VITE_SOOMBOOK_FIXTURE_SLUG: '',
    VITE_SOOMBOOK_RELEASE_ID: version,
  };
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [npmCli, 'run', 'build', '--workspace=@soombook/reader-web'],
      {
        cwd: ROOT,
        env: buildEnvironment,
        stdio: 'inherit',
        windowsHide: true,
      },
    );
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal || code !== 0)
        reject(new Error(`PWA ${version} build 실패: ${signal ?? `exit ${code}`}`));
      else resolve();
    });
  });
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, 'run', 'check:pack-build'], {
      cwd: ROOT,
      env: buildEnvironment,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal || code !== 0)
        reject(new Error(`PWA ${version} BookPack 결박 실패: ${signal ?? `exit ${code}`}`));
      else resolve();
    });
  });
}

await buildVersion('v1');
await buildVersion('v2');
console.log('PWA update fixture build 완료: v1, v2');
