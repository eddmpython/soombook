import { describe, expect, it } from 'vitest';

import { createSha256Integrity, type AssetRecord } from '@soombook/book-schema';

import { loadVerifiedBookAsset } from './bookAssetLoader';

function imageAsset(integrity: string): AssetRecord {
  return {
    id: 'asset-test',
    kind: 'image',
    path: 'assets/test.svg',
    rightsRecordId: 'rights-test',
    integrity,
    alt: '검사용 이미지',
  };
}

describe('loadVerifiedBookAsset', () => {
  it('SHA-256이 같은 self asset만 사용한다', async () => {
    const bytes = new TextEncoder().encode('<svg>verified</svg>');
    const asset = imageAsset(await createSha256Integrity(bytes));
    const result = await loadVerifiedBookAsset(asset, '/assets/test.svg', undefined, () =>
      Promise.resolve(new Response(bytes, { status: 200 })),
    );

    expect(result).toEqual({ ok: true, url: '/assets/test.svg' });
  });

  it('404와 hash 불일치를 서로 다른 로컬 오류로 반환한다', async () => {
    const expected = new TextEncoder().encode('<svg>expected</svg>');
    const asset = imageAsset(await createSha256Integrity(expected));
    const missing = await loadVerifiedBookAsset(asset, '/assets/missing.svg', undefined, () =>
      Promise.resolve(new Response(null, { status: 404 })),
    );
    const mismatch = await loadVerifiedBookAsset(asset, '/assets/test.svg', undefined, () =>
      Promise.resolve(new Response('<svg>changed</svg>', { status: 200 })),
    );

    expect(missing).toEqual({ ok: false, code: 'fetchFailed' });
    expect(mismatch).toEqual({ ok: false, code: 'hashMismatch' });
  });
});
