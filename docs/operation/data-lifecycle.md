# Local Data and Cache Lifecycle

확인일: 2026-08-10

브라우저 로컬 진행과 service worker cache는 서로 다른 데이터다. 한쪽을 지우는 절차가 다른 쪽까지
지웠다고 주장하지 않는다. 자동 PASS는 기기 원격 삭제, production 운영 또는 아동 연구 승인이 아니다.

<a id="ops-local-data-delete"></a>
## OPS-LOCAL-DATA-DELETE

결정 책임자는 `user-or-guardian`, 실행자는 `reader-runtime`, 검증자는 `reader-maintainer`다. action은
`보호자 안내 > 저장된 진행 삭제 확인`이다. 사용자가 삭제 확인을 승인하면
`clearRuntimeState(pack)`이 현재 책 ID의 모든 pack version key와 legacy mirror를 제거한다. 다른 책과
다른 앱의 storage는 지우지 않는다. 삭제 뒤 새 runtime을 만들고 결과를 화면 live 문구로 알린다.

검증 명령은 `npm run test:e2e`, `npm exec vitest run apps/reader-web/src/runtimeStore.test.ts`,
`npm run check:operations`다. 입력은 현재 BookPack
identity와 브라우저 localStorage다. 증거는 삭제 전 key 목록, 삭제 확인 조작, 삭제 뒤 key 목록과 새 시작
화면이다. `OPS_LOCAL_DELETE_FAILED`이면 저장 공간 접근 실패를 알리고 memory session으로 새 탐험을
유지한다. cache, service worker, 다른 책과 다른 origin 데이터는 이 절차의 삭제 범위가 아니다.
단계 ID는 `local-confirm`, `local-cancel-audio`, `local-delete-book-keys`, `local-delete-legacy`,
`local-fresh-runtime`, `local-preserve-failure`, `local-memory-session` 순서다.

<a id="ops-render-error-all-progress-reset"></a>
## OPS-RENDER-ERROR-ALL-PROGRESS-RESET

결정 책임자는 `user-or-guardian`, 실행자는 `reader-error-boundary`, 검증자는 `reader-maintainer`다.
action은 `READER_RENDER_001 > 진행을 지우고 다시 열기`다. 사용자가 전체 진행 삭제를 선택하면
`clearAllRuntimeState()`가 `soombook.runtime.` prefix의 key만 지운다. 다른 app key와 cache는 보존한다.
삭제가 실패하면 reload하지 않고 `LOCAL_DELETE_002`를 표시한다. 검증 명령은
`npm exec vitest run apps/reader-web/src/runtimeStore.test.ts`, `npm run typecheck`,
`npm run check:operations`다. `OPS_RENDER_RESET_FAILED`이면 reload하지 않고 실패를 표시한다. Web Storage
삭제는 transaction이 아니므로 일부 Soombook 진행 key가 이미 삭제됐을 수 있지만, unrelated key와 cache는
보존한다.
단계 ID는 `render-confirm`, `render-delete-prefix`, `render-reload-success`, `render-preserve-storage`,
`render-show-failure` 순서다.

<a id="ops-service-worker-failure-recovery"></a>
## OPS-SERVICE-WORKER-FAILURE-RECOVERY

결정 책임자는 `pwa-maintainer`, 실행자는 `reader-service-worker-lifecycle`, 검증자는 `pwa-reviewer`다.
이 절차는 운영자 원격 purge가 아니라 현재 browser의 등록 또는 갱신
실패 복구다. `recoverServiceWorkerToOnlineOnly`는 현재 app
scope와 정확히 같은 registration만 해제하고, `soombook-reader-` prefix와 현재 scope suffix를 모두 가진
cache만 삭제한다. 로컬 진행은 보존하고 화면에 `SW_REGISTER_001`과 online-only 상태를 표시한다.

검증 명령은 `npm run test:pwa-update`,
`npm exec vitest run apps/reader-web/src/serviceWorkerLifecycle.test.ts`, `npm run check:operations`다. 입력은
app scope, registration 목록과 cache key 목록이다. 증거는 삭제한 cache 수, 해제한 worker 수, 보존한
foreign scope, 복구 코드와 진행 digest다. `OPS_CACHE_SCOPE_MISMATCH`이면 삭제를 중단하고 scope를 다시
확인한다. `OPS_CACHE_RECOVERY_FAILED`이면 `recovery-failed`와 `SW_RECOVERY_002`를 표시하며 online-only
성공을 주장하지 않는다.
단계 ID는 `sw-match-scope`, `sw-unregister-owned`, `sw-match-cache`, `sw-delete-owned`,
`sw-preserve-progress`, `sw-stop-unknown-scope`, `sw-report-failure` 순서다.

<a id="ops-remote-cache-withdrawal-limit"></a>
## OPS-REMOTE-CACHE-WITHDRAWAL-LIMIT

결정 책임자는 `release-operator`, 실행자는 `operator`, 검증자는 `remote-verifier`다. action은
`no-operator-directed-client-cache-purge`다. 현재 host는 설치 기기의 cache를 원격으로 강제 삭제할 수 없다.
`operatorDirectedClientCachePurge`는 false이며 별도 실행 명령도 없다. 안전 대체 release와
`npm run test:pages:remote`, `npm run check:operations`로 fresh client의 현재 remote identity만 확인한다.
이 검증은 이미 열린 client의 교체나 비활성 client cache 삭제를 증명하지 않는다. 열린 client와 비활성
client의 잔여 cache는 `OPS_REMOTE_CACHE_RESIDUAL`로 unresolved 기록한다. OG-08이 필요하다.

단계 ID는 `remote-cache-safe-release`, `remote-cache-verify-fresh`, `remote-cache-record-unresolved`
순서다. 이 절차의 운영자 게이트는 `OG-08`이다.

Pages는 이미 설치된 기기의 cache를 원격으로 즉시 삭제할 수 없다. 권리 또는 안전 철회 때는 안전한 대체
release를 먼저 배포하고 cache 갱신과 remote 확인을 마친 뒤 공개 중단을 판단한다.
