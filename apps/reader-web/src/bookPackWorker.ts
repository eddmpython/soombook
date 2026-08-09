import type { BookPackWorkerMessage } from './bookPackWorkerContract';
import { createCanonicalSha256 } from '@soombook/book-schema';
import { loadConfiguredBookPackWithAssets } from 'virtual:soombook-book-pack';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '책 데이터를 검증하지 못했습니다.';
}

try {
  const loaded = loadConfiguredBookPackWithAssets();
  const actualDigest = createCanonicalSha256(loaded.pack);
  if (actualDigest !== loaded.bookPackDigest) {
    throw new Error('책 payload와 승인된 BookPack digest가 다릅니다.');
  }
  const message: BookPackWorkerMessage = {
    status: 'ready',
    pack: loaded.pack,
    assetUrls: loaded.assetUrls,
    bookPackDigest: loaded.bookPackDigest,
    packContentDigest: loaded.packContentDigest,
  };
  self.postMessage(message);
} catch (error) {
  const message: BookPackWorkerMessage = {
    status: 'error',
    message: errorMessage(error),
  };
  self.postMessage(message);
}
