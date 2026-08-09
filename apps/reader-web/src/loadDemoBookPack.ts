import { assertValidBookPack, type BookPack } from '@soombook/book-schema';

import fixtureRegistry from '../../../content/fixture-registry.json';

interface JsonModule {
  default: unknown;
}

export interface LoadedBookPack {
  assetUrls: Record<string, string>;
  pack: BookPack;
}

const fixtureJsonModules = import.meta.glob<JsonModule>('../../../content/fixtures/**/*.json', {
  eager: true,
});
const fixtureAssetUrls = import.meta.glob<string>('../../../content/fixtures/*/assets/**/*', {
  eager: true,
  import: 'default',
  query: '?url',
});

function modulePath(slug: string, relativePath: string): string {
  return `../../../content/fixtures/${slug}/${relativePath}`;
}

function readJson(slug: string, relativePath: string): unknown {
  const module = fixtureJsonModules[modulePath(slug, relativePath)];
  if (!module) {
    throw new Error(`BookPack JSON을 찾을 수 없습니다: ${slug}/${relativePath}`);
  }
  return module.default;
}

function loadScenes(slug: string, sceneOrder: string[]): unknown[] {
  const scenePrefix = modulePath(slug, 'scenes/');
  const scenes = Object.entries(fixtureJsonModules)
    .filter(([path]) => path.startsWith(scenePrefix))
    .map(([, module]) => module.default);
  const sceneById = new Map(
    scenes.flatMap((scene) =>
      scene && typeof scene === 'object' && 'id' in scene && typeof scene.id === 'string'
        ? [[scene.id, scene] as const]
        : [],
    ),
  );
  return sceneOrder.map((sceneId) => {
    const scene = sceneById.get(sceneId);
    if (!scene) {
      throw new Error(`manifest 장면 JSON을 찾을 수 없습니다: ${slug}/${sceneId}`);
    }
    return scene;
  });
}

export function loadFixtureBookPack(slug: string): BookPack {
  const manifest = readJson(slug, 'manifest.json');
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !('sceneOrder' in manifest) ||
    !Array.isArray(manifest.sceneOrder) ||
    !manifest.sceneOrder.every((sceneId) => typeof sceneId === 'string')
  ) {
    throw new Error(`BookPack manifest의 sceneOrder를 읽을 수 없습니다: ${slug}`);
  }
  const value: unknown = {
    manifest,
    book: readJson(slug, 'book.json'),
    scenes: loadScenes(slug, manifest.sceneOrder),
    interactions: readJson(slug, 'interactions.json'),
    reasoningPrompts: readJson(slug, 'reasoningPrompts.json'),
    connectionCards: readJson(slug, 'connectionCards.json'),
    rights: readJson(slug, 'ledgers/rights.json'),
    claims: readJson(slug, 'ledgers/claims.json'),
    assets: readJson(slug, 'ledgers/assets.json'),
    audioTracks: readJson(slug, 'audioTracks.json'),
    reviewRecords: readJson(slug, 'ledgers/reviews.json'),
  };
  assertValidBookPack(value, 'fixture');
  return value;
}

export function resolveFixtureAssetUrls(pack: BookPack): Record<string, string> {
  return Object.fromEntries(
    pack.assets.flatMap((asset) => {
      if (asset.path === null) {
        return [];
      }
      const url = fixtureAssetUrls[modulePath(pack.manifest.slug, asset.path)];
      return typeof url === 'string' ? [[asset.id, url] as const] : [];
    }),
  );
}

export function loadDemoBookPack(): BookPack {
  const publicFixture = fixtureRegistry.fixtures.find(
    (fixture) => fixture.exposure === 'public-demo',
  );
  if (!publicFixture) {
    throw new Error('공개 체험판 fixture registry 항목이 없습니다.');
  }
  return loadFixtureBookPack(publicFixture.slug);
}

export function loadDemoBookPackWithAssets(): LoadedBookPack {
  const pack = loadDemoBookPack();
  return { pack, assetUrls: resolveFixtureAssetUrls(pack) };
}

export function loadFixtureBookPackWithAssets(slug: string): LoadedBookPack {
  const pack = loadFixtureBookPack(slug);
  return { pack, assetUrls: resolveFixtureAssetUrls(pack) };
}
