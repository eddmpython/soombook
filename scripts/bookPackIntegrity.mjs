import { isUtf8 } from 'node:buffer';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { detectMediaType } from './binaryPolicy.mjs';

export const BOOK_PACK_INTEGRITY_FORMAT_VERSION = 2;
export const BOOK_PACK_INTEGRITY_FILE = 'integrity.json';
export const BOOK_PACK_INTEGRITY_AUTHORITY = 'book-pack-whole-file-integrity';

const SHA256_PATTERN = /^sha256-[0-9a-f]{64}$/u;
const MANIFEST_FIELDS = new Set([
  'schemaVersion',
  'authority',
  'bookId',
  'packVersion',
  'exposure',
  'bookPackDigest',
  'files',
  'packContentDigest',
]);
const FILE_ENTRY_FIELDS = new Set(['path', 'byteLength', 'mediaType', 'sha256']);
const MEDIA_TYPE_BY_EXTENSION = new Map([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.json', 'application/json'],
  ['.m4a', 'audio/mp4'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.tif', 'image/tiff'],
  ['.tiff', 'image/tiff'],
  ['.wav', 'audio/wav'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(',')}}`;
}

export function createCanonicalValueDigest(value) {
  return sha256(Buffer.from(canonicalJson(value), 'utf8'));
}

function serializedJson(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function createBookPackPayloadFiles(pack, assetBytesByPath = new Map()) {
  const files = new Map([
    ['manifest.json', serializedJson(pack.manifest)],
    ['book.json', serializedJson(pack.book)],
    ...pack.scenes.map((scene) => [`scenes/${scene.id}.json`, serializedJson(scene)]),
    ['interactions.json', serializedJson(pack.interactions)],
    ['reasoningPrompts.json', serializedJson(pack.reasoningPrompts)],
    ['connectionCards.json', serializedJson(pack.connectionCards)],
    ['ledgers/rights.json', serializedJson(pack.rights)],
    ['ledgers/claims.json', serializedJson(pack.claims)],
    ['ledgers/assets.json', serializedJson(pack.assets)],
    ['audioTracks.json', serializedJson(pack.audioTracks)],
    ['ledgers/reviews.json', serializedJson(pack.reviewRecords ?? [])],
  ]);
  for (const asset of pack.assets) {
    if (asset.path === null) continue;
    const bytes = assetBytesByPath.get(asset.path);
    if (!bytes) throw new Error(`BookPack 자산 byte가 없습니다: ${asset.path}`);
    files.set(asset.path, Buffer.from(bytes));
  }
  return files;
}

export function assembleBookPackFromFileMap(files) {
  const parse = (relativePath) => {
    const bytes = files.get(relativePath);
    if (!bytes) throw new Error(`BookPack payload 파일이 없습니다: ${relativePath}`);
    return JSON.parse(Buffer.from(bytes).toString('utf8'));
  };
  const manifest = parse('manifest.json');
  if (!Array.isArray(manifest.sceneOrder))
    throw new Error('BookPack manifest.sceneOrder가 배열이 아닙니다.');
  const sceneFiles = [...files.keys()]
    .filter((relativePath) => /^scenes\/[^/]+\.json$/u.test(relativePath))
    .map((relativePath) => [relativePath, parse(relativePath)]);
  const scenePathById = new Map(
    sceneFiles.map(([relativePath, scene]) => [scene.id, relativePath]),
  );
  const scenes = manifest.sceneOrder.map((sceneId) => {
    const relativePath = scenePathById.get(sceneId);
    if (!relativePath) throw new Error(`BookPack 장면 파일이 없습니다: ${sceneId}`);
    return parse(relativePath);
  });
  return {
    manifest,
    book: parse('book.json'),
    scenes,
    interactions: parse('interactions.json'),
    reasoningPrompts: parse('reasoningPrompts.json'),
    connectionCards: parse('connectionCards.json'),
    rights: parse('ledgers/rights.json'),
    claims: parse('ledgers/claims.json'),
    assets: parse('ledgers/assets.json'),
    audioTracks: parse('audioTracks.json'),
    reviewRecords: parse('ledgers/reviews.json'),
  };
}

function comparePaths(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function isSafePackFilePath(relativePath) {
  const hasControlCharacter =
    typeof relativePath === 'string' &&
    [...relativePath].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f);
    });
  if (
    typeof relativePath !== 'string' ||
    relativePath.length === 0 ||
    relativePath !== relativePath.normalize('NFC') ||
    relativePath.includes('\\') ||
    hasControlCharacter ||
    relativePath.startsWith('/') ||
    /^[a-z][a-z0-9+.-]*:/iu.test(relativePath)
  ) {
    return false;
  }
  const segments = relativePath.split('/');
  return segments.every(
    (segment) =>
      segment.length > 0 && segment !== '.' && segment !== '..' && !/[ .]$/u.test(segment),
  );
}

function mediaTypeForBytes(relativePath, bytes) {
  const expectedMediaType = MEDIA_TYPE_BY_EXTENSION.get(
    path.posix.extname(relativePath).toLowerCase(),
  );
  if (!expectedMediaType)
    throw new Error(`허용하지 않는 BookPack 파일 형식입니다: ${relativePath}`);
  const detectedMediaType = detectMediaType(bytes);
  if (expectedMediaType === 'application/json') {
    if (detectedMediaType !== null)
      throw new Error(`JSON 확장자에 media byte가 들어 있습니다: ${relativePath}`);
    if (!isUtf8(bytes)) throw new Error(`BookPack JSON이 UTF-8이 아닙니다: ${relativePath}`);
    try {
      JSON.parse(Buffer.from(bytes).toString('utf8'));
    } catch {
      throw new Error(`BookPack JSON을 해석할 수 없습니다: ${relativePath}`);
    }
    return expectedMediaType;
  }
  if (detectedMediaType !== expectedMediaType) {
    throw new Error(
      `BookPack 파일 media type이 확장자와 다릅니다: ${relativePath} (${detectedMediaType ?? 'unknown'})`,
    );
  }
  return expectedMediaType;
}

export function createBookPackFileEntry(relativePath, inputBytes) {
  if (!isSafePackFilePath(relativePath) || relativePath === BOOK_PACK_INTEGRITY_FILE)
    throw new Error(`안전하지 않은 BookPack 파일 경로입니다: ${relativePath}`);
  const bytes = Buffer.from(inputBytes);
  return {
    path: relativePath,
    byteLength: bytes.byteLength,
    mediaType: mediaTypeForBytes(relativePath, bytes),
    sha256: sha256(bytes),
  };
}

export function createBookPackManifestDigest(manifestWithoutDigest) {
  return sha256(Buffer.from(canonicalJson(manifestWithoutDigest), 'utf8'));
}

export function createBookPackIntegrityManifest({
  bookId,
  packVersion,
  exposure,
  bookPackDigest,
  files,
}) {
  if (typeof bookId !== 'string' || bookId.length === 0)
    throw new Error('BookPack integrity bookId가 없습니다.');
  if (typeof packVersion !== 'string' || packVersion.length === 0)
    throw new Error('BookPack integrity packVersion이 없습니다.');
  if (!['public-demo', 'internal-validation', 'review-candidate', 'published'].includes(exposure))
    throw new Error('BookPack integrity exposure가 유효하지 않습니다.');
  if (typeof bookPackDigest !== 'string' || !SHA256_PATTERN.test(bookPackDigest))
    throw new Error('BookPack semantic digest가 유효하지 않습니다.');
  const seenPaths = new Set();
  const seenCaseFoldedPaths = new Set();
  const entries = files.map(({ path: relativePath, bytes }) => {
    if (seenPaths.has(relativePath))
      throw new Error(`중복 BookPack 파일 경로입니다: ${relativePath}`);
    const caseFoldedPath = relativePath.toLocaleLowerCase('en-US');
    if (seenCaseFoldedPaths.has(caseFoldedPath))
      throw new Error(`대소문자만 다른 BookPack 파일 경로입니다: ${relativePath}`);
    seenPaths.add(relativePath);
    seenCaseFoldedPaths.add(caseFoldedPath);
    return createBookPackFileEntry(relativePath, bytes);
  });
  entries.sort((left, right) => comparePaths(left.path, right.path));
  const unsigned = {
    schemaVersion: BOOK_PACK_INTEGRITY_FORMAT_VERSION,
    authority: BOOK_PACK_INTEGRITY_AUTHORITY,
    bookId,
    packVersion,
    exposure,
    bookPackDigest,
    files: entries,
  };
  return { ...unsigned, packContentDigest: createBookPackManifestDigest(unsigned) };
}

function issue(code, issuePath, message) {
  return { code, path: issuePath, message };
}

export function validateBookPackIntegrityManifest(value) {
  const issues = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [issue('packIntegrity.invalid', '/', 'BookPack integrity manifest가 객체가 아닙니다.')];
  }
  for (const field of Object.keys(value)) {
    if (!MANIFEST_FIELDS.has(field))
      issues.push(issue('packIntegrity.unexpectedField', `/${field}`, '허용하지 않는 필드입니다.'));
  }
  if (value.schemaVersion !== BOOK_PACK_INTEGRITY_FORMAT_VERSION)
    issues.push(
      issue('packIntegrity.schemaVersion', '/schemaVersion', '지원하지 않는 형식입니다.'),
    );
  if (value.authority !== BOOK_PACK_INTEGRITY_AUTHORITY)
    issues.push(issue('packIntegrity.authority', '/authority', 'authority가 다릅니다.'));
  if (typeof value.bookId !== 'string' || value.bookId.length === 0)
    issues.push(issue('packIntegrity.bookId', '/bookId', 'bookId가 없습니다.'));
  if (typeof value.packVersion !== 'string' || value.packVersion.length === 0)
    issues.push(issue('packIntegrity.packVersion', '/packVersion', 'packVersion이 없습니다.'));
  if (
    !['public-demo', 'internal-validation', 'review-candidate', 'published'].includes(
      value.exposure,
    )
  )
    issues.push(issue('packIntegrity.exposure', '/exposure', 'exposure가 유효하지 않습니다.'));
  if (typeof value.bookPackDigest !== 'string' || !SHA256_PATTERN.test(value.bookPackDigest))
    issues.push(
      issue(
        'packIntegrity.bookPackDigest',
        '/bookPackDigest',
        'semantic digest가 유효하지 않습니다.',
      ),
    );
  if (!Array.isArray(value.files)) {
    issues.push(issue('packIntegrity.files', '/files', 'files가 배열이 아닙니다.'));
    return issues;
  }

  const seenPaths = new Set();
  const seenCaseFoldedPaths = new Set();
  let previousPath = null;
  for (const [index, entry] of value.files.entries()) {
    const entryPath = `/files/${index}`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      issues.push(issue('packIntegrity.fileEntry', entryPath, '파일 항목이 객체가 아닙니다.'));
      continue;
    }
    for (const field of Object.keys(entry)) {
      if (!FILE_ENTRY_FIELDS.has(field))
        issues.push(
          issue(
            'packIntegrity.unexpectedField',
            `${entryPath}/${field}`,
            '허용하지 않는 파일 필드입니다.',
          ),
        );
    }
    if (!isSafePackFilePath(entry.path) || entry.path === BOOK_PACK_INTEGRITY_FILE) {
      issues.push(
        issue('packIntegrity.pathUnsafe', `${entryPath}/path`, '안전하지 않은 경로입니다.'),
      );
      continue;
    }
    if (seenPaths.has(entry.path))
      issues.push(issue('packIntegrity.pathDuplicate', `${entryPath}/path`, '중복 경로입니다.'));
    seenPaths.add(entry.path);
    const caseFoldedPath = entry.path.toLocaleLowerCase('en-US');
    if (seenCaseFoldedPaths.has(caseFoldedPath))
      issues.push(
        issue(
          'packIntegrity.pathCaseCollision',
          `${entryPath}/path`,
          '대소문자만 다른 경로가 중복됩니다.',
        ),
      );
    seenCaseFoldedPaths.add(caseFoldedPath);
    if (previousPath !== null && comparePaths(previousPath, entry.path) >= 0)
      issues.push(
        issue(
          'packIntegrity.fileOrder',
          `${entryPath}/path`,
          '파일 순서가 canonical하지 않습니다.',
        ),
      );
    previousPath = entry.path;
    if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0)
      issues.push(
        issue(
          'packIntegrity.byteLength',
          `${entryPath}/byteLength`,
          'byteLength가 유효하지 않습니다.',
        ),
      );
    const expectedMediaType = MEDIA_TYPE_BY_EXTENSION.get(
      path.posix.extname(entry.path).toLowerCase(),
    );
    if (!expectedMediaType || entry.mediaType !== expectedMediaType)
      issues.push(
        issue('packIntegrity.mediaType', `${entryPath}/mediaType`, 'mediaType이 경로와 다릅니다.'),
      );
    if (typeof entry.sha256 !== 'string' || !SHA256_PATTERN.test(entry.sha256))
      issues.push(issue('packIntegrity.sha256', `${entryPath}/sha256`, 'SHA-256 형식이 아닙니다.'));
  }

  const unsigned = {
    schemaVersion: value.schemaVersion,
    authority: value.authority,
    bookId: value.bookId,
    packVersion: value.packVersion,
    exposure: value.exposure,
    bookPackDigest: value.bookPackDigest,
    files: value.files,
  };
  const expectedDigest = createBookPackManifestDigest(unsigned);
  if (value.packContentDigest !== expectedDigest)
    issues.push(
      issue(
        'packIntegrity.packContentDigest',
        '/packContentDigest',
        'canonical digest가 다릅니다.',
      ),
    );
  return issues;
}

function collectFiles(root, directory, issues, foundFiles) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.relative(root, absolutePath).replaceAll('\\', '/');
    const metadata = lstatSync(absolutePath);
    if (metadata.isSymbolicLink()) {
      issues.push(
        issue('packIntegrity.symlink', relativePath, 'BookPack 안의 symbolic link는 금지합니다.'),
      );
    } else if (metadata.isDirectory()) {
      collectFiles(root, absolutePath, issues, foundFiles);
    } else if (metadata.isFile()) {
      foundFiles.add(relativePath);
    } else {
      issues.push(issue('packIntegrity.notRegularFile', relativePath, '일반 파일이 아닙니다.'));
    }
  }
}

function inspectAndCaptureBookPackIntegritySync(root, manifest, options = {}) {
  const issues = [...validateBookPackIntegrityManifest(manifest)];
  const capturedFiles = new Map();
  if (options.manifestBytes) {
    const expectedManifestBytes = Buffer.from(serializeBookPackIntegrityManifest(manifest), 'utf8');
    if (!Buffer.from(options.manifestBytes).equals(expectedManifestBytes)) {
      issues.push(
        issue(
          'packIntegrity.serializationDrift',
          `/${BOOK_PACK_INTEGRITY_FILE}`,
          'integrity manifest byte가 canonical serialization과 다릅니다.',
        ),
      );
    }
  }
  if (issues.length > 0) return { issues, files: capturedFiles };
  for (const [field, expected] of Object.entries(options.expectedIdentity ?? {})) {
    if (manifest[field] !== expected) {
      issues.push(
        issue(
          'packIntegrity.identityMismatch',
          `/${field}`,
          `${field}가 검증 대상 BookPack과 다릅니다.`,
        ),
      );
    }
  }
  const ignoredPaths = new Set(options.ignoredPaths ?? [BOOK_PACK_INTEGRITY_FILE]);
  const foundFiles = new Set();
  collectFiles(root, root, issues, foundFiles);
  const expectedPaths = new Set(manifest.files.map((entry) => entry.path));

  for (const relativePath of foundFiles) {
    if (!ignoredPaths.has(relativePath) && !expectedPaths.has(relativePath))
      issues.push(
        issue('packIntegrity.unregisteredFile', relativePath, 'manifest 밖의 파일입니다.'),
      );
  }
  for (const entry of manifest.files) {
    if (!foundFiles.has(entry.path)) {
      issues.push(issue('packIntegrity.fileMissing', entry.path, 'manifest의 파일이 없습니다.'));
      continue;
    }
    let actual;
    try {
      const bytes = readFileSync(path.join(root, entry.path));
      capturedFiles.set(entry.path, bytes);
      actual = createBookPackFileEntry(entry.path, bytes);
    } catch (error) {
      issues.push(
        issue(
          'packIntegrity.fileInvalid',
          entry.path,
          error instanceof Error ? error.message : String(error),
        ),
      );
      continue;
    }
    if (actual.byteLength !== entry.byteLength)
      issues.push(
        issue('packIntegrity.byteLengthMismatch', entry.path, '파일 byteLength가 다릅니다.'),
      );
    if (actual.mediaType !== entry.mediaType)
      issues.push(
        issue('packIntegrity.mediaTypeMismatch', entry.path, '파일 mediaType이 다릅니다.'),
      );
    if (actual.sha256 !== entry.sha256)
      issues.push(issue('packIntegrity.hashMismatch', entry.path, '파일 SHA-256이 다릅니다.'));
  }
  return { issues, files: capturedFiles };
}

export function inspectBookPackIntegritySync(root, manifest, options = {}) {
  return inspectAndCaptureBookPackIntegritySync(root, manifest, options).issues;
}

export function readVerifiedBookPackFilesSync(root, manifest, options = {}) {
  const result = inspectAndCaptureBookPackIntegritySync(root, manifest, options);
  if (result.issues.length > 0) {
    throw new Error(
      `BookPack 전체 파일 무결성 검증 실패\n${result.issues
        .map((entry) => `${entry.code} ${entry.path}: ${entry.message}`)
        .join('\n')}`,
    );
  }
  return result.files;
}

export function assertBookPackIntegritySync(root, manifest, options = {}) {
  const issues = inspectBookPackIntegritySync(root, manifest, options);
  if (issues.length === 0) return;
  throw new Error(
    `BookPack 전체 파일 무결성 검증 실패\n${issues
      .map((entry) => `${entry.code} ${entry.path}: ${entry.message}`)
      .join('\n')}`,
  );
}

export function serializeBookPackIntegrityManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
