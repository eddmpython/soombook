import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import { App } from './app';
import { AppErrorBoundary } from './appErrorBoundary';
import { ServiceWorkerNotice } from './serviceWorkerNotice';
import { startServiceWorkerLifecycle } from './serviceWorkerLifecycle';
import './styles.css';

document.documentElement.dataset.releaseId = import.meta.env.VITE_SOOMBOOK_RELEASE_ID ?? 'local';

startServiceWorkerLifecycle(registerSW, {
  appScope: new URL(import.meta.env.BASE_URL, window.location.href).href,
  cacheStorage: 'caches' in window ? window.caches : undefined,
  serviceWorker: 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
});

const root = document.getElementById('root');
if (!root) {
  throw new Error('React 루트 요소를 찾을 수 없습니다.');
}

createRoot(root).render(
  <StrictMode>
    <ServiceWorkerNotice />
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
