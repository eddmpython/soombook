import { spawn } from 'node:child_process';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url);
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error('npm 실행 경로를 찾을 수 없습니다. npm run qa:performance로 실행하세요.');
}

function runNpm(script, environment = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, 'run', script], {
      cwd: ROOT,
      env: environment,
      shell: false,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm run ${script} 실패: exit ${code ?? 'unknown'}`));
      }
    });
  });
}

for (const profile of ['root', 'pages']) {
  await runNpm(profile === 'root' ? 'build' : 'build:pages');
  await runNpm('qa:performance:profile', {
    ...process.env,
    SOOMBOOK_PERFORMANCE_PROFILE: profile,
  });
}
