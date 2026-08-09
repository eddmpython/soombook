import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { createServer } from 'vite';

import {
  createBookPackIntegrityManifest,
  serializeBookPackIntegrityManifest,
} from './bookPackIntegrity.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_ROOT = path.join(ROOT, 'content', 'fixtures');

function serialized(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function expectedFiles() {
  const server = await createServer({
    root: ROOT,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  try {
    const module = await server.ssrLoadModule('/packages/test-book-factory/src/index.ts');
    const schema = await server.ssrLoadModule('/packages/book-schema/src/canonicalDigest.ts');
    const registry = JSON.parse(
      await readFile(path.join(ROOT, 'content', 'fixture-registry.json'), 'utf8'),
    );
    const files = new Map();
    for (const createPack of module.fixtureBookPackFactories) {
      const pack = createPack();
      const serializedPack = { ...pack, reviewRecords: pack.reviewRecords ?? [] };
      const prefix = pack.manifest.slug;
      const fixture = registry.fixtures.find((candidate) => candidate.slug === prefix);
      if (!fixture) throw new Error(`fixture registry에 없는 pack입니다: ${prefix}`);
      const packFiles = new Map(
        [
          ['manifest.json', pack.manifest],
          ['book.json', pack.book],
          ...pack.scenes.map((scene) => [`scenes/${scene.id}.json`, scene]),
          ['interactions.json', pack.interactions],
          ['reasoningPrompts.json', pack.reasoningPrompts],
          ['connectionCards.json', pack.connectionCards],
          ['ledgers/rights.json', pack.rights],
          ['ledgers/claims.json', pack.claims],
          ['ledgers/assets.json', pack.assets],
          ['audioTracks.json', pack.audioTracks],
          ['ledgers/reviews.json', pack.reviewRecords ?? []],
        ].map(([relativePath, value]) => [relativePath, serialized(value)]),
      );
      const payloadFiles = [...packFiles].map(([relativePath, content]) => ({
        path: relativePath,
        bytes: Buffer.from(content, 'utf8'),
      }));
      for (const asset of pack.assets) {
        if (asset.path === null) continue;
        payloadFiles.push({
          path: asset.path,
          bytes: await readFile(path.join(CONTENT_ROOT, prefix, asset.path)),
        });
      }
      const integrityManifest = createBookPackIntegrityManifest({
        bookId: pack.manifest.id,
        packVersion: pack.manifest.packVersion,
        exposure: fixture.exposure,
        bookPackDigest: schema.createCanonicalSha256(serializedPack),
        files: payloadFiles,
      });
      packFiles.set('integrity.json', serializeBookPackIntegrityManifest(integrityManifest));
      for (const [relativePath, content] of packFiles) {
        files.set(`${prefix}/${relativePath}`, content);
      }
    }
    return files;
  } finally {
    await server.close();
  }
}

async function writeContent(files) {
  for (const [relativePath, content] of files) {
    const absolutePath = path.join(CONTENT_ROOT, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');
  }
  console.log(`fixture content 동기화 완료: ${files.size}개 JSON`);
}

async function listJsonFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
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

async function checkContent(files) {
  const errors = [];
  for (const [relativePath, expected] of files) {
    try {
      const actual = await readFile(path.join(CONTENT_ROOT, relativePath), 'utf8');
      if (actual !== expected) {
        errors.push(`내용 drift: ${relativePath}`);
      }
    } catch {
      errors.push(`파일 없음: ${relativePath}`);
    }
  }
  for (const relativePath of await listJsonFiles(CONTENT_ROOT)) {
    if (!files.has(relativePath)) {
      errors.push(`registry 밖 JSON: ${relativePath}`);
    }
  }
  if (errors.length > 0) {
    console.error('demo content 검증 실패');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    console.error('수정 의도와 일치하면 npm run content:sync를 실행합니다.');
    process.exitCode = 1;
    return;
  }
  console.log(`fixture content 검증 통과: ${files.size}개 JSON`);
}

const mode = process.argv[2];
const files = await expectedFiles();
if (mode === '--write') {
  await writeContent(files);
} else if (mode === '--check') {
  await checkContent(files);
} else {
  console.error('사용법: node scripts/demoContent.mjs --write 또는 --check');
  process.exitCode = 1;
}
