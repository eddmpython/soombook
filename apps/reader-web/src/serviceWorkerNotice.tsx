import { useSyncExternalStore } from 'react';

import { getServiceWorkerSnapshot, subscribeServiceWorker } from './serviceWorkerLifecycle';

export function ServiceWorkerNotice() {
  const state = useSyncExternalStore(
    subscribeServiceWorker,
    getServiceWorkerSnapshot,
    getServiceWorkerSnapshot,
  );
  if (state.mode !== 'online-only' && state.mode !== 'unsupported') return null;

  return (
    <aside className="serviceWorkerNotice" role="status">
      <strong>인터넷에 연결해서 읽는 모드예요.</strong>
      <span>오프라인 준비를 사용할 수 없지만 저장된 진행과 읽기는 그대로 유지돼요.</span>
      {state.recoveryCode ? <small>오류 코드 {state.recoveryCode}</small> : null}
    </aside>
  );
}
