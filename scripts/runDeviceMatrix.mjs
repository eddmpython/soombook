import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { createCurrentDeviceMatrixScopeDigest } from './checkDeviceMatrix.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const MATRIX_ROOT = path.resolve(ROOT, '../soombook.out/device-matrix');
const PLAYWRIGHT_ROOT = path.resolve(ROOT, '../soombook.out/playwright-device-matrix');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm 실행 경로를 찾을 수 없습니다.');

function run(argumentsList) {
  return new Promise((resolve, reject) => {
    let output = '';
    const child = spawn(process.execPath, [npmCli, ...argumentsList], {
      cwd: ROOT,
      env: { ...process.env, SOOMBOOK_DEVICE_MATRIX_STRICT_SERVER: 'true' },
      shell: false,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    for (const stream of [child.stdout, child.stderr]) {
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        output += chunk;
        const target = stream === child.stdout ? process.stdout : process.stderr;
        target.write(chunk);
      });
    }
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(
            Object.assign(new Error(`device matrix 명령 실패: npm ${argumentsList.join(' ')}`), {
              output,
            }),
          ),
    );
  });
}

await rm(MATRIX_ROOT, { recursive: true, force: true });
await rm(PLAYWRIGHT_ROOT, { recursive: true, force: true });
await mkdir(MATRIX_ROOT, { recursive: true });
const runContext = {
  schemaVersion: 1,
  authority: 'device-matrix-run-context',
  runId: randomUUID(),
  matrixScopeDigest: await createCurrentDeviceMatrixScopeDigest(),
};
await writeFile(
  path.join(MATRIX_ROOT, 'run-context.json'),
  `${JSON.stringify(runContext, null, 2)}\n`,
  'utf8',
);
try {
  await run(['exec', 'playwright', 'test', '--', '--config=playwright.device-matrix.config.ts']);
  await run(['run', 'check:device-matrix', '--', '--write']);
} catch (error) {
  await rm(path.join(MATRIX_ROOT, 'aggregate.json'), { force: true });
  const outputLines =
    error && typeof error === 'object' && typeof error.output === 'string'
      ? error.output.split(/\r?\n/u).filter(Boolean)
      : [];
  const diagnosticLines = outputLines.filter((line) => /^device\./u.test(line));
  const diagnostics = diagnosticLines.slice(0, 1000);
  await writeFile(
    path.join(MATRIX_ROOT, 'failed-run.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        authority: 'device-matrix-failure-diagnostic-not-pass-receipt',
        runId: runContext.runId,
        matrixScopeDigest: runContext.matrixScopeDigest,
        command: 'npm run qa:device-matrix',
        error: error instanceof Error ? error.message : String(error),
        diagnostics,
        omittedDiagnosticCount: diagnosticLines.length - diagnostics.length,
        details: outputLines.slice(-80),
        repair:
          'failed project와 state를 details에서 확인하고 제품 또는 검사 계약을 수리한 뒤 전체 matrix를 새 runId로 다시 실행하세요.',
        aggregateWritten: false,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  throw error;
}
