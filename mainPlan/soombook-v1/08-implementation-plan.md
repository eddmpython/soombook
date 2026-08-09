# 08. Implementation Plan

상태: Phase 0 착수 계약 v1.0

범위: 새 clone에서 실행 가능한 작업 환경부터 4장면 fixture 수직 절편, 검증, 운영자 검수 패키지까지의
파일, 심볼, 명령, PR 단위, 실패 조건과 롤백.

## 구현 기록 2026-08-09

P0A부터 P0E와 P0F의 자동화 범위까지 기능 검증용 수직 절편이 구현됐다. P0F의 실제 기기와 보조기기
검수는 OPERATOR GATE다. 현재 사실과 명령은 `docs/**`가 소유하고 이 문서는 남은 운영자 승인과 확장
순서를 계속 소유한다.

계획 대비 실제 구현 차이는 숨기지 않고 다음처럼 판정했다.

| 계획 | 실제 | 판정 |
|---|---|---|
| production 콘텐츠와 test factory 분리 | factory에서 14개 JSON을 생성하고 drift gate로 검산 | 충족 |
| IndexedDB port | 작은 직렬화 상태를 localStorage에 저장하고 실패를 화면에 표시 | Phase 0 단순화, 한 권 확장 전 재검토 |
| 여러 UI audit script와 plan JSON | type checked `uiAudit.spec.ts` 하나가 시나리오와 receipt를 소유 | 책임 통합 |
| offline 모든 engine | Chromium이 PWA offline 차단, Firefox와 WebKit은 완주와 저장 smoke | 도구 안정성에 따른 권위 분리 |
| 실제 이미지와 음원 | CSS 창작 장면과 기기 음성 합성 | 권리 승인 전 정공법 fallback |
| 최종 장면 즉시 완료 | `ENTER_REFLECTION` 뒤 회상 또는 보물 재확인으로만 완료 | PRD 완료 의미 repair |
| 대체 목록에서 단서 즉시 열기 | 세 길의 발자국과 풀잎을 비교한 뒤 같은 interaction 완료 | H1 관찰 가설 repair |
| 단방향 다음 장면 | 이전 버튼과 좌우 화살표가 runtime command를 공유 | FR-03의 표준 이동 보강 |

`content/fixtures` 직접 수정, test factory production import, 저장 성공 위장, 승인 전 실제 자산 교체는
금지한다.

## 1. 구현 결정

### 1.1 기술

- npm workspaces를 쓴다. 현재 환경에 있는 npm을 기준으로 lockfile을 커밋한다.
- 앱은 Vite, React, TypeScript 정적 PWA다. V1 backend는 없다.
- runtime은 React와 browser API를 모르는 순수 TypeScript package다.
- schema validator는 JSON Schema 2020-12와 Ajv를 사용한다.
- unit과 integration은 Vitest, browser journey는 Playwright, 자동 접근성은 axe를 쓴다.
- PWA cache는 Workbox를 직접 흩어 쓰지 않고 Vite PWA 설정 한 곳에서 생성한다.
- 이미지 파일이 없어도 작동하는 직접 제작 CSS fixture를 먼저 사용한다.
- build, coverage, browser report, screenshot은 저장소 밖 `../soombook.out`에 둔다.

패키지 버전은 2026-08-09 registry와 peer dependency를 확인한 뒤 `package-lock.json`에 고정한다. 이 문서는
버전 정본이 아니며 `package.json`과 lockfile이 정본이다.

### 1.2 DartLab에서 적용하는 코드 스타일

- TypeScript와 Python 함수, method, variable, parameter, 일반 파일명은 camelCase다.
- class, type, React component와 component file은 PascalCase다.
- module constant는 ALL_CAPS다.
- generic `utils`, `helpers`, `_*.py`를 만들지 않고 책임이 드러나는 도메인 이름을 쓴다.
- public surface는 사용처와 test를 함께 가진다. 미래용 export를 만들지 않는다.
- 한 함수 인자가 5개를 넘으면 의미 있는 object type으로 묶는다.
- `index.ts`는 re-export만 하고 business logic을 넣지 않는다.
- UI component는 runtime 규칙, rights 판정, progress mutation을 복제하지 않는다.
- fixture와 production data를 같은 type으로 읽되 truth와 publish 상태를 화면에서 구분한다.

Python 표준의 일반적 snake_case와 다른 선택이다. 이 저장소는 사용자가 지정한 DartLab 스타일을 일관되게
적용하고 lint로 신규 위반을 막는다.

## 2. Phase 0 목표 구조

```text
soombook/
├─ .github/
│  └─ workflows/
├─ .githooks/
├─ apps/
│  └─ reader-web/
│     ├─ src/
│     │  ├─ app/
│     │  ├─ book/
│     │  ├─ components/
│     │  ├─ ports/
│     │  └─ styles/
│     └─ index.html
├─ packages/
│  ├─ book-schema/
│  ├─ book-runtime/
│  └─ test-book-factory/
├─ content/
│  └─ fixtures/
│     └─ tiger-demo/
├─ tests/
│  ├─ e2e/
│  ├─ ui/
│  └─ audit/
├─ docs/
├─ mainPlan/
├─ scripts/
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ eslint.config.js
├─ LICENSE
└─ NOTICE
```

빈 `page-engine`, `audio-sync`, `design-system` package는 만들지 않는다. 첫 구현은 app의 명확한 port에 두고
두 소비자 또는 교체 경계가 실제로 생길 때 분리한다.

## 3. 실행 명령 계약

Phase 0 완료 시 root에서 다음이 복사 실행 가능해야 한다.

```powershell
npm ci
npm run dev
npm run check
npm run test:unit
npm run test:contracts
npm run test:e2e
npm run qa:ui
npm run build
npm test
python scripts/check_project_docs.py
```

`npm test`는 quick gate다. browser를 포함한 full gate는 `npm run check:full`이다. CI와 local 명령 이름을
다르게 만들지 않는다.

## 4. P0A 작업 환경

### 4.1 신규 파일

- `package.json`: workspace와 명령 정본.
- `package-lock.json`: 의존성 잠금.
- `tsconfig.json`: strict TypeScript와 path contract.
- `eslint.config.js`: React, hooks, accessibility, naming lint.
- `.gitignore`: secret, cache, local dependency, 임시 산출물.
- `.githooks/pre-commit`: staged text와 quick gate 진입.
- `.githooks/commit-msg`: em 대시, AI 생성 표식, 비한국어 범주 message 차단.
- `.github/workflows/quality.yml`: quick, contracts, browser, build job.
- `scripts/checkProject.mjs`: registry와 package, CI projection 검사.
- `tests/audit/gates.json`: gate ID, owner, command, CI job, blocking.

### 4.2 변경 파일

- `CLAUDE.md`: 실제 명령, 코드 스타일, UI QA, 산출물 경로.
- `docs/operation/workspace.md`: 확인된 설치, 개발, 검증, build 계약.
- `README.md`: 현재 구현 상태와 시작 명령.
- `scripts/check_project_docs.py`: 새 current contract와 license 파일, 금지 문자 범위.

### 4.3 실패 확인

1. registry에서 CI job 이름 하나를 바꿔 `checkProject` red.
2. 임시 Markdown에 em 대시를 넣어 document gate red.
3. type error fixture로 `tsc` red.
4. dependency boundary 위반 fixture 또는 static audit red.

임시 실패 fixture는 test가 스스로 만들고 정리한다. 저장소에 깨진 상태를 남기지 않는다.

## 5. P0B BookPack contract

### 5.1 `packages/book-schema`

파일:

- `src/bookPackTypes.ts`: manifest, book, scene, interaction, asset, rights, claim types.
- `src/bookPackSchema.ts`: JSON Schema object와 stable schema ID.
- `src/validateBookPack.ts`: profile별 semantic validator.
- `src/bookPackIssues.ts`: error code와 해결 문구.
- `src/index.ts`: public re-export만.
- `tests/validateBookPack.test.ts`: valid와 negative fixture.

주요 심볼:

```ts
type PublishProfile = 'fixture' | 'review' | 'production';
type ValidationIssue = { code; path; ref; message; severity };
type ValidationResult = { status; errors; warnings };

validateBookPack(pack, profile): ValidationResult
assertBookPack(pack, profile): BookPack
```

검사 순서:

1. JSON shape와 format version.
2. ID uniqueness와 reference existence.
3. scene order와 required completion.
4. interaction adapter와 unlock cycle.
5. audio segment.
6. asset budget와 integrity.
7. rights와 claim publish status.
8. accessibility summary, reading order, label.

### 5.2 `packages/test-book-factory`

파일:

- `src/createTigerDemoPack.ts`: 기본 valid fixture.
- `src/createInvalidPack.ts`: test가 field를 의도적으로 깨는 factory.
- `src/index.ts`: public re-export.

테스트가 production content를 import하지 않도록 test factory와 app fixture source를 분리한다. 의미는 같아도
두 JSON을 수기로 복사하지 않고 한 fixture builder의 serialized result를 검산한다.

### 5.3 `content/fixtures/tiger-demo`

- `manifest.json`
- `book.json`
- `scenes/scene-01.json`부터 `scene-04.json`
- `ledgers/assets.json`, `rights.json`, `claims.json`
- `integrity.json`

모든 화면에는 `기능 검증용 직접 제작 장면`, `실제 유물 아님`을 표시한다. fixture rights는 직접 제작
provenance만 가지며 박물관 또는 공공누리 표식을 쓰지 않는다.

## 6. P0C runtime과 progress

### 6.1 `packages/book-runtime`

파일:

- `src/runtimeTypes.ts`
- `src/createRuntimeState.ts`
- `src/reduceBookCommand.ts`
- `src/runtimeSelectors.ts`
- `src/runtimeReceipts.ts`
- `src/index.ts`
- `tests/reduceBookCommand.test.ts`

주요 심볼:

```ts
createRuntimeState(pack, progress): BookRuntimeState
reduceBookCommand(state, command): RuntimeTransition
canLeaveScene(state): boolean
selectJourneyState(state): JourneyState
```

불변조건:

- reducer는 `Date`, random, DOM, storage, audio를 직접 호출하지 않는다.
- effect description은 실행할 일을 표현하고 성공 뒤 보상 command를 받는다.
- same idempotency key는 receipt를 늘리지 않는다.
- scene leave 전에 현재 필수 상태가 완료돼야 한다.
- adapter가 달라도 같은 interaction ID는 같은 progress를 만든다.

### 6.2 app port

파일:

- `apps/reader-web/src/ports/progressStore.ts`: interface.
- `apps/reader-web/src/ports/indexedDbProgressStore.ts`: browser adapter.
- `apps/reader-web/src/ports/memoryProgressStore.ts`: 명시적 fallback.
- `apps/reader-web/src/ports/runEffects.ts`: persistence와 UI effect 실행.

storage failure는 memory state를 유지하고 `저장되지 않음` 상태를 표시한다. 자동으로 성공 receipt를 만들지
않는다.

## 7. P0D와 P0E reader UI

### 7.1 app shell

파일:

- `apps/reader-web/src/main.tsx`
- `apps/reader-web/src/app/ReaderApp.tsx`
- `apps/reader-web/src/app/useBookRuntime.ts`
- `apps/reader-web/src/book/loadFixturePack.ts`
- `apps/reader-web/src/styles/tokens.css`
- `apps/reader-web/src/styles/global.css`

첫 viewport는 navbar나 dashboard가 아니라 책상, 표지, 한 개의 `오늘의 책 열기` 행동으로 구성한다.

### 7.2 component와 port

| 파일 | 책임 | 금지 |
|---|---|---|
| `components/BookCover.tsx` | 표지 열기와 표준 button | 진행 직접 수정 |
| `components/BookStage.tsx` | 현재 장면 layout | rules 복제 |
| `components/StoryText.tsx` | 본문과 읽기 상태 | audio lifecycle 소유 |
| `components/ReadingControls.tsx` | 세 읽기 mode | 자동 장면 이동 |
| `components/ExplorationLens.tsx` | lens 위치와 detail layer | clue 완료 직접 선언 |
| `components/ExploreChoices.tsx` | tap, keyboard, linear 대체 | 낮은 등급 UI 표현 |
| `components/HintPanel.tsx` | 단계별 hint 요청 | score와 penalty |
| `components/ReasoningChoices.tsx` | radio group 근거 선택 | 빨간 실패 |
| `components/ConnectionCard.tsx` | truth, source, fixture 상태 | 기관 제휴 암시 |
| `components/CompletionPanel.tsx` | 한 줄, 보물, 재탐험 | 순위와 무한 추천 |
| `components/ParentNote.tsx` | 저장과 fixture 안내 | 아이 흐름 선차단 |
| `ports/pageEngine.ts` | static과 CSS fold port | scene 해석 |
| `ports/narrationController.ts` | 음성 lifecycle와 text timing | 전이 결정 |

### 7.3 CSS fixture 장면

- 실제 문화자산과 유사한 복제 이미지를 만들지 않는다.
- 한지, 먹, 연필, 황동, 나무의 추상 재료감은 CSS gradient, shadow, pseudo element로 만든다.
- 동물 발자국은 단순 기하 도형이며 `DEMO ASSET` 문구를 함께 보인다.
- 완성 제품의 예술 자산으로 승인하지 않는다.
- reduced motion에서는 transition duration과 자동 이동을 없앤다.

### 7.4 음성 전략

Phase 0은 문장 단위 timing controller와 browser capability fallback을 검증한다. 운영 음성이라고 부르지 않는다.

- 사전 음원 fixture가 있으면 `HTMLAudioElement`로 재생한다.
- 음원이 없으면 직접 읽기가 완전한 기본 경로다.
- OS speech를 쓰는 개발 helper가 있더라도 기기별 차이를 숨기지 않고 `개발용 음성`으로 표시한다.
- P1 전에 검수 음원과 segment timing이 없으면 `같이 읽자`, `들려줘`를 운영 기능으로 승인하지 않는다.

## 8. P0F PWA와 frontend QA

### 8.1 PWA

- `apps/reader-web/vite.config.ts`: build output, manifest, service worker, cache policy.
- 첫 fixture와 app shell은 same-origin precache.
- HTML은 update 확인, content hash asset은 immutable cache.
- 열린 session은 현재 pack version을 유지한다.
- update와 cache 삭제가 local progress를 지우지 않는다.

### 8.2 browser tests

파일:

- `playwright.config.ts`: browser, viewport, output outside repo.
- `tests/e2e/readerFlow.spec.ts`: 기능, 접근성, 저장 복구, offline, 확대와 입력 adapter.
- `tests/ui/uiAudit.spec.ts`: 세 viewport의 실제 조작, axe, network, overflow, PNG와 JSON receipt.
- `tests/performance/performanceAudit.spec.ts`: root와 Pages의 합성 성능과 반복 heap receipt.
- `apps/reader-web/src/bookPackWorker.ts`: 초기 메인 스레드를 막지 않는 BookPack 정본 검증.
- `playwright.config.ts`, `playwright.pages.config.ts`, `playwright.performance.config.ts`: profile별 권위.

selector는 사용자 role과 name을 먼저 사용한다. 시각 audit의 의미 단위 식별에는 안정된 `data-qa`를 허용하되
그 존재만으로 통과하지 않는다.

`uiAudit.spec.ts`는 다음을 수행한다.

1. healthy preview를 확인한다.
2. 각 viewport에서 새 context를 연다.
3. scenario를 실제 조작한다.
4. console, network, overflow, focus, box, text를 검사한다.
5. 이전 project 영수증을 지우고 screenshot과 JSON receipt를 `../soombook.out/ui-audit/<project>`에 쓴다.
6. error finding 하나라도 있으면 종료코드 1이다.
7. 자신이 시작한 server와 browser를 종료한다.

### 8.3 browser 수용 기준

- Chromium에서 4장면 pointer와 keyboard journey.
- Firefox와 WebKit에서 핵심 smoke.
- desktop, tablet, mobile overflow 0.
- reduced motion과 200% zoom에서 완료.
- offline reload 뒤 완료.
- console error, failed critical request, third-party request 0.
- axe serious와 critical violation 0.

## 9. 라이선스와 권리 파일

결정:

- 저장소 software와 code documentation은 `Apache-2.0`.
- Apache-2.0은 명시적 저작권과 특허 허여를 제공하고 상표 사용은 허여하지 않는다.
- 첫 당사자 공개 story 또는 art를 CC BY 4.0으로 열지 여부는 실제 자산 생성 뒤 별도 결정한다.
- `content/fixtures`의 직접 제작 fixture는 기술 검증용이며 현재 Apache-2.0 저장소 범위에 포함하되 실제
  문화자산으로 표현하지 않는다.
- 제3자 문화자산, 음성, font, effect는 원 라이선스를 유지하며 project LICENSE로 재허여하지 않는다.
- `Soombook`, `숨책`, logo와 기관 표시는 별도 상표와 brand approval 대상이다.

파일:

- `LICENSE`: Apache License 2.0 전문.
- `NOTICE`: project copyright와 공식 repository.
- `docs/operation/licensing.md`: code, content, third-party, trademark 경계.
- `THIRD_PARTY_NOTICES.md`: 실제 dependency와 포함 asset inventory.
- 각 BookPack `ledgers/rights.json`: asset별 권리와 변경 내용.

공식 근거:

- [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- [GNU AGPL 3.0 section 13](https://www.gnu.org/licenses/agpl-3.0.en.html#section13)
- [Creative Commons software license 안내](https://creativecommons.org/faq/#can-i-apply-a-creative-commons-license-to-software)

이 결정은 법률 자문이 아니다. 실제 외부 자산과 상표 공개는 사람 권리 검토를 거친다.

## 10. PR 또는 commit 단위

1. `기획: 숨책 V1 실행 계약 완성`
2. `환경: npm workspace와 품질 게이트 구성`
3. `계약: BookPack schema와 fixture validator 추가`
4. `기능: 결정론 독서 runtime과 로컬 진행 추가`
5. `기능: 한 장면 읽기 수직 절편 구현`
6. `기능: 4장면 탐험과 추론 완결`
7. `품질: 접근성 PWA 브라우저 게이트 추가`
8. `운영: 라이선스와 프론트 검수 절차 확정`

커밋은 사용자가 요청했을 때만 한다. stage는 위 단위의 명시 경로만 사용하고 `git add .`, `git add -A`를
쓰지 않는다. push도 별도 요청이 있을 때만 수행한다.

## 11. 구현 중 정공법 판정

이 프로젝트에서 정공법은 어려운 기술을 무조건 고르는 뜻이 아니다. 다음을 모두 만족하는 가장 작은 완전한
경로다.

1. 실제 사용자 결과까지 연결된다.
2. 도메인 소유자와 단일 정본을 우회하지 않는다.
3. 실패를 숨기지 않고 재현 가능한 gate를 둔다.
4. 접근성 대체가 같은 command와 receipt를 쓴다.
5. fixture와 승인된 운영 자산을 구분한다.
6. 관련 없는 미래 구조를 만들지 않는다.
7. 막힘은 작은 독립 작업으로 우회하되 차단 조건 자체를 낮추지 않는다.
8. build, test, 실제 render, 사람 승인을 각각 다른 증거로 기록한다.

## 12. Phase 0 최종 검증 순서

```text
python scripts/check_project_docs.py
-> npm run check
-> npm run test:contracts
-> npm run test:unit
-> npm run build
-> npm run test:e2e
-> npm run qa:ui
-> npm run qa:performance
-> npm run check:full
-> operator device and content checklist
```

앞 단계가 실패하면 뒤 단계가 의미 있는지 판단한다. 문서 오류 때문에 unit test를 건너뛰는 식의 무관한
중단은 피하되, 공개 build는 모든 blocking gate가 green일 때만 만든다.

## 13. Phase 0 완료 정의

- 새 clone에서 lockfile 설치와 문서 명령이 재현된다.
- valid fixture와 invalid published pack이 기대한 green과 red를 만든다.
- 4장면 journey가 pointer, keyboard, reduced motion, offline에서 완료된다.
- 세 viewport의 실제 screenshot과 receipt를 사람이 검토할 수 있다.
- remote 개인정보와 third-party request가 없다.
- build와 QA 산출물이 저장소 밖에 있고 Git 상태가 깨끗하게 설명된다.
- 현재 계약을 `docs/**`에 반영하고, 원장에 판정을 기록한다.
- 실제 문화자산, 낭독, 아동 연구가 미승인이면 제품을 fixture 기술 데모로만 명시한다.
