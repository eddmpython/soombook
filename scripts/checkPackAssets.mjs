import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { createServer } from 'vite';

import { inspectBookPackIntegritySync } from './bookPackIntegrity.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_ROOT = path.join(ROOT, 'content', 'fixtures');

function insidePackRoot(packRoot, relativePath) {
  const resolved = path.resolve(packRoot, relativePath);
  return resolved.startsWith(`${packRoot}${path.sep}`) ? resolved : null;
}

async function readRegisteredAsset(packRoot, relativePath) {
  const resolved = insidePackRoot(packRoot, relativePath);
  if (!resolved) {
    throw new Error(`content root 밖의 경로입니다: ${relativePath}`);
  }
  try {
    const metadata = await lstat(resolved);
    if (metadata.isSymbolicLink() || !metadata.isFile()) {
      throw new Error(`일반 파일이 아닙니다: ${relativePath}`);
    }
    return new Uint8Array(await readFile(resolved));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function listAssetFiles(directory, prefix = 'assets') {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const relativePath = `${prefix}/${entry.name}`;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`asset directory의 symlink는 허용하지 않습니다: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      files.push(...(await listAssetFiles(absolutePath, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files.sort();
}

const server = await createServer({
  root: ROOT,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const factoryModule = await server.ssrLoadModule('/packages/test-book-factory/src/index.ts');
  const integrityModule = await server.ssrLoadModule('/packages/book-schema/src/assetIntegrity.ts');
  const digestModule = await server.ssrLoadModule('/packages/book-schema/src/canonicalDigest.ts');
  const registry = JSON.parse(
    await readFile(path.join(ROOT, 'content', 'fixture-registry.json'), 'utf8'),
  );
  const errors = [];
  let registeredAssetCount = 0;
  const seenSlugs = new Set();
  for (const createPack of factoryModule.fixtureBookPackFactories) {
    const pack = createPack();
    if (seenSlugs.has(pack.manifest.slug)) {
      errors.push(`fixture.slugDuplicate ${pack.manifest.slug}`);
      continue;
    }
    seenSlugs.add(pack.manifest.slug);
    const packRoot = path.join(CONTENT_ROOT, pack.manifest.slug);
    const fixture = registry.fixtures.find((candidate) => candidate.slug === pack.manifest.slug);
    if (!fixture) {
      errors.push(`fixture.registryMissing ${pack.manifest.slug}`);
      continue;
    }
    const issues = await integrityModule.inspectAssetIntegrity(pack, (relativePath) =>
      readRegisteredAsset(packRoot, relativePath),
    );
    const registeredPaths = new Set(
      pack.assets.flatMap((asset) => (asset.path === null ? [] : [asset.path])),
    );
    registeredAssetCount += registeredPaths.size;
    const unregisteredFiles = (await listAssetFiles(path.join(packRoot, 'assets'))).filter(
      (relativePath) => !registeredPaths.has(relativePath),
    );
    for (const validationIssue of issues) {
      errors.push(
        `${pack.manifest.slug} ${validationIssue.code} ${validationIssue.path}: ${validationIssue.message}`,
      );
    }
    for (const relativePath of unregisteredFiles) {
      errors.push(`${pack.manifest.slug} asset.unregisteredFile: ${relativePath}`);
    }
    const wholeFileManifest = JSON.parse(
      await readFile(path.join(packRoot, 'integrity.json'), 'utf8'),
    );
    if (wholeFileManifest.files.length !== fixture.expectedPayloadFileCount) {
      errors.push(
        `${pack.manifest.slug} packIntegrity.payloadCount: ${wholeFileManifest.files.length}/${fixture.expectedPayloadFileCount}`,
      );
    }
    for (const manifestIssue of inspectBookPackIntegritySync(packRoot, wholeFileManifest, {
      ignoredPaths: ['integrity.json', 'README.md'],
      expectedIdentity: {
        bookId: pack.manifest.id,
        packVersion: pack.manifest.packVersion,
        exposure: fixture.exposure,
        bookPackDigest: digestModule.createCanonicalSha256({
          ...pack,
          reviewRecords: pack.reviewRecords ?? [],
        }),
      },
    })) {
      errors.push(
        `${pack.manifest.slug} ${manifestIssue.code} ${manifestIssue.path}: ${manifestIssue.message}`,
      );
    }
  }
  for (const fixture of registry.fixtures.filter(
    (candidate) => candidate.exposure === 'review-candidate' || candidate.exposure === 'published',
  )) {
    const packRoot = path.join(ROOT, 'content', 'books', fixture.slug, 'compiled');
    const manifestBytes = await readFile(path.join(packRoot, 'integrity.json'));
    const wholeFileManifest = JSON.parse(manifestBytes.toString('utf8'));
    if (wholeFileManifest.files.length !== fixture.expectedPayloadFileCount) {
      errors.push(
        `${fixture.slug} packIntegrity.payloadCount: ${wholeFileManifest.files.length}/${fixture.expectedPayloadFileCount}`,
      );
    }
    for (const manifestIssue of inspectBookPackIntegritySync(packRoot, wholeFileManifest, {
      manifestBytes,
      expectedIdentity: { exposure: fixture.exposure },
    })) {
      errors.push(
        `${fixture.slug} ${manifestIssue.code} ${manifestIssue.path}: ${manifestIssue.message}`,
      );
    }
    seenSlugs.add(fixture.slug);
  }

  if (errors.length > 0) {
    console.error('BookPack 자산 무결성 검증 실패');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `BookPack 전체 파일 무결성 검증 통과: pack ${seenSlugs.size}개, 파일 자산 ${registeredAssetCount}개`,
    );
  }
} finally {
  await server.close();
}
