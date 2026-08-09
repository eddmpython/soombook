import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXPECTED_REMOTE = 'https://github.com/eddmpython/soombook.git';

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function configureHooks() {
  git(['config', '--local', 'core.hooksPath', '.githooks']);
  const configured = git(['config', '--local', '--get', 'core.hooksPath']);
  if (configured !== '.githooks') {
    throw new Error(`Git hook 경로 설정 실패: ${configured}`);
  }
}

function configureRemote() {
  const remotes = git(['remote']).split(/\r?\n/u).filter(Boolean);
  if (!remotes.includes('origin')) {
    git(['remote', 'add', 'origin', EXPECTED_REMOTE]);
    return;
  }
  const current = git(['remote', 'get-url', 'origin']);
  if (current !== EXPECTED_REMOTE) {
    throw new Error(`origin이 예상 주소와 다릅니다. 자동으로 덮지 않습니다. 현재: ${current}`);
  }
}

try {
  configureHooks();
  configureRemote();
  console.log('workspace 설정 완료: tracked Git hook과 origin 확인');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
