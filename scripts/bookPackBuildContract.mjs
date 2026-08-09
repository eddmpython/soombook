import { isUtf8 } from 'node:buffer';
import { createHash } from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';
import { TextDecoder, TextEncoder } from 'node:util';

import { detectMediaType } from './binaryPolicy.mjs';
import {
  createCanonicalValueDigest,
  serializeBookPackIntegrityManifest,
  validateBookPackIntegrityManifest,
} from './bookPackIntegrity.mjs';

const BUILD_BINDING_FIELDS = new Set([
  'schemaVersion',
  'authority',
  'buildProfile',
  'exposure',
  'slug',
  'bookId',
  'packVersion',
  'bookPackDigest',
  'packContentDigest',
  'payloadFileCount',
]);
const RELEASE_FIELDS = new Set([
  'base',
  'commit',
  'artifactContentSha256',
  'nodeVersion',
  'bookId',
  'packVersion',
  'bookPackDigest',
  'packContentDigest',
  'bookPackIntegrityPath',
  'bookPackIntegritySha256',
  'bookPackBindingPath',
  'bookPackBindingSha256',
  'bookPackWorkerPath',
  'bookPackWorkerSha256',
  'profile',
]);

function sha256(bytes) {
  return `sha256-${createHash('sha256').update(bytes).digest('hex')}`;
}

function exactFields(value, allowed) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === allowed.size &&
    Object.keys(value).every((field) => allowed.has(field))
  );
}

export function expectedExposureForBuildProfile(buildProfile) {
  if (buildProfile === 'reader-web' || /^pwa-update-v[0-9]+$/u.test(buildProfile))
    return 'public-demo';
  if (buildProfile === 'audio-fixture') return 'internal-validation';
  if (buildProfile === 'review-candidate') return 'review-candidate';
  if (buildProfile === 'published-reader') return 'published';
  throw new Error(`등록되지 않은 BookPack build profile입니다: ${buildProfile}`);
}

export function expectedBookPackBuildBinding({ buildProfile, fixture, integrity }) {
  if (expectedExposureForBuildProfile(buildProfile) !== fixture.exposure)
    throw new Error(`build profile과 BookPack exposure가 다릅니다: ${buildProfile}`);
  return {
    schemaVersion: 1,
    authority: 'book-pack-build-binding-not-publication-approval',
    buildProfile,
    exposure: fixture.exposure,
    slug: fixture.slug,
    bookId: integrity.bookId,
    packVersion: integrity.packVersion,
    bookPackDigest: integrity.bookPackDigest,
    packContentDigest: integrity.packContentDigest,
    payloadFileCount: integrity.files.length,
  };
}

export function serializeBookPackBuildBinding(binding) {
  return `${JSON.stringify(binding, null, 2)}\n`;
}

export function serializePagesRelease(release) {
  return `${JSON.stringify(release, null, 2)}\n`;
}

function codeMarkerOffsets(source, marker) {
  const offsets = [];
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === '\n' || character === '\r') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (source.startsWith(marker, index)) {
      offsets.push(index);
      index += marker.length - 1;
    }
  }
  return offsets;
}

export function inspectServiceWorkerPrecache(swText) {
  const errors = [];
  const marker = '.precacheAndRoute(';
  const callOffsets = codeMarkerOffsets(swText, marker);
  if (callOffsets.length !== 1) return { errors: ['build.precacheCallCount'], urls: new Set() };
  let arrayStart = callOffsets[0] + marker.length;
  while (/\s/u.test(swText[arrayStart] ?? '')) arrayStart += 1;
  if (swText[arrayStart] !== '[')
    return { errors: ['build.precacheArrayMissing'], urls: new Set() };
  let depth = 0;
  let quote = null;
  let escaped = false;
  let arrayEnd = -1;
  for (let index = arrayStart; index < swText.length; index += 1) {
    const character = swText[index];
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '[') depth += 1;
    else if (character === ']') {
      depth -= 1;
      if (depth === 0) {
        arrayEnd = index;
        break;
      }
    }
  }
  if (arrayEnd < 0) return { errors: ['build.precacheArrayUnclosed'], urls: new Set() };
  const arrayText = swText.slice(arrayStart, arrayEnd + 1);
  const urls = new Set();
  let afterArray = arrayEnd + 1;
  while (/\s/u.test(swText[afterArray] ?? '')) afterArray += 1;
  if (swText[afterArray] !== ',' && swText[afterArray] !== ')')
    return { errors: ['build.precacheFirstArgumentInvalid'], urls };
  const entryPattern =
    /\{\s*(?:"url"|url)\s*:\s*("(?:\\.|[^"\\])*")\s*,\s*(?:"revision"|revision)\s*:\s*(?:null|"(?:\\.|[^"\\])*")\s*\}/uy;
  let cursor = 1;
  let parsedEntryCount = 0;
  while (cursor < arrayText.length - 1) {
    while (/\s/u.test(arrayText[cursor] ?? '')) cursor += 1;
    if (arrayText[cursor] === ']') break;
    entryPattern.lastIndex = cursor;
    const match = entryPattern.exec(arrayText);
    if (!match) {
      errors.push('build.precacheEntryInvalid');
      break;
    }
    try {
      urls.add(JSON.parse(match[1]));
    } catch {
      errors.push('build.precacheEntryInvalid');
      break;
    }
    parsedEntryCount += 1;
    cursor = entryPattern.lastIndex;
    while (/\s/u.test(arrayText[cursor] ?? '')) cursor += 1;
    if (arrayText[cursor] === ',') cursor += 1;
    else if (arrayText[cursor] !== ']') {
      errors.push('build.precacheEntryInvalid');
      break;
    }
  }
  while (/\s/u.test(arrayText[cursor] ?? '')) cursor += 1;
  if (arrayText[cursor] !== ']') errors.push('build.precacheEntryInvalid');
  if (parsedEntryCount === 0) errors.push('build.precacheEmpty');
  return { errors, urls };
}

function executeBookPackWorker(workerText) {
  let postedMessage = null;
  const sandbox = {
    ArrayBuffer,
    DataView,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    URL,
    console,
    crypto: globalThis.crypto,
    location: new URL('https://example.test/assets/bookPackWorker.js'),
    navigator: Object.freeze({ language: 'ko-KR', onLine: true }),
    postMessage(message) {
      if (postedMessage !== null) throw new Error('worker가 두 번 이상 message를 게시했습니다.');
      postedMessage = structuredClone(message);
    },
    structuredClone,
  };
  sandbox.self = sandbox;
  try {
    new vm.Script(workerText, { filename: 'bookPackWorker.js' }).runInNewContext(sandbox, {
      timeout: 250,
      microtaskMode: 'afterEvaluate',
      contextCodeGeneration: { strings: false, wasm: false },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), message: null };
  }
  return { error: null, message: postedMessage };
}

export function inspectBookPackBuildEvidence({
  artifactBytes,
  binding,
  buildProfile,
  expectedPack,
  fixture,
  integrity,
  publicBase,
  precacheUrls,
  allowedMediaSha256s = new Set(),
}) {
  const errors = [];
  if (
    typeof publicBase !== 'string' ||
    !publicBase.startsWith('/') ||
    publicBase.startsWith('//') ||
    !publicBase.endsWith('/')
  ) {
    errors.push('build.publicBaseInvalid');
  }
  let expectedBinding;
  try {
    expectedBinding = expectedBookPackBuildBinding({ buildProfile, fixture, integrity });
  } catch {
    errors.push('build.profileExposureMismatch');
    return { errors, emittedPackAssets: [], workerPath: null, workerSha256: null };
  }
  if (!exactFields(binding, BUILD_BINDING_FIELDS)) errors.push('build.bindingSchema');
  if (JSON.stringify(binding) !== JSON.stringify(expectedBinding))
    errors.push('build.bindingMismatch');

  const emittedIntegrity = artifactBytes.get('bookpack-integrity.json');
  if (
    !emittedIntegrity ||
    !Buffer.from(emittedIntegrity).equals(
      Buffer.from(serializeBookPackIntegrityManifest(integrity), 'utf8'),
    )
  ) {
    errors.push('build.integrityMismatch');
  }
  const emittedBinding = artifactBytes.get('bookpack-binding.json');
  if (!emittedBinding) errors.push('build.bindingMissing');
  else if (
    !Buffer.from(emittedBinding).equals(
      Buffer.from(serializeBookPackBuildBinding(expectedBinding), 'utf8'),
    )
  ) {
    errors.push('build.bindingSerialization');
  }

  const workers = [...artifactBytes].filter(([relativePath]) =>
    /^assets\/bookPackWorker-[^/]+\.js$/u.test(relativePath),
  );
  if (workers.length !== 1) {
    errors.push('build.workerCount');
    return { errors, emittedPackAssets: [], workerPath: null, workerSha256: null };
  }
  const [workerPath, workerBytes] = workers[0];
  const workerText = Buffer.from(workerBytes).toString('utf8');
  for (const digest of [integrity.bookPackDigest, integrity.packContentDigest]) {
    if (!workerText.includes(digest)) errors.push('build.workerDigestMissing');
  }
  const execution = executeBookPackWorker(workerText);
  if (execution.error || execution.message?.status !== 'ready') {
    errors.push('build.workerExecution');
  } else {
    if (
      createCanonicalValueDigest(execution.message.pack) !== integrity.bookPackDigest ||
      createCanonicalValueDigest(execution.message.pack) !==
        createCanonicalValueDigest(expectedPack)
    ) {
      errors.push('build.workerPayloadMismatch');
    }
    if (
      execution.message.bookPackDigest !== integrity.bookPackDigest ||
      execution.message.packContentDigest !== integrity.packContentDigest
    ) {
      errors.push('build.workerReportedDigestMismatch');
    }
  }
  for (const requiredPath of ['bookpack-integrity.json', 'bookpack-binding.json', workerPath]) {
    if (!precacheUrls.has(requiredPath)) errors.push(`build.precacheMissing:${requiredPath}`);
  }

  const emittedPackAssets = [];
  const workerAssetUrls = execution.message?.status === 'ready' ? execution.message.assetUrls : {};
  const expectedAssetUrlKeys = expectedPack.assets
    .filter((asset) => asset.path !== null)
    .map((asset) => asset.id)
    .sort();
  if (JSON.stringify(Object.keys(workerAssetUrls).sort()) !== JSON.stringify(expectedAssetUrlKeys))
    errors.push('build.workerAssetKeySetMismatch');
  for (const entry of integrity.files.filter(
    (candidate) => candidate.mediaType !== 'application/json',
  )) {
    const matches = [...artifactBytes]
      .filter(([, bytes]) => sha256(bytes) === entry.sha256)
      .map(([relativePath]) => relativePath);
    if (matches.length !== 1) {
      errors.push(`build.assetArtifactCount:${entry.path}`);
    }
    if (matches.length === 0) {
      errors.push(`build.assetMissing:${entry.path}`);
      continue;
    }
    for (const relativePath of matches) {
      if (
        path.posix.extname(relativePath).toLowerCase() !==
        path.posix.extname(entry.path).toLowerCase()
      ) {
        errors.push(`build.assetExtensionMismatch:${entry.path}`);
      }
    }
    const matchingAssets = expectedPack.assets.filter((asset) => asset.path === entry.path);
    if (matchingAssets.length === 0) errors.push(`build.assetLedgerMissing:${entry.path}`);
    for (const asset of matchingAssets) {
      const assetUrl = workerAssetUrls[asset.id];
      if (
        typeof assetUrl !== 'string' ||
        !matches.some((path) => assetUrl === `${publicBase}${path}`)
      )
        errors.push(`build.workerAssetReferenceMissing:${asset.id}`);
    }
    for (const relativePath of matches) {
      if (!precacheUrls.has(relativePath)) errors.push(`build.precacheMissing:${relativePath}`);
    }
    emittedPackAssets.push(...matches);
  }
  for (const [relativePath, bytes] of artifactBytes) {
    const mediaType = detectMediaType(bytes);
    if (mediaType !== null && !allowedMediaSha256s.has(sha256(bytes)))
      errors.push(`build.unregisteredMedia:${relativePath}`);
  }
  const allowedExactPaths = new Set([
    'bookpack-binding.json',
    'bookpack-integrity.json',
    'index.html',
    'manifest.webmanifest',
    'og.png',
    'soombook-mark-192.png',
    'soombook-mark-512.png',
    'soombook-mark.svg',
    'sw.js',
    ...emittedPackAssets,
  ]);
  if (buildProfile === 'reader-web') allowedExactPaths.add('release.json');

  for (const relativePath of [
    'index.html',
    'manifest.webmanifest',
    'og.png',
    'soombook-mark-192.png',
    'soombook-mark-512.png',
    'soombook-mark.svg',
    'sw.js',
  ]) {
    if (!artifactBytes.has(relativePath)) errors.push(`build.exactArtifactMissing:${relativePath}`);
  }

  for (const [relativePath, expectedMediaType] of [
    ['og.png', 'image/png'],
    ['soombook-mark-192.png', 'image/png'],
    ['soombook-mark-512.png', 'image/png'],
    ['soombook-mark.svg', 'image/svg+xml'],
  ]) {
    const bytes = artifactBytes.get(relativePath);
    if (
      bytes &&
      (detectMediaType(bytes) !== expectedMediaType || !allowedMediaSha256s.has(sha256(bytes)))
    ) {
      errors.push(`build.exactArtifactContentInvalid:${relativePath}`);
    }
  }
  for (const relativePath of ['index.html', 'sw.js']) {
    const bytes = artifactBytes.get(relativePath);
    if (bytes && !isUtf8(bytes)) errors.push(`build.exactArtifactContentInvalid:${relativePath}`);
  }
  const indexBytes = artifactBytes.get('index.html');
  if (
    indexBytes &&
    !Buffer.from(indexBytes).toString('utf8').toLowerCase().includes('<!doctype html')
  ) {
    errors.push('build.exactArtifactContentInvalid:index.html');
  }
  const webManifestBytes = artifactBytes.get('manifest.webmanifest');
  if (webManifestBytes) {
    try {
      if (!isUtf8(webManifestBytes)) throw new Error('invalid utf8');
      const webManifest = JSON.parse(Buffer.from(webManifestBytes).toString('utf8'));
      if (
        webManifest === null ||
        typeof webManifest !== 'object' ||
        webManifest.id !== publicBase ||
        webManifest.start_url !== publicBase ||
        webManifest.scope !== publicBase ||
        !Array.isArray(webManifest.icons) ||
        !webManifest.icons.some(
          (icon) => icon?.src === `${publicBase}soombook-mark-192.png` && icon?.sizes === '192x192',
        ) ||
        !webManifest.icons.some(
          (icon) => icon?.src === `${publicBase}soombook-mark-512.png` && icon?.sizes === '512x512',
        ) ||
        webManifest.icons.some(
          (icon) =>
            typeof icon?.src !== 'string' ||
            ![
              `${publicBase}soombook-mark-192.png`,
              `${publicBase}soombook-mark-512.png`,
              `${publicBase}soombook-mark.svg`,
            ].includes(icon.src),
        )
      ) {
        throw new Error('invalid web manifest');
      }
    } catch {
      errors.push('build.exactArtifactContentInvalid:manifest.webmanifest');
    }
  }
  const releaseBytes = artifactBytes.get('release.json');
  if (releaseBytes) {
    if (buildProfile !== 'reader-web') {
      errors.push('build.releaseArtifactUnexpected');
    } else {
      try {
        if (!isUtf8(releaseBytes)) throw new Error('invalid utf8');
        const release = JSON.parse(Buffer.from(releaseBytes).toString('utf8'));
        if (release?.base !== publicBase) errors.push('build.releasePublicBaseMismatch');
        errors.push(
          ...inspectReleaseBookPackEvidence({ artifactBytes, binding, release, releaseBytes }).map(
            (error) => `build.${error}`,
          ),
        );
      } catch {
        errors.push('build.exactArtifactContentInvalid:release.json');
      }
    }
  }
  const allowedGeneratedPathPatterns = [
    ['workbox-runtime', /^workbox-[A-Za-z0-9_-]+\.js$/u, false],
    ['book-pack-worker', /^assets\/bookPackWorker-[A-Za-z0-9_-]+\.js$/u, true],
    ['application-script', /^assets\/index-[A-Za-z0-9_-]+\.js$/u, true],
    ['application-style', /^assets\/index-[A-Za-z0-9_-]+\.css$/u, true],
    ['narration-controller', /^assets\/narrationAudio-[A-Za-z0-9_-]+\.js$/u, true],
    ['workbox-window', /^assets\/workbox-window\.prod\.es5-[A-Za-z0-9_-]+\.js$/u, true],
  ];
  for (const [role, pattern, mustBePrecached] of allowedGeneratedPathPatterns) {
    const matches = [...artifactBytes.keys()].filter((relativePath) => pattern.test(relativePath));
    if (matches.length !== 1) errors.push(`build.artifactRoleCount:${role}`);
    for (const relativePath of matches) {
      if (!isUtf8(artifactBytes.get(relativePath)))
        errors.push(`build.generatedArtifactNotUtf8:${relativePath}`);
      if (mustBePrecached && !precacheUrls.has(relativePath))
        errors.push(`build.precacheMissing:${relativePath}`);
    }
  }
  const applicationScripts = [...artifactBytes].filter(([relativePath]) =>
    /^assets\/index-[A-Za-z0-9_-]+\.js$/u.test(relativePath),
  );
  if (
    applicationScripts.length !== 1 ||
    ![integrity.bookPackDigest, integrity.packContentDigest].every((digest) =>
      Buffer.from(applicationScripts[0]?.[1] ?? [])
        .toString('utf8')
        .includes(digest),
    )
  ) {
    errors.push('build.applicationDigestMissing');
  }
  const applicationText = Buffer.from(applicationScripts[0]?.[1] ?? []).toString('utf8');
  for (const assetUrl of Object.values(workerAssetUrls)) {
    if (typeof assetUrl !== 'string' || !applicationText.includes(assetUrl))
      errors.push('build.applicationAssetReferenceMissing');
  }
  for (const relativePath of artifactBytes.keys()) {
    if (
      !allowedExactPaths.has(relativePath) &&
      !allowedGeneratedPathPatterns.some(([, pattern]) => pattern.test(relativePath))
    ) {
      errors.push(`build.unregisteredArtifact:${relativePath}`);
    }
  }
  return {
    errors,
    emittedPackAssets: [...new Set(emittedPackAssets)].sort(),
    workerPath,
    workerSha256: sha256(workerBytes),
  };
}

export function inspectReleaseBookPackEvidence({ artifactBytes, binding, release, releaseBytes }) {
  const errors = [];
  if (!exactFields(release, RELEASE_FIELDS)) errors.push('release.schema');
  if (!releaseBytes) errors.push('release.serializationMissing');
  else if (!Buffer.from(releaseBytes).equals(Buffer.from(serializePagesRelease(release), 'utf8'))) {
    errors.push('release.serialization');
  }
  if (release.base !== '/soombook/' || release.profile !== 'github-pages-preview')
    errors.push('release.profile');
  if (!/^(?:local|[0-9a-f]{40})$/u.test(String(release.commit))) errors.push('release.commit');
  if (!/^[0-9a-f]{64}$/u.test(String(release.artifactContentSha256)))
    errors.push('release.artifactContentSha256');
  if (!/^v\d+\.\d+\.\d+$/u.test(String(release.nodeVersion))) errors.push('release.nodeVersion');
  const bindingBytes = artifactBytes.get('bookpack-binding.json');
  if (
    !exactFields(binding, BUILD_BINDING_FIELDS) ||
    !bindingBytes ||
    !Buffer.from(bindingBytes).equals(Buffer.from(serializeBookPackBuildBinding(binding), 'utf8'))
  ) {
    errors.push('release.bindingArtifact');
  }
  const integrityBytes = artifactBytes.get('bookpack-integrity.json');
  if (!integrityBytes) errors.push('release.integrityArtifact');
  else {
    try {
      const integrity = JSON.parse(Buffer.from(integrityBytes).toString('utf8'));
      if (
        validateBookPackIntegrityManifest(integrity).length > 0 ||
        !Buffer.from(integrityBytes).equals(
          Buffer.from(serializeBookPackIntegrityManifest(integrity), 'utf8'),
        ) ||
        ['bookId', 'packVersion', 'bookPackDigest', 'packContentDigest'].some(
          (field) => integrity[field] !== binding[field],
        )
      ) {
        errors.push('release.integrityArtifact');
      }
    } catch {
      errors.push('release.integrityArtifact');
    }
  }
  for (const field of ['bookId', 'packVersion', 'bookPackDigest', 'packContentDigest']) {
    if (release[field] !== binding[field]) errors.push(`release.bindingMismatch:${field}`);
  }
  const workers = [...artifactBytes.keys()].filter((relativePath) =>
    /^assets\/bookPackWorker-[^/]+\.js$/u.test(relativePath),
  );
  if (workers.length !== 1) errors.push('release.workerCount');
  const expectedPaths = {
    bookPackIntegrityPath: 'bookpack-integrity.json',
    bookPackBindingPath: 'bookpack-binding.json',
    bookPackWorkerPath: workers[0],
  };
  const rolePaths = Object.keys(expectedPaths).map((field) => release[field]);
  if (new Set(rolePaths).size !== rolePaths.length) errors.push('release.pathRolesOverlap');
  for (const [pathField, expectedPath] of Object.entries(expectedPaths)) {
    if (release[pathField] !== expectedPath) errors.push(`release.pathRoleMismatch:${pathField}`);
  }
  for (const [pathField, digestField] of [
    ['bookPackIntegrityPath', 'bookPackIntegritySha256'],
    ['bookPackBindingPath', 'bookPackBindingSha256'],
    ['bookPackWorkerPath', 'bookPackWorkerSha256'],
  ]) {
    const relativePath = release[pathField];
    const bytes = typeof relativePath === 'string' ? artifactBytes.get(relativePath) : null;
    if (!bytes) {
      errors.push(`release.artifactMissing:${pathField}`);
      continue;
    }
    if (release[digestField] !== sha256(bytes))
      errors.push(`release.digestMismatch:${digestField}`);
  }
  return errors;
}
