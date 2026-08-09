import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getServiceWorkerSnapshot,
  recoverServiceWorkerToOnlineOnly,
  SOOMBOOK_CACHE_PREFIX,
  startServiceWorkerLifecycle,
  type RegisterServiceWorker,
} from './serviceWorkerLifecycle';

function registration(scope: string, result = true) {
  const unregister = vi.fn(() => Promise.resolve(result));
  return {
    unregister,
    value: { scope, unregister } as unknown as ServiceWorkerRegistration,
  };
}

describe('service worker lifecycle', () => {
  beforeEach(() => {
    const register: RegisterServiceWorker = () => () => Promise.resolve();
    startServiceWorkerLifecycle(register, {
      appScope: 'https://example.test/soombook/',
      cacheStorage: undefined,
      serviceWorker: undefined,
    });
  });

  it('현재 app scope와 숨책 cache만 제거하고 다른 project와 진행 저장을 보존한다', async () => {
    const own = registration('https://example.test/soombook/');
    const other = registration('https://example.test/another-project/');
    const progress = new Map([['soombook:progress:v4:tiger-demo:0.3.0', '{"status":"reading"}']]);
    const deleted: string[] = [];
    const ownCache = `${SOOMBOOK_CACHE_PREFIX}precache-v1-https://example.test/soombook/`;
    const otherSoombookCache = `${SOOMBOOK_CACHE_PREFIX}precache-v1-https://example.test/another-project/`;

    const result = await recoverServiceWorkerToOnlineOnly({
      appScope: 'https://example.test/soombook/',
      serviceWorker: {
        getRegistrations: () => Promise.resolve([own.value, other.value]),
      },
      cacheStorage: {
        keys: () => Promise.resolve([ownCache, otherSoombookCache, 'another-project-precache-v1']),
        delete: (cacheName) => {
          deleted.push(cacheName);
          return Promise.resolve(true);
        },
      },
    });

    expect(result).toEqual({ deletedCaches: 1, unregisteredWorkers: 1 });
    expect(own.unregister).toHaveBeenCalledOnce();
    expect(other.unregister).not.toHaveBeenCalled();
    expect(deleted).toEqual([ownCache]);
    expect(progress.get('soombook:progress:v4:tiger-demo:0.3.0')).toBe('{"status":"reading"}');
    expect(getServiceWorkerSnapshot()).toEqual({
      mode: 'online-only',
      recoveryCode: 'SW_REGISTER_001',
    });
  });

  it('등록 실패를 숨기지 않고 online-only 복구를 실행한다', async () => {
    const own = registration('https://example.test/soombook/');
    const register: RegisterServiceWorker = (options) => {
      options.onRegisterError(new Error('synthetic registration failure'));
      return () => Promise.resolve();
    };
    startServiceWorkerLifecycle(register, {
      appScope: 'https://example.test/soombook/',
      serviceWorker: {
        getRegistrations: () => Promise.resolve([own.value]),
      } as unknown as ServiceWorkerContainer,
      cacheStorage: {
        keys: () => Promise.resolve([]),
        delete: () => Promise.resolve(false),
      } as unknown as CacheStorage,
    });

    await vi.waitFor(() =>
      expect(getServiceWorkerSnapshot()).toEqual({
        mode: 'online-only',
        recoveryCode: 'SW_REGISTER_001',
      }),
    );
    expect(own.unregister).toHaveBeenCalledOnce();
  });

  it('지원하지 않는 browser를 online-only 상태로 명시한다', () => {
    const register = vi.fn<RegisterServiceWorker>();
    startServiceWorkerLifecycle(register, {
      appScope: 'https://example.test/soombook/',
      cacheStorage: undefined,
      serviceWorker: undefined,
    });
    expect(register).not.toHaveBeenCalled();
    expect(getServiceWorkerSnapshot()).toEqual({ mode: 'unsupported', recoveryCode: null });
  });

  it('새 worker를 현재 문서 reload 없이 활성화한다', async () => {
    const updateWorker = vi.fn(() => Promise.resolve());
    let requestRefresh: (() => void) | null = null;
    let requestReload: (() => void) | null = null;
    const register: RegisterServiceWorker = (options) => {
      requestRefresh = options.onNeedRefresh;
      requestReload = options.onNeedReload;
      return updateWorker;
    };
    startServiceWorkerLifecycle(register, {
      appScope: 'https://example.test/soombook/',
      serviceWorker: {
        getRegistrations: () => Promise.resolve([]),
      } as unknown as ServiceWorkerContainer,
      cacheStorage: {
        keys: () => Promise.resolve([]),
        delete: () => Promise.resolve(false),
      } as unknown as CacheStorage,
    });

    requestRefresh!();
    await vi.waitFor(() => expect(updateWorker).toHaveBeenCalledWith(false));
    requestReload!();
    expect(getServiceWorkerSnapshot()).toEqual({ mode: 'update-ready', recoveryCode: null });
  });

  it('등록 함수가 반환되기 전의 갱신 요청도 한 번 활성화한다', async () => {
    const updateWorker = vi.fn(() => Promise.resolve());
    const register: RegisterServiceWorker = (options) => {
      options.onNeedRefresh();
      options.onNeedRefresh();
      return updateWorker;
    };

    startServiceWorkerLifecycle(register, {
      appScope: 'https://example.test/soombook/',
      serviceWorker: {
        getRegistrations: () => Promise.resolve([]),
      } as unknown as ServiceWorkerContainer,
      cacheStorage: {
        keys: () => Promise.resolve([]),
        delete: () => Promise.resolve(false),
      } as unknown as CacheStorage,
    });

    await vi.waitFor(() => expect(updateWorker).toHaveBeenCalledOnce());
    expect(updateWorker).toHaveBeenCalledWith(false);
  });

  it('등록 함수가 동기 예외를 던져도 online-only로 복구한다', async () => {
    const own = registration('https://example.test/soombook/');
    const register: RegisterServiceWorker = () => {
      throw new Error('synthetic synchronous registration failure');
    };

    startServiceWorkerLifecycle(register, {
      appScope: 'https://example.test/soombook/',
      serviceWorker: {
        getRegistrations: () => Promise.resolve([own.value]),
      } as unknown as ServiceWorkerContainer,
      cacheStorage: {
        keys: () => Promise.resolve([]),
        delete: () => Promise.resolve(false),
      } as unknown as CacheStorage,
    });

    await vi.waitFor(() =>
      expect(getServiceWorkerSnapshot()).toEqual({
        mode: 'online-only',
        recoveryCode: 'SW_REGISTER_001',
      }),
    );
    expect(own.unregister).toHaveBeenCalledOnce();
  });

  it('갱신 활성화가 실패하면 현재 scope만 정리하고 online-only로 복구한다', async () => {
    const own = registration('https://example.test/soombook/');
    const other = registration('https://example.test/another-project/');
    const ownCache = `${SOOMBOOK_CACHE_PREFIX}precache-v1-https://example.test/soombook/`;
    const otherCache = `${SOOMBOOK_CACHE_PREFIX}precache-v1-https://example.test/another-project/`;
    const deleted: string[] = [];
    let reportRegistered:
      ((scriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void) | null =
      null;
    let reportOfflineReady: (() => void) | null = null;
    let reportNeedReload: (() => void) | null = null;
    const register: RegisterServiceWorker = (options) => {
      reportRegistered = options.onRegisteredSW;
      reportOfflineReady = options.onOfflineReady;
      reportNeedReload = options.onNeedReload;
      queueMicrotask(options.onNeedRefresh);
      return () => Promise.reject(new Error('synthetic update failure'));
    };

    startServiceWorkerLifecycle(register, {
      appScope: 'https://example.test/soombook/',
      serviceWorker: {
        getRegistrations: () => Promise.resolve([own.value, other.value]),
      } as unknown as ServiceWorkerContainer,
      cacheStorage: {
        keys: () => Promise.resolve([ownCache, otherCache]),
        delete: (cacheName: string) => {
          deleted.push(cacheName);
          return Promise.resolve(true);
        },
      } as unknown as CacheStorage,
    });

    await vi.waitFor(() =>
      expect(getServiceWorkerSnapshot()).toEqual({
        mode: 'online-only',
        recoveryCode: 'SW_REGISTER_001',
      }),
    );
    expect(own.unregister).toHaveBeenCalledOnce();
    expect(other.unregister).not.toHaveBeenCalled();
    expect(deleted).toEqual([ownCache]);

    reportRegistered!('/sw.js', own.value);
    reportOfflineReady!();
    reportNeedReload!();
    expect(getServiceWorkerSnapshot()).toEqual({
      mode: 'online-only',
      recoveryCode: 'SW_REGISTER_001',
    });
  });
});
