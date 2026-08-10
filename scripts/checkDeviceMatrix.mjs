import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { createCurrentReviewBuildReceipt } from './checkReviewBuild.mjs';
import {
  createDeviceMatrixDigest,
  createNormalizedDeviceAriaSnapshotDigest,
  DEVICE_MATRIX_ACCESSIBILITY_BASELINES,
  DEVICE_MATRIX_RAW_ACCESSIBILITY_BASELINES,
  DEVICE_MATRIX_AGGREGATE_AUTHORITY,
  DEVICE_MATRIX_PROFILES,
  DEVICE_MATRIX_STATES,
  inspectDeviceMatrixReceipts,
  serializeDeviceMatrixReceipt,
} from './deviceMatrixContract.mjs';
import { createCurrentRepresentativeReviewReceipt } from './checkRepresentativeReview.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const MATRIX_ROOT = path.resolve(ROOT, '../soombook.out/device-matrix');
const BUILD_ROOT = path.resolve(ROOT, '../soombook.out/build/review-candidate');
const AGGREGATE_PATH = path.join(MATRIX_ROOT, 'aggregate.json');
const RUN_CONTEXT_PATH = path.join(MATRIX_ROOT, 'run-context.json');
export const DEVICE_MATRIX_SCOPE_PATHS = [
  '.github/workflows/quality.yml',
  '.github/workflows/pages.yml',
  '.github/workflows/pages-rollback.yml',
  'THIRD_PARTY_NOTICES.md',
  'apps/reader-web/src/bookReader.tsx',
  'apps/reader-web/src/reflectionStep.tsx',
  'apps/reader-web/src/styles.css',
  'package.json',
  'package-lock.json',
  'playwright.device-matrix.config.ts',
  'scripts/deviceMatrixContract.mjs',
  'scripts/checkDeviceMatrix.mjs',
  'scripts/checkExpertReviews.mjs',
  'scripts/buildReviewCandidate.mjs',
  'scripts/reviewCandidateServer.mjs',
  'scripts/runDeviceMatrix.mjs',
  'scripts/checkProject.mjs',
  'scripts/representativeDecisionReceipt.mjs',
  'tests/audit/gates.json',
  'tests/audit/deviceMatrixContract.test.mjs',
  'tests/audit/representativeReview.test.mjs',
  'tests/device/deviceMatrix.spec.ts',
];

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

function candidateProjection(receipt) {
  return {
    bookId: receipt.bookId,
    packVersion: receipt.packVersion,
    authoringSourceSha256: receipt.authoringSourceSha256,
    bookPackDigest: receipt.bookPackDigest,
    packContentDigest: receipt.packContentDigest,
    candidateDigest: receipt.candidateDigest,
    planDigest: receipt.planDigest,
  };
}

export async function createCurrentDeviceMatrixScopeDigest() {
  const entries = await Promise.all(
    DEVICE_MATRIX_SCOPE_PATHS.map(async (relativePath) => ({
      path: relativePath,
      sha256: sha256(await readFile(path.join(ROOT, relativePath))),
    })),
  );
  return createDeviceMatrixDigest(entries);
}

export function createDeviceMatrixAggregateDigest(aggregate) {
  return createDeviceMatrixDigest({
    schemaVersion: aggregate.schemaVersion,
    authority: aggregate.authority,
    candidateIdentity: aggregate.candidateIdentity,
    matrixScopeDigest: aggregate.matrixScopeDigest,
    artifactDigest: aggregate.artifactDigest,
    binding: aggregate.binding,
    bindingDigest: aggregate.bindingDigest,
    profileIds: aggregate.profileIds,
    profileAccessibilityDigests: aggregate.profileAccessibilityDigests,
    profileOutcomeDigests: aggregate.profileOutcomeDigests,
    finalStateDigest: aggregate.finalStateDigest,
    valid: aggregate.valid,
  });
}

export function createDeviceMatrixEvidenceDigest(aggregate) {
  return createDeviceMatrixDigest({
    runId: aggregate.runId,
    profileRawAccessibilityDigests: aggregate.profileRawAccessibilityDigests,
    evidenceFiles: aggregate.evidenceFiles,
    stateStructureDigests: aggregate.stateStructureDigests,
  });
}

function stableOfflineProbeProjection(probe) {
  return {
    attempted: probe.attempted,
    blocked: probe.blocked,
    requestKind: probe.requestKind,
    failedRequestCount: probe.failedRequestCount,
  };
}

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readRunContext() {
  const stat = await lstat(RUN_CONTEXT_PATH);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error('device matrix run context가 regular file이 아닙니다.');
  const bytes = await readFile(RUN_CONTEXT_PATH);
  const value = JSON.parse(bytes.toString('utf8'));
  if (
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify(['authority', 'matrixScopeDigest', 'runId', 'schemaVersion'].sort()) ||
    value.schemaVersion !== 1 ||
    value.authority !== 'device-matrix-run-context' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value.runId) ||
    value.matrixScopeDigest !== (await createCurrentDeviceMatrixScopeDigest()) ||
    !bytes.equals(canonicalBytes(value))
  )
    throw new Error('device matrix run context가 현재 scope와 다릅니다.');
  return { value, bytes };
}

async function readReceipts() {
  const expectedProjects = Object.keys(DEVICE_MATRIX_PROFILES).sort();
  const rootEntries = await readdir(MATRIX_ROOT, { withFileTypes: true });
  const allowedRootEntries = new Set([...expectedProjects, 'aggregate.json', 'run-context.json']);
  const unexpected = rootEntries
    .map((entry) => entry.name)
    .filter((name) => !allowedRootEntries.has(name));
  if (unexpected.length > 0)
    throw new Error(`device matrix 미등록 산출물: ${unexpected.sort().join(', ')}`);
  const receipts = [];
  const evidenceFiles = [];
  for (const project of expectedProjects) {
    const projectPath = path.join(MATRIX_ROOT, project);
    const projectStat = await lstat(projectPath);
    if (!projectStat.isDirectory() || projectStat.isSymbolicLink())
      throw new Error(`device matrix project 경로가 regular directory가 아닙니다: ${project}`);
    const entries = await readdir(projectPath, { withFileTypes: true });
    if (
      entries.length !== 1 ||
      entries[0].name !== 'receipt.json' ||
      !entries[0].isFile() ||
      entries[0].isSymbolicLink()
    )
      throw new Error(`device matrix project 산출물 집합 오류: ${project}`);
    const relativePath = `${project}/receipt.json`;
    const bytes = await readFile(path.join(MATRIX_ROOT, relativePath));
    const receipt = JSON.parse(bytes.toString('utf8'));
    if (!bytes.equals(Buffer.from(serializeDeviceMatrixReceipt(receipt), 'utf8')))
      throw new Error(`device matrix receipt가 canonical JSON이 아닙니다: ${project}`);
    receipts.push(receipt);
    evidenceFiles.push({ path: relativePath, byteLength: bytes.byteLength, sha256: sha256(bytes) });
  }
  return { receipts, evidenceFiles };
}

export async function createCurrentDeviceMatrixAggregate() {
  const runContext = await readRunContext();
  const bindingBytes = await readFile(path.join(BUILD_ROOT, 'bookpack-binding.json'));
  const binding = JSON.parse(bindingBytes.toString('utf8'));
  const bindingDigest = sha256(bindingBytes);
  const staticReceipt = await createCurrentRepresentativeReviewReceipt();
  if (!staticReceipt.valid)
    throw new Error('현재 representative static receipt가 유효하지 않습니다.');
  const candidateIdentity = candidateProjection(staticReceipt);
  const { receipt: buildReceipt, errors: buildErrors } = await createCurrentReviewBuildReceipt({
    buildRoot: BUILD_ROOT,
  });
  if (buildErrors.length > 0 || !buildReceipt.valid)
    throw new Error(`현재 review artifact가 유효하지 않습니다: ${buildErrors.join(', ')}`);
  const { receipts, evidenceFiles } = await readReceipts();
  const { errors } = inspectDeviceMatrixReceipts(
    receipts,
    binding,
    bindingDigest,
    candidateIdentity,
    buildReceipt.artifactDigest,
    runContext.value.matrixScopeDigest,
    runContext.value.runId,
    {
      playwrightVersion: JSON.parse(
        await readFile(path.join(ROOT, 'node_modules/@playwright/test/package.json'), 'utf8'),
      ).version,
      nodeVersion: process.version,
      platform: process.platform,
    },
    DEVICE_MATRIX_ACCESSIBILITY_BASELINES,
    DEVICE_MATRIX_RAW_ACCESSIBILITY_BASELINES,
  );
  if (errors.length > 0) throw new Error(errors.join('\n'));
  const orderedReceipts = [...receipts].sort((left, right) =>
    left.project.localeCompare(right.project, 'en'),
  );
  const firstReceipt = orderedReceipts[0];
  const aggregateWithoutDigest = {
    schemaVersion: 1,
    authority: DEVICE_MATRIX_AGGREGATE_AUTHORITY,
    runId: runContext.value.runId,
    candidateIdentity,
    matrixScopeDigest: runContext.value.matrixScopeDigest,
    artifactDigest: buildReceipt.artifactDigest,
    binding,
    bindingDigest,
    profileIds: orderedReceipts.map((receipt) => receipt.project),
    profileAccessibilityDigests: orderedReceipts.map((receipt) => ({
      project: receipt.project,
      states: receipt.stateChecks.map((check) => ({
        stateId: check.stateId,
        normalizedAriaSnapshotDigest: createNormalizedDeviceAriaSnapshotDigest(check.ariaSnapshot),
      })),
    })),
    profileRawAccessibilityDigests: orderedReceipts.map((receipt) => ({
      project: receipt.project,
      engine: receipt.engine,
      browserVersion: receipt.environment.browserVersion,
      states: receipt.stateChecks.map((check) => ({
        stateId: check.stateId,
        ariaSnapshotDigest: check.ariaSnapshotDigest,
      })),
    })),
    profileOutcomeDigests: orderedReceipts.map((receipt) => ({
      project: receipt.project,
      engine: receipt.engine,
      outcomeDigest: createDeviceMatrixDigest({
        inputRoute: receipt.inputRoute,
        offlineMode: receipt.offlineMode,
        navigatorOnlineAfterOffline: receipt.navigatorOnlineAfterOffline,
        offlineProbe: stableOfflineProbeProjection(receipt.offlineProbe),
        scenarios: receipt.scenarios,
        stateChecks: receipt.stateChecks.map((check) => ({
          stateId: check.stateId,
          structureProjection: check.structureProjection,
          semanticCounts: check.semanticCounts,
          activeElement: check.activeElement,
          liveAnnouncementEvents: check.liveAnnouncementEvents,
          axeViolationCount: check.axeViolationCount,
          horizontalOverflowPx: check.horizontalOverflowPx,
          focusIndicatorOk: check.focusIndicatorOk,
          forcedColorStateOk: check.forcedColorStateOk,
          reducedMotionStateOk: check.reducedMotionStateOk,
        })),
        finalStateDigest: receipt.finalStateDigest,
        storageBeforeDigest: receipt.storageBeforeDigest,
        storageAfterDigest: receipt.storageAfterDigest,
        reloadedStorageDigest: receipt.reloadedStorageDigest,
        storageReload: receipt.storageReload,
        offlineCompletion: receipt.offlineCompletion,
      }),
    })),
    evidenceFiles: [
      {
        path: 'run-context.json',
        byteLength: runContext.bytes.byteLength,
        sha256: sha256(runContext.bytes),
      },
      ...evidenceFiles,
    ],
    stateStructureDigests: DEVICE_MATRIX_STATES.map((stateId) => ({
      stateId,
      structureDigest: firstReceipt.stateChecks.find((check) => check.stateId === stateId)
        .structureDigest,
      activeElementDigest: firstReceipt.stateChecks.find((check) => check.stateId === stateId)
        .activeElementDigest,
    })),
    finalStateDigest: firstReceipt.finalStateDigest,
    valid: true,
  };
  const aggregateWithEvidence = {
    ...aggregateWithoutDigest,
    evidenceDigest: createDeviceMatrixEvidenceDigest(aggregateWithoutDigest),
  };
  return {
    ...aggregateWithEvidence,
    aggregateDigest: createDeviceMatrixAggregateDigest(aggregateWithEvidence),
  };
}

async function main() {
  const aggregate = await createCurrentDeviceMatrixAggregate();
  const bytes = Buffer.from(`${JSON.stringify(aggregate, null, 2)}\n`, 'utf8');
  if (process.argv.includes('--write')) {
    await mkdir(MATRIX_ROOT, { recursive: true });
    try {
      const aggregateStat = await lstat(AGGREGATE_PATH);
      if (!aggregateStat.isFile() || aggregateStat.isSymbolicLink())
        throw new Error('device matrix aggregate 경로가 regular file이 아닙니다.');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    await writeFile(AGGREGATE_PATH, bytes);
  } else {
    const aggregateStat = await lstat(AGGREGATE_PATH);
    if (!aggregateStat.isFile() || aggregateStat.isSymbolicLink())
      throw new Error('device matrix aggregate가 regular file이 아닙니다.');
    const stored = await readFile(AGGREGATE_PATH);
    if (!stored.equals(bytes)) throw new Error('device matrix aggregate가 현재 증거와 다릅니다.');
  }
  console.log(
    `device matrix 통과: ${aggregate.profileIds.length} profiles, ${aggregate.aggregateDigest}`,
  );
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(import.meta.filename)) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
