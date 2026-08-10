import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { format } from 'prettier';

import {
  assembleBookPackFromFileMap,
  readVerifiedBookPackFilesSync,
} from './bookPackIntegrity.mjs';
import {
  createCurrentPerformanceAggregate,
  PERFORMANCE_SCOPE_PATHS,
} from './checkPerformanceEvidence.mjs';
import {
  createPublicArtifactEvidence,
  createPublicCopyDigest,
  createPublicReleaseEvidenceDigest,
  createPublicReleaseRunEvidenceDigest,
  inspectPublicCopyEvidence,
  PUBLIC_HEADER_POLICY,
  PUBLIC_RELEASE_AUTHORITY,
  PUBLIC_RELEASE_CLASS,
} from './publicReleaseEvidence.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ARTIFACT_ROOT = path.resolve(ROOT, '../soombook.out/performance-artifacts');
const RELEASE_ROOT = path.resolve(ROOT, '../soombook.out/release-evidence');
const RECEIPT_PATH = path.join(RELEASE_ROOT, 'candidate.json');
const LIVE_BUILD_ROOT = path.resolve(ROOT, '../soombook.out/build/reader-web');
export const PUBLIC_RELEASE_SCOPE_PATHS = [
  ...new Set([
    ...PERFORMANCE_SCOPE_PATHS,
    '.github/workflows/quality.yml',
    '.github/workflows/pages.yml',
    '.github/workflows/pages-rollback.yml',
    'docs/operation/github-pages.md',
    'docs/operation/operator-review.md',
    'docs/operation/quality.md',
    'packages/test-book-factory/src/createDemoBookPack.ts',
    'playwright.pages.config.ts',
    'playwright.remote.config.ts',
    'scripts/binaryPolicy.mjs',
    'scripts/bookPackIntegrity.mjs',
    'scripts/checkExpertReviews.mjs',
    'scripts/checkProject.mjs',
    'scripts/checkPublicReleaseEvidence.mjs',
    'scripts/emitReleaseIdentity.mjs',
    'scripts/runBuiltPagesTests.mjs',
    'tests/audit/gates.json',
    'tests/audit/publicReleaseEvidence.test.mjs',
    'tests/e2e/readerFlow.spec.ts',
    'tests/pages/pagesDeployment.spec.ts',
  ]),
].sort();

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

async function canonicalBytes(value) {
  return Buffer.from(
    await format(JSON.stringify(value), { parser: 'json', printWidth: 100 }),
    'utf8',
  );
}

export async function createCurrentPublicReleaseScopeDigest() {
  const entries = await Promise.all(
    PUBLIC_RELEASE_SCOPE_PATHS.map(async (relativePath) => ({
      path: relativePath,
      sha256: sha256(await readFile(path.join(ROOT, relativePath))),
    })),
  );
  return createPublicCopyDigest(entries);
}

async function readCanonicalJson(filePath, label) {
  const metadata = await lstat(filePath);
  if (!metadata.isFile() || metadata.isSymbolicLink())
    throw new Error(`${label} regular file 오류`);
  const bytes = await readFile(filePath);
  const value = JSON.parse(bytes.toString('utf8'));
  if (!bytes.equals(await canonicalBytes(value))) throw new Error(`${label} canonical JSON 오류`);
  return { value, bytes };
}

function publicFixtureProjection(pack, integrity, integrityBytes) {
  return {
    slug: pack.manifest.slug,
    exposure: 'public-demo',
    bookId: pack.manifest.id,
    packVersion: pack.manifest.packVersion,
    status: pack.manifest.status,
    bookPackDigest: integrity.bookPackDigest,
    packContentDigest: integrity.packContentDigest,
    integritySha256: sha256(integrityBytes),
    sceneIds: pack.manifest.sceneOrder,
    sceneTruth: pack.scenes.map((scene) => ({
      id: scene.id,
      truthStatus: scene.visual.truthStatus,
    })),
    connectionTruth: pack.connectionCards.map((card) => ({
      id: card.id,
      truthStatus: card.truthStatus,
    })),
    rights: pack.rights.map((record) => ({
      id: record.id,
      approvalStatus: record.approvalStatus,
      sourceUrl: record.sourceUrl,
    })),
    claims: pack.claims.map((record) => ({
      id: record.id,
      reviewStatus: record.reviewStatus,
      sourceUrl: record.sourceUrl,
    })),
  };
}

export function inspectPublicArtifactSourceBinding(artifactIdentities, integrity) {
  const errors = [];
  for (const profile of ['root', 'pages']) {
    const identity = artifactIdentities?.[profile];
    if (
      !identity ||
      identity.bookPackDigest !== integrity?.bookPackDigest ||
      identity.packContentDigest !== integrity?.packContentDigest
    )
      errors.push(`release.sourceArtifactBinding:${profile}`);
  }
  return errors;
}

export async function createCurrentPublicReleaseAggregate() {
  const copy = await readCanonicalJson(
    path.join(ROOT, 'content/public-release-copy.json'),
    'public release copy',
  );
  const registry = JSON.parse(
    await readFile(path.join(ROOT, 'content/fixture-registry.json'), 'utf8'),
  );
  const packRoot = path.join(ROOT, 'content/fixtures/tiger-demo');
  const integrityBytes = await readFile(path.join(packRoot, 'integrity.json'));
  const integrity = JSON.parse(integrityBytes.toString('utf8'));
  const files = readVerifiedBookPackFilesSync(packRoot, integrity, {
    ignoredPaths: ['integrity.json', 'README.md'],
    manifestBytes: integrityBytes,
    expectedIdentity: { exposure: 'public-demo' },
  });
  const pack = assembleBookPackFromFileMap(files);
  const rootEvidence = await createPublicArtifactEvidence(path.join(ARTIFACT_ROOT, 'root'), 'root');
  const pagesEvidence = await createPublicArtifactEvidence(
    path.join(ARTIFACT_ROOT, 'pages'),
    'pages',
  );
  const copyErrors = [
    ...inspectPublicCopyEvidence({
      copyContract: copy.value,
      registry,
      pack,
      indexHtml: rootEvidence.indexHtml,
      applicationText: rootEvidence.applicationText,
    }),
    ...inspectPublicCopyEvidence({
      copyContract: copy.value,
      registry,
      pack,
      indexHtml: pagesEvidence.indexHtml,
      applicationText: pagesEvidence.applicationText,
    }),
  ];
  if (copyErrors.length > 0) throw new Error([...new Set(copyErrors)].join('\n'));
  if (
    JSON.stringify(copy.value.responseHeaderExceptions) !==
      JSON.stringify(PUBLIC_HEADER_POLICY.exceptions) ||
    PUBLIC_HEADER_POLICY.hostClass !== 'github-pages' ||
    PUBLIC_HEADER_POLICY.releaseClass !== PUBLIC_RELEASE_CLASS
  )
    throw new Error('public response header exception 정책 오류');
  const performance = await createCurrentPerformanceAggregate();
  const artifactIdentities = {
    root: rootEvidence.artifactIdentity,
    pages: pagesEvidence.artifactIdentity,
  };
  const sourceBindingErrors = inspectPublicArtifactSourceBinding(artifactIdentities, integrity);
  if (sourceBindingErrors.length > 0) throw new Error(sourceBindingErrors.join('\n'));
  if (JSON.stringify(performance.artifactIdentities) !== JSON.stringify(artifactIdentities))
    throw new Error('performance와 public release artifact identity가 다릅니다.');
  const fixtureProjection = publicFixtureProjection(pack, integrity, integrityBytes);
  const publicCopyDigest = createPublicCopyDigest({
    copyContract: copy.value,
    fixtureProjection,
    rootArtifactDigest: artifactIdentities.root.artifactContentDigest,
    pagesArtifactDigest: artifactIdentities.pages.artifactContentDigest,
  });
  const aggregateWithoutDigests = {
    schemaVersion: 1,
    authority: PUBLIC_RELEASE_AUTHORITY,
    releaseClass: PUBLIC_RELEASE_CLASS,
    releaseScopeDigest: await createCurrentPublicReleaseScopeDigest(),
    artifactIdentities,
    publicFixture: fixtureProjection,
    publicCopyDigest,
    performanceStableDigest: performance.stableDigest,
    performanceEvidenceDigest: performance.evidenceDigest,
    headerPolicy: PUBLIC_HEADER_POLICY,
    nonPromotion: copy.value.nonPromotion,
    artifactEvidenceFiles: {
      root: rootEvidence.fileReceipts,
      pages: pagesEvidence.fileReceipts,
    },
    releaseByteDigest: pagesEvidence.releaseByteDigest,
    valid: true,
  };
  const aggregateWithStable = {
    ...aggregateWithoutDigests,
    releaseEvidenceDigest: createPublicReleaseEvidenceDigest(aggregateWithoutDigests),
  };
  return {
    ...aggregateWithStable,
    runEvidenceDigest: createPublicReleaseRunEvidenceDigest(aggregateWithStable),
  };
}

async function main() {
  const aggregate = await createCurrentPublicReleaseAggregate();
  const bytes = await canonicalBytes(aggregate);
  if (process.argv.includes('--write')) {
    await mkdir(RELEASE_ROOT, { recursive: true });
    await writeFile(RECEIPT_PATH, bytes);
  } else {
    const stored = await readCanonicalJson(RECEIPT_PATH, 'public release evidence');
    if (!stored.bytes.equals(bytes))
      throw new Error('public release evidence가 current 입력과 다릅니다.');
  }
  if (process.argv.includes('--current-pages')) {
    const live = await createPublicArtifactEvidence(LIVE_BUILD_ROOT, 'pages');
    if (
      JSON.stringify(live.artifactIdentity) !==
        JSON.stringify(aggregate.artifactIdentities.pages) ||
      live.releaseByteDigest !== aggregate.releaseByteDigest
    )
      throw new Error('최종 Pages artifact가 성능 및 release evidence와 다릅니다.');
  }
  console.log(`public release evidence 통과: ${aggregate.releaseEvidenceDigest}`);
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
