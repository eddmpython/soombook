import { useEffect, useState } from 'react';

import type { BookPack } from '@soombook/book-schema';
import { loadConfiguredBookAssetUrls } from 'virtual:soombook-book-asset-urls';

import { BookReader } from './bookReader';
import {
  type BookPackWorkerMessage,
  verifyBookPackWorkerReadyMessage,
} from './bookPackWorkerContract';

type BookPackLoadState =
  | { status: 'loading' }
  | {
      status: 'ready';
      pack: BookPack;
      assetUrls: Record<string, string>;
      bookPackDigest: string;
      packContentDigest: string;
    }
  | { status: 'error'; message: string };

function PackLoadError({ message }: { message: string }): never {
  throw new Error(message);
}

export function App() {
  const [loadState, setLoadState] = useState<BookPackLoadState>({ status: 'loading' });

  useEffect(() => {
    const worker = new Worker(new URL('./bookPackWorker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event: MessageEvent<BookPackWorkerMessage>) => {
      try {
        const verified = verifyBookPackWorkerReadyMessage(
          event.data,
          SOOMBOOK_EXPECTED_BOOK_PACK_DIGEST,
          SOOMBOOK_EXPECTED_PACK_CONTENT_DIGEST,
          loadConfiguredBookAssetUrls(),
        );
        document.documentElement.dataset.bookPackDigest = verified.bookPackDigest;
        document.documentElement.dataset.packContentDigest = verified.packContentDigest;
        setLoadState(verified);
      } catch (error) {
        setLoadState({
          status: 'error',
          message: error instanceof Error ? error.message : '책 데이터 신원을 확인하지 못했습니다.',
        });
      }
    };
    worker.onerror = () => {
      setLoadState({
        status: 'error',
        message: '책 데이터 검증 작업을 시작하지 못했습니다.',
      });
    };
    return () => {
      worker.terminate();
      delete document.documentElement.dataset.bookPackDigest;
      delete document.documentElement.dataset.packContentDigest;
    };
  }, []);

  if (loadState.status === 'error') {
    return <PackLoadError message={loadState.message} />;
  }
  if (loadState.status === 'loading') {
    return (
      <main className="loadingPage" aria-busy="true">
        <section className="loadingPanel" aria-labelledby="loading-title">
          <span className="eyebrow">책 데이터 검증</span>
          <h1 id="loading-title">이야기를 준비하고 있어요</h1>
          <p>책의 구조와 권리 기록을 확인한 뒤 읽기 화면을 엽니다.</p>
        </section>
      </main>
    );
  }
  return <BookReader assetUrls={loadState.assetUrls} pack={loadState.pack} />;
}
