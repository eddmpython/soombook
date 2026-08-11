import { useSyncExternalStore } from 'react';

import { getServiceWorkerSnapshot, subscribeServiceWorker } from './serviceWorkerLifecycle';

export function ServiceWorkerNotice() {
  const snapshot = useSyncExternalStore(
    subscribeServiceWorker,
    getServiceWorkerSnapshot,
    getServiceWorkerSnapshot,
  );
  if (
    snapshot.mode !== 'online-only' &&
    snapshot.mode !== 'recovery-failed' &&
    snapshot.mode !== 'unsupported'
  )
    return null;

  if (snapshot.mode === 'recovery-failed') {
    return (
      <aside className="serviceWorkerNotice" role="alert">
        <strong>오프라인 준비를 정리하지 못했어요.</strong>
        <span>연결된 상태에서 새로고침해 주세요. 저장된 진행은 자동으로 지우지 않았어요.</span>
        <small>오류 코드 {snapshot.recoveryCode}</small>
      </aside>
    );
  }

  return (
    <aside className="serviceWorkerNotice" role="status">
      <strong>인터넷에 연결해서 읽는 모드예요.</strong>
      <span>오프라인 준비를 사용할 수 없지만 저장된 진행과 읽기는 그대로 유지돼요.</span>
      {snapshot.recoveryCode ? <small>오류 코드 {snapshot.recoveryCode}</small> : null}
    </aside>
  );
}
