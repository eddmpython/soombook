# 06. Measurement, Experiments, and Quality

상태: V1 측정과 품질 계약 v1.0

범위: primary journey, metric authority, 실험, 자동 검증, 프론트 검수, 성능, 증거 registry, release 판정.

## 1. 무엇을 성공으로 세는가

북극성 후보는 `weeklyMeaningfulStoryJourneys`지만 실제 아동 cohort authority가 없으므로 현재 값은
`미측정`이다. V1 구현의 primary goal ID는 `completeMeaningfulStoryJourney`다.

```text
opened -> read -> explored -> reasoned -> connected -> completed
```

한 journey는 아이 또는 승인된 연구 참여자의 의도적 시작 하나가 위 상태를 순서대로 통과한 결과다. 화면
노출, 클릭 수, audio play, hotspot hit만으로 완료를 만들지 않는다.

### 1.1 상태 권위

| 상태 | receipt 조건 | 대체할 수 없는 이유 |
|---|---|---|
| `opened` | 표지 또는 시작 제어의 명시적 command | 자동 mount는 의도 아님 |
| `read` | 핵심 text가 직접 읽기 확인 또는 narration 완료 | 장면 노출은 읽기 아님 |
| `explored` | 필수 interaction command가 완료 | hint 표시는 발견 아님 |
| `reasoned` | 근거 선택 또는 말해 보기 선택이 확정 | 정답 카드 노출은 추론 아님 |
| `connected` | 연결 카드를 사용자가 열어봄 | 미리 렌더한 DOM은 확인 아님 |
| `completed` | 4장면과 완주 선택이 확정 | 마지막 장면 진입은 완주 아님 |

receipt는 `journeyId`, state, bookId, packVersion, sceneId, origin, idempotency key만 가진다. 본문, 답변,
이름, 정확한 pointer 좌표는 갖지 않는다.

## 2. Semantic authority와 count authority

### 2.1 Semantic authority

`book-runtime`의 순수 reducer가 전이 가능 여부와 receipt를 판정한다. UI component, audio callback, CSS
animation, 분석 SDK는 완료를 직접 선언하지 않는다.

### 2.2 Count authority

| origin | 자동 품질 증거 | 제품 지표 분자 |
|---|---:|---:|
| `automatedTest` | 예 | 아니오 |
| `developer` | 예 | 아니오 |
| `adultQa` | 예 | 아니오 |
| `researchParticipant` | 승인 뒤 | 승인된 연구 분석만 |
| `productionGuest` | 별도 privacy 승인 뒤 | 권위 window 승인 뒤 |

V1은 원격 count store를 구현하지 않는다. 자동 테스트가 100회 완주해도 실제 사용률은 `미측정`이다.

## 3. 지표 계층

### 3.1 Primary result

- `meaningfulStoryJourneyCompleted`: 순서가 완결된 distinct journey.

### 3.2 손실 전이

- `openedToRead`
- `readToExplored`
- `exploredToReasoned`
- `reasonedToConnected`
- `connectedToCompleted`

현재 제품 작업은 가장 큰 첫 손실 전이 하나만 선택한다. 여러 전이를 동시에 최적화해 원인을 흐리지 않는다.

### 3.3 가드레일

- rights error 0
- culture claim misrepresentation 0
- child personal data collection 0
- blocked alternative action 0
- audio overlap 0
- progress silent loss 0
- critical console error 0
- low-tier fatal session 0

### 3.4 진단 지표

- first readable scene latency
- asset fallback code
- audio fallback code
- motion mode
- input adapter class
- scene transition retry
- local progress migration result

진단 지표는 사용자 능력 점수나 광고 profile로 사용하지 않는다.

## 4. 기준선과 목표 규칙

1. 권위 있는 자료가 없으면 `0`이 아니라 `미측정`이다.
2. 기술 예산과 사용자 성과 목표를 구분한다.
3. 작은 연구의 비율을 시장 전환율로 발표하지 않는다.
4. 평균만 보지 않고 실패 장면, 입력 경로, motion 설정을 함께 본다.
5. 목표 숫자는 최소 4개 완전한 승인 window 또는 명시된 연구 설계 뒤 검토한다.
6. 결과가 가드레일을 악화시키면 성장 근거로 무효다.

기술 목표인 LCP, INP, asset byte는 개발 예산이다. 실제 아동 완주율과 같은 제품 지표가 아니다.

## 5. 실험 계약

실험은 다음 필드를 모두 가진다.

```text
experimentId
hypothesis
primaryLossTransition
variant
populationAuthority
exposureRule
successSignal
guardrails
minimumEvidence
stopRule
decision
rollback
```

실험을 시작하기 전에 실패 시 어느 코드를 되돌릴지 정한다. 사용자를 몰래 분기하거나 승인되지 않은 아동
traffic에 원격 variant를 적용하지 않는다.

### E1. 읽기 뒤 탐색 해금

| 필드 | 계약 |
|---|---|
| 가설 | 핵심 문장 뒤 탐색을 열면 찾기만 반복하는 손실이 줄어든다 |
| A | 장면 진입 즉시 탐색 가능 |
| B | 핵심 문장 직접 확인 또는 narration 뒤 탐색 가능 |
| 첫 권장 | B |
| 성공 | `read -> explored -> reasoned`의 관찰 품질 |
| 중단 | 아이가 잠금을 벌이나 고장으로 해석 |
| rollback | 탐색 즉시 허용, 본문 근거를 interaction 안에 재제시 |

자동 테스트는 A와 B의 state machine이 정확한지만 확인한다. 교육 효과는 승인된 연구가 필요하다.

### E2. 페이지 전환 물성

| variant | 설명 |
|---|---|
| A | 짧은 CSS fold |
| B | 최소 opacity와 translate |
| C | 즉시 정적 전환 |

성공은 화려함이 아니라 scene skip 0, motion 불편 0, 첫 장면 지연 예산, 조작 발견이다. 저사양과 reduced
motion에는 C가 정상 제품 경로다.

### E3. 낭독 하이라이트 단위

- 문장 단위와 어절 단위를 비교한다.
- 250ms 이상 지속 mismatch, 시선 방해, 단어 재생 발견성을 본다.
- browser TTS 차이를 실험 결과로 섞지 않는다. 같은 검수 음원과 timing data를 쓴다.

### E4. 연결 카드 시점

- 추론 직전 카드는 금지 기준선이다. 사실 정보가 사건 답을 대신할 수 있다.
- 추론 뒤 즉시 카드와 완주 뒤 카드의 흐름 이탈을 비교한다.
- fixture와 실제 자산 혼동이 하나라도 있으면 문구와 시각 구분을 `repair`한다.

## 6. 테스트 전략

테스트는 가장 좁은 결정론 계약에서 공개 브라우저 여정으로 넓힌다.

```text
schema and pure domain
-> component and adapter
-> integration and persistence
-> browser journey
-> visual and accessibility
-> performance and offline
-> operator device review
-> approved child research
```

### 6.1 Tier 1, quick gate

목표: 변경 중 빠른 회귀 확인, 3분 안팎.

- format, typecheck, lint
- affected unit tests
- schema fixture validate
- document and prohibited-character gate
- dependency boundary and forbidden API audit
- production pack rights negative fixture

### 6.2 Tier 2, full gate

목표: main 반영 전 전체 공유 경계 확인.

- 모든 unit과 integration test
- Chromium journey
- axe accessibility
- keyboard-only와 pointer-only journey
- build와 static preview smoke
- offline reload
- content security와 external request allowlist
- UI audit receipt 생성과 finding 0 확인

### 6.3 Tier 3, release and scheduled gate

목표: 브라우저와 성능 변동, 공급망, 실제 기기 준비 확인.

- Chromium, Firefox, WebKit journey
- desktop 1440x900, tablet 768x1024, mobile 390x844
- reduced motion, 200% zoom, offline
- cold와 warm performance profile
- dependency audit와 license inventory
- stale rights와 claim review 재검사
- 운영자 실기기 checklist

전체 테스트를 매 수정마다 실행하지 않는다. 다만 공개 상태, schema, state machine, 공통 UI를 바꾸면 Tier 2로
확대한다.

## 7. 테스트 행렬

| 위험 | 최소 자동 증거 | 사람 증거 |
|---|---|---|
| schema drift | valid와 invalid BookPack fixture | authoring 오류 문구 확인 |
| 잘못된 상태 건너뛰기 | property transition matrix | 없음 |
| duplicate 완료 | retry 20회 뒤 receipt 1 | 없음 |
| page와 lens 충돌 | pointer capture cancel E2E | touch 실기기 |
| audio overlap | scene leave lifecycle test | 실제 음량과 끊김 |
| local progress 손실 | IndexedDB fault와 migration | 새로 고침, 회전, 재진입 |
| drag 의존 | pointer-only와 keyboard-only E2E | 보조기기 |
| motion 불편 | reduced motion snapshot | 민감성 검수 |
| fixture 오인 | text와 truth state assertion | 아동 문구 검토 |
| 외부 코드 주입 | HTML, URL, path traversal negative fixture | 없음 |
| offline 실패 | service worker reload journey | 기기 비행기 모드 |
| 화면 깨짐 | viewport audit와 screenshot | 눈검수 |

## 8. 프론트 검수 메커니즘

빌드 성공은 화면 합격 증거가 아니다. `ui-audit`은 실제 브라우저에서 제품 여정을 수행하고 JSON receipt와
스크린샷을 저장한다.

### 8.1 시나리오

1. `first-open`: 첫 화면에서 책을 열고 첫 장면이 읽힌다.
2. `read-along`: 읽기 모드 전환, 하이라이트, 장면 이동 뒤 audio 정리.
3. `find-clue-pointer`: drag 없이 영역 tap으로 clue 완료.
4. `find-clue-keyboard`: keyboard와 focus만으로 같은 clue 완료.
5. `reason-and-connect`: 근거 선택, fixture 카드, 완주.
6. `progress-recovery`: 새로 고침 뒤 장면과 설정 복구, 삭제 제어.
7. `reduced-motion`: 애니메이션 없이 동일 완주.
8. `offline-finish`: 한번 연 fixture를 network 없이 완주.

### 8.2 viewport

- desktop: 1440x900
- tablet: 768x1024
- mobile: 390x844

### 8.3 자동 finding

- 수평 overflow
- viewport 밖 주요 control
- 중복 QA selector
- console error와 unhandled rejection
- 실패한 image, font, audio request
- 44px 목표 미달 주요 아동 control
- 보이지 않거나 잘린 focus indicator
- 로딩 종료 뒤 실질 text와 interactive control 부재
- 예상 밖 third-party request
- fixture 표시 누락

### 8.4 시각 판정

자동 finding 0만으로 눈검수를 대체하지 않는다. 각 screenshot은 다음을 사람이 확인한다.

- 한눈에 현재 주 행동이 보이는가.
- 책, 도구, 본문이 장난감 dashboard가 아니라 한 장면으로 읽히는가.
- 아이 문구가 짧고 직접적인가.
- 본문 대비, 행 길이, 줄 간격이 읽기 편한가.
- 손가락이 렌즈와 단서를 가리지 않는가.
- fixture, 허구, 실제 자료 표시가 오해를 만들지 않는가.
- 모바일에서 책이 축소된 데스크톱 화면처럼 보이지 않는가.

receipt와 screenshot은 저장소 밖 `../soombook.out/ui-audit/<runId>/`에 둔다. Git에는 코드, 시나리오,
판정 규칙만 남긴다.

## 9. 성능과 안정성 품질

### 9.1 초기 예산

| 항목 | 목표 | 측정 문맥 |
|---|---:|---|
| app shell compressed JS + CSS | 350KB 이하 | production build |
| 첫 장면 base image와 style | 600KB 이하 | critical request |
| first readable scene LCP | 2.5초 이하 | mid-tier mobile profile |
| INP | 200ms 이하 | 실제 scripted interaction |
| CLS | 0.1 이하 | 첫 장면과 전환 |
| 200ms 초과 long task | 0 | 4장면 journey |
| scene skip | 0 | 20회 연속 이동 |
| audio overlap | 0 | 20회 이동과 mode 전환 |
| 지속 memory 증가 | 없음 | 4장면 5회 반복 뒤 |

환경, network, cold 또는 warm cache를 receipt에 기록한다. 도구 점수 하나만으로 사용자 성능을 판정하지
않는다.

### 9.2 실패 분리

- 제품 결함: 같은 환경에서 재현되고 contract를 위반한다.
- fixture 결함: 누락 또는 의도하지 않은 invalid pack이다.
- 검사 환경: 브라우저 실행 실패, 포트 점유, 동기화 폴더 lock, server reload다.
- 외부 환경: registry, browser download, OS voice처럼 제품이 통제하지 못하는 입력이다.

검사가 끝나기 전 중간 로그를 최종 실패로 읽지 않는다. timeout이면 child process와 실제 결과 파일을 각각
확인한다.

## 10. 증거 registry

`scripts/check_project_docs.py`를 시작으로 Phase 0에서 `scripts/check_project.py`를 만든다. registry는
문서에 적힌 gate, 실제 script, package command, CI job이 서로 누락되지 않았는지 검사한다.

각 gate entry는 다음을 가진다.

```json
{
  "id": "bookpack-contract",
  "owner": "packages/book-schema",
  "command": "npm run test:contracts",
  "ci": "quality / contracts",
  "blocking": true,
  "evidence": "junit-or-json-receipt"
}
```

registry self-test는 다음 결함에서 실제 red를 만들어야 한다.

- 등록 파일 없음
- command 없음
- CI projection 없음
- blocking gate를 warning으로 실행
- 문서 command와 package script drift
- UI audit scenario 또는 viewport 누락

## 11. Release 판정

한 품질 window가 끝나면 `10-progress-decision-ledger.md`에 하나를 기록한다.

| 판정 | 의미 | 행동 |
|---|---|---|
| `expand` | 핵심 루프와 가드레일이 성립 | 다음 장면 또는 한 권 확장 |
| `improve` | 결과는 성립하지만 마찰이 큼 | 같은 범위의 UX와 성능 개선 |
| `repair` | 안전, 권리, 상태, 데이터 신뢰 결함 | 확장 중지, 원인 계약 수정 |
| `revert` | 가설이 기준선보다 나쁨 | 기능 제거 또는 정적 읽기 기본 |

판정에는 변경 ref, 실행 명령, 자동 증거, 사람 증거, 미확인 항목, 다음 손실 전이, rollback 위치를 함께 쓴다.
