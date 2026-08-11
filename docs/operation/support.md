# Support Boundary

확인일: 2026-08-10

이 문서는 현재 공개 기술 체험판과 비공개 review 후보의 지원 범위를 소유한다. 계정, 결제, 원격
telemetry와 운영 고객 데이터는 현재 없다. 자동 검수 PASS는 지원 SLA, 배포, 법률, 교육, 문화, 실제
기기 또는 아동 연구 승인이 아니다.

<a id="ops-support-intake"></a>
## OPS-SUPPORT-INTAKE

결정 책임자는 `repository-maintainer`, 실행자는 `issue-triager`, 검증자는 `repository-maintainer`다.
비민감 기술 문제는
`https://github.com/eddmpython/soombook/issues`에 재현 절차, 대상 commit SHA, 브라우저와 오류 코드만
기록한다. 이름, 연락처, 계정 정보, 아동 정보, 연구 기록, 권리 협의 원본, 비밀정보와 자격증명은 공개
issue에 넣지 않는다.

현재 승인된 비공개 보안 신고 채널과 운영 SLA는 없다. 민감한 신고가 필요한 production 공개는 OG-08에서
비공개 접수 채널, 담당자, 응답 시간, 보존과 삭제 기준을 먼저 승인해야 한다. 이 조건을 갖추기 전에는
공개 기술 체험판 범위를 확장하지 않는다.

지원 route는 다음처럼 분리한다.

- `general-technical`: 공개 GitHub Issues, 비민감 재현만 허용
- `security-privacy`: 미설정, OG-07과 OG-08 전에는 production 확장 차단
- `rights-takedown`: 미설정, OG-02와 OG-08 전에는 외부 권리 자산 공개 차단
- `child-safety-research`: 미설정, OG-06부터 OG-08 전에는 아동 연구 금지

검증 명령은 `npm run check:operations`와 `npm run check:project`다. 입력은 이 문서, `SECURITY.md`, 현재
release identity와 재현 정보다. 증거는 issue URL 또는 비공개 incident ID, commit SHA, 오류 코드와
재현 결과다. `OPS_SUPPORT_SENSITIVE_PUBLIC_DATA`가 발생하면 `support-classify`, `support-route-public`,
`support-stop`, `support-remove-public-data`, `support-escalate` 순서로 처리한다.

<a id="ops-private-security-boundary"></a>
## OPS-PRIVATE-SECURITY-BOUNDARY

결정 책임자는 `privacy-security-owner`, 실행자는 `operator`, 검증자는 `incident-commander`다. 현재 action은
`not-configured`이며 검증 명령은 `npm run check:operations`다. `OPS_SUPPORT_PRIVATE_CHANNEL_MISSING`이면
`private-block-expansion`을 수행한다. `OG-07`, `OG-08`이 승인되기 전에는 private route가 준비됐다고
표현하거나 production 범위를 확장하지 않는다.
