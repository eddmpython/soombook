import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  assembleBookPackFromFileMap,
  inspectBookPackIntegritySync,
  readVerifiedBookPackFilesSync,
  serializeBookPackIntegrityManifest,
} from './bookPackIntegrity.mjs';
import {
  expectedBookPackBuildBinding,
  expectedExposureForBuildProfile,
  inspectBookPackBuildEvidence,
  inspectServiceWorkerPrecache,
  serializeBookPackBuildBinding,
} from './bookPackBuildContract.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUILD_PROFILE = process.env.SOOMBOOK_BUILD_PROFILE ?? 'reader-web';
const PUBLIC_BASE = process.env.SOOMBOOK_PUBLIC_BASE ?? '/';
const BUILD_ROOT = path.resolve(ROOT, `../soombook.out/build/${BUILD_PROFILE}`);
const REGISTRY_PATH = path.join(ROOT, 'content', 'fixture-registry.json');
const BINARY_INVENTORY_PATH = path.join(ROOT, 'tests', 'audit', 'binary-assets.json');

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

function expectedExposure() {
  return expectedExposureForBuildProfile(BUILD_PROFILE);
}

function sourceRoot(fixture) {
  return path.join(
    ROOT,
    'content',
    fixture.exposure === 'review-candidate' || fixture.exposure === 'published'
      ? 'books'
      : 'fixtures',
    fixture.slug,
    ...(fixture.exposure === 'review-candidate' || fixture.exposure === 'published'
      ? ['compiled']
      : []),
  );
}

async function collectFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(directory, entry.name);
    const metadata = await lstat(absolutePath);
    if (metadata.isSymbolicLink())
      throw new Error(`build artifact에 symbolic link가 있습니다: ${relativePath}`);
    if (metadata.isDirectory()) files.push(...(await collectFiles(absolutePath, relativePath)));
    else if (metadata.isFile()) files.push({ relativePath, absolutePath });
    else throw new Error(`build artifact에 일반 파일이 아닌 항목이 있습니다: ${relativePath}`);
  }
  return files;
}

const registry = JSON.parse(await readFile(REGISTRY_PATH, 'utf8'));
const exposure = expectedExposure();
const requestedSlug = process.env.VITE_SOOMBOOK_FIXTURE_SLUG?.trim();
const fixture = requestedSlug
  ? registry.fixtures.find((candidate) => candidate.slug === requestedSlug)
  : registry.fixtures.find((candidate) => candidate.exposure === 'public-demo');
if (!fixture) throw new Error('build와 대조할 BookPack registry 항목이 없습니다.');
if (fixture.exposure !== exposure)
  throw new Error(`build profile과 fixture exposure가 다릅니다: ${BUILD_PROFILE}`);

const packRoot = sourceRoot(fixture);
const sourceIntegrityBytes = await readFile(path.join(packRoot, 'integrity.json'));
const sourceIntegrity = JSON.parse(sourceIntegrityBytes.toString('utf8'));
const sourceIssues = inspectBookPackIntegritySync(packRoot, sourceIntegrity, {
  ignoredPaths: [
    'integrity.json',
    ...(fixture.exposure.includes('validation') || fixture.exposure === 'public-demo'
      ? ['README.md']
      : []),
  ],
  manifestBytes: sourceIntegrityBytes,
  expectedIdentity: { exposure: fixture.exposure },
});
if (sourceIssues.length > 0)
  throw new Error(
    `source BookPack 무결성 실패\n${sourceIssues.map((entry) => `${entry.code} ${entry.path}`).join('\n')}`,
  );
if (sourceIntegrity.files.length !== fixture.expectedPayloadFileCount)
  throw new Error(
    `BookPack payload file 수가 registry 계약과 다릅니다: ${sourceIntegrity.files.length}/${fixture.expectedPayloadFileCount}`,
  );
const verifiedSourceFiles = readVerifiedBookPackFilesSync(packRoot, sourceIntegrity, {
  ignoredPaths: [
    'integrity.json',
    ...(fixture.exposure.includes('validation') || fixture.exposure === 'public-demo'
      ? ['README.md']
      : []),
  ],
  manifestBytes: sourceIntegrityBytes,
  expectedIdentity: { exposure: fixture.exposure },
});
const expectedPack = assembleBookPackFromFileMap(verifiedSourceFiles);

const artifactFiles = await collectFiles(BUILD_ROOT);
const artifactByPath = new Map(artifactFiles.map((file) => [file.relativePath, file.absolutePath]));
const artifactBytes = new Map(
  await Promise.all(
    artifactFiles.map(async (file) => [file.relativePath, await readFile(file.absolutePath)]),
  ),
);
const emittedIntegrityPath = artifactByPath.get('bookpack-integrity.json');
const emittedBindingPath = artifactByPath.get('bookpack-binding.json');
if (!emittedIntegrityPath || !emittedBindingPath)
  throw new Error('build에 BookPack integrity 또는 binding artifact가 없습니다.');
const emittedIntegrityBytes = await readFile(emittedIntegrityPath);
if (!emittedIntegrityBytes.equals(Buffer.from(serializeBookPackIntegrityManifest(sourceIntegrity))))
  throw new Error('build BookPack integrity가 source canonical manifest와 다릅니다.');

const emittedBindingBytes = await readFile(emittedBindingPath);
const binding = JSON.parse(emittedBindingBytes.toString('utf8'));
const expectedBinding = expectedBookPackBuildBinding({
  buildProfile: BUILD_PROFILE,
  fixture,
  integrity: sourceIntegrity,
});
if (
  !emittedBindingBytes.equals(Buffer.from(serializeBookPackBuildBinding(expectedBinding), 'utf8'))
)
  throw new Error('build BookPack binding이 profile과 source manifest에 결박되지 않았습니다.');

const workers = artifactFiles.filter((file) =>
  /^assets\/bookPackWorker-[^/]+\.js$/u.test(file.relativePath),
);
if (workers.length !== 1)
  throw new Error(`BookPack worker는 정확히 하나여야 합니다: ${workers.length}개`);
const worker = workers[0];
const workerBytes = await readFile(worker.absolutePath);
const workerText = workerBytes.toString('utf8');
for (const digest of [sourceIntegrity.bookPackDigest, sourceIntegrity.packContentDigest]) {
  if (!workerText.includes(digest))
    throw new Error(`BookPack worker에 digest가 없습니다: ${digest}`);
}

const swText = await readFile(path.join(BUILD_ROOT, 'sw.js'), 'utf8');
const precacheEvidence = inspectServiceWorkerPrecache(swText);
if (precacheEvidence.errors.length > 0)
  throw new Error(`service worker precache 계약 실패: ${precacheEvidence.errors.join(', ')}`);
const precacheUrls = precacheEvidence.urls;
const binaryInventory = JSON.parse(await readFile(BINARY_INVENTORY_PATH, 'utf8'));
const allowedMediaSha256s = new Set([
  ...sourceIntegrity.files
    .filter((entry) => entry.mediaType !== 'application/json')
    .map((entry) => entry.sha256),
  ...binaryInventory.assets
    .filter((entry) => entry.path.startsWith('apps/reader-web/public/'))
    .map((entry) => entry.sha256),
]);
const buildEvidence = inspectBookPackBuildEvidence({
  artifactBytes,
  binding,
  buildProfile: BUILD_PROFILE,
  expectedPack,
  fixture,
  integrity: sourceIntegrity,
  publicBase: PUBLIC_BASE,
  precacheUrls,
  allowedMediaSha256s,
});
if (buildEvidence.errors.length > 0)
  throw new Error(`BookPack build evidence 실패: ${buildEvidence.errors.join(', ')}`);
for (const requiredPath of [
  'bookpack-integrity.json',
  'bookpack-binding.json',
  worker.relativePath,
]) {
  if (!precacheUrls.has(requiredPath))
    throw new Error(`service worker precache에 BookPack binding 파일이 없습니다: ${requiredPath}`);
}

const emittedPackAssets = [];
for (const entry of sourceIntegrity.files.filter(
  (candidate) => candidate.mediaType !== 'application/json',
)) {
  const matches = [];
  for (const file of artifactFiles) {
    if (sha256(await readFile(file.absolutePath)) === entry.sha256) matches.push(file.relativePath);
  }
  if (matches.length === 0)
    throw new Error(`BookPack binary asset이 build에 없습니다: ${entry.path}`);
  if (!matches.some((relativePath) => workerText.includes(relativePath)))
    throw new Error(`BookPack worker가 emitted asset을 참조하지 않습니다: ${entry.path}`);
  for (const relativePath of matches) {
    if (!precacheUrls.has(relativePath))
      throw new Error(`service worker precache에 BookPack asset이 없습니다: ${relativePath}`);
  }
  emittedPackAssets.push(...matches);
}

const applicationText = (
  await Promise.all(
    artifactFiles
      .filter((file) => ['.html', '.js', '.json'].includes(path.extname(file.relativePath)))
      .map((file) => readFile(file.absolutePath, 'utf8')),
  )
).join('\n');
for (const candidate of registry.fixtures.filter((item) => item.slug !== fixture.slug)) {
  const candidateManifest = JSON.parse(
    await readFile(path.join(sourceRoot(candidate), 'manifest.json'), 'utf8'),
  );
  for (const forbiddenIdentity of [candidate.slug, candidateManifest.id]) {
    if (applicationText.includes(forbiddenIdentity))
      throw new Error(`다른 BookPack identity가 build에 포함됐습니다: ${forbiddenIdentity}`);
  }
}

const receipt = {
  schemaVersion: 1,
  authority: 'local-book-pack-build-binding-receipt-not-publication-approval',
  buildProfile: BUILD_PROFILE,
  exposure: fixture.exposure,
  slug: fixture.slug,
  bookId: sourceIntegrity.bookId,
  packVersion: sourceIntegrity.packVersion,
  bookPackDigest: sourceIntegrity.bookPackDigest,
  packContentDigest: sourceIntegrity.packContentDigest,
  bookPackIntegrityPath: 'bookpack-integrity.json',
  bookPackIntegritySha256: sha256(emittedIntegrityBytes),
  bookPackBindingPath: 'bookpack-binding.json',
  bookPackBindingSha256: sha256(emittedBindingBytes),
  bookPackWorkerPath: worker.relativePath,
  bookPackWorkerSha256: sha256(workerBytes),
  emittedPackAssets: [...new Set(emittedPackAssets)].sort(),
};
const receiptPath = path.resolve(
  ROOT,
  `../soombook.out/audit/bookpack-build-${BUILD_PROFILE}.json`,
);
await mkdir(path.dirname(receiptPath), { recursive: true });
await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(
  `BookPack build 결박 통과: ${BUILD_PROFILE}, ${fixture.slug}, ${sourceIntegrity.files.length}개 payload`,
);
