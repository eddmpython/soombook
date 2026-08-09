# 09. Agent Execution Runbook

상태: Phase 0 에이전트 운영 계약 v1.0

목적: 새 세션의 에이전트가 현재 상태를 과장하지 않고, 다음 손실 전이와 안전한 작업선을 골라, 구현, 검증,
기록까지 막힘 없이 이어가게 한다.

## 1. 시작 순서

모든 변경 세션은 다음 순서를 지킨다.

```text
CLAUDE.md 전체
-> git status --short --branch
-> README.md와 docs/README.md
-> mainPlan/README.md
-> 이 initiative README와 10-progress-decision-ledger.md
-> 변경 범위의 소유 문서
-> 이름과 개념 검색
-> document baseline
-> 가장 작은 실패 재현
```

복사 실행:

```powershell
git status --short --branch
python scripts/check_project_docs.py
rg -n "찾는이름|찾는개념" .
```

제품 코드가 생긴 뒤에는 `docs/operation/workspace.md`의 현재 명령을 따른다. `mainPlan`의 미래 명령을 실제로
있는 것처럼 실행하지 않는다.

## 2. 정보 소유권

| 질문 | 정본 |
|---|---|
| 무엇을 만들며 성공은 무엇인가 | `00-product-prd.md` |
| 원문에서 무엇을 유지, 수정, 보류했나 | `01-source-audit.md` |
| 아이가 어떤 장면을 경험하나 | `02-experience-content-pedagogy.md` |
| pack, state, rights, claim은 무엇인가 | `03-bookspec-rights-data-contract.md` |
| package와 runtime 의존 방향은 무엇인가 | `04-runtime-architecture.md` |
| 안전, 접근성, 보안에서 무엇이 우선인가 | `05-child-safety-accessibility-security.md` |
| 어떤 증거로 완료를 판정하나 | `06-measurement-experiments-quality.md` |
| 무엇을 지금 만들지 않는가 | `07-scope-phasing-kill-list.md` |
| 파일과 심볼을 어떤 순서로 만드나 | `08-implementation-plan.md` |
| 현재 사실, 결정, NEXT는 무엇인가 | `10-progress-decision-ledger.md` |
| 지금 실제로 도는 명령과 구조 | `docs/**` |

같은 사실을 여러 문서에서 고치지 않는다. 소유 문서를 바꾸고 다른 문서에는 link만 둔다.

## 3. 작업 선택 알고리즘

### 3.1 첫 선택

1. 원장의 `현재 Phase`와 `NEXT`를 읽는다.
2. 이미 완료라고 적힌 항목도 code, test, execution evidence가 있는지 확인한다.
3. blocking gate가 red면 그 gate를 먼저 고친다.
4. gate가 green이면 primary journey의 첫 미완 상태를 고른다.
5. 사람 승인 대기면 같은 Phase의 fallback lane을 고른다.
6. 관련 없는 개선은 새 범위로 열지 않는다.

### 3.2 우선순위 함수

```text
아동 안전과 권리 결함
> 데이터 손실과 상태 불일치
> 접근성으로 막힌 core action
> primary journey 단절
> 공개 화면과 contract drift
> 성능과 offline 결함
> 감성 polish
> future platform breadth
```

기능이 예뻐도 core action이 keyboard로 막히면 접근성 결함을 먼저 고친다. schema가 거짓인데 화면만
정상으로 보이면 schema와 validator를 먼저 고친다.

## 4. 작업 카드

코드 작업 하나는 시작 전에 최소한 다음을 적는다. 별도 임시 문서를 만들 필요는 없고 원장 entry나 작업
메모리에 남긴다.

```text
primary goal ID
current loss transition
user result
owner files
public symbols
precondition
smallest failing evidence
implementation boundary
tests
browser or operator evidence
rollback
out of scope
```

이 필드가 없으면 큰 변경에서 완료 기준이 흔들리기 쉽다.

## 5. 정공법 체크

작업 전에 다음 질문에 모두 답한다.

1. 현재 소유 package와 문서를 읽었는가.
2. 기존 command, port, type, component가 같은 책임을 이미 가지는가.
3. 더 작은 실제 vertical slice가 있는가.
4. mock이 사용자 결과까지 연결되는가, 아니면 화면 장식인가.
5. 실패하는 negative fixture를 먼저 만들 수 있는가.
6. drag, visual, audio를 못 쓰는 경로도 같은 command인가.
7. 권리와 사실이 미승인인데 production처럼 보이지 않는가.
8. 실패 시 어떤 file과 state를 되돌리는가.

정공법 위반 예:

- UI가 reducer를 거치지 않고 `completed=true`를 저장한다.
- schema가 실패하자 validation을 warning으로 낮춘다.
- 실제 유물 승인이 없어서 출처 없는 비슷한 이미지를 넣는다.
- page library가 어렵다고 drag-only custom gesture를 만든다.
- browser QA가 불안정하다고 screenshot 없이 완료한다.
- 서버가 필요하지 않은데 미래 계정용 API와 database를 만든다.

## 6. 구현 순환

```text
reproduce red
-> change one owner
-> run focused gate
-> inspect diff
-> run shared boundary gate
-> render if UI
-> update current contract
-> update progress ledger
-> decide expand, improve, repair, revert
```

### 6.1 focused gate

- pure reducer: 해당 unit test.
- schema: valid와 관련 negative fixture.
- component: component 또는 browser scenario.
- persistence: fault injection과 reload.
- docs: document gate.
- dependency: boundary audit.

### 6.2 shared gate 확대

- public type 또는 schema 변경: contract와 모든 consumer test.
- runtime state 변경: integration과 browser journey.
- UI 공통 component 변경: 세 viewport와 keyboard.
- service worker 또는 cache 변경: build, online, offline, update.
- license 또는 dependency 변경: third-party inventory.

## 7. 프론트 검수 순서

화면을 바꾼 작업은 다음 없이 완료하지 않는다.

1. production build.
2. local preview health.
3. 변경 scenario를 가장 작은 viewport 하나에서 조작.
4. desktop, tablet, mobile audit.
5. keyboard-only 또는 pointer-only 해당 경로.
6. reduced motion.
7. screenshot과 receipt 확인.
8. console, network, overflow, focus finding 확인.
9. 사람이 실제 screenshot을 보고 시각 판정.

페이지가 열렸다는 사실만 보지 않는다. 로딩이 끝났는지, 본문이 실제로 그려졌는지, 주 행동이 viewport 안에
있는지, 장면을 끝낼 수 있는지 확인한다.

## 8. 막힘 처리

### 8.1 분류

| 막힘 | 행동 |
|---|---|
| missing external approval | OPERATOR GATE 기록, fixture lane 계속 |
| dependency 설치 실패 | registry, proxy, peer dependency 확인, 최소 대안 검토 |
| 동기화 폴더 lock | process 종료 확인, 산출물을 `../soombook.out`으로 이동 |
| browser launch 실패 | product server와 browser 환경을 분리 진단 |
| flaky test 의심 | 같은 seed와 환경으로 재현, 성공할 때까지 반복해 덮지 않음 |
| unknown product choice | code와 문서로 발견 불가하고 결과가 크게 갈릴 때만 사용자 질문 |
| invalid existing dirty change | 덮지 않고 경로와 겹침 보고 |

### 8.2 fallback lane

사람 승인과 외부 서비스가 없어도 다음은 계속할 수 있다.

- schema와 negative fixtures
- reducer와 adapter
- CSS fixture UI
- keyboard와 pointer 대체
- local progress와 deletion
- PWA cache와 offline
- performance budget
- UI audit runner
- approval checklist와 rights ledger

fallback lane은 차단 조건을 통과한 척하는 우회가 아니다. production publish는 계속 막힌다.

## 9. 실패 조사 규칙

1. command 종료와 exit code를 확인한다.
2. test runner가 아직 도는지 확인한다.
3. 제품 server health와 검사 browser health를 분리한다.
4. fixture, path, port, output directory, clock, cache를 확인한다.
5. 같은 최소 case를 재현한다.
6. 이번 변경 전 baseline이 가능한 경우 비교한다.
7. 실제 제품 결함이면 test를 낮추지 않고 owner code를 고친다.
8. 검사 환경 결함이면 제품 완료와 분리해 `미확인`으로 남긴다.

timeout, 빈 output, browser crash를 같은 실패로 부르지 않는다.

## 10. Git 운영

### 10.1 기본

- 기본 branch는 `main`이다.
- 별도 요청 없이 branch나 worktree를 만들지 않는다.
- 관련 없는 dirty file을 되돌리거나 같은 commit에 섞지 않는다.
- stage는 명시 경로만 한다.
- commit message는 한국어 범주와 내용을 쓴다.
- 생성 주체, 모델명, vendor명, contributor trailer를 넣지 않는다.
- commit과 push는 사용자가 요청했을 때만 한다.
- force push, rebase로 공개 이력 변경, branch 삭제는 명시 승인을 받는다.

### 10.2 범주 예

- `기획: 숨책 V1 안전 계약 추가`
- `환경: reader workspace와 검증 명령 구성`
- `계약: BookPack validator 추가`
- `기능: 키보드 탐험 여정 구현`
- `품질: 모바일 UI 검수 gate 추가`
- `문서: 현재 workspace 계약 갱신`

### 10.3 push 전

```powershell
git status --short
git diff --check
npm run check:full
git diff --cached --name-only
```

사용자 요청이 있어도 blocking gate가 실패하면 push하지 않고 원인과 미완 범위를 보고한다. 검증 우회 flag를
기본 해결책으로 쓰지 않는다.

## 11. 문서 승격과 initiative 종료

구현한 사실은 같은 작업에서 `docs/**`에 반영한다.

예:

- 실제 명령과 버전: `docs/operation/workspace.md`.
- 실제 package와 의존 방향: `docs/architecture/runtime.md`.
- 실제 BookPack format: `docs/contracts/bookpack.md`.
- 실제 UI QA 실행: `docs/operation/ui-qa.md`.
- 실제 license 경계: `docs/operation/licensing.md`.

Phase 0 전체가 완료되기 전에는 구현된 부분만 current contract로 옮긴다. 계획 전체를 current 사실로 복사하지
않는다.

initiative 종료:

1. V1 완료 정의의 실제 증거 확인.
2. `expand`, `improve`, `repair`, `revert` 최종 판정.
3. 확정 사실을 `docs/**`와 code에 반영.
4. 남은 미래 범위는 새 initiative로 최소 분리.
5. `mainPlan/soombook-v1` 삭제.
6. `mainPlan/README.md` 갱신.

완료 폴더를 `_done`으로 이동하지 않는다.

## 12. 완료 보고 형식

최종 보고는 다음을 구분한다.

```text
결과
변경한 current contract와 code
실행한 검증과 결과
브라우저와 사람 검수 결과
미확인 또는 OPERATOR GATE
Git commit과 push 상태
다음 loss transition
```

`테스트 통과`, `화면 완료`, `출시 가능`을 같은 말로 쓰지 않는다. 자동 테스트가 green이어도 권리, 문화,
실기기, 아동 연구가 남아 있으면 각각 그대로 적는다.

## 13. 현재 첫 실행

현재 기준 첫 작업 카드는 `P0A 작업 환경과 실패 게이트`다.

```text
primary goal: completeMeaningfulStoryJourney
current loss: 실행 가능한 제품 코드와 검증 명령이 없음
result: 새 clone에서 reader 작업을 시작하고 검증 가능
owners: package.json, apps/reader-web, packages, scripts, docs/operation
first evidence: document gate의 missing 05~10 파일 실패
rollback: 제품 scaffold 제거, 기획 문서 보존
out of scope: 실제 문화자산, 계정, 배포, 아동 연구
```

P0A를 닫은 뒤 원장의 NEXT를 P0B로 한 칸만 이동한다.
