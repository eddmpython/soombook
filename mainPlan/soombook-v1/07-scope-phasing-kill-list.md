# 07. Scope, Phasing, and Kill List

상태: V1 범위 잠금 v1.0

범위: 무엇을 어떤 의존 순서로 만들고, 무엇을 만들지 않으며, 어떤 증거가 있어야 다음 단계로 확장하는지
정한다.

## 1. 범위 원칙

1. 첫 제품은 플랫폼이 아니라 4장면 완결 journey다.
2. 단계는 파일 수나 기능 수가 아니라 사용자 결과와 실패 가능한 증거로 닫는다.
3. 외부 승인 대기와 독립 구현 가능 작업을 분리한다.
4. fixture는 다음 작업을 여는 도구이며 실제 자산 승인 완료를 가장하지 않는다.
5. 연결되지 않은 package, 빈 메뉴, 미래 API, 501 tool을 미리 만들지 않는다.
6. 한 단계의 rollback이 이전 단계의 읽기와 로컬 진행을 파괴하지 않아야 한다.

## 2. 의존 순서

```text
P0A 작업 환경과 실패 게이트
  -> P0B BookPack schema와 validator
    -> P0C 순수 runtime과 local progress
      -> P0D 한 장면 읽기 UI
        -> P0E 4장면 완결 journey
          -> P0F 접근성, offline, 성능 hardening
            -> P0G 운영자 검수 패키지
              -> OPERATOR GATE 권리, 문화, 교육, 연구
                -> P1 한 권 확장 판정
```

P0B부터 P0F까지는 직접 제작 fixture로 진행한다. 권리와 문화 승인 부재가 schema, runtime, UI, test를
막지 않는다.

## 3. Phase 계약

### P0A. 작업 환경과 실패 게이트

산출:

- root npm workspace와 lockfile
- 복사 실행 가능한 install, dev, test, build, UI audit 명령
- TypeScript, lint, format, test, browser runner
- 저장소 밖 build와 QA 산출물 경로
- 문서, 금지 문자, schema registry, dependency boundary audit
- CI fast와 full workflow
- Git hook은 CI의 편의 mirror이며 유일한 강제 수단이 아님

Exit:

- 새 clone 기준 install과 quick gate가 실행된다.
- 의도적인 깨진 link, em 대시, missing gate projection, failing unit fixture에서 red를 확인한다.
- `docs/operation/workspace.md`와 `CLAUDE.md` 명령이 실제 package script와 일치한다.

Rollback:

- 앱과 workspace files를 제거해 문서 기준선으로 돌아간다. 기존 기획 문서는 보존한다.

### P0B. BookPack schema와 validator

산출:

- versioned JSON Schema
- fixture pack 하나
- `loadPack`, `validatePack`, `inspectRights`, `inspectClaims`
- schema, ref, rights, claim, accessibility, budget negative fixtures
- integrity manifest 생성과 검사

Exit:

- fixture profile은 green이다.
- 같은 pack을 published로 바꾸면 사람 승인과 rights evidence 부재로 red다.
- path traversal, duplicate ID, missing alternative adapter, invalid audio segment가 red다.

Rollback:

- runtime은 이전 schema minor를 계속 읽고, catalog pointer는 이전 pack으로 복구한다.

### P0C. 순수 runtime과 local progress

산출:

- `reduceBookCommand` 단일 전이 함수
- effect와 receipt 계약
- IndexedDB adapter와 memory fallback
- progress migration과 delete

Exit:

- 모든 허용, 거부 전이가 unit test로 증명된다.
- retry, double input, refresh에서 완료와 발견이 중복되지 않는다.
- storage fault가 읽기를 중단하지 않으며 저장 실패를 숨기지 않는다.

Rollback:

- persistence adapter를 memory로 교체하고 원본 IndexedDB store는 자동 삭제하지 않는다.

### P0D. 한 장면 읽기 UI

산출:

- 첫 진입, 표지, 본문 3문장
- 직접 읽기와 개발용 읽어주기
- 정적 page engine과 CSS fold enhancement
- reduced motion
- 반응형 desktop, tablet, mobile

Exit:

- 60초 안 첫 장면 진입을 scripted journey로 재현한다.
- button, keyboard로 표지를 열고 다음 상태로 간다.
- audio 또는 음성 기능 실패에도 본문이 읽힌다.
- 세 viewport screenshot과 receipt가 있다.

Rollback:

- CSS fold를 끄고 정적 장면으로 유지한다.

### P0E. 4장면 완결 journey

산출:

- 장면 1부터 4
- 탐험 렌즈, 영역 tap, keyboard, linear explore
- 힌트 사다리
- 근거 추론
- fixture 연결 카드와 완주
- 로컬 이어 읽기와 데이터 삭제

Exit:

- pointer-only, keyboard-only, reduced-motion journey가 같은 상태 receipt를 만든다.
- 읽기 전 단서 잠금, 오답 회복, 연결 카드, 완주가 모두 실제 브라우저에서 돈다.
- 장면 전환 20회에 skip, audio overlap, focus loss가 없다.

Rollback:

- 렌즈를 영역 목록으로, fold를 정적 전환으로 내리되 4장면 완주는 유지한다.

### P0F. 접근성, offline, 성능 hardening

산출:

- service worker와 versioned cache
- offline 완주
- axe와 keyboard gate
- UI audit runner와 viewport plan
- bundle, LCP, INP, CLS, memory receipt
- CSP와 third-party request audit

Exit:

- full gate와 browser matrix가 green이다.
- 성능 예산을 넘으면 원인과 rollback이 기록되고 공개 후보를 만들지 않는다.
- 자동 접근성 이외의 사람 검수 항목은 `미확인`으로 분리된다.

Rollback:

- service worker registration을 내리고 online reader를 유지한다. progress store는 보존한다.

### P0G. 운영자 검수 패키지

산출:

- 세 viewport screenshot과 UI finding receipt
- 기기별 눈검수 checklist
- 권리, 문화, 교육, 접근성 approval sheet
- 아동 연구 protocol 초안
- license와 third-party notice
- preview와 production rollback runbook

Exit:

- 운영자가 승인할 질문과 증거가 한곳에 있고, 에이전트 작업과 사람 판단이 섞이지 않는다.
- 공개 범위가 fixture 기술 데모인지 실제 문화유산 콘텐츠인지 명확하다.

## 4. P1 이후 확장 조건

### P1. 대표작 한 권

현재 판정: 사용자의 끝까지 구현 지시를 `expand`로 기록해 비공개 10장면 `review` 후보까지 착수했다.
창작 placeholder, pending 권리와 claim, 격리 build와 자동 완주는 구현됐지만 아래 사람 승인이 없어
`published` 대표작은 아니다.

착수 조건:

- P0E의 complete journey가 성립한다.
- P0F 자동 gate가 green이다.
- 운영자가 `expand` 또는 범위가 명확한 `improve`를 기록한다.
- 실제 자산을 쓰려면 해당 asset과 claim 승인이 있다.

범위:

- 10에서 12장면 한 권
- 두 번째 필수 단서가 아니라 재독 선택 단서부터 확장
- 검수된 낭독과 timing
- 권리와 문화 승인된 연결 카드

### P2. 반복 제작

착수 조건:

- 서로 다른 두 번째 fixture BookPack을 기존 runtime 수정 없이 만든다.
- 한 장면 제작 시간, 수정 횟수, pack byte, 검수 결함이 측정된다.
- 개발자 JSON 수작업이 실제 병목으로 확인된다.

Scene Studio 전체가 아니라 필요한 authoring helper부터 만든다.

### P3. 카탈로그와 계정

착수 조건:

- 한 권 외 책에서도 재독 또는 완주 가치가 확인된다.
- 여러 기기 동기화 요구가 반복 관찰된다.
- 개인정보, 보호자 동의, 삭제, incident response가 승인된다.

서버와 PostgreSQL은 이 시점에도 후보이며 자동 선택이 아니다.

### P4. 학교와 박물관

착수 조건:

- 학생 이메일 없는 배포가 실제 교사 문제를 해결한다는 인터뷰 근거.
- 기관이 제휴 표현, 자산, 동선, 지원 책임을 승인한다.
- 현장 offline과 기기 운영이 실측된다.

## 5. 영구 KILL

다음은 V1 이후에도 새 안전 PRD와 명시적 번복 없이는 만들지 않는다.

- 아이 화면 광고와 맞춤형 광고
- 확률형 보상, 코인 판매, loot box
- 읽기 속도, 오답, 힌트 사용의 공개 순위
- 공개 아동 프로필, 댓글, 친구, 메시지
- 아이 대상 결제 유도와 해지 방해
- 아이에게 비밀을 요구하는 캐릭터와 자유 상담형 AI
- 출처와 사실 상태 없는 문화유산 자산
- 권리 검사를 경고로 낮추는 production publish
- 필수 기능의 drag-only, color-only, audio-only 조작
- BookPack 안의 JavaScript, eval, remote HTML
- test와 adult QA traffic을 실제 아동 성과로 합산
- 실패를 숨기는 자동 fallback과 연결되지 않은 mock 완료 선언

## 6. DEFER 목록

| 항목 | 이유 | 재개 조건 |
|---|---|---|
| 가족 계정 | 첫 가치에 불필요, 개인정보 비용 | 다기기 요구와 privacy 승인 |
| FastAPI와 PostgreSQL | static journey로 충분 | server gate의 실제 요구 |
| 결제와 구독 | 가격과 가치 미검증 | 보호자 인터뷰, 원가, 법률 승인 |
| 12권 카탈로그 | 제작 품질과 비용 미측정 | 두 책 반복 제작 gate |
| Scene Studio | 실제 authoring 병목 미측정 | 개발자 수작업 병목 증거 |
| StPageFlip 채택 | 접근성, lifecycle, bundle 미검증 | isolated spike gate |
| 자체 곡률 엔진 | 제품 가치보다 이른 투자 | 감성 물성 가설 통과 |
| 자유 대화 AI | 사실, 안전, 개인정보 위험 | 별도 아동 AI PRD와 승인 |
| 원격 analytics | 권위와 privacy 없음 | data inventory와 opt-in 승인 |
| 박물관 API runtime 호출 | offline과 권리 분리 필요 | ingest와 asset approval workflow |
| 방문 위치와 카메라 | 민감 데이터, 핵심 밖 | 별도 현장 안전 PRD |
| 학교 학급 코드 | 운영과 삭제 책임 | 교사 pilot 승인 |
| 다국어 | 한국어 초3 품질 우선 | 한 권 제작 반복성과 문화 검수 체계 |

DEFER 항목은 빈 route, interface, database table로 자리를 만들지 않는다.

## 7. 병렬 fallback lane

| 막힘 | 계속할 작업 |
|---|---|
| 실제 문화자산 권리 대기 | fixture pack, rights validator, attribution UI |
| 문화 전문가 대기 | fiction과 fact 분리, claim ledger, caveat UI |
| 낭독 제작 대기 | text lifecycle, timing validator, audio failure UI |
| iPad 또는 저사양 기기 부재 | browser profiles, device checklist, operator gate |
| 아동 연구 승인 대기 | 성인 QA, test origin 분리, 연구 protocol |
| page library spike 실패 | StaticPageEngine과 CssFoldPageEngine |
| service worker 오류 | online reader와 explicit offline 미지원 표기 |
| 원격 repo 또는 CI 문제 | local gate와 evidence 준비, push 보류 |

같은 막힘을 해결하는 척 우회 구현하지 않는다. 공개 상태만 차단하고 독립 작업을 계속한다.

## 8. Scope change 절차

범위를 넓히려면 다음을 원장에 기록한다.

1. 현재 primary loss transition.
2. 새 기능이 그 손실을 줄이는 인과.
3. 만들지 않을 더 작은 대안이 실패한 증거.
4. 새 개인정보, 권리, 접근성, 운영 비용.
5. 필요한 사람 승인.
6. 실패와 rollback.
7. 기존 Phase exit를 흐리지 않는 PR 단위.

근거 없이 `나중에 필요할 것 같음`만 있으면 DEFER를 유지한다.

## 9. V1 범위 잠금 판정

V1을 닫는 최소 결과는 다음 하나다.

> 가입하지 않은 사용자가 4장면을 열고, 문장을 읽거나 들으며, 드래그 없이도 호랑이 발자국 단서를 찾고,
> 그 근거로 떠난 이유를 고르고, fixture임이 분명한 현실 연결 카드를 본 뒤, 점수 없이 완주한다.

이 문장을 직접 증명하지 않는 기능은 P0 필수가 아니다.
