import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { inspectAssetIntegrity, validateBookPack } from '@soombook/book-schema';

import { createDemoBookPack } from './createDemoBookPack';
import { createLanternDemoBookPack } from './createLanternDemoBookPack';

describe('createLanternDemoBookPack', () => {
  it('첫 fixture의 ID 치환 복제가 아닌 독립된 다섯 장면 pack이다', () => {
    const tiger = createDemoBookPack();
    const lantern = createLanternDemoBookPack();

    expect(lantern.manifest.status).toBe('internal');
    expect(lantern.scenes).toHaveLength(5);
    expect(lantern.manifest.sceneOrder).not.toEqual(tiger.manifest.sceneOrder);
    expect(lantern.interactions[0]?.sceneId).toBe('lantern-search');
    expect(lantern.claims[0]?.statement).toContain('실제 문화 사실을 주장하지 않는다');
    expect(validateBookPack(lantern, 'fixture')).toEqual({ valid: true, issues: [] });
  });

  it('잘못된 장면 자산 참조를 gate가 차단한다', () => {
    const pack = createLanternDemoBookPack();
    pack.scenes[2]!.visual.detailAssetId = 'asset-missing-detail';

    expect(validateBookPack(pack, 'fixture').issues).toContainEqual(
      expect.objectContaining({ code: 'reference.missing', path: '/scenes/2/visual' }),
    );
  });

  it('두 번째 fixture의 실제 파일 hash 변경을 gate가 차단한다', async () => {
    const pack = createLanternDemoBookPack();
    const fixtureRoot = new URL('../../../content/fixtures/lantern-demo/', import.meta.url);
    const readAsset = async (relativePath: string) =>
      new Uint8Array(await readFile(new URL(relativePath, fixtureRoot)));

    expect(await inspectAssetIntegrity(pack, readAsset)).toEqual([]);
    pack.assets[0]!.integrity = `sha256-${'0'.repeat(64)}`;
    expect(await inspectAssetIntegrity(pack, readAsset)).toContainEqual(
      expect.objectContaining({ code: 'asset.hashMismatch', path: '/assets/0/integrity' }),
    );
  });

  it('호랑이 fallback을 재사용하지 않고 등불 고유 geometry를 선언한다', () => {
    const pack = createLanternDemoBookPack();
    const scene = pack.scenes.find((candidate) => candidate.id === 'lantern-search');

    expect(scene?.visual.decorations).toEqual([
      'moon',
      'mountains',
      'stoneWall',
      'lantern',
      'ribbons',
    ]);
    expect(scene?.visual.decorations).not.toContain('tiger');
    expect(pack.interactions[0]?.pointerTarget).toMatchObject({
      centerXPercent: 63,
      centerYPercent: 67,
    });
  });
});
