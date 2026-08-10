# Quality and UI Review Contract

확인일: 2026-08-10

## 차단 게이트

차단 게이트의 ID, 소유 경로, 명령, CI projection은 `tests/audit/gates.json`이 소유한다.

| 묶음 | 명령 | 검증 범위 |
|---|---|---|
| 빠른 검증 | `npm run check` | 문서, 텍스트와 공개 source 정책, 구조 registry, 전문 에이전트 검수 scope, fixture와 review candidate compile, asset·portability·validator drift, format, type, lint, contract, unit |
| 빌드 | `npm run build` | 공개 fixture만 포함한 production bundle, service worker, 내부 fixture 누출 차단, 350KB gzip과 600KB raster 예산 |
| 브라우저 | `npm run test:e2e` | desktop과 mobile 완주, 회상과 보물 마무리, 실제 tap, focus, 이전과 화살표, 저장 삭제와 손상 복구, 접근성, 확대, offline |
| 내부 오디오 | `npm run test:audio-fixture` | 격리된 3 mode fixture의 seek, rate, 종료 의미, 실패 fallback, cleanup과 offline 재생 |
| 검수 후보 | `npm run test:review-candidate` | 격리된 10장면 review pack의 desktop·mobile 완주, truth 문구, axe, overflow와 offline |
| First-party 제품 기준 | `npm run check:product-baseline` | 10장면 source, 전체 compiled와 review build, CSS fallback, 빈 audio, pending ledger와 선택적 외부 확장 부재를 하나의 digest로 결박 |
| 기기 행렬 | `npm run qa:device-matrix` | 같은 10장면 artifact의 Chromium·Firefox·WebKit, CSS root 200%, forced-colors, reduced-motion, high-contrast, touch 모의 전체 여정과 21개 상태별 AX·focus·저장·offline 증거 |
| UI 감수 | `npm run qa:ui` | 1440x900, 768x1024, 390x844 완주와 9개 시나리오 |
| 합성 성능 | `npm run qa:performance` | 같은 root와 Pages artifact의 mobile, desktop 4개 profile, warm-up 뒤 3회 lab 중앙값, mobile 5회 heap 반복 |
| 공개 release evidence | `npm run check:public-release-evidence` | current tiger fixture 문구, root와 Pages artifact, 4개 성능 profile, Pages header 예외를 하나의 release identity로 결박 |
| Pages artifact | `npm run build:pages` | `/soombook/` base, PWA, noindex, source path와 sourcemap 차단 |
| Pages browser | `npm run test:pages` | 독립 실행 시 build 후 desktop과 mobile 하위 경로 완주, manifest, service worker, offline |
| 검증한 Pages artifact | `npm run test:pages:built` | 기존 Pages output을 재빌드하지 않고 검사해 release identity와 upload byte를 일치시킴 |
| PWA 두 버전 | `npm run test:pwa-update` | 열린 v1 유지, 신규 v2 진입, 진행 보존, v2 offline reload와 실패 복구 |
| 로컬 전체 | `npm run check:full` | quick, root build, 공개 browser, 내부 오디오, 10장면 review 후보, UI 감수, 기기 행렬과 기기 전문 검수 quorum. release는 build 뒤 `test:pages:built` 실행 |

GitHub Actions의 `.github/workflows/quality.yml`은 quick, contracts, build, browser, pages job으로 같은 명령을
재실행한다. compatibility job은 모든 quality trigger에서 Chromium, Firefox, WebKit을 한 worker로 실행하고
실패 여부와 무관하게 matrix 영수증을 보존한다.
offline PWA 차단 게이트는 서비스 워커 자동화가 안정적인 Chromium이 소유하고 다른 엔진은 전체 완주와
저장 복구 smoke를 소유한다.

## 전문 에이전트 검수 영수증

`tests/audit/expert-reviews.json`은 완료한 구현 꼭지별 scope와 필수 전문 역할을 소유한다. 각 review는
reviewer ref, 날짜, PASS, 실행 명령과 scope digest를 기록한다. `npm run check:expert-reviews`는 scope의 모든
파일을 다시 hash해 검수 뒤 코드가 바뀌면 실패한다. 현재 권리 승인 자동화, PWA 두 버전 갱신·복구와
BookPack 전체 파일 및 build artifact 결박이 각각 세 역할의 독립 검수를 통과했다. 10장면
대표작 후보는 content provenance, education structure, accessibility delivery 세 역할이 같은
candidate, plan과 scope digest를 검수한 뒤 기술 `expand`를 판정했다. 상세 순서와 영수증
계약은 `docs/operation/representative-review.md`가 소유한다. BookPack 검수는
누락, 추가, 중복 byte, profile과 base 교차, worker와 main payload 및 asset URL, precache와 release 역할을
포함한다. 기기 행렬은 engine compatibility, interaction persistence, accessibility structure 세 역할이
같은 candidate, matrix scope와 aggregate digest를 검수한다. 이 영수증은 기술 검수 증거이며 법률 승인,
기관 승인, 실제 보조기기 사용이나 아동 연구를 가장하지 않는다.

First-party 제품 기준은 content boundary, delivery boundary, extension boundary 세 역할이 같은 baseline,
candidate와 review artifact digest를 검수한다. 외부 문화자산은 metadata-only pending, 승인 낭독은
`absent`와 `not-implemented`로 유지되며 이 상태를 바꾸면 기존 quorum은 즉시 stale이 된다.

공개 기술 체험판 release evidence는 product copy, performance evidence, deployment boundary 세 역할이 서로
다른 reviewer ref로 같은 release scope와 stable evidence digest를 검수한다. raw 성능 수치와 실행 환경은
매 실행마다 current evidence digest로 다시 검증하고, 전문 검수 identity는 artifact, 고정 profile, 예산,
자동 PASS와 verifier scope처럼 재현 가능한 projection만 소유한다. 배포 담당 review는 current Pages byte와
workflow 구조 검사를 별도로 실행한다. 이 PASS는 Pages 배포 승인, 출판 승인이나 교육 효과 승인이 아니다.

## UI 감수 영수증

`tests/ui/uiAudit.spec.ts`는 각 화면 크기의 이전 영수증 폴더를 먼저 비우고 첫 화면, 찾기, 오답 회복,
연결, 마무리 선택, 보물 재확인과 완료 화면을 PNG로 남긴다. skip link가 평소 clip되고 Tab 초점에서만
열리는지도 검사한다. 다음 값을 `receipt.json`에 기록한다.

- 실행한 9개 시나리오 이름
- 심각하거나 치명적인 axe 접근성 위반 수
- 가로 넘침 pixel 수
- console error, critical request 실패, third-party network origin
- 완주 여부

산출물 경로는 `../soombook.out/ui-audit/<project>/`다. 캡처는 회귀 증거이지만 Git 정본은 아니다.
자동 검사가 통과해도 화면 문구, 위계, 잘림과 포커스 표현은 원본 캡처를 눈으로 확인한다.

## 현재 검증 기준선

2026-08-09 최신 로컬 실행에서 29개 필수 문서, 181개 text 파일, 22개 registry gate, fixture 31개 JSON과
10장면 review 후보 compiled JSON 20개, 2개 기술 fixture와 파일 자산 5개, standalone validator와 공개
source 위생이 통과했다. contract는 canonical approval digest와 provenance negative test를 포함해 44건,
runtime unit은 13건이 통과했다.

기본 production profile의 desktop과 mobile 브라우저는 60건 중 50건 통과, project별로 중복되거나
환경 소유권이 다른 10건을 의도적으로 제외했다. Pages profile은 artifact identity 검사가 추가되어 64건
중 53건 통과, 환경 소유 11건을
제외했다. `/soombook/`의 manifest id, start URL, scope, 192·512 PNG icon, service worker scope, 전체
offline 완주, `reflecting`과 `completed` 재진입을 확인했다. 내부 오디오 production profile 5건은 mode
위치 보존, 직접 읽기 비자동재생, 문장 seek, 1.2배 속도, 비승인 종료, 404 fallback, pack별 geometry와
offline 재생을 통과했다. 10장면 review 후보는 desktop과 mobile 2건에서 axe,
overflow, 전체 완주와 offline 완료 복구를 통과했다.

2026-08-10 기기 행렬은 current review artifact `sha256-702b3a4a...`의 서버 제공 파일 15개를 build
receipt의 byte length와 SHA-256에 대조한 뒤 8개 profile, profile당 21개 상태를 전부 통과했다. current
matrix scope는 `sha256-78f2418d...`, aggregate는 `sha256-8dcd351a...`다. 각 상태는 normalized AX와
profile별 raw AX, landmark, heading, 진행 이름과 완료·현재·예정 상태, status와 live event, truth,
reflection, visible focus, overflow, 저장 전·후·reload, same-origin uncached offline probe를 결박한다.
CSS root 200%와 touch는 합성 또는 모의 profile이며 실제 browser zoom, 실기기와 보조기기 승인은 OG-05에
남는다.

세 화면 UI 감수 3건은 심각 접근성 위반 0, 가로 넘침 0, console error 0, request 실패 0, third-party
origin 0, 완주 true로 기록됐다. 원본 캡처에서 desktop과 mobile의 시작, 찾기, 오답 회복, 연결, 마무리,
보물, 완료를 눈으로 확인했다. 공개 production build의 최신 JS와 CSS gzip 합계는 root 113,155B이고
critical raster 22,029B, social preview 1,465,962B였다. validator를 build time으로 옮겨 공개 app에서
검수용 hash 코드를 제거했다. 공개 artifact에는 tiger 파일 자산만 있고 lantern, 10장면 review 후보,
timing WAV, sourcemap과 로컬 사용자 경로는 없다.

합성 성능 gate는 390x844, CPU 2배, RTT 100ms, download 500,000B/s, cache off, service worker 차단
조건에서 warm-up 완주 뒤 production 완주를 3회 실행해 중앙값을 차단 값으로 쓴다. memory는 완주 5회와
강제 GC 뒤 heap을 기록한다. 각 measured run은 별도 Chromium process로 격리한다. 최신 root mobile은
LCP 760ms, 합성 INP 88ms, CLS 0, 200ms 초과 long task 0, heap 증가 303,532B였고 root desktop은 LCP
1,108ms, 합성 INP 56ms, CLS 0.0271, long task 0, gesture 최대 frame gap 16.7ms였다. Pages mobile은 LCP
696ms, 합성 INP 88ms, CLS 0, long task 0, heap 증가 305,980B였고 Pages desktop은 LCP 1,144ms,
합성 INP 64ms, CLS 0.0271, long task 0, gesture 최대 frame gap 16.8ms였다. 네 profile 모두 현재 예산을
통과했다. current performance stable digest는 `sha256-4de103f6...`다.
영수증 권위는 `three-run-synthetic-lab-not-field-cwv-or-real-device-approval`이다. 실제 사용자 field CWV,
4배 CPU 진단, 실제
보조기기와 실기기 검수는 이 자동 gate로 완료 처리하지 않는다.

오디오와 fixture build 격리 변경 직후 호스트 CPU가 79%에서 99%로 포화된 상태에서는 root 합성 INP가
208ms, 224ms, 264ms로 세 번 차단됐다. 예산을 바꾸지 않고 호스트 부하가 낮아진 구간에서 같은 명령을
다시 실행해 통과했고, 이후 provenance와 10장면 검수 후보를 추가한 최신 release도 같은 예산을 그대로
통과했다. 포화 상태 실패와 이전 green 수치는 삭제하지 않고 성능 영수증과 진행 원장에 진단 이력으로
남긴다.
