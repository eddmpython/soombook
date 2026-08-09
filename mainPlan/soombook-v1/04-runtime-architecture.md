# 04. Runtime Architecture

상태: V1 기술 계약 v1.0

범위: static-first reader, package boundary, 상태 기계, asset loading, offline, 성능, 보안, 배포와 미래 서버 도입
조건.

## 1. 아키텍처 한 줄

**V1은 서버 없는 정적 React PWA가 검증된 BookPack을 로드하고, 모든 읽기와 탐색을 클라이언트에서
결정론적으로 실행하며, 진행은 로컬에만 저장한다.**

```text
Static app shell
  -> BookPack loader
    -> schema and integrity verifier
      -> book runtime state machine
        -> accessible React surfaces
          -> page, audio, lens adapters
            -> local progress and coarse local diagnostics
```

## 2. V1 기술 결정

| 영역 | 결정 | 이유 |
|---|---|---|
| 앱 | Vite + React + TypeScript | 정적 배포, 빠른 browser iteration, 서버 불필요 |
| package manager | npm workspaces | 현재 환경에 설치돼 있고 별도 도구 설치가 필요 없음 |
| 콘텐츠 schema | JSON Schema 2020-12 + TypeScript validator | 공개 포맷 가능성과 기계 검증 |
| 콘텐츠 tool | Python 3.13 + uv | 이미지, 오디오, rights ingest에 적합 |
| 상태 | 순수 reducer와 command bus | 입력 방식과 UI 효과를 도메인 상태에서 분리 |
| 진행 저장 | IndexedDB | versioned object store와 migration |
| asset cache | Cache Storage | BookPack과 PWA offline 자산 분리 |
| UI 기본 | semantic DOM + CSS | 스크린리더와 표준 입력 보존 |
| 페이지 효과 | `PageEngine` port 뒤 CSS prototype, StPageFlip spike | 교체와 fallback 가능 |
| 렌즈 | CSS clip 또는 mask 기반 base, high-res optional | DOM 접근성과 성능 제어 |
| audio | HTMLAudioElement base + timing controller | 예측 가능한 media lifecycle |
| backend | 없음 | 첫 가치에 필요하지 않음 |
| telemetry | 원격 없음 | 아동 개인정보와 기준선 없는 수집 방지 |

패키지의 구체 버전은 Phase 0 설치 시 공식 지원 범위와 Node 22 호환성을 확인하고 lockfile로 고정한다.
문서에 최신 버전을 추측해 적지 않는다.

## 3. 목표 저장소 구조

```text
soombook/
├─ apps/
│  └─ reader-web/
│     ├─ src/
│     ├─ public/
│     └─ e2e/
├─ packages/
│  ├─ book-schema/
│  ├─ book-runtime/
│  ├─ page-engine/
│  ├─ exploration-lens/
│  ├─ audio-sync/
│  ├─ progress-store/
│  ├─ design-system/
│  └─ test-book-factory/
├─ pipeline/
│  ├─ pyproject.toml
│  ├─ src/soombook_pipeline/
│  └─ tests/
├─ content/
│  ├─ fixtures/
│  ├─ drafts/
│  └─ reviews/
├─ tests/
│  ├─ contracts/
│  ├─ accessibility/
│  ├─ performance/
│  └─ visual/
├─ docs/
├─ mainPlan/
└─ scripts/
```

처음부터 빈 package를 모두 만들지 않는다. Phase 0은 `reader-web`, `book-schema`, `book-runtime`,
`test-book-factory`만 만들고 실제 중복이나 교체 경계가 확인될 때 분리한다.

## 4. 의존 방향

```text
reader-web
├─ design-system
├─ page-engine
├─ exploration-lens
├─ audio-sync
├─ progress-store
└─ book-runtime
   └─ book-schema

pipeline
└─ book-schema artifact, JSON Schema
```

불변조건:

- `book-runtime`은 React, browser DOM, page library를 import하지 않는다.
- 입력 adapter는 domain command를 호출하고 직접 진행 저장을 수정하지 않는다.
- `page-engine`은 scene 내용을 해석하지 않는다.
- `audio-sync`는 장면 전이를 결정하지 않는다.
- `reader-web`은 rights나 completion 규칙을 복제하지 않는다.
- Python pipeline과 TypeScript runtime은 같은 versioned JSON Schema artifact를 소비한다.

## 5. Runtime domain

### 5.1 주요 타입

```ts
type BookRuntimeState = {
  pack: LoadedBookPack;
  sceneId: string;
  sceneState: SceneRuntimeState;
  reading: ReadingState;
  exploration: ExplorationState;
  progress: GuestProgress;
  capability: RuntimeCapability;
  errors: RuntimeIssue[];
};

type BookCommand =
  | { type: 'OPEN_BOOK' }
  | { type: 'ENTER_SCENE'; sceneId: string }
  | { type: 'CONSUME_TEXT'; textId: string; mode: ReadingMode }
  | { type: 'COMPLETE_INTERACTION'; interactionId: string; adapter: InputAdapter }
  | { type: 'REQUEST_HINT'; interactionId: string }
  | { type: 'COMPLETE_REASONING'; reasoningId: string; optionId: string }
  | { type: 'OPEN_CONNECTION'; connectionId: string }
  | { type: 'LEAVE_SCENE'; direction: 'previous' | 'next' }
  | { type: 'SET_READING_MODE'; mode: ReadingMode }
  | { type: 'SET_REDUCED_MOTION'; enabled: boolean };
```

### 5.2 유일한 전이 함수

```ts
reduceBookCommand(state, command) -> { state, effects, receipts }
```

- reducer는 순수 함수다.
- 오디오 재생, IndexedDB write, navigation은 effect runner가 수행한다.
- effect 실패는 보상 command로 돌아온다.
- journey receipt는 idempotency key를 가진다.
- UI component가 직접 scene 완료를 선언하지 않는다.

### 5.3 입력 adapter

```text
drag page corner
tap next control
keyboard ArrowRight
screen reader next button
  -> LEAVE_SCENE(next)

lens target
region tap
keyboard target selection
linear exploration selection
  -> COMPLETE_INTERACTION(find-tiger-paw, adapter)
```

같은 command를 사용하므로 접근성 대체가 별도 게임 상태로 갈라지지 않는다.

## 6. PageEngine port

```ts
interface PageEngine {
  mount(host: HTMLElement, options: PageEngineOptions): void;
  render(previous: PageFace | null, current: PageFace, next: PageFace | null): void;
  transition(direction: 'previous' | 'next', mode: MotionMode): Promise<PageTransitionResult>;
  setInteractionLock(locked: boolean): void;
  resize(viewport: Viewport): void;
  destroy(): void;
}
```

### 구현 후보

1. `StaticPageEngine`: 즉시 전환, 기준선과 fallback, 반드시 먼저 구현.
2. `CssFoldPageEngine`: 짧은 fold와 그림자, 기본 감성 후보.
3. `StPageFlipAdapter`: 외부 library spike, 채택 전 접근성과 lifecycle 검증.
4. 자체 곡률 엔진: 제품 가치 증명 뒤 DEFER.

### 채택 gate

- React Strict Mode mount, unmount에서 listener와 node leak 없음.
- pointer cancel과 orientation change 뒤 상태 복구.
- DOM reading order를 바꾸거나 복제 text를 스크린리더에 노출하지 않음.
- reduced motion에서 animation을 실행하지 않음.
- 20회 연속 전환에 scene skip과 audio overlap 없음.
- low-tier profile에서 frame budget 통과.

StPageFlip이 실패해도 `StaticPageEngine`으로 전체 제품을 계속 구현한다.

## 7. ExplorationLens port

```ts
interface ExplorationLens {
  activate(scene: LensScene): void;
  move(normalizedPoint: Point): void;
  selectTarget(targetId: string, adapter: InputAdapter): void;
  setMode(mode: 'detail' | 'clue' | 'time' | 'real'): void;
  deactivate(): void;
}
```

### 렌더 전략

- base 이미지는 일반 `<img>`와 대체 텍스트를 사용한다.
- detail layer는 같은 normalized coordinate space를 쓴다.
- 렌즈는 CSS mask 또는 clip으로 detail layer 일부만 표시한다.
- high-res asset이 없거나 늦으면 base layer 확대를 사용한다.
- WebGL은 V1 핵심 경로에 넣지 않는다.

### pointer 규칙

- pointer capture는 렌즈 손잡이에서만 시작한다.
- `pointercancel`, `lostpointercapture`, visibility change에서 반드시 정리한다.
- 렌즈 active일 때 browser scroll을 넓게 막지 않는다. 필요한 영역만 제어한다.
- 손가락 가림을 줄이는 offset을 제공한다.
- drag 없이 target 목록과 영역 tap을 제공한다.

## 8. AudioSync

### lifecycle

```text
idle -> loading -> ready -> playing -> paused -> ended
             |          |          |
             v          v          v
           failed     failed     disposed
```

### 계약

- track 하나에 active media element 하나만 허용한다.
- scene leave 전에 pause, currentTime snapshot, source cleanup을 실행한다.
- highlight는 audio `currentTime`에서 계산하고 animation timer를 권위로 쓰지 않는다.
- page visibility가 hidden이면 정책에 따라 pause하고 돌아왔을 때 사용자 선택으로 resume한다.
- playback rate 변경은 segment data를 수정하지 않는다.
- audio 실패는 text 읽기를 막지 않는다.

## 9. BookPack loading

### 순서

```text
manifest fetch
-> format and runtime compatibility
-> critical file integrity
-> book and first scene schema
-> first scene critical assets
-> render readable
-> next scene background prefetch
-> optional detail and audio prefetch
```

첫 장면을 위해 전체 pack을 기다리지 않는다.

### cache key

```text
soombook:{packId}:{packVersion}:{assetDigest}
```

URL만 cache identity로 쓰지 않는다. content hash가 바뀌면 새 entry다.

### 실패 전략

| 실패 | 사용자 경로 | 진단 |
|---|---|---|
| manifest 없음 | retry와 정적 오류 카드 | `PACK_MANIFEST_UNAVAILABLE` |
| format 불일치 | 지원하지 않는 책 안내 | `PACK_FORMAT_UNSUPPORTED` |
| image 실패 | alt와 fallback image | `ASSET_IMAGE_FAILED` |
| detail 실패 | base 확대 | `ASSET_DETAIL_FAILED` |
| audio 실패 | 직접 읽기 | `AUDIO_TRACK_FAILED` |
| progress write 실패 | 현재 세션 memory 유지와 안내 | `PROGRESS_WRITE_FAILED` |
| service worker 실패 | online reader 계속 사용 | `OFFLINE_RUNTIME_FAILED` |

## 10. Local persistence

### IndexedDB stores

- `packs`: 검증한 manifest와 cache metadata
- `progress`: guest profile slot별 진행
- `receipts`: 중복 방지용 coarse journey receipt
- `settings`: reading, motion, sound, text preferences

### transaction

장면 전환은 다음을 같은 logical commit으로 취급한다.

1. 현재 장면 필수 상태 검증.
2. 다음 장면 ID 결정.
3. 진행 record 쓰기.
4. write 성공 receipt 발급.
5. UI 전환 확정.

write 실패 시 UI를 멈추지 않을 수 있지만 `저장되지 않음`을 조용히 숨기지 않는다. memory state는 유지하고
다시 저장할 수 있게 한다.

## 11. Offline

### V1 범위

- app shell과 fixture BookPack 하나를 명시적 다운로드 없이 precache할 수 있다.
- 업데이트 중에도 열린 session의 현재 pack version을 유지한다.
- 새 version은 다음 책 열기에서 적용한다.
- offline 상태에서 외부 출처 링크는 사용할 수 없음을 알린다.
- cache 삭제는 local progress 삭제와 별개다.

### quota

- 저장 전 예상 byte를 보여줄 필요는 한 권 prototype에서 없지만 내부 예산을 검사한다.
- quota 초과 시 high-res와 audio optional cache부터 포기한다.
- 진행 데이터는 asset cache eviction과 함께 삭제하지 않는다.

## 12. 성능 예산

### critical path 목표

| 항목 | 목표 |
|---|---:|
| app shell compressed JS + CSS | 350KB 이하 초기 목표 |
| 첫 장면 base image 총량 | 600KB 이하 |
| 첫 장면 text와 schema | 50KB 이하 |
| 첫 interaction 준비 | 첫 장면 표시 뒤 500ms 안 |
| LCP | mid-tier mobile에서 2.5초 이하 목표 |
| INP | 200ms 이하 목표 |
| CLS | 0.1 이하 목표 |
| long task | 50ms 초과 작업 최소화, 200ms 초과 0 목표 |
| steady memory | 4장면 탐험 뒤 지속 증가 없음 |

수치는 실제 환경 기준선을 얻기 위한 초기 예산이다. 구현 완료 선언에는 측정 환경, cold 또는 warm cache,
network profile을 함께 기록한다.

### asset 예산

- base page image: 장당 150~350KB 목표
- detail image: 장당 1.5MB 상한, initial load 제외
- narration audio: 장면당 1MB 상한 목표
- font: 필요한 weight만 subset, 시스템 fallback 제공
- decorative texture: 반복 가능한 작은 asset 우선

## 13. 지원 행렬

### 자동화

- Chromium desktop latest available in CI
- WebKit engine available in browser test runner
- Firefox engine available in browser test runner
- viewport: 390x844, 768x1024, 1280x800
- reduced motion, 200% zoom, keyboard-only

### 운영자 실기기

- 저사양 Android Chrome 1대
- 중급 Android Chrome 1대
- iPad Safari 1대
- Windows Chrome 또는 Edge 1대

기기 모델은 실제 확보 뒤 원장에 기록한다. 실기기 확인이 없으면 자동화 통과와 구분해 보고한다.

## 14. 보안 경계

- BookPack은 data이며 instruction이나 executable code가 아니다.
- 콘텐츠 text는 React text node로 렌더하고 HTML injection을 허용하지 않는다.
- 외부 URL은 allowlisted protocol과 새 창 보호 속성을 검사한다.
- CSP는 script, style, media, image, connect source를 최소화한다.
- third-party analytics, ad, chat, social SDK를 넣지 않는다.
- package lock과 dependency review를 CI에 둔다.
- service worker update와 rollback은 versioned cache를 사용한다.
- source map 공개 여부는 secret과 source asset URL 노출을 검사한 뒤 결정한다.

## 15. 관측성과 privacy

Phase 0은 console debug와 local diagnostic export만 제공한다.

```json
{
  "runtimeVersion": "0.1.0",
  "packVersion": "0.1.0",
  "capabilityClass": "low",
  "issues": ["ASSET_DETAIL_FAILED"],
  "journeyStates": ["opened", "read", "explored"],
  "containsPersonalData": false
}
```

진단 export에 path, user text, audio, IP, exact coordinates, browser fingerprint를 넣지 않는다. 원격 수집은
별도 privacy gate 전 구현하지 않는다.

## 16. 배포

V1 artifact는 정적 디렉터리다.

```text
npm run build
-> static artifact
-> local preview
-> browser gate
-> 운영자 승인
-> preview hosting
```

호스팅 제공자는 local vertical slice를 막지 않는다. 선택 기준은 다음과 같다.

- immutable asset cache와 HTML revalidation 제어
- custom headers와 CSP
- preview와 production 분리
- 원자적 배포와 빠른 rollback
- 비용과 로그 보존 정책
- 한국 사용자 latency

DNS와 production publish는 운영자 승인 작업이다.

## 17. 서버 도입 gate

다음 중 적어도 하나가 실제 사용자 결과로 증명돼야 서버를 도입한다.

- 여러 기기에서 같은 진행을 이어야 하는 반복 요구
- 보호자가 여러 아이 profile을 관리해야 하는 요구
- 비공개 학교 배포와 학기 종료 삭제
- 권리 담당자가 web workflow로 승인해야 하는 제작량
- BookPack catalog가 정적 manifest로 운영하기 어려운 규모

서버 도입 전에 작성할 별도 계약:

- identity와 법정대리인 동의
- data inventory, retention, deletion, export
- threat model과 incident response
- tenant와 학교 경계
- backup과 restore
- API authorization
- 비용과 SLO

FastAPI와 PostgreSQL은 후보일 뿐 이 gate 통과 전 확정 아키텍처가 아니다.

## 18. 롤백

- 외부 PageEngine 문제: `StaticPageEngine`으로 교체.
- detail lens 문제: base 확대와 선형 탐색 유지.
- audio 문제: 직접 읽기 기본, track 비활성화.
- service worker 문제: 등록 해제 migration과 online reader 유지.
- BookPack 문제: catalog pointer를 이전 approved version으로 복구.
- app deploy 문제: 이전 immutable artifact로 복구.
- 진행 schema 문제: 원본 store를 보존하고 reader를 read-only recovery로 전환.

rollback에서 사용자 로컬 진행과 승인 증거를 자동 삭제하지 않는다.
