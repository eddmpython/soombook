export const SOOMBOOK_CACHE_PREFIX = 'soombook-reader-';

export type ServiceWorkerMode =
  'registering' | 'ready' | 'offline-ready' | 'update-ready' | 'online-only' | 'unsupported';

export interface ServiceWorkerSnapshot {
  mode: ServiceWorkerMode;
  recoveryCode: 'SW_REGISTER_001' | null;
}

interface RegisterServiceWorkerOptions {
  immediate: true;
  onRegisteredSW: (scriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
  onOfflineReady: () => void;
  onNeedRefresh: () => void;
  onNeedReload: () => void;
  onRegisterError: (error: unknown) => void;
}

export type RegisterServiceWorker = (
  options: RegisterServiceWorkerOptions,
) => (reloadPage?: boolean) => Promise<void>;

export interface ServiceWorkerRecoveryEnvironment {
  appScope: string;
  cacheStorage: Pick<CacheStorage, 'delete' | 'keys'>;
  serviceWorker: Pick<ServiceWorkerContainer, 'getRegistrations'>;
}

const listeners = new Set<() => void>();
let snapshot: ServiceWorkerSnapshot = { mode: 'registering', recoveryCode: null };

function publish(next: ServiceWorkerSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function getServiceWorkerSnapshot(): ServiceWorkerSnapshot {
  return snapshot;
}

export function subscribeServiceWorker(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function recoverServiceWorkerToOnlineOnly(
  environment: ServiceWorkerRecoveryEnvironment,
): Promise<{ deletedCaches: number; unregisteredWorkers: number }> {
  const registrations = await environment.serviceWorker.getRegistrations();
  let unregisteredWorkers = 0;
  for (const registration of registrations) {
    if (registration.scope !== environment.appScope) continue;
    if (await registration.unregister()) unregisteredWorkers += 1;
  }

  const cacheNames = await environment.cacheStorage.keys();
  let deletedCaches = 0;
  for (const cacheName of cacheNames) {
    if (!cacheName.startsWith(SOOMBOOK_CACHE_PREFIX) || !cacheName.endsWith(environment.appScope))
      continue;
    if (await environment.cacheStorage.delete(cacheName)) deletedCaches += 1;
  }
  publish({ mode: 'online-only', recoveryCode: 'SW_REGISTER_001' });
  return { deletedCaches, unregisteredWorkers };
}

export function startServiceWorkerLifecycle(
  registerServiceWorker: RegisterServiceWorker,
  browser: {
    appScope: string;
    cacheStorage: CacheStorage | undefined;
    serviceWorker: ServiceWorkerContainer | undefined;
  },
): void {
  if (!browser.serviceWorker || !browser.cacheStorage) {
    publish({ mode: 'unsupported', recoveryCode: null });
    return;
  }

  publish({ mode: 'registering', recoveryCode: null });
  const environment: ServiceWorkerRecoveryEnvironment = {
    appScope: browser.appScope,
    cacheStorage: browser.cacheStorage,
    serviceWorker: browser.serviceWorker,
  };
  let activateWaitingWorker: ReturnType<RegisterServiceWorker> | null = null;
  let activationRequested = false;
  let activationStarted = false;
  let recoveryStarted = false;

  const recoverOnce = (): void => {
    if (recoveryStarted) return;
    recoveryStarted = true;
    void recoverServiceWorkerToOnlineOnly(environment).catch(() => {
      publish({ mode: 'online-only', recoveryCode: 'SW_REGISTER_001' });
    });
  };

  const activateUpdate = (): void => {
    activationRequested = true;
    if (!activateWaitingWorker || activationStarted || recoveryStarted) return;
    activationRequested = false;
    activationStarted = true;
    void activateWaitingWorker(false).catch(recoverOnce);
  };

  try {
    activateWaitingWorker = registerServiceWorker({
      immediate: true,
      onRegisteredSW: (_scriptUrl, registration) => {
        if (registration && !recoveryStarted) publish({ mode: 'ready', recoveryCode: null });
      },
      onOfflineReady: () => {
        if (!recoveryStarted) publish({ mode: 'offline-ready', recoveryCode: null });
      },
      onNeedRefresh: activateUpdate,
      onNeedReload: () => {
        if (!recoveryStarted) publish({ mode: 'update-ready', recoveryCode: null });
      },
      onRegisterError: recoverOnce,
    });
    if (activationRequested) activateUpdate();
  } catch {
    recoverOnce();
  }
}
