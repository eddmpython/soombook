# Operator Review and Release Evidence

확인일: 2026-08-10

이 문서는 공개 기술 체험판과 이후 대표작의 사람 검수 질문, 실행 순서, 증거 형식을 소유한다. 자동 검사가
통과해도 이 표의 사람 판단을 대신하지 않는다. 현재 모든 사람 승인 항목은 `미승인` 또는 `미실시`다.

## 공개 등급

| 등급 | 허용 범위 | 현재 후보 |
|---|---|---|
| 로컬 기능 검증 | 개발자 기기, 창작 fixture, 비공개 | 충족 |
| 공개 기술 체험판 | 무계정, 무입력, 무telemetry, noindex, 창작 fixture | 운영자 승인 전 |
| 대표작 검수 후보 | 비공개 10장면, 창작 placeholder, pending external provenance | 세 전문 에이전트 기술 `expand` 완료 |
| 대표작 제품 | 승인 자산과 낭독, 문화·교육 검토, 실기기 검수 | 미충족 |
| 아동 연구 | 승인 protocol, 보호자 동의, 아동 동의, 삭제와 중단 절차 | 미승인 |

GitHub Pages는 공개 기술 체험판까지만 후보로 삼는다. 계정, 자유 입력, 연구, 결제, 승인 문화자산 또는
실제 상용 운영은 응답 보안 헤더와 exact rollback을 통제하는 Cloudflare Workers Static Assets나 동등
host로 승격하기 전에는 허용하지 않는다.

## 운영자 승인 시트

| Gate | 질문 | 필요한 증거 | 현재 상태 | 승인 책임 |
|---|---|---|---|---|
| OG-01 브랜드 | 이름과 표식이 타인의 권리를 침해하거나 공식 제휴로 오인시키지 않는가 | 상표 조사, 공개 문구, 로고 사용 범위 | 미확인 | 운영자, 법률 검토 |
| OG-02 권리 | 공개하는 모든 text, visual, audio의 이용·변경·상업 조건이 증명되는가 | source snapshot, 원문 URL, 확인일, SHA-256, attribution | 미승인 | 권리 책임자 |
| OG-03 문화 | 사실, 허구, fixture, 미확인이 분리되고 해석이 왜곡되지 않는가 | claim ledger, 원자료, caveat, 문화 검토 기록 | 미승인 | 문화 전문가 |
| OG-04 교육 | 초3 문장, 질문, 실패 회복, 회상이 이해 가능하고 안전한가 | 장면 script, 질문 근거, 교육 검토 의견 | 미승인 | 교육 검토자 |
| OG-05 접근성 | 실제 기기와 보조기기에서 핵심 여정을 독립 수행할 수 있는가 | 아래 실기기 checklist와 원본 화면 기록 | 미실시 | 접근성 검토자 |
| OG-06 연구 | 목적, 최소 수집, 보호자·아동 동의, 중단, 삭제가 승인됐는가 | 연구 protocol 승인본과 동의 문서 | 미승인 | 연구 책임자 |
| OG-08 배포 | SHA, artifact digest, 전체 gate, 성능, rollback, 보안 예외를 확인했는가 | release receipt, CI run, remote smoke | 미승인 | 운영자 |

각 승인 기록에는 검토자 실명 또는 조직 내부 식별자, 날짜, 대상 commit SHA, 판정, 조건, 만료 또는 재검토
조건을 남긴다. 이 공개 저장소에는 서명 원본, 연락처, 아동 정보와 비공개 협의 자료를 넣지 않는다.

10장면 `tiger-full-review`의 first-party 기술 품질은 세 전문 에이전트가 같은 candidate와
artifact를 검수해 `expand`를 판정했다. 이 결정은 외부 자산을 현재 범위에서 제외한 후보의
기술 완성도를 뜻하며, 사용자가 요구한 에이전트 검수 경계를 충족한다.

단, 10장면 `tiger-full-review`의 7개 review record는 모두 `pending`이다. 자동 source digest와 완주 결과는
검토 자료의 동일성만 증명한다. 운영자가 승인 문자열을 직접 바꾸지 않고 권리, 문화, 교육, 접근성 담당의
비개인 reviewer ref와 대상 digest를 승인 기록에서 투영해야 한다. 박물관 원본과 낭독 파일은 해당 file
단위 OG-02 승인 전 저장소에 넣지 않는다.

OG-02의 metadata-only 요청, 외부 evidence, 서명 검증과 결정적 staging 명령은
`docs/operation/rights-review.md`가 소유한다.

코드, 데이터 계약과 자동 gate의 전문 에이전트 교차검수는 `tests/audit/expert-reviews.json`이 별도로
소유한다. 이 registry의 PASS는 변경 scope를 technical review에 결박하지만 제3자 권리 결정, 실제 기기
사용 기록이나 아동 동의를 대신하지 않는다.

## 실기기와 보조기기 checklist

다음 조합에서 표지부터 회상 또는 보물 마무리까지 실행한다. 자동 Playwright receipt와 별개로 사람이 화면,
초점, 음성 안내, 손가락 오조작을 확인한다.

| 조합 | 필수 확인 | 상태 |
|---|---|---|
| Windows 최신 Chrome, Edge | 키보드만으로 완주, 200% browser zoom, 고대비, 화면 회전 대체 resize | 미실시 |
| Windows NVDA + Chrome | 제목 전환, 진행 단계, 힌트 누적, reflection, 오류 복구 읽기 순서 | 미실시 |
| macOS Safari + VoiceOver | rotor heading, radio 설정, focus 복구, PWA와 offline | 미실시 |
| iOS Safari + VoiceOver | 390px급 세로·가로, 실제 tap, zoom, 주소창 변화, touch target | 미실시 |
| Android Chrome + TalkBack | 실제 tap, 단서 목록, 회전, 설치 icon, offline 재진입 | 미실시 |
| 저사양 Android 후보 | 첫 장면 표시, 장면 20회 이동, memory 압박, service worker update | 미실시 |

모든 조합에서 확인한다.

1. 가로 overflow와 잘린 text 0.
2. focus가 현재 제목 또는 의도한 control에 있고 화면 안에 보임.
3. 색, 움직임, 음성 하나만으로 의미를 전달하지 않음.
4. 보조 음성 실패와 asset 실패에도 정적 읽기가 남음.
5. 진행 삭제가 해당 로컬 profile의 모든 pack version을 지움.
6. 아동을 탓하거나 점수, 순위, 시간 압박을 쓰지 않음.

## Release receipt

공개 후보마다 다음 값을 한 묶음으로 남긴다. 자동 산출물은 `../soombook.out`과 GitHub Actions artifact에
두고, 승인 판정만 운영 기록에 남긴다.

| 필드 | 기록 계약 |
|---|---|
| release class | `public-technical-demo` 또는 이후 승인된 등급 |
| source | 40자리 commit SHA, main 포함 여부 |
| artifact | `release.json`의 content SHA-256, base, BookPack version, Node version |
| quality | `check:release:automated` run URL과 성능, root, Pages 순서별 결과 |
| UI | 세 viewport receipt, 심각 axe, overflow, console, request, third-party origin |
| performance | 환경, cold/warm, LCP, INP, CLS, long task, memory, 반복 횟수 |
| content | fixture 표시 또는 OG-02·03·04 승인 ref |
| security | noindex, meta CSP, referrer, source hygiene, Pages response header 예외 |
| rollback | 마지막 정상 SHA, rollback workflow run, remote smoke |
| operator | 승인자, 승인 날짜, 조건, 재검토 기준 |

## 공개 승인 순서

1. `npm run check:release:automated`를 통과한다.
2. `qa:performance`의 root와 Pages 3회 합성 lab, 5회 heap receipt를 확인하고 목표 초과가 없음을
   확인한다. field CWV나 실제 기기 성능으로 오해하지 않는다.
3. 이 문서의 실기기 checklist에서 공개 후보에 필요한 항목을 사람이 확인한다.
4. 창작 fixture 표시, 보호자 안내, license, 문의 경로, Pages 보안 예외를 승인한다.
5. 최초 commit과 origin/main push를 별도로 승인한다.
6. repository의 Pages, environment reviewer, main 제한, self-review 금지를 확인한다.
7. `pages-preview`를 수동 실행하고 artifact SHA를 본 뒤 deploy를 승인한다.
8. remote smoke를 통과한 뒤에만 `공개 기술 체험판`으로 기록한다.
9. 실패하면 `pages-rollback`으로 마지막 정상 main SHA를 검증, 재빌드, 재배포한다.

성능 receipt와 운영자 배포 승인이 없으면 공개하지 않는다. 실제 문화자산과 아동 연구 승인이 없으면
제품 또는 교육 효과가 검증됐다고 표현하지 않는다.
