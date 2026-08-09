import { createCanonicalSha256, type BookPack } from '@soombook/book-schema';

export type BookPackWorkerMessage =
  | {
      status: 'ready';
      pack: BookPack;
      assetUrls: Record<string, string>;
      bookPackDigest: string;
      packContentDigest: string;
    }
  | { status: 'error'; message: string };

export function verifyBookPackWorkerReadyMessage(
  message: BookPackWorkerMessage,
  expectedBookPackDigest: string,
  expectedPackContentDigest: string,
  expectedAssetUrls: Readonly<Record<string, string>>,
): Extract<BookPackWorkerMessage, { status: 'ready' }> {
  if (message.status !== 'ready') throw new Error(message.message);
  if (
    message.bookPackDigest !== expectedBookPackDigest ||
    message.packContentDigest !== expectedPackContentDigest ||
    createCanonicalSha256(message.pack) !== expectedBookPackDigest ||
    JSON.stringify(message.assetUrls) !== JSON.stringify(expectedAssetUrls)
  ) {
    throw new Error('책 데이터 신원을 확인하지 못했습니다.');
  }
  return message;
}
