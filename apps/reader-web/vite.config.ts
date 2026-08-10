import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { createCanonicalSha256 } from '../../packages/book-schema/src/canonicalDigest.ts';
import type { BookPack } from '../../packages/book-schema/src/bookPack.ts';
import type { BookPackIntegrityManifest } from '../../packages/book-schema/src/bookPackFileIntegrity.ts';
import { assertValidBookPack } from '../../packages/book-schema/src/validation.ts';
import {
  assertPublishableBookPack,
  type ApprovedRightsProjection,
} from '../../packages/book-authoring/src/approvedRightsProjection.ts';
import {
  assembleBookPackFromFileMap,
  createBookPackFileEntry,
  createBookPackIntegrityManifest,
  createBookPackPayloadFiles,
  readVerifiedBookPackFilesSync,
  serializeBookPackIntegrityManifest,
} from '../../scripts/bookPackIntegrity.mjs';
import {
  expectedBookPackBuildBinding,
  expectedExposureForBuildProfile,
  serializeBookPackBuildBinding,
} from '../../scripts/bookPackBuildContract.mjs';

const APP_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const BUILD_PROFILE = process.env.SOOMBOOK_BUILD_PROFILE ?? 'reader-web';
if (!/^[a-z][a-z0-9-]*$/u.test(BUILD_PROFILE)) {
  throw new Error('SOOMBOOK_BUILD_PROFILE은 소문자 영숫자와 하이픈만 사용할 수 있습니다.');
}
const OUTPUT_DIRECTORY = path.resolve(
  APP_DIRECTORY,
  `../../../soombook.out/build/${BUILD_PROFILE}`,
);
const PUBLIC_BASE = process.env.SOOMBOOK_PUBLIC_BASE ?? '/';
const PREVIEW_PORT = Number(process.env.SOOMBOOK_PREVIEW_PORT ?? 4173);
const FIXTURE_REGISTRY_PATH = path.resolve(APP_DIRECTORY, '../../content/fixture-registry.json');
const PUBLIC_RELEASE_COPY_PATH = path.resolve(
  APP_DIRECTORY,
  '../../content/public-release-copy.json',
);
const PUBLIC_RELEASE_SURFACES = (
  JSON.parse(readFileSync(PUBLIC_RELEASE_COPY_PATH, 'utf8')) as {
    surfaces: Record<string, string>;
  }
).surfaces;
const VIRTUAL_BOOK_PACK_ID = 'virtual:soombook-book-pack';
const RESOLVED_VIRTUAL_BOOK_PACK_ID = `\0${VIRTUAL_BOOK_PACK_ID}`;
const VIRTUAL_BOOK_ASSET_URLS_ID = 'virtual:soombook-book-asset-urls';
const RESOLVED_VIRTUAL_BOOK_ASSET_URLS_ID = `\0${VIRTUAL_BOOK_ASSET_URLS_ID}`;

if (!PUBLIC_BASE.startsWith('/') || !PUBLIC_BASE.endsWith('/')) {
  throw new Error('SOOMBOOK_PUBLIC_BASE는 앞뒤가 /인 절대 경로여야 합니다.');
}

interface FixtureRegistry {
  fixtures: Array<{
    exposure: 'internal-validation' | 'public-demo' | 'published' | 'review-candidate';
    expectedPayloadFileCount: number;
    slug: string;
  }>;
}

interface FixtureManifest {
  sceneOrder: string[];
}

export interface ConfiguredPackSnapshot {
  assets: BookPack['assets'];
  fixture: FixtureRegistry['fixtures'][number];
  files: Map<string, Buffer>;
  integrity: BookPackIntegrityManifest;
  integrityBytes: Buffer;
  pack: BookPack;
}

const AUTHORIZED_PUBLISHED_SNAPSHOTS = new WeakSet<ConfiguredPackSnapshot>();

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function configuredFixture() {
  const registry = readJson<FixtureRegistry>(FIXTURE_REGISTRY_PATH);
  const requestedSlug = process.env.VITE_SOOMBOOK_FIXTURE_SLUG?.trim();
  const publicFixtures = registry.fixtures.filter(
    (candidate) => candidate.exposure === 'public-demo',
  );
  if (!requestedSlug && (publicFixtures.length !== 1 || publicFixtures[0]?.slug !== 'tiger-demo')) {
    throw new Error('공개 기술 체험판 fixture는 tiger-demo 하나여야 합니다.');
  }
  const fixture = requestedSlug
    ? registry.fixtures.find((candidate) => candidate.slug === requestedSlug)
    : publicFixtures[0];
  if (!fixture) {
    throw new Error(
      requestedSlug
        ? `fixture registry에 ${requestedSlug} 항목이 없습니다.`
        : '공개 체험판 fixture registry 항목이 없습니다.',
    );
  }
  if (
    fixture.exposure === 'internal-validation' &&
    process.env.SOOMBOOK_INTERNAL_FIXTURE_BUILD !== 'true'
  ) {
    throw new Error(
      '내부 fixture는 SOOMBOOK_INTERNAL_FIXTURE_BUILD=true인 격리 빌드만 허용합니다.',
    );
  }
  if (fixture.exposure === 'review-candidate' && process.env.SOOMBOOK_REVIEW_BUILD !== 'true') {
    throw new Error('검수 후보는 SOOMBOOK_REVIEW_BUILD=true인 격리 빌드만 허용합니다.');
  }
  if (fixture.exposure === 'published' && process.env.SOOMBOOK_PUBLISHED_BUILD !== 'true') {
    throw new Error('출판 pack은 SOOMBOOK_PUBLISHED_BUILD=true인 승인 빌드만 허용합니다.');
  }
  return fixture;
}

function validationProfile(
  exposure: FixtureRegistry['fixtures'][number]['exposure'],
): 'fixture' | 'publish' | 'review' {
  if (exposure === 'review-candidate') return 'review';
  if (exposure === 'published') return 'publish';
  return 'fixture';
}

function expectedExposureForProfile(): FixtureRegistry['fixtures'][number]['exposure'] {
  return expectedExposureForBuildProfile(BUILD_PROFILE);
}

function configuredPackSnapshot(): ConfiguredPackSnapshot {
  const fixture = configuredFixture();
  const expectedExposure = expectedExposureForProfile();
  if (fixture.exposure !== expectedExposure) {
    throw new Error(
      `build profile과 BookPack exposure가 다릅니다: ${BUILD_PROFILE} -> ${fixture.exposure}`,
    );
  }
  const profile = validationProfile(fixture.exposure);
  const contentCollection =
    fixture.exposure === 'review-candidate' || fixture.exposure === 'published'
      ? `books/${fixture.slug}/compiled`
      : `fixtures/${fixture.slug}`;
  const fixtureRoot = path.resolve(APP_DIRECTORY, `../../content/${contentCollection}`);
  const integrityBytes = readFileSync(path.join(fixtureRoot, 'integrity.json'));
  const integrity = JSON.parse(integrityBytes.toString('utf8')) as BookPackIntegrityManifest;
  const files = readVerifiedBookPackFilesSync(fixtureRoot, integrity, {
    ignoredPaths: [
      'integrity.json',
      ...(fixtureRoot.includes(`${path.sep}fixtures${path.sep}`) ? ['README.md'] : []),
    ],
    manifestBytes: integrityBytes,
    expectedIdentity: { exposure: fixture.exposure },
  });
  if (integrity.files.length !== fixture.expectedPayloadFileCount) {
    throw new Error(
      `BookPack payload file 수가 registry 계약과 다릅니다: ${fixture.slug} ${integrity.files.length}/${fixture.expectedPayloadFileCount}`,
    );
  }
  const pack = assembleBookPackFromFileMap(files) as BookPack;
  if (
    fixture.exposure === 'public-demo' &&
    (pack.manifest.id !== 'book-tiger-demo' ||
      pack.manifest.packVersion !== '0.3.0' ||
      pack.manifest.status !== 'fixture')
  ) {
    throw new Error('공개 기술 체험판 BookPack identity가 승인된 fixture와 다릅니다.');
  }
  const manifest = pack.manifest as FixtureManifest & BookPack['manifest'];
  const assets = pack.assets;
  const integrityEntryByPath = new Map(
    integrity.files.map((entry) => [entry.path, entry] as const),
  );
  for (const asset of assets) {
    if (asset.path === null) continue;
    const entry = integrityEntryByPath.get(asset.path);
    if (!entry || asset.integrity !== entry.sha256)
      throw new Error(`asset ledger와 whole-file manifest SHA-256이 다릅니다: ${asset.id}`);
  }
  const sceneFiles = [...files.keys()]
    .filter((relativePath) => /^scenes\/[^/]+\.json$/u.test(relativePath))
    .map((relativePath) => ({
      relativePath,
      scene: JSON.parse(files.get(relativePath)!.toString('utf8')) as BookPack['scenes'][number],
    }));
  const sceneFileById = new Map(
    sceneFiles.map(({ relativePath, scene }) => [scene.id, relativePath]),
  );
  const scenes = manifest.sceneOrder.map((sceneId) => {
    const relativePath = sceneFileById.get(sceneId);
    if (!relativePath)
      throw new Error(`manifest 장면 JSON을 찾을 수 없습니다: ${fixture.slug}/${sceneId}`);
    return JSON.parse(files.get(relativePath)!.toString('utf8')) as BookPack['scenes'][number];
  });
  if (scenes.length !== pack.scenes.length)
    throw new Error('BookPack scene projection이 다릅니다.');
  assertValidBookPack(pack, profile);
  const expectedPaths = new Set([
    'manifest.json',
    'book.json',
    ...scenes.map((scene) => sceneFileById.get(scene.id)!),
    'interactions.json',
    'reasoningPrompts.json',
    'connectionCards.json',
    'ledgers/rights.json',
    'ledgers/claims.json',
    'ledgers/assets.json',
    'audioTracks.json',
    'ledgers/reviews.json',
    ...assets.flatMap((asset) => (asset.path === null ? [] : [asset.path])),
  ]);
  const manifestedPaths = new Set(integrity.files.map((entry) => entry.path));
  if (
    expectedPaths.size !== manifestedPaths.size ||
    [...expectedPaths].some((relativePath) => !manifestedPaths.has(relativePath))
  ) {
    throw new Error(`BookPack payload file 집합이 schema와 다릅니다: ${fixture.slug}`);
  }
  const bookPackDigest = createCanonicalSha256(pack);
  if (
    integrity.bookId !== pack.manifest.id ||
    integrity.packVersion !== pack.manifest.packVersion ||
    integrity.bookPackDigest !== bookPackDigest
  ) {
    throw new Error(`BookPack integrity identity가 조립한 pack과 다릅니다: ${fixture.slug}`);
  }
  return { assets, fixture, files, integrity, integrityBytes, pack };
}

function configuredBookPackPlugin(snapshot: ConfiguredPackSnapshot, publicBase: string): Plugin {
  const assetFiles = snapshot.assets.flatMap((asset) =>
    asset.path === null ? [] : [{ assetId: asset.id, path: asset.path }],
  );

  return {
    name: 'soombook-configured-book-pack',
    resolveId(id: string) {
      if (id === VIRTUAL_BOOK_PACK_ID) return RESOLVED_VIRTUAL_BOOK_PACK_ID;
      if (id === VIRTUAL_BOOK_ASSET_URLS_ID) return RESOLVED_VIRTUAL_BOOK_ASSET_URLS_ID;
      return null;
    },
    resolveFileUrl({ fileName }) {
      return JSON.stringify(`${publicBase}${fileName}`);
    },
    load(id: string) {
      if (id !== RESOLVED_VIRTUAL_BOOK_PACK_ID && id !== RESOLVED_VIRTUAL_BOOK_ASSET_URLS_ID)
        return null;
      const emittedAssets = assetFiles.map((asset) => {
        const bytes = snapshot.files.get(asset.path);
        if (!bytes) throw new Error(`검증된 BookPack 자산이 없습니다: ${asset.path}`);
        return {
          assetId: asset.assetId,
          referenceId: this.emitFile({
            type: 'asset',
            name: path.posix.basename(asset.path),
            source: bytes,
          }),
        };
      });
      const assetUrlsSource = `{${emittedAssets
        .map(
          ({ assetId, referenceId }) =>
            `${JSON.stringify(assetId)}: import.meta.ROLLUP_FILE_URL_${referenceId}`,
        )
        .join(', ')}}`;
      if (id === RESOLVED_VIRTUAL_BOOK_ASSET_URLS_ID) {
        return `const assetUrls = ${assetUrlsSource};
export function loadConfiguredBookAssetUrls() { return assetUrls; }`;
      }
      return `const pack = ${JSON.stringify(snapshot.pack)};
const assetUrls = ${assetUrlsSource};
export function loadConfiguredBookPackWithAssets() {
  return {
    pack,
    assetUrls,
    bookPackDigest: ${JSON.stringify(snapshot.integrity.bookPackDigest)},
    packContentDigest: ${JSON.stringify(snapshot.integrity.packContentDigest)},
  };
}`;
    },
  };
}

function bookPackIntegrityArtifactPlugin(
  snapshot: ConfiguredPackSnapshot,
  buildProfile: string,
): Plugin {
  const binding = expectedBookPackBuildBinding({
    buildProfile,
    fixture: snapshot.fixture,
    integrity: snapshot.integrity,
  });
  return {
    name: 'soombook-book-pack-integrity-artifact',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'bookpack-integrity.json',
        source: serializeBookPackIntegrityManifest(snapshot.integrity),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'bookpack-binding.json',
        source: serializeBookPackBuildBinding(binding),
      });
    },
  };
}

export function createAuthorizedPublishedPackSnapshot(input: {
  assetBytesByPath: ReadonlyMap<string, Uint8Array>;
  pack: BookPack;
  projections: readonly ApprovedRightsProjection[];
  releaseAt: string;
}): ConfiguredPackSnapshot {
  assertPublishableBookPack(input.pack, input.projections, input.releaseAt);
  const pack = deepFreeze(structuredClone(input.pack));
  const files = createBookPackPayloadFiles(pack, input.assetBytesByPath);
  const integrity = createBookPackIntegrityManifest({
    bookId: pack.manifest.id,
    packVersion: pack.manifest.packVersion,
    exposure: 'published',
    bookPackDigest: createCanonicalSha256(pack),
    files: [...files].map(([filePath, bytes]) => ({ path: filePath, bytes })),
  }) as BookPackIntegrityManifest;
  deepFreeze(integrity);
  const fixture = deepFreeze({
    exposure: 'published' as const,
    expectedPayloadFileCount: integrity.files.length,
    slug: pack.manifest.slug,
  });
  const snapshot: ConfiguredPackSnapshot = {
    assets: pack.assets,
    fixture,
    files,
    integrity,
    integrityBytes: Buffer.from(serializeBookPackIntegrityManifest(integrity), 'utf8'),
    pack,
  };
  AUTHORIZED_PUBLISHED_SNAPSHOTS.add(snapshot);
  return Object.freeze(snapshot);
}

interface ReaderWebConfigOptions {
  authorizedPublishedSnapshot?: ConfiguredPackSnapshot;
  buildProfile?: string;
  outputDirectory?: string;
  previewPort?: number;
  publicBase?: string;
}

export function createReaderWebViteConfig(options: ReaderWebConfigOptions = {}) {
  const buildProfile = options.buildProfile ?? BUILD_PROFILE;
  const publicBase = options.publicBase ?? PUBLIC_BASE;
  const outputDirectory = options.outputDirectory ?? OUTPUT_DIRECTORY;
  const previewPort = options.previewPort ?? PREVIEW_PORT;
  if (!publicBase.startsWith('/') || !publicBase.endsWith('/'))
    throw new Error('BookPack build base는 앞뒤가 /여야 합니다.');
  const snapshot = options.authorizedPublishedSnapshot ?? configuredPackSnapshot();
  let buildSnapshot = snapshot;
  if (buildProfile === 'published-reader') {
    if (
      !options.authorizedPublishedSnapshot ||
      !AUTHORIZED_PUBLISHED_SNAPSHOTS.has(options.authorizedPublishedSnapshot)
    ) {
      throw new Error(
        'published-reader는 같은 프로세스에서 검증한 rights projection이 필요합니다.',
      );
    }
    if (snapshot.fixture.exposure !== 'published')
      throw new Error('published-reader에 review 또는 fixture snapshot을 사용할 수 없습니다.');
    const actualPaths = new Set(snapshot.files.keys());
    let fileSetMatches = false;
    try {
      fileSetMatches = snapshot.integrity.files.every((entry) => {
        const bytes = snapshot.files.get(entry.path);
        if (!bytes) return false;
        const actual = createBookPackFileEntry(entry.path, bytes);
        return (
          actual.byteLength === entry.byteLength &&
          actual.mediaType === entry.mediaType &&
          actual.sha256 === entry.sha256
        );
      });
    } catch {
      fileSetMatches = false;
    }
    if (
      createCanonicalSha256(snapshot.pack) !== snapshot.integrity.bookPackDigest ||
      snapshot.integrity.files.length !== snapshot.files.size ||
      snapshot.integrity.files.some((entry) => !actualPaths.has(entry.path)) ||
      !fileSetMatches
    ) {
      throw new Error('승인된 published BookPack snapshot이 생성 뒤 변경됐습니다.');
    }
    buildSnapshot = {
      assets: snapshot.assets,
      fixture: snapshot.fixture,
      files: new Map(
        [...snapshot.files].map(([filePath, bytes]) => [filePath, Buffer.from(bytes)]),
      ),
      integrity: snapshot.integrity,
      integrityBytes: Buffer.from(snapshot.integrityBytes),
      pack: snapshot.pack,
    };
  } else if (options.authorizedPublishedSnapshot) {
    throw new Error(
      '검증된 published snapshot은 published-reader profile에서만 사용할 수 있습니다.',
    );
  }
  if (expectedExposureForBuildProfile(buildProfile) !== buildSnapshot.fixture.exposure)
    throw new Error('build profile과 authorized BookPack exposure가 다릅니다.');
  return {
    configFile: false as const,
    root: APP_DIRECTORY,
    base: publicBase,
    define: {
      SOOMBOOK_PUBLIC_RELEASE_SURFACES: JSON.stringify(PUBLIC_RELEASE_SURFACES),
      SOOMBOOK_EXPECTED_BOOK_PACK_DIGEST: JSON.stringify(buildSnapshot.integrity.bookPackDigest),
      SOOMBOOK_EXPECTED_PACK_CONTENT_DIGEST: JSON.stringify(
        buildSnapshot.integrity.packContentDigest,
      ),
    },
    plugins: [
      configuredBookPackPlugin(buildSnapshot, publicBase),
      bookPackIntegrityArtifactPlugin(buildSnapshot, buildProfile),
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['soombook-mark.svg', 'soombook-mark-192.png', 'soombook-mark-512.png'],
        manifest: {
          id: publicBase,
          name: '숨책 독서 탐험',
          short_name: '숨책',
          description: '읽고, 찾고, 생각하고, 연결하는 독서 탐험',
          theme_color: '#143b35',
          background_color: '#f4efe4',
          display: 'standalone',
          lang: 'ko-KR',
          start_url: publicBase,
          scope: publicBase,
          icons: [
            {
              src: `${publicBase}soombook-mark-192.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${publicBase}soombook-mark-512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: `${publicBase}soombook-mark.svg`,
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: `${publicBase}soombook-mark.svg`,
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          cacheId: 'soombook-reader',
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,json,svg,png,wav,webp}'],
          globIgnores: ['og.png'],
          navigateFallback: 'index.html',
        },
      }),
    ],
    build: {
      assetsInlineLimit: 0,
      outDir: outputDirectory,
      emptyOutDir: true,
      sourcemap: process.env.SOOMBOOK_SOURCE_MAP === 'true',
    },
    preview: {
      port: previewPort,
      strictPort: true,
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    worker: {
      plugins: () => [configuredBookPackPlugin(buildSnapshot, publicBase)],
    },
  };
}

export default defineConfig(createReaderWebViteConfig());
