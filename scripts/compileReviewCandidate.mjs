import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { format } from 'prettier';
import { createServer } from 'vite';

import {
  assertBookPackIntegritySync,
  createBookPackIntegrityManifest,
  serializeBookPackIntegrityManifest,
} from './bookPackIntegrity.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BOOK_ROOT = path.join(ROOT, 'content', 'books', 'tiger-full-review');
const SOURCE_PATH = path.join(BOOK_ROOT, 'source', 'book-source.json');
const COMPILED_ROOT = path.join(BOOK_ROOT, 'compiled');
const RECEIPT_PATH = path.resolve(ROOT, '../soombook.out/review-candidate/compile-receipt.json');

function serialized(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function formattedJson(value) {
  return format(JSON.stringify(value), { parser: 'json', printWidth: 100 });
}

async function compiledFiles(pack, bookPackDigest) {
  const files = new Map([
    ['manifest.json', await formattedJson(pack.manifest)],
    ['book.json', await formattedJson(pack.book)],
    ...(await Promise.all(
      pack.scenes.map(async (scene) => [`scenes/${scene.id}.json`, await formattedJson(scene)]),
    )),
    ['interactions.json', await formattedJson(pack.interactions)],
    ['reasoningPrompts.json', await formattedJson(pack.reasoningPrompts)],
    ['connectionCards.json', await formattedJson(pack.connectionCards)],
    ['ledgers/rights.json', await formattedJson(pack.rights)],
    ['ledgers/claims.json', await formattedJson(pack.claims)],
    ['ledgers/assets.json', await formattedJson(pack.assets)],
    ['audioTracks.json', await formattedJson(pack.audioTracks)],
    ['ledgers/reviews.json', await formattedJson(pack.reviewRecords ?? [])],
  ]);
  const payloadFiles = [...files].map(([relativePath, content]) => ({
    path: relativePath,
    bytes: Buffer.from(content, 'utf8'),
  }));
  for (const asset of pack.assets) {
    if (asset.path === null) continue;
    payloadFiles.push({
      path: asset.path,
      bytes: await readFile(path.join(COMPILED_ROOT, asset.path)),
    });
  }
  const integrityManifest = createBookPackIntegrityManifest({
    bookId: pack.manifest.id,
    packVersion: pack.manifest.packVersion,
    exposure: 'review-candidate',
    bookPackDigest,
    files: payloadFiles,
  });
  files.set('integrity.json', serializeBookPackIntegrityManifest(integrityManifest));
  return { files, integrityManifest };
}

async function listJsonFiles(directory, prefix = '') {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(path.join(directory, entry.name), relativePath)));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(relativePath);
    }
  }
  return files;
}

async function writeCompiled(files) {
  for (const [relativePath, content] of files) {
    const target = path.join(COMPILED_ROOT, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }
}

async function checkCompiled(files) {
  const errors = [];
  for (const [relativePath, expected] of files) {
    try {
      const actual = await readFile(path.join(COMPILED_ROOT, relativePath), 'utf8');
      if (actual !== expected) errors.push(`compiled drift: ${relativePath}`);
    } catch {
      errors.push(`compiled 파일 없음: ${relativePath}`);
    }
  }
  for (const relativePath of await listJsonFiles(COMPILED_ROOT)) {
    if (!files.has(relativePath)) errors.push(`compiler 밖 JSON: ${relativePath}`);
  }
  if (errors.length > 0) {
    throw new Error(`review candidate compile 검증 실패\n${errors.join('\n')}`);
  }
}

const startedAt = new Date().toISOString();
const sourceBytes = await readFile(SOURCE_PATH);
const sourceSha256 = `sha256-${createHash('sha256').update(sourceBytes).digest('hex')}`;
const source = JSON.parse(sourceBytes.toString('utf8'));
const server = await createServer({
  root: ROOT,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const authoring = await server.ssrLoadModule('/packages/book-authoring/src/compileReviewBook.ts');
  const schema = await server.ssrLoadModule('/packages/book-schema/src/canonicalDigest.ts');
  const pack = authoring.compileReviewBook(source, sourceSha256);
  const bookPackDigest = schema.createCanonicalSha256(pack);
  const { files, integrityManifest } = await compiledFiles(pack, bookPackDigest);
  if (process.argv[2] === '--write') await writeCompiled(files);
  else if (process.argv[2] === '--check') await checkCompiled(files);
  else throw new Error('사용법: compileReviewCandidate.mjs --write 또는 --check');
  assertBookPackIntegritySync(COMPILED_ROOT, integrityManifest, {
    expectedIdentity: {
      bookId: pack.manifest.id,
      packVersion: pack.manifest.packVersion,
      exposure: 'review-candidate',
      bookPackDigest,
    },
  });

  const receipt = {
    schemaVersion: 1,
    authority: 'automated-review-candidate-build-not-publication-approval',
    startedAt,
    finishedAt: new Date().toISOString(),
    sourcePath: 'content/books/tiger-full-review/source/book-source.json',
    sourceSha256,
    bookId: pack.manifest.id,
    packVersion: pack.manifest.packVersion,
    bookPackDigest,
    packContentDigest: integrityManifest.packContentDigest,
    sceneCount: pack.scenes.length,
    compiledSceneIds: [...pack.manifest.sceneOrder],
    interactionCount: pack.interactions.length,
    reasoningCount: pack.reasoningPrompts.length,
    connectionCount: pack.connectionCards.length,
    reviewRecordCount: pack.reviewRecords?.length ?? 0,
    pendingReviewCount:
      pack.reviewRecords?.filter((record) => record.status === 'pending').length ?? 0,
    compiledJsonFileCount: files.size,
    manualCompiledJsonEditCount: 0,
    validatorDetectedIssueCount: 0,
    publicArtifactIncluded: false,
    educationalEffectMeasured: false,
    childOutcomeMeasured: false,
  };
  await mkdir(path.dirname(RECEIPT_PATH), { recursive: true });
  await writeFile(RECEIPT_PATH, serialized(receipt), 'utf8');
  console.log(
    `review candidate ${process.argv[2] === '--write' ? 'compile' : '검증'} 통과: ${pack.scenes.length}장면, pending review ${receipt.pendingReviewCount}개`,
  );
} finally {
  await server.close();
}
