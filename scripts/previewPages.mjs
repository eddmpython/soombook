import process from 'node:process';
import { spawn } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error('npm 실행 경로를 찾을 수 없습니다. npm run preview:pages로 실행하세요.');
}
const child = spawn(
  process.execPath,
  [npmCli, 'run', 'preview', '--workspace=@soombook/reader-web'],
  {
    cwd: ROOT,
    env: { ...process.env, SOOMBOOK_PUBLIC_BASE: '/soombook/' },
    shell: false,
    stdio: 'inherit',
  },
);

child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
