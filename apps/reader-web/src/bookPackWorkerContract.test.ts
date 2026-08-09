import { describe, expect, it } from 'vitest';

import { createCanonicalSha256, type BookPack } from '@soombook/book-schema';

import {
  type BookPackWorkerMessage,
  verifyBookPackWorkerReadyMessage,
} from './bookPackWorkerContract';

const pack = {
  manifest: { id: 'book-test', packVersion: '1.0.0' },
  book: { title: 'test' },
  scenes: [],
  interactions: [],
  reasoningPrompts: [],
  connectionCards: [],
  rights: [],
  claims: [],
  assets: [],
  audioTracks: [],
  reviewRecords: [],
} as unknown as BookPack;
const digest = createCanonicalSha256(pack);

function readyMessage(): Extract<BookPackWorkerMessage, { status: 'ready' }> {
  return {
    status: 'ready',
    pack,
    assetUrls: {},
    bookPackDigest: digest,
    packContentDigest: 'sha256-content',
  };
}

describe('BookPack worker message verification', () => {
  it('메인 문서가 payload와 두 build digest를 독립 검증한다', () => {
    expect(
      verifyBookPackWorkerReadyMessage(readyMessage(), digest, 'sha256-content', {}).pack,
    ).toBe(pack);
    expect(() =>
      verifyBookPackWorkerReadyMessage(
        { ...readyMessage(), pack: { ...pack, manifest: { ...pack.manifest, id: 'book-evil' } } },
        digest,
        'sha256-content',
        {},
      ),
    ).toThrow(/신원/u);
    expect(() =>
      verifyBookPackWorkerReadyMessage(
        { ...readyMessage(), packContentDigest: 'sha256-foreign' },
        digest,
        'sha256-content',
        {},
      ),
    ).toThrow(/신원/u);
    expect(() =>
      verifyBookPackWorkerReadyMessage(
        { ...readyMessage(), assetUrls: { foreign: 'data:image/svg+xml,foreign' } },
        digest,
        'sha256-content',
        {},
      ),
    ).toThrow(/신원/u);
  });
});
