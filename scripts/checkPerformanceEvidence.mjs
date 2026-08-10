import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  createPerformanceDigest,
  createPerformanceEvidenceDigest,
  createPerformanceStableDigest,
  inspectPerformanceReceipts,
  PERFORMANCE_AGGREGATE_AUTHORITY,
  PERFORMANCE_PROFILES,
  serializePerformanceReceipt,
} from './performanceEvidenceContract.mjs';
import { createPublicArtifactEvidence } from './publicReleaseEvidence.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PERFORMANCE_ROOT = path.resolve(ROOT, '../soombook.out/performance');
const ARTIFACT_ROOT = path.resolve(ROOT, '../soombook.out/performance-artifacts');
const RUN_CONTEXT_PATH = path.join(PERFORMANCE_ROOT, 'run-context.json');
const AGGREGATE_PATH = path.join(PERFORMANCE_ROOT, 'aggregate.json');
export const PERFORMANCE_SCOPE_PATHS = [
  'package.json',
  'package-lock.json',
  'playwright.performance.config.ts',
  'apps/reader-web/index.html',
  'apps/reader-web/src/bookReader.tsx',
  'apps/reader-web/src/loadDemoBookPack.ts',
  'apps/reader-web/src/sceneActivity.tsx',
  'apps/reader-web/vite.config.ts',
  'content/fixture-registry.json',
  'content/fixtures/tiger-demo/integrity.json',
  'content/public-release-copy.json',
  'scripts/binaryPolicy.mjs',
  'scripts/bookPackBuildContract.mjs',
  'scripts/bookPackIntegrity.mjs',
  'scripts/buildPages.mjs',
  'scripts/checkBookPackBuild.mjs',
  'scripts/checkBuildBudget.mjs',
  'scripts/checkPagesBuild.mjs',
  'scripts/checkPerformanceEvidence.mjs',
  'scripts/performanceEvidenceContract.d.mts',
  'scripts/performanceEvidenceContract.mjs',
  'scripts/publicReleaseEvidence.mjs',
  'scripts/runPerformanceAudit.mjs',
  'tests/performance/performanceAudit.spec.ts',
];

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function exactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}

export async function createCurrentPerformanceScopeDigest() {
  const entries = await Promise.all(
    PERFORMANCE_SCOPE_PATHS.map(async (relativePath) => ({
      path: relativePath,
      sha256: sha256(await readFile(path.join(ROOT, relativePath))),
    })),
  );
  return createPerformanceDigest(entries);
}

async function readRegularCanonicalJson(filePath, label) {
  const metadata = await lstat(filePath);
  if (!metadata.isFile() || metadata.isSymbolicLink())
    throw new Error(`${label} regular file 오류`);
  const bytes = await readFile(filePath);
  const value = JSON.parse(bytes.toString('utf8'));
  if (!bytes.equals(canonicalBytes(value))) throw new Error(`${label} canonical JSON 오류`);
  return { value, bytes };
}

async function readRunContext() {
  const result = await readRegularCanonicalJson(RUN_CONTEXT_PATH, 'performance run context');
  if (
    !exactKeys(result.value, ['schemaVersion', 'authority', 'runId', 'performanceScopeDigest']) ||
    result.value.schemaVersion !== 1 ||
    result.value.authority !== 'performance-evidence-run-context' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
      result.value.runId,
    ) ||
    result.value.performanceScopeDigest !== (await createCurrentPerformanceScopeDigest())
  )
    throw new Error('performance run context가 현재 scope와 다릅니다.');
  return result;
}

async function readEvidence() {
  const rootEntries = await readdir(PERFORMANCE_ROOT, { withFileTypes: true });
  const allowed = new Set(['root', 'pages', 'run-context.json', 'aggregate.json']);
  const unexpected = rootEntries.map((entry) => entry.name).filter((name) => !allowed.has(name));
  if (unexpected.length > 0) throw new Error(`performance 미등록 산출물: ${unexpected.join(', ')}`);
  const receipts = [];
  const contexts = {};
  const evidenceFiles = [];
  for (const profile of ['root', 'pages']) {
    const directory = path.join(PERFORMANCE_ROOT, profile);
    const metadata = await lstat(directory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink())
      throw new Error(`performance profile directory 오류: ${profile}`);
    const entries = await readdir(directory, { withFileTypes: true });
    const expectedNames = ['desktop-gesture-receipt.json', 'profile-context.json', 'receipt.json'];
    if (
      JSON.stringify(entries.map((entry) => entry.name).sort()) !== JSON.stringify(expectedNames) ||
      entries.some((entry) => !entry.isFile() || entry.isSymbolicLink())
    )
      throw new Error(`performance profile 산출물 집합 오류: ${profile}`);
    for (const name of expectedNames) {
      const relativePath = `${profile}/${name}`;
      const file = await readRegularCanonicalJson(
        path.join(PERFORMANCE_ROOT, relativePath),
        relativePath,
      );
      evidenceFiles.push({
        path: relativePath,
        byteLength: file.bytes.byteLength,
        sha256: sha256(file.bytes),
      });
      if (name === 'profile-context.json') contexts[profile] = file.value;
      else {
        if (!file.bytes.equals(Buffer.from(serializePerformanceReceipt(file.value), 'utf8')))
          throw new Error(`performance receipt serializer 오류: ${relativePath}`);
        receipts.push(file.value);
      }
    }
  }
  return { receipts, contexts, evidenceFiles };
}

export async function createCurrentPerformanceAggregate() {
  const runContext = await readRunContext();
  const artifactEntries = await readdir(ARTIFACT_ROOT, { withFileTypes: true });
  if (
    JSON.stringify(artifactEntries.map((entry) => entry.name).sort()) !==
      JSON.stringify(['pages', 'root']) ||
    artifactEntries.some((entry) => !entry.isDirectory() || entry.isSymbolicLink())
  )
    throw new Error('performance artifact snapshot 집합 오류');
  const artifactIdentities = {
    root: (await createPublicArtifactEvidence(path.join(ARTIFACT_ROOT, 'root'), 'root'))
      .artifactIdentity,
    pages: (await createPublicArtifactEvidence(path.join(ARTIFACT_ROOT, 'pages'), 'pages'))
      .artifactIdentity,
  };
  const { receipts, contexts, evidenceFiles } = await readEvidence();
  for (const profile of ['root', 'pages']) {
    const context = contexts[profile];
    if (
      !exactKeys(context, [
        'schemaVersion',
        'authority',
        'runId',
        'performanceScopeDigest',
        'artifactIdentity',
      ]) ||
      context.schemaVersion !== 1 ||
      context.authority !== 'performance-profile-context' ||
      context.runId !== runContext.value.runId ||
      context.performanceScopeDigest !== runContext.value.performanceScopeDigest ||
      JSON.stringify(context.artifactIdentity) !== JSON.stringify(artifactIdentities[profile])
    )
      throw new Error(`performance profile context 오류: ${profile}`);
  }
  const environment = {
    nodeVersion: process.version,
    playwrightVersion: JSON.parse(
      await readFile(path.join(ROOT, 'node_modules/@playwright/test/package.json'), 'utf8'),
    ).version,
    platform: process.platform,
    architecture: process.arch,
  };
  const errors = inspectPerformanceReceipts(receipts, {
    runId: runContext.value.runId,
    performanceScopeDigest: runContext.value.performanceScopeDigest,
    artifactIdentities,
    environment,
  });
  if (errors.length > 0) throw new Error(errors.join('\n'));
  const ordered = [...receipts].sort((left, right) =>
    left.profileId.localeCompare(right.profileId, 'en'),
  );
  const aggregateWithoutDigests = {
    schemaVersion: 1,
    authority: PERFORMANCE_AGGREGATE_AUTHORITY,
    runId: runContext.value.runId,
    performanceScopeDigest: runContext.value.performanceScopeDigest,
    artifactIdentities,
    environment,
    profileIds: ordered.map((receipt) => receipt.profileId),
    contracts: ordered.map((receipt) => ({
      profileId: receipt.profileId,
      artifactProfile: PERFORMANCE_PROFILES[receipt.profileId].artifactProfile,
      layout: PERFORMANCE_PROFILES[receipt.profileId].layout,
      performanceJourneyCycles: receipt.performanceJourneyCycles,
      warmupJourneyCycles: receipt.warmupJourneyCycles,
      memoryJourneyCycles: receipt.memoryJourneyCycles,
      budgets: receipt.budgets,
      throttling: receipt.throttling,
      passed: receipt.passed,
    })),
    outcomes: ordered.map((receipt) => ({
      profileId: receipt.profileId,
      measuredAt: receipt.measuredAt,
      browserVersion: receipt.environment.browserVersion,
      summary: receipt.summary,
      runsDigest: createPerformanceDigest({
        runs: receipt.runs,
        heapSamplesBytes: receipt.heapSamplesBytes,
      }),
      receiptDigest: receipt.receiptDigest,
    })),
    evidenceFiles: [
      {
        path: 'run-context.json',
        byteLength: runContext.bytes.byteLength,
        sha256: sha256(runContext.bytes),
      },
      ...evidenceFiles,
    ],
    valid: true,
  };
  const aggregateWithStable = {
    ...aggregateWithoutDigests,
    stableDigest: createPerformanceStableDigest(aggregateWithoutDigests),
  };
  return {
    ...aggregateWithStable,
    evidenceDigest: createPerformanceEvidenceDigest(aggregateWithStable),
  };
}

async function main() {
  const aggregate = await createCurrentPerformanceAggregate();
  const bytes = canonicalBytes(aggregate);
  if (process.argv.includes('--write')) {
    await mkdir(PERFORMANCE_ROOT, { recursive: true });
    await writeFile(AGGREGATE_PATH, bytes);
  } else {
    const stored = await readRegularCanonicalJson(AGGREGATE_PATH, 'performance aggregate');
    if (!stored.bytes.equals(bytes))
      throw new Error('performance aggregate가 current evidence와 다릅니다.');
  }
  console.log(
    `성능 evidence 통과: ${aggregate.profileIds.length} profiles, ${aggregate.stableDigest}`,
  );
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
