import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { createCurrentPerformanceScopeDigest } from './checkPerformanceEvidence.mjs';
import { createPublicArtifactEvidence } from './publicReleaseEvidence.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PERFORMANCE_ROOT = path.resolve(ROOT, '../soombook.out/performance');
const PLAYWRIGHT_ROOT = path.resolve(ROOT, '../soombook.out/playwright-performance');
const ARTIFACT_ROOT = path.resolve(ROOT, '../soombook.out/performance-artifacts');
const RELEASE_ROOT = path.resolve(ROOT, '../soombook.out/release-evidence');
const BUILD_ROOT = path.resolve(ROOT, '../soombook.out/build/reader-web');
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  throw new Error('npm 실행 경로를 찾을 수 없습니다. npm run qa:performance로 실행하세요.');
}

function runNpm(argumentsList, environment = process.env) {
  return new Promise((resolve, reject) => {
    let output = '';
    const child = spawn(process.execPath, [npmCli, ...argumentsList], {
      cwd: ROOT,
      env: environment,
      shell: false,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    for (const stream of [child.stdout, child.stderr]) {
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        output += chunk;
        (stream === child.stdout ? process.stdout : process.stderr).write(chunk);
      });
    }
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else
        reject(
          Object.assign(
            new Error(`npm ${argumentsList.join(' ')} 실패: exit ${code ?? 'unknown'}`),
            { output },
          ),
        );
    });
  });
}

await rm(PERFORMANCE_ROOT, { recursive: true, force: true });
await rm(PLAYWRIGHT_ROOT, { recursive: true, force: true });
await rm(ARTIFACT_ROOT, { recursive: true, force: true });
await rm(RELEASE_ROOT, { recursive: true, force: true });
await rm(BUILD_ROOT, { recursive: true, force: true });
await mkdir(PERFORMANCE_ROOT, { recursive: true });
const runContext = {
  schemaVersion: 1,
  authority: 'performance-evidence-run-context',
  runId: randomUUID(),
  performanceScopeDigest: await createCurrentPerformanceScopeDigest(),
};
await writeFile(
  path.join(PERFORMANCE_ROOT, 'run-context.json'),
  `${JSON.stringify(runContext, null, 2)}\n`,
  'utf8',
);

try {
  for (const profile of ['root', 'pages']) {
    await rm(BUILD_ROOT, { recursive: true, force: true });
    await runNpm(['run', profile === 'root' ? 'build' : 'build:pages']);
    const snapshotRoot = path.join(ARTIFACT_ROOT, profile);
    await cp(BUILD_ROOT, snapshotRoot, { recursive: true, errorOnExist: true });
    const artifactIdentity = (await createPublicArtifactEvidence(snapshotRoot, profile))
      .artifactIdentity;
    const profileRoot = path.join(PERFORMANCE_ROOT, profile);
    await mkdir(profileRoot, { recursive: true });
    await writeFile(
      path.join(profileRoot, 'profile-context.json'),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          authority: 'performance-profile-context',
          runId: runContext.runId,
          performanceScopeDigest: runContext.performanceScopeDigest,
          artifactIdentity,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await runNpm(['run', 'qa:performance:profile'], {
      ...process.env,
      SOOMBOOK_PERFORMANCE_PROFILE: profile,
    });
    const liveIdentity = (await createPublicArtifactEvidence(BUILD_ROOT, profile)).artifactIdentity;
    if (JSON.stringify(liveIdentity) !== JSON.stringify(artifactIdentity))
      throw new Error(`성능 측정 중 ${profile} artifact가 변경됐습니다.`);
  }
  await runNpm(['run', 'check:performance-evidence', '--', '--write']);
  await runNpm(['run', 'check:public-release-evidence', '--', '--write']);
} catch (error) {
  await rm(path.join(PERFORMANCE_ROOT, 'aggregate.json'), { force: true });
  const outputLines =
    error && typeof error === 'object' && typeof error.output === 'string'
      ? error.output.split(/\r?\n/u).filter(Boolean)
      : [];
  await writeFile(
    path.join(PERFORMANCE_ROOT, 'failed-run.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        authority: 'performance-evidence-failure-diagnostic-not-pass-receipt',
        runId: runContext.runId,
        performanceScopeDigest: runContext.performanceScopeDigest,
        command: 'npm run qa:performance',
        error: error instanceof Error ? error.message : String(error),
        details: outputLines.slice(-120),
        repair:
          '실패한 profile과 evidence code를 확인하고 전체 root와 Pages 성능 행렬을 새 runId로 다시 실행하세요.',
        aggregateWritten: false,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  throw error;
}
