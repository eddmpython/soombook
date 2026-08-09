import { describe, expect, it } from 'vitest';

import { loadDemoBookPack, loadFixtureBookPack, resolveFixtureAssetUrls } from './loadDemoBookPack';

describe('loadDemoBookPack', () => {
  it('웹 앱이 현재 BookPack 전체 계약을 조립한다', () => {
    const pack = loadDemoBookPack();

    expect(pack.manifest.packVersion).toBe('0.3.0');
    expect(pack.audioTracks).toEqual([]);
    expect(pack.reviewRecords).toEqual([]);
    expect(pack.connectionCards[0]?.truthStatus).toBe('fixture');
    expect(pack.scenes.map((scene) => scene.id)).toEqual(pack.manifest.sceneOrder);
    expect(Object.keys(resolveFixtureAssetUrls(pack)).sort()).toEqual([
      'asset-tiger-base',
      'asset-tiger-detail',
    ]);
  });

  it('장면 수와 ID가 다른 비공개 fixture도 같은 조립기로 읽는다', () => {
    const pack = loadFixtureBookPack('lantern-demo');

    expect(pack.manifest.status).toBe('internal');
    expect(pack.scenes).toHaveLength(5);
    expect(pack.scenes.map((scene) => scene.id)).toEqual(pack.manifest.sceneOrder);
    expect(Object.keys(resolveFixtureAssetUrls(pack)).sort()).toEqual([
      'asset-lantern-base',
      'asset-lantern-detail',
      'asset-lantern-timing',
    ]);
  });
});
