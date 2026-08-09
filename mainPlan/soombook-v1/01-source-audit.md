# 01. Source Audit and Decision Ledger

상태: 원본 분석 완료, 공식 근거 1차 재확인 완료

확인일: 2026-08-09

## 1. 분석 대상

```text
파일: 로컬 Downloads/숨책_초3_인터랙티브_독서탐험_장기기획서.md
문서 상태: 장기 제품 기획서 v1.0
문서 기준일: 2026-08-08
크기: 83,056 bytes
줄 수: 2,343
SHA-256: C7247AEB8179F881E3EB1EFBD21AD4DA6CB567E3EA134C2F3B64718EFACB47D3
```

원본은 외부 입력이며 현재 제품 계약이 아니다. 이 문서는 원본의 주장을 다음 네 상태로 분류한다.

- `KEEP`: 제품 정체성으로 유지
- `REFINE`: 방향은 유지하되 구현 계약을 구체화
- `DEFER`: 맞지만 지금 만들면 핵심 검증을 흐림
- `GATE`: 사람 승인이나 최신 외부 근거 없이는 실행 금지

## 2. 원문의 가장 강한 부분

### 2.1 카테고리 정의

원문은 전자책, 오디오북, 학습지, 박물관 검색, 숨은그림찾기 중 하나로 제품을 축소하지 않고
`Narrative Exploration Platform`으로 정의한다. 읽기와 행동이 경쟁하지 않고 같은 이해를 만드는 것이 제품
차별점이라는 판단은 유지한다.

### 2.2 타깃의 선명함

초3을 첫 타깃으로 고정해 세션 길이, 어휘 지원, 화면, 난이도, 보상, 보호 기준을 구체화했다. 교육부의
책임교육학년 설명과 2022 개정 교육과정 적용 일정도 공식 자료와 정합한다.

### 2.3 첫 대표작의 압축력

《호랑이가 그림에서 사라졌다》는 페이지 전환, 낭독, 렌즈, 단서, 추론, 실제 유물 연결을 한 이야기로
검증할 수 있다. 제품 설명과 기능 데모가 따로 놀지 않는 좋은 vertical slice다.

### 2.4 권리와 아동 보호의 선행 배치

권리 장부, 공공누리 유형, 변경 이력, 검증일, 게스트 우선, 광고와 공개 채팅 금지, 법정대리인 동의를
기획 단계에 포함했다. 이 축은 부록이 아니라 blocking gate로 승격한다.

### 2.5 플랫폼 자산의 올바른 위치

장기 방어력을 페이지 넘김 효과가 아니라 BookSpec, 권리 장부, 콘텐츠 그래프, 제작 도구로 본 판단이
맞다. V1에서는 Scene Studio를 만들지 않지만 schema와 검증기는 첫날부터 만든다.

## 3. 원문에서 닫히지 않은 구멍

### G1. 첫 범위가 세 번 다르게 보임

원문에는 `대표작 3권 + 감성 읽기책 9권`, `대표작 1권`, `4장면 프로토타입`, `완전한 한 장면`이 함께 있다.
순서는 있지만 각 산출물의 종료 조건과 다음 단계 의존성이 충분히 닫히지 않았다.

보강:

```text
1개 장면 기술 spike
-> 4장면 완결 vertical slice
-> 10~12장면 한 권
-> 3권 포트폴리오
-> 반복 제작성이 증명된 뒤 12권 카탈로그
```

### G2. 백엔드가 너무 일찍 전제됨

FastAPI, PostgreSQL, 여러 서비스가 첫 아동 가치보다 앞에 놓일 수 있다. 게스트 4장면은 정적 BookPack과
로컬 진행만으로 완결할 수 있다.

보강:

- Phase 0과 1은 정적 PWA와 로컬 저장만 사용한다.
- 서버는 계정 동기화, 비공개 출판, 운영 권리 워크플로 중 실제 필요가 검증된 뒤 도입한다.
- 마이크로서비스 네 개는 조직과 트래픽이 생기기 전 만들지 않는다.

### G3. BookSpec이 실행 포맷으로 불충분함

원문의 예시는 책, 장면, 텍스트, hotspot, 어휘, 링크, alt를 보여주지만 다음이 없다.

- pack version과 런타임 호환 범위
- asset hash, 크기, MIME, 파생 계보
- 장면 상태 기계와 전이 조건
- 행동의 필수 여부와 대체 조작
- 오디오 track 길이와 locale
- 사실, 허구, fixture 구분
- 권리 승인 상태와 claim 승인
- 진행 migration 규칙
- event privacy 분류

보강 계약은 `03-bookspec-rights-data-contract.md`가 소유한다.

### G4. 접근성이 기능 목록에 머묾

키보드와 대체 탐색을 언급했지만, 렌즈와 페이지 드래그의 동등 기능이 정확히 같은 진행 상태를 만드는지
정의하지 않았다. WCAG 2.2의 Dragging Movements 기준은 드래그 기능에 단순 포인터 대체를 요구한다.

보강:

- 모든 core action은 공통 command를 호출한다.
- drag, tap, button, keyboard, linear explore는 같은 command adapter다.
- 대체 경로가 같은 서사 피드백과 완료 receipt를 만든다.

### G5. 지표가 실제 연구와 제품 telemetry를 섞음

완주율, 재독률 목표는 좋지만 실제 아동 cohort, consent, event authority, test traffic 제외 기준이 없다.

보강:

- 자동 테스트와 성인 QA는 실제 북극성 분자에서 제외한다.
- 아동 연구 전에는 제품 지표를 `미측정`으로 유지한다.
- 사용성 연구 관찰과 운영 analytics를 분리한다.

### G6. 외부 승인 대기가 전체 작업을 막을 수 있음

대표 장면이 실제 박물관 이미지와 권리를 전제로 하면 API 키, 자산 승인, 문화 감수 대기 중 코드가 멈춘다.

보강:

- 명확히 표시한 직접 제작 fixture로 런타임을 완성한다.
- 실제 자산은 같은 asset contract를 통해 나중에 교체한다.
- 승인 부재는 production publish만 막고 schema, UI, 테스트, 성능 작업은 막지 않는다.

### G7. 콘텐츠 생산 비용과 용량 예산이 없음

A급 3권과 B급 9권 구분은 있지만 한 권당 장면, 삽화, 오디오, 권리, 감수의 상한과 반복 제작 gate가 없다.

보강:

- 4장면 vertical slice의 시간과 용량을 먼저 측정한다.
- 한 권 확장 전 장면당 제작시간, 수정 횟수, pack 크기, 검수 결함을 기록한다.
- 개발자 수작업 없이 두 번째 fixture pack을 만들 수 있을 때만 Scene Studio 필요를 판정한다.

### G8. 시장과 지불 가설이 기능 로드맵과 결합됨

가족 구독, 학교, 기관, 출판사 모델은 가능성이 있으나 V1 사용성보다 먼저 구현할 근거는 없다.

보강:

- 가격과 결제는 DEFER한다.
- 보호자 인터뷰, 교사 인터뷰, 기관 데모 반응, 실제 제작원가를 각각 증거로 분리한다.
- 아이 화면 광고와 확률형 보상은 영구 KILL이다.

## 4. 핵심 결정 매트릭스

| 원문 항목 | 판정 | V1 결정 | 재검토 조건 |
|---|---|---|---|
| 초3 단일 타깃 | KEEP | 유지 | 실제 연구에서 연령 적합성 실패 |
| 읽기, 찾기, 추론, 연결 | KEEP | primary journey | 상호작용 없는 대조군이 우세 |
| 감성 페이지 넘김 | REFINE | adapter 뒤의 progressive enhancement | 저사양 또는 접근성 기준 실패 |
| 탐험 렌즈 | KEEP | 대표 UI, 필수 대체 경로 | 조작 발견 실패가 반복 |
| 고품질 사전 음성 | KEEP | fixture 뒤 사람 검수 음성 | 비용과 품질 실험 결과 |
| A급 3권 + B급 9권 | DEFER | 1개 장면, 4장면, 한 권 순 | 반복 제작 gate 통과 |
| React 또는 Next.js | REFINE | 정적 React PWA 우선, framework spike | SEO와 서버 렌더 요구 확인 |
| FastAPI와 PostgreSQL | DEFER | 서버 없음 | 계정, 운영 권리, 비공개 출판 필요 |
| 서비스별 API 네 개 | DEFER | modular monolith도 아직 없음 | 팀과 독립 배포 경계가 생김 |
| StPageFlip | REFINE | spike 후보, `PageEngine` port 뒤 격리 | 라이브러리 품질과 접근성 gate |
| 자체 Page Engine | DEFER | 단순 전환 fallback만 직접 소유 | 대표 경험 가치가 증명됨 |
| 공공누리 0·1유형 | KEEP + GATE | 실제 사용은 asset별 확인 | 권리 담당 승인 |
| e뮤지엄 API | REFINE | metadata ingest spike | 키 발급, 형식, quota 실측 |
| 게스트 우선 | KEEP | V1 유일 모드 | 다기기 동기화 수요 확인 |
| 가족 계정 | DEFER + GATE | 미구현 | 개인정보 영향평가와 동의 설계 승인 |
| 아이 자유 AI 채팅 없음 | KEEP | 영구 기본선 | 별도 안전 PRD와 승인 없이는 유지 |
| Scene Studio | DEFER | CLI validator와 fixture authoring부터 | 두 번째 책 제작 병목 실측 |
| 박물관 방문 모드 | DEFER | 연결 카드의 비공식 관찰 제안만 | 기관과 현장 테스트 승인 |

## 5. 공식 근거 재확인

### 5.1 교육 타깃

- 교육부 자료는 초등학교 3학년을 읽기, 쓰기, 셈하기를 바탕으로 교과 학습이 시작되는 책임교육학년으로
  설명한다.
- 2022 개정 교육과정은 초등학교 3, 4학년에 2025년 3월 1일부터 적용됐다.

근거:

- https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=340&boardSeq=95642&lev=0&m=020201&opType=N&s=moe&statusYN=W
- https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&page=1&s=moe&statusYN=W

제품 해석:

초3 집중의 공공정책 맥락은 유효하다. 다만 800자에서 1,600자, 10분에서 18분 같은 수치는 교육 표준이
아니므로 계속 제품 가설로 표시한다.

### 5.2 아동 개인정보

개인정보 보호법 제22조의2는 만 14세 미만 아동의 개인정보 처리에 법정대리인 동의가 필요한 경우 그
동의를 받고 확인하도록 하며, 아동 대상 고지는 이해하기 쉬운 양식과 명확한 언어를 요구한다.

근거:

- https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1020398521

개인정보보호위원회는 아동을 주 이용자로 하는 서비스에서 맞춤형 광고 목적의 행태정보 수집을 하지 않을
것을 권고했다.

근거:

- https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=9888

제품 해석:

V1은 서버 개인정보 수집과 광고 SDK를 쓰지 않는다. 계정 도입은 법률 자문과 개인정보 영향 검토가 필요한
별도 initiative다. 이 문서는 법률 의견서가 아니다.

### 5.3 공공누리와 e뮤지엄

공공누리 제1유형은 상업적 이용과 변경 이용을 허용하지만 구체적인 출처 표시, 가능한 경우 원문 링크,
공공기관과의 특수 관계 오인 방지를 요구한다. 변경 이용에서도 저작인격권을 존중해야 한다.

근거:

- https://www.kogl.or.kr/info/licenseType1.do
- https://www.emuseum.go.kr/m/copyright
- https://www.museum.go.kr/MUSEUM/contents/M3304000000.do

공공데이터포털의 `국립중앙박물관_e뮤지엄_박물관 소장품 정보`는 2026-07-28 수정 기준으로 약 400개
협력 박물관, 약 280만 건의 목록과 상세 정보를 제공한다고 설명한다. 현재 페이지 표기상 데이터 포맷은
XML이고 개발 계정 기본 트래픽은 1,000건이다.

근거:

- https://www.data.go.kr/data/15159017/openapi.do

원문 보정:

- 원문은 XML 또는 JSON 조회 가능성을 적었지만 해당 공공데이터포털 항목의 현재 표기는 XML이다.
- API 전체 라이선스가 제0유형이라고 표시돼도 개별 이미지의 공공누리 표시는 별도로 확인한다.
- API metadata 이용 허용과 이미지의 변형·상업 이용 허용을 같은 것으로 간주하지 않는다.

### 5.4 접근성

WCAG 2.2는 W3C Recommendation이며, 2.5.7 Dragging Movements는 드래그 동작을 같은 페이지의 단순
포인터 대체로 수행할 수 있어야 한다고 요구한다. 2.5.8은 포인터 대상 크기 또는 충분한 간격을 다룬다.

근거:

- https://www.w3.org/TR/WCAG22/
- https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html

제품 해석:

페이지 모서리 드래그와 렌즈 드래그만 제공하면 안 된다. 탭, 버튼, 선형 탐색은 부가 기능이 아니라 같은
완료를 만드는 필수 계약이다.

### 5.5 페이지 엔진 참고

StPageFlip 공개 저장소는 MIT 라이선스와 모바일 지원을 표시한다. 하지만 라이선스 존재만으로 제품 적합성이
보장되지는 않는다. 번들, 접근성, 입력 충돌, 유지 상태는 Phase 0 spike에서 확인한다.

근거:

- https://github.com/Nodlik/StPageFlip

MengTo/sketchbook은 시각 참고만 허용한다. 명시적 허락 또는 라이선스 검증 전 코드와 자산을 복제하지
않는다.

## 6. 원문에서 파생한 제품 핵심

### 유지할 장면 문법

```text
짧은 본문
-> 아이가 선택한 읽기 방식
-> 이야기 이해에 필요한 한 행동
-> 벌 없는 힌트
-> 서사 피드백
-> 사실 또는 현실 연결
-> 다음 장면
```

### 유지할 감성 문법

- 수채화, 연필, 종이, 잉크, 황동, 나무 책상
- 상시 음악보다 짧은 재료음과 공간음
- 폭죽, 보석, 코인, 네온 HUD 금지
- 아이와 보호자가 함께 봐도 유치하지 않은 화면

### 유지할 안전 문법

- 가입 없이 핵심 가치 완결
- 광고, 공개 소통, 순위, 아이 대상 결제 유도 없음
- 외부 링크는 보호자 경계 뒤에 배치
- 실제 아이 자유 텍스트와 음성 원본은 기본 저장하지 않음

## 7. 계획이 닫아야 할 질문

| 질문 | 지금의 결정 | 소유 문서 |
|---|---|---|
| 첫 사용자가 얻는 한 결과는 무엇인가 | 의미 있는 4장면 완결 journey | `00-product-prd.md` |
| 어떤 장면이 첫 vertical slice인가 | 호랑이 발자국 4장면 | `02-experience-content-pedagogy.md` |
| 콘텐츠와 권리는 어떻게 기계 검증하는가 | versioned BookPack, asset·claim·rights ledger | `03-bookspec-rights-data-contract.md` |
| 서버가 필요한가 | V1에는 필요 없음 | `04-runtime-architecture.md` |
| 드래그 불가능 사용자는 어떻게 완주하는가 | tap, button, keyboard, linear explore | `05-child-safety-accessibility-security.md` |
| 실제 성공을 어떻게 세는가 | 승인된 journey receipt와 연구 관찰 | `06-measurement-experiments-quality.md` |
| 무엇을 만들지 않는가 | KILL과 DEFER로 차단 | `07-scope-phasing-kill-list.md` |
| 에이전트가 다음에 무엇을 하는가 | gate 기반 순서와 fallback lane | `09-agent-execution-runbook.md` |

## 8. OPERATOR GATE 목록

에이전트가 준비할 수 있지만 최종 승인할 수 없는 항목이다.

1. 정식 브랜드명과 상표, 도메인 사용 가능성.
2. 실제 박물관 이미지와 3D 자산의 이용 범위.
3. 문화유산 설명과 허구적 재구성의 정확성.
4. 초3 문장, 질문, 감정 표현의 교육 적합성.
5. 실제 아동 연구의 보호자 동의, 장소, 보상, 기록, 삭제 절차.
6. 개인정보 처리방침과 계정 동의 절차.
7. 유료 결제, 구독 해지, 학교·기관 계약.
8. 프로덕션 공개와 기관 제휴 표현.

승인 대기 중에도 합성 fixture, schema, 런타임, 접근성, 성능, 문서, 테스트는 진행할 수 있다.
