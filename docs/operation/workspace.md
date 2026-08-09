# Workspace Contract

확인일: 2026-08-09

## 현재 환경

| 도구 | 확인 값 |
|---|---|
| 운영체제와 셸 | Windows, PowerShell |
| Git | 2.49.0.windows.1 |
| Node.js | 22.19.0 |
| npm | 10.9.3 |
| Python | 3.13.7 |
| uv | 0.8.22 |
| pnpm | 설치되지 않음 |

버전은 환경 재구성 시 달라질 수 있다. JavaScript 의존성은 `package.json`과 `package-lock.json`을 따른다.

## 현재 저장소 구조

```text
soombook/
├─ AGENTS.md
├─ CLAUDE.md
├─ README.md
├─ apps/reader-web/
├─ packages/
│  ├─ book-schema/
│  ├─ book-runtime/
│  ├─ book-authoring/
│  └─ test-book-factory/
├─ docs/
├─ tests/
├─ .github/workflows/
├─ .githooks/
├─ mainPlan/
└─ scripts/
```

## 현재 명령

| 목적 | 명령 |
|---|---|
| 의존성 설치 | `npm install` |
| Git 원격과 훅 설정 | `npm run setup:workspace` |
| 개발 서버 | `npm run dev` |
| 빠른 로컬 검증 | `npm run check` |
| fixture JSON 재생성 | `npm run content:sync` |
| 10장면 검수 후보 compile | `npm run review-candidate:sync` |
| 검수 후보 source와 compiled drift | `npm run check:review-candidate` |
| 검수 후보 격리 build | `npm run build:review-candidate` |
| 검수 후보 desktop, mobile, offline 여정 | `npm run test:review-candidate` |
| 내부 timing WAV 재생성 | `npm run fixture-audio:sync` |
| PWA PNG icon 재생성 | `npm run icons:sync` |
| 공개 source 위생 | `npm run check:source` |
| BookPack 실제 자산 무결성 | `npm run check:assets` |
| fixture 반복 제작성 | `npm run check:fixtures` |
| 제품 빌드 | `npm run build` |
| GitHub Pages artifact | `npm run build:pages` |
| 브라우저 여정 | `npm run test:e2e` |
| 내부 오디오 production 여정 | `npm run test:audio-fixture` |
| GitHub Pages 하위 경로 브라우저 검증 | `npm run test:pages` |
| 세 화면 UI 감수 | `npm run qa:ui` |
| root와 Pages 합성 성능 | `npm run qa:performance` |
| 전체 차단 게이트 | `npm run check:full` |
| 공개 후보 자동 게이트 | `npm run check:release:automated` |
| 공개 자동 release 검증 | `npm run check:release:automated` |
| 정기 다중 브라우저 호환성 | `npm run test:e2e:all` |

빌드, Playwright 결과, UI 캡처, 성능과 JSON 영수증은 형제 폴더 `../soombook.out`에 생성된다. 이 경로는
소스 저장소와 분리되며 Git에 넣지 않는다. root와 Pages build는 같은 중간 경로를 순차 사용하므로 동시에
실행하지 않는다. Pages artifact는 `/soombook/` profile과 공개 위생 검사를 적용한다. 기본과 Pages
build는 registry의 `public-demo` 하나만 포함한다. 내부 오디오 검사는
`SOOMBOOK_INTERNAL_FIXTURE_BUILD=true`인 전용 프로세스와 별도 출력 경로, port 4174를 사용하며 일반
개발과 공개 build에서 내부 fixture를 선택할 수 없다. 10장면 후보는 `SOOMBOOK_REVIEW_BUILD=true`, 별도
`review-candidate` 출력과 port 4175를 쓰며 `review` validator만 통과한다.

## 외부 입력 기준선

원본 기획서:

```text
로컬 Downloads/숨책_초3_인터랙티브_독서탐험_장기기획서.md
SHA-256: C7247AEB8179F881E3EB1EFBD21AD4DA6CB567E3EA134C2F3B64718EFACB47D3
```

원본은 기획 입력이며 저장소 정본이 아니다. 원본이 이동해도 실행 판단은
`mainPlan/soombook-v1/01-source-audit.md`와 나머지 PRD 계약으로 재현할 수 있어야 한다.

## 알려진 환경 함정

- 저장소가 동기화 경로 아래 있다. 개발 서버와 테스트가 파일을 빠르게 만들고 지울 때 잠금이나
  지연이 생길 수 있다.
- Windows 경로와 PowerShell을 기준으로 시작하되, 애플리케이션 명령은 CI의 Linux에서도 동작하게 만든다.
- Git 기본 설정은 `master`였으나 이 저장소는 `main`으로 초기화됐다.
- 공공데이터 API 키, 박물관 제휴, 상표, 실제 아동 연구 승인은 현재 없다.
- 인앱 브라우저 연결은 실행 환경에 따라 없을 수 있다. 자동 Chromium 감수는 Playwright 설치 뒤 독립적으로
  실행된다.
