# Withdrawal and Incident Response

확인일: 2026-08-10

이 문서는 권리, 안전, 무결성 또는 배포 사고의 현재 대응 순서를 소유한다. GitHub Pages는 client cache를
강제로 회수할 수 없으므로 단순 unpublish를 철회 완료로 간주하지 않는다. 자동 PASS는 철회, 배포,
법률, 문화, 교육, 실제 기기 또는 아동 연구 승인이 아니다.

<a id="ops-remote-smoke-failure"></a>
## OPS-REMOTE-SMOKE-FAILURE

결정 책임자는 `incident-commander`, 실행자는 `release-operator`, 검증자는 `remote-verifier`다. action은
`pages-preview remote-smoke`다. remote smoke가 실패하면 신규 dispatch를 동결하고 실패 receipt,
release identity와 workflow artifact를 먼저 보존한다. 원인을 platform, artifact, rights 또는 safety로
분류한다. 단순 배포 결함은 마지막 정상 SHA rollback 후보로 보낼 수 있지만 rights 또는 safety 영향은
ordinary rollback을 금지하고 `OPS-CONTENT-WITHDRAWAL`로 보낸다.

검증 명령은 `npm run test:pages:remote`와 `npm run check:operations`다. 입력은 failed run ID, release SHA,
artifact digest, remote URL과 마지막 정상 main SHA다. 증거는 실패 영수증, release identity, 보존 artifact,
분류와 owner다. `OPS_REMOTE_SMOKE_FAILED` 또는 `OPS_REMOTE_FAILURE_UNCLASSIFIED`이면 운영자 승인 없이
resolved로 기록하지 않는다. 순서는 freeze, evidence 보존, 분류, rollback 또는 withdrawal 선택, 운영자
승인, remote 재검증, resolved 또는 escalated 기록이다. OG-08이 필요하다.
단계 ID는 `remote-freeze`, `remote-preserve`, `remote-classify`, `remote-select`,
`remote-operator-approve`, `remote-reverify`, `remote-record` 순서다. 운영자 게이트는 `OG-08`이다.

<a id="ops-rollback-last-known-good"></a>
## OPS-ROLLBACK-LAST-KNOWN-GOOD

결정 책임자는 `incident-commander`, 실행자는 `release-operator`, 검증자는 `remote-verifier`다. action은
`pages-rollback`이다. target은 green remote receipt가 있는 소문자 40자리 `origin/main` ancestor
SHA여야 한다. `npm run check:release:automated`, `npm run test:pages:remote`, `npm run check:operations`를
사용한다. full gate와 build, artifact digest, 운영자 environment 승인, remote smoke를 증거로 남긴다.

순서는 green receipt 확인, main ancestor SHA 검증, affected content 확인과 withdrawal 전환 판단, full gate와
build, 운영자 배포 승인, rollback 배포, remote 검증, 결과 기록이다. `OPS_ROLLBACK_TARGET_UNSAFE`이면
target을 배포하지 않는다.
`OPS_ROLLBACK_REMOTE_UNVERIFIED`이면 정상 복구로 선언하지 않는다. target에 affected rights 또는 safety
content가 있으면 rollback을 중단하고 안전 대체 release를 만든다. OG-08이 필요하다.
단계 ID는 `rollback-confirm-green`, `rollback-validate-sha`, `rollback-switch-withdrawal`,
`rollback-run-gates`, `rollback-operator-approve`, `rollback-deploy`, `rollback-remote-verify`,
`rollback-keep-open` 순서다. 운영자 게이트는 `OG-08`이다.

<a id="ops-content-withdrawal"></a>
## OPS-CONTENT-WITHDRAWAL

결정 책임자는 `rights-or-safety-owner`, 실행자는 `release-operator`, 검증자는 `remote-verifier`다. action은
`pages-preview safe replacement`다. 입력은 affected book/asset ID, rights lifecycle, 마지막 정상 40자리 main
SHA, 현재 release digest와 incident ID다. 다음 순서를 바꾸지 않는다.

1. 신규 release와 권리 승격을 동결한다.
2. 문제 콘텐츠를 제거한 안전한 대체 release를 준비한다.
3. `npm run check:release:automated`와 `npm run check:operations`를 통과한다.
4. 운영자가 Pages 안전 대체 artifact 배포를 승인한다.
5. `npm run test:pages:remote`로 fresh client의 release identity, 전체 여정, service worker와 offline cache를
   확인한다. 이 검증은 이미 열린 client의 전환을 증명하지 않는다.
6. 필요하면 Pages를 중단한다.
7. incident ID, affected identity, 배포·확인 증거와 열린·비활성 client의 남은 cache 한계를 unresolved로
   기록한다.

증거는 target과 replacement SHA, artifact digest, rights state, CI run, remote smoke, cache 확인과 운영자
결정이다. `OPS_WITHDRAWAL_REPLACEMENT_UNVERIFIED`이면 unpublish만으로 완료 처리하지 않고 안전 대체
release 또는 제어 가능한 host 전환을 유지한다. 제거 배포의 운영자 게이트는 `OG-08`이다. `OG-02`는
원인 기록과 재게시 승인에만 필요하며, 문제 콘텐츠 제거의 선행 조건이 아니다.

단계 ID는 `withdrawal-freeze`, `withdrawal-safe-replacement`, `withdrawal-run-gates`,
`withdrawal-operator-approve`, `withdrawal-deploy`, `withdrawal-remote-verify`,
`withdrawal-unpublish-if-required`, `withdrawal-keep-open` 순서다.

<a id="ops-incident-response"></a>
## OPS-INCIDENT-RESPONSE

결정 책임자는 `incident-commander`, 실행자는 `assigned-owner`, 검증자는 `independent-reviewer`다. 기록
action은 `private incident record`다. 사고는 `rights-withdrawal`, `unsafe-content`, `artifact-integrity`,
`service-worker-cache`, `availability`, `security-report` 중 하나로 분류한다. 다음 순서를 따른다.

1. 신규 release를 동결하고 incident ID와 발견 시각을 만든다.
2. 영향 book, pack, artifact, commit, URL과 cache scope를 식별한다.
3. 민감 정보는 공개 issue와 repository에서 분리한다.
4. 결정, 실행과 독립 검증 owner를 배정한다.
5. 안전 대체 release 또는 main 이력의 마지막 정상 SHA rollback을 선택한다.
6. `npm run check:release:automated`, `npm run check:operations`와 필요한 rights gate를 실행한다.
7. 운영자 승인 뒤 배포하고 `npm run test:pages:remote`로 원격 상태를 검증한다.
8. 실패 원인, 조치, 증거, 남은 위험, follow-up owner와 재검토 조건을 기록한다.

증거는 incident ID, severity, affected identities, 판단 책임자, 명령 결과, release receipt, remote smoke와
종료 조건이다. `OPS_INCIDENT_OWNER_MISSING`이면 대응을 완료 처리하지 않는다.
`OPS_INCIDENT_REMOTE_UNVERIFIED`이면 마지막 정상 공개라고 선언하지 않는다. OG-08이 필요하며 권리,
문화, 교육, 접근성 또는 연구 사고는 해당 OG-02부터 OG-06도 별도로 요구한다.
단계 ID는 `incident-freeze`, `incident-identify`, `incident-separate-sensitive`,
`incident-assign-owner`, `incident-choose-recovery`, `incident-run-gates`,
`incident-operator-approve`, `incident-remote-verify`, `incident-keep-open` 순서다. 운영자 게이트는
`OG-08`이다.
