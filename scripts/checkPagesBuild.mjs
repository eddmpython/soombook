import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  inspectReleaseBookPackEvidence,
  inspectServiceWorkerPrecache,
} from './bookPackBuildContract.mjs';
import { inspectDocumentPolicy } from './publicReleaseEvidence.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUILD_ROOT = path.resolve(ROOT, '../soombook.out/build/reader-web');
const PUBLIC_BASE = '/soombook/';
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.svg', '.webmanifest']);
const LOCAL_PATH_PATTERN = new RegExp(
  ['[A-Za-z]:[\\\\/]Users[\\\\/]', ['One', 'Drive'].join('') + '[\\\\/]'].join('|'),
  'iu',
);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    const metadata = await lstat(target);
    if (metadata.isSymbolicLink()) {
      throw new Error(`Pages artifact에 symbolic link가 있습니다: ${target}`);
    }
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(target)));
    } else if (entry.isFile()) {
      files.push(target);
    }
  }
  return files;
}

async function pngDimensions(file) {
  const bytes = await readFile(file);
  const signature = bytes.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a' || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
    return null;
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function artifactContentDigest(files) {
  const records = [];
  for (const file of files) {
    const relativePath = path.relative(BUILD_ROOT, file).replaceAll('\\', '/');
    if (relativePath === 'release.json') continue;
    const digest = createHash('sha256')
      .update(await readFile(file))
      .digest('hex');
    records.push(`${relativePath}\0${digest}`);
  }
  records.sort();
  return createHash('sha256').update(records.join('\n')).digest('hex');
}

const errors = [];

try {
  const files = await collectFiles(BUILD_ROOT);
  const relativeFiles = files.map((file) => path.relative(BUILD_ROOT, file).replaceAll('\\', '/'));
  for (const required of [
    'index.html',
    'bookpack-binding.json',
    'bookpack-integrity.json',
    'manifest.webmanifest',
    'og.png',
    'release.json',
    'soombook-mark-192.png',
    'soombook-mark-512.png',
    'sw.js',
  ]) {
    if (!relativeFiles.includes(required)) {
      errors.push(`필수 Pages artifact 없음: ${required}`);
    }
  }
  for (const relativeFile of relativeFiles) {
    if (relativeFile.endsWith('.map')) {
      errors.push(`공개 sourcemap 금지: ${relativeFile}`);
    }
    if (!TEXT_EXTENSIONS.has(path.extname(relativeFile).toLowerCase())) {
      continue;
    }
    const text = await readFile(path.join(BUILD_ROOT, relativeFile), 'utf8');
    if (LOCAL_PATH_PATTERN.test(text)) {
      errors.push(`공개 artifact의 로컬 경로 금지: ${relativeFile}`);
    }
  }

  const index = await readFile(path.join(BUILD_ROOT, 'index.html'), 'utf8');
  const publicReleaseCopy = JSON.parse(
    await readFile(path.join(ROOT, 'content/public-release-copy.json'), 'utf8'),
  );
  if (/(?:href|src)=["']\/(?!soombook\/)/u.test(index)) {
    errors.push('index.html에 Pages base 밖의 root asset URL이 있습니다.');
  }
  errors.push(...inspectDocumentPolicy(index, publicReleaseCopy));
  if (/<script[^>]+src=["']https?:\/\//iu.test(index)) {
    errors.push('index.html에 외부 script가 있습니다.');
  }

  const manifest = JSON.parse(
    await readFile(path.join(BUILD_ROOT, 'manifest.webmanifest'), 'utf8'),
  );
  for (const field of ['id', 'start_url', 'scope']) {
    if (manifest[field] !== PUBLIC_BASE) {
      errors.push(`manifest ${field} 불일치: ${String(manifest[field])}`);
    }
  }
  if (
    !Array.isArray(manifest.icons) ||
    manifest.icons.length === 0 ||
    manifest.icons.some((icon) => !String(icon.src).startsWith(PUBLIC_BASE))
  ) {
    errors.push('manifest icon이 Pages base 안에 있지 않습니다.');
  }
  for (const [fileName, expectedSize] of [
    ['soombook-mark-192.png', 192],
    ['soombook-mark-512.png', 512],
  ]) {
    const dimensions = await pngDimensions(path.join(BUILD_ROOT, fileName));
    if (dimensions?.width !== expectedSize || dimensions.height !== expectedSize) {
      errors.push(`${fileName} 크기가 ${expectedSize}x${expectedSize}가 아닙니다.`);
    }
    const expectedSource = `${PUBLIC_BASE}${fileName}`;
    if (
      !manifest.icons.some(
        (icon) => icon.src === expectedSource && icon.sizes === `${expectedSize}x${expectedSize}`,
      )
    ) {
      errors.push(`manifest에 ${expectedSource} 설치 아이콘 계약이 없습니다.`);
    }
  }

  const serviceWorker = await readFile(path.join(BUILD_ROOT, 'sw.js'), 'utf8');
  const precacheEvidence = inspectServiceWorkerPrecache(serviceWorker);
  errors.push(...precacheEvidence.errors);
  if (!serviceWorker.includes('index.html')) {
    errors.push('service worker에 offline navigation fallback이 없습니다.');
  }
  const bookPackWorkers = relativeFiles.filter((file) =>
    /^assets\/bookPackWorker-[A-Za-z0-9_-]+\.js$/u.test(file),
  );
  if (bookPackWorkers.length !== 1) {
    errors.push(`BookPack worker artifact는 정확히 하나여야 합니다: ${bookPackWorkers.length}개`);
  } else {
    const workerFile = bookPackWorkers[0];
    const workerUrl = `${PUBLIC_BASE}${workerFile}`;
    const applicationScripts = relativeFiles.filter(
      (file) => file.endsWith('.js') && file !== workerFile && file !== 'sw.js',
    );
    const applicationReferencesWorker = (
      await Promise.all(
        applicationScripts.map(async (file) => readFile(path.join(BUILD_ROOT, file), 'utf8')),
      )
    ).some((source) => source.includes(workerUrl));
    if (!applicationReferencesWorker) {
      errors.push(
        `main application이 Pages base의 BookPack worker를 참조하지 않습니다: ${workerUrl}`,
      );
    }
    if (!precacheEvidence.urls.has(workerFile)) {
      errors.push(`service worker precache에 BookPack worker가 없습니다: ${workerFile}`);
    }
  }
  const releaseBytes = await readFile(path.join(BUILD_ROOT, 'release.json'));
  const release = JSON.parse(releaseBytes.toString('utf8'));
  const bookPackBinding = JSON.parse(
    await readFile(path.join(BUILD_ROOT, 'bookpack-binding.json'), 'utf8'),
  );
  const artifactBytes = new Map(
    await Promise.all(
      files.map(async (file) => [
        path.relative(BUILD_ROOT, file).replaceAll('\\', '/'),
        await readFile(file),
      ]),
    ),
  );
  errors.push(
    ...inspectReleaseBookPackEvidence({
      artifactBytes,
      binding: bookPackBinding,
      release,
      releaseBytes,
    }),
  );
  if (!/^[0-9a-f]{64}$/u.test(String(release.artifactContentSha256))) {
    errors.push('release.json에 artifact content SHA-256이 없습니다.');
  } else if (release.artifactContentSha256 !== (await artifactContentDigest(files))) {
    errors.push('release.json의 artifact digest가 실제 Pages 파일과 일치하지 않습니다.');
  }
  if (release.base !== PUBLIC_BASE || release.profile !== 'github-pages-preview') {
    errors.push('release.json의 base 또는 profile이 Pages 후보와 다릅니다.');
  }
  for (const field of ['bookPackDigest', 'packContentDigest']) {
    if (release[field] !== bookPackBinding[field])
      errors.push(`release.json의 ${field}가 BookPack binding과 다릅니다.`);
  }
  for (const field of ['bookPackIntegrityPath', 'bookPackBindingPath', 'bookPackWorkerPath']) {
    if (!relativeFiles.includes(String(release[field])))
      errors.push(`release.json의 ${field} 파일이 artifact에 없습니다.`);
  }
  for (const [pathField, digestField] of [
    ['bookPackIntegrityPath', 'bookPackIntegritySha256'],
    ['bookPackBindingPath', 'bookPackBindingSha256'],
    ['bookPackWorkerPath', 'bookPackWorkerSha256'],
  ]) {
    const targetPath = path.join(BUILD_ROOT, String(release[pathField]));
    const actual = createHash('sha256')
      .update(await readFile(targetPath))
      .digest('hex');
    if (release[digestField] !== `sha256-${actual}`)
      errors.push(`release.json의 ${digestField}가 artifact byte와 다릅니다.`);
  }
  if (!/^v\d+\.\d+\.\d+$/u.test(String(release.nodeVersion))) {
    errors.push('release.json에 정확한 Node 버전이 없습니다.');
  }
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
}

if (errors.length > 0) {
  console.error('Pages artifact 검증 실패');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log('Pages artifact 검증 통과: base, PWA, worker precache, meta policy, source hygiene');
}
