# Soombook V1 PRD Index

상태: 기능 검증용 수직 절편과 10장면 review 후보 구현, 사람 승인 준비 중, 2026-08-09

범위: 초등학교 3학년이 가입 없이 4장면 이야기를 열고, 문장을 읽거나 들은 뒤, 탐험 렌즈 또는 대체
조작으로 서사 단서를 찾고, 그 근거를 말하거나 선택하고, 출처가 있는 문화유산 연결 카드를 확인하는 첫
완결 제품을 만든다.

이 폴더는 미래 설계다. 현재 동작의 정본은 `docs/**`다. 구현이 끝나면 확정 사실을 현재 계약으로 옮기고
이 폴더를 삭제한다.

## Outcome brief

| 필드 | 계약 |
|---|---|
| Primary goal ID | `completeMeaningfulStoryJourney` |
| Supporting goal IDs | `openFirstStoryFast`, `understandStoryThroughEvidence`, `protectChildTrust`, `keepReaderResponsive`, `enableRepeatableBookProduction` |
| 사용자와 실제 대상 | 초등학교 3학년 아이, 공개 4장면 기술 체험판과 비공개 10장면 대표작 review 후보 |
| 관찰할 손실 전이 | `opened -> read -> explored -> reasoned -> connected -> completed` 중 첫 실패 지점 |
| 기준선 권위 | 자동 성인 조작 기준선은 `docs/operation/quality.md`, 실제 아동 결과는 `미측정` |
| 기대 이동 | 성인 조작 검증, 접근성 검증, 보호자 동반 사용성 연구 순으로 완결 루프가 성립 |
| 위험 가드레일 | 권리 오류 0, 아동 개인정보 수집 0, 막힌 대체 조작 0, 저사양 치명 오류 0 |
| 완결 수직 절편 | 4장면, 451자 본문, 세 길 비교 단서 1개, 길과 까닭 근거 선택 1개, fixture 연결 카드 1개, 회상 또는 보물 마무리 |
| 자동 증거 | provenance schema, state machine, 공개·내부·review 격리 build, browser, accessibility, offline, root·Pages 합성 performance gate 구현 완료 |
| 운영자 증거 | 권리, 문화 정확성, 교육 적합성, 실제 기기 눈검수, 아동 연구 승인과 결과 |
| 롤백 | 정적 읽기 모드로 즉시 전환, 문제 자산 비활성화, 신규 진행 저장은 보존 |
| Exit decision | `expand`, `improve`, `repair`, `revert` 중 하나를 원장에 기록 |

## 한 줄 결정

**첫 제품은 플랫폼도 12권 카탈로그도 아니다. 권리가 깨끗한 임시 자산으로 먼저 완성한 무계정 4장면
수직 절편이며, 그 안에서 읽기, 찾기, 추론, 실제 세계 연결이 하나의 검증 가능한 루프로 끝나야 한다.**

## 원문에서 유지한 핵심

- 초3을 첫 타깃으로 고정한다.
- 제품 루프는 읽기, 찾기, 추론하기, 실제 세계와 연결하기다.
- 페이지 넘김과 탐험 렌즈는 감성적 대표 인터페이스다.
- 점수, 경쟁, 광고보다 발견 기록과 재독을 보상으로 쓴다.
- 권리 장부, 아동 안전, 접근성은 출판 전 차단 게이트다.
- 대표작은 《호랑이가 그림에서 사라졌다》다.

## 보강한 핵심

- 원문의 12권, FastAPI, PostgreSQL, 계정 계획은 첫 수직 절편 뒤로 옮긴다.
- Phase 0은 외부 박물관 원본 없이 직접 제작하거나 합성한 fixture로 진행한다.
- 드래그 전용 UI를 금지하고 모든 핵심 행동에 탭과 키보드 대체 경로를 둔다.
- `BookSpec`을 상태 기계, 무결성, 권리 계보, 접근성 대체, 이벤트 계약까지 확장한다.
- 사용자 지표와 아동 연구를 분리하고, 실제 아동 데이터는 승인 전 수집하지 않는다.
- 에이전트가 독립 실행할 수 있는 작업과 사람만 승인할 수 있는 작업을 명시한다.

## 문서 지도와 읽기 순서

1. [00-product-prd.md](00-product-prd.md): 제품 결과, 사용자, 범위, 기능 요구, 완료 판정.
2. [01-source-audit.md](01-source-audit.md): 원문 분석, 유지·수정·보류 결정, 최신 공식 근거.
3. [02-experience-content-pedagogy.md](02-experience-content-pedagogy.md): 아이 여정, 장면, 상호작용, 교육·콘텐츠 계약.
4. [03-bookspec-rights-data-contract.md](03-bookspec-rights-data-contract.md): BookSpec, 진행 상태, 이벤트, 권리 장부와 출판 상태 기계.
5. [04-runtime-architecture.md](04-runtime-architecture.md): 정적 우선 아키텍처, 패키지 경계, 성능, 오프라인, 관측성.
6. [05-child-safety-accessibility-security.md](05-child-safety-accessibility-security.md): 개인정보, 연구, 접근성, 보안, 사람 승인.
7. [06-measurement-experiments-quality.md](06-measurement-experiments-quality.md): 북극성, 이벤트, 실험, 품질 증거, 테스트 행렬.
8. [07-scope-phasing-kill-list.md](07-scope-phasing-kill-list.md): 단계, 의존성, KILL, DEFER, 확장 조건.
9. [08-implementation-plan.md](08-implementation-plan.md): 파일, 심볼, PR 단위, 테스트, 롤백을 포함한 구현 순서.
10. [09-agent-execution-runbook.md](09-agent-execution-runbook.md): 에이전트가 막힘 없이 다음 작업을 선택하는 운영 절차.
11. [10-progress-decision-ledger.md](10-progress-decision-ledger.md): 확인 사실, 결정, 미해결, 진행과 NEXT의 단일 원장.
12. [11-productization-completion-audit.md](11-productization-completion-audit.md): FR, NFR, Phase별 현재 증거와 남은 완료 조건.
13. [12-child-study-protocol.md](12-child-study-protocol.md): 승인 전 아동 연구 질문, 최소 수집, 중단과 삭제 초안.

## 문서 충돌 우선순위

구현 착수 시 `08-implementation-plan.md`의 단계, 파일 경계, 수용 기준이 우선한다. 다만 아동 안전,
권리, 접근성에 관한 충돌은 `05-child-safety-accessibility-security.md`가 우선한다. 제품 목표와 범위 충돌은
`00-product-prd.md`가 우선한다.

## 착수 순서

```text
문서와 실패 게이트
-> 정적 앱 셸과 BookSpec 최소 계약
-> 한 장면 읽기 수직 절편
-> 4장면 완결 루프
-> 접근성, 성능, 오프라인 하드닝
-> 사람 승인 준비 패키지
-> 권리와 연구 승인 뒤 실제 자산 및 아동 연구
-> 결과에 따라 한 권 확장 여부 결정
```

승인이 없는 외부 자산과 실제 아동 데이터는 착수 순서의 병렬 입력이지 코드 작업 전체를 막는 전제 조건이
아니다.
