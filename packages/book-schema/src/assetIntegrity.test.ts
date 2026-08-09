import { describe, expect, it } from 'vitest';

import { createDemoBookPack } from '@soombook/test-book-factory';

import { createSha256Integrity, inspectAssetIntegrity } from './assetIntegrity';

function addImageAsset(integrity: string) {
  const pack = createDemoBookPack();
  pack.assets = pack.assets.filter((asset) => asset.path === null);
  pack.assets.push({
    id: 'asset-test-image',
    kind: 'image',
    path: 'assets/test-image.bin',
    rightsRecordId: 'rights-fixture-art',
    integrity,
    alt: '무결성 검사용 임시 이미지 자산',
  });
  return pack;
}

describe('asset integrity', () => {
  it('실제 byte의 SHA-256과 장부가 같으면 통과한다', async () => {
    const bytes = new TextEncoder().encode('soombook fixture asset');
    const integrity = await createSha256Integrity(bytes);
    const issues = await inspectAssetIntegrity(addImageAsset(integrity), () =>
      Promise.resolve(bytes),
    );

    expect(issues).toEqual([]);
  });

  it('등록된 파일이 없으면 정확한 경로로 차단한다', async () => {
    const pack = addImageAsset(`sha256-${'0'.repeat(64)}`);
    const issues = await inspectAssetIntegrity(pack, () => Promise.resolve(null));

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'asset.fileMissing', path: '/assets/1/path' }),
    );
  });

  it('실제 byte와 SHA-256이 다르면 차단한다', async () => {
    const pack = addImageAsset(`sha256-${'0'.repeat(64)}`);
    const bytes = new TextEncoder().encode('different bytes');
    const issues = await inspectAssetIntegrity(pack, () => Promise.resolve(bytes));

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'asset.hashMismatch', path: '/assets/1/integrity' }),
    );
  });
});
