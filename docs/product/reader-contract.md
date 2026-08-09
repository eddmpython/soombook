# Reader Product Contract

확인일: 2026-08-09

## 현재 전달물

현재 공개 리더는 초등학교 3학년 대상의 무계정 4장면 정적 PWA다. 별도 격리 profile에는 같은 제목의
10장면 `review` 후보가 있으며 출판본이나 공개 catalog 항목이 아니다.

```text
표지 열기 -> 장면 읽기 -> 세 길 비교 -> 근거 선택 -> 질문 카드 연결 -> 돌아보기 -> 완료
```

콘텐츠는 실제 문화유산 원본이나 박물관 설명이 아니다. 화면과 데이터에 공개 체험판임을 표시하며,
권리와 사실 검토 없이 `published` 상태로 검증할 수 없다.

## 동작 계약

| 장면 | 아이의 핵심 행동 | 완료 조건 |
|---|---|---|
| 시작 | 표지를 열고 첫 문장을 읽는다 | 현재 장면의 글 1개 이상 읽음 |
| 찾기 | 렌즈와 영역 탭으로 그림을 살피거나 키보드와 선형 목록으로 세 길을 비교한다 | 글 읽음과 같은 단서 발견 |
| 생각 | 길의 두 특징과 호랑이의 편지를 함께 보고 길과 까닭을 고른다 | 글 읽음과 정답 근거 선택 |
| 연결 | 현실의 그림을 볼 때 사용할 질문 카드를 연다 | 글 읽음과 카드 열기 |
| 마무리 | 기억할 한 줄을 고르거나 발견한 보물을 실제로 다시 본다 | 명시적 돌아보기 행동 뒤 완료 |

- 오답은 실패 낙인이나 점수 없이 재시도 안내만 제공한다.
- 진행 순서는 상태 기계가 차단하며 UI에서 장면을 임의로 건너뛸 수 없다.
- 동일 command ID는 한 번만 처리한다.
- 마지막 장면의 요구를 마쳐도 곧바로 완료하지 않는다. `ENTER_REFLECTION`이 `reflecting`으로 옮기고,
  등록된 회상 문장 또는 이미 발견한 보물로 `COMPLETE_REFLECTION`을 수행해야만 `completed`가 된다.
- 진행은 이 기기의 `localStorage`에만 저장한다. 책과 pack version, 현재 장면, 완료 ID, 글씨와 움직임
  설정만 저장하며 이름, 자유 답안, 음성, 포인터 궤적, 정확한 시각, 오답 횟수와 receipt는 저장하지 않는다.
- 원격 telemetry와 계정은 기본값이 아니라 현재 구현 자체에 없다.
- 기본 글씨와 큰 글씨를 고를 수 있다. 움직임은 기기 설정을 따르거나 항상 줄이도록 고를 수 있으며, OS가
  움직임 축소를 요청하면 앱 설정으로 강제 해제하지 않는다.
- 공개 tiger 체험판의 reading mode는 `내가 읽을래` 하나다. 1280px 이상에서는 그림과 글을 정적 양면으로
  배치하고 보이는 바깥 가장자리 버튼을 제공한다. 좁은 화면은 단면으로 돌아가며 상태를 잃지 않는다.
- 가장자리에서 시작한 짧은 tap과 제한된 가로 끌기는 이전·다음 버튼과 같은 runtime command를 쓴다.
  렌즈가 pointer를 소유할 때 가장자리 gesture를 잠그고, 세로 의도, 짧은 끌기, pointer 취소, 화면 숨김과
  회전은 장면 이동 없이 정리한다. drag는 대체 버튼과 키보드를 제거하지 않는 체험 기능이다.
- 기기 음성은 `브라우저 보조 음성`으로 분리하고 검수 낭독이 아님을 계속 표시한다. 재생만으로 읽기 완료를
  기록하지 않으며 장면 이동, 이전, 화면 숨김, 마무리 진입과 완료에서 재생을 취소한다. 미지원 브라우저는
  버튼을 비활성화하고 직접 읽기 안내를 유지한다.
- 장면 전환 뒤 새 제목으로 focus와 scroll을 옮기고 키보드와 실제 tap 좌표가 같은 단서 결과에 도달한다.
- 이전 장면 버튼과 좌우 화살표는 runtime command를 공유한다. 입력, 링크와 버튼 안에서는 화살표 이동을
  가로채지 않는다.
- 발견 전 narration, instruction, alt와 accessible name은 줄무늬 꼬리의 위치를 누설하지 않는다. 선형
  대체 탐색도 연못, 소나무, 마을의 발자국과 풀잎을 비교해야 한다.
- 찾기 힌트는 말, 방향, 영역, 직접의 4단계다. 지금까지 연 힌트를 누적해 다시 볼 수 있고 직접 단계로
  건너뛸 수 있으며 점수나 불이익은 없다. 연 힌트와 경로는 저장하지 않는다.
- 탐험 렌즈는 BookPack에 등록되고 SHA-256이 일치한 base와 detail 파일을 실제로 보여 준다. detail 로드나
  무결성이 실패하면 오류를 숨기지 않고 기본 그림과 선형 비교 목록으로 같은 진행을 계속한다.
- 렌즈 성공 영역도 BookPack의 타원 geometry가 소유한다. 책마다 다른 좌표를 사용하고 포인터 좌표와 궤적은
  저장하지 않는다.
- 보호자 안내에서 저장 범위와 호스팅 한계를 확인하고 진행을 직접 지울 수 있다.
- 화면 낭독 지원을 위해 의미 구조, live announcement, skip link, focus 표시를 제공한다.
- `prefers-reduced-motion`과 `prefers-contrast`에 대응한다. skip link는 평소 clip하고 키보드 초점에서만
  화면에 나타난다.

## 내부 읽기 모드 검증

공개 catalog에 들어가지 않는 5장면 `lantern-demo`는 `내가 읽을래`, `같이 읽자`, `들려줘`의 기술 계약을
검증한다. 4초짜리 자체 생성 timing WAV를 각 장면 track에 연결해 다음을 production browser에서 확인한다.

- mode 전환 시 현재 위치 보존, 직접 읽기 자동 재생 금지, 장면 자동 넘김 금지
- media current time 기반 문장 highlight와 문장 선택 seek
- 0.8배, 1.0배, 1.2배 속도와 250ms 이내 segment 동기
- scene, visibility, reflection, completion과 unmount 정리
- 404, hash, duration과 재생 실패 시 직접 읽기로 명시적 fallback
- service worker 저장 뒤 offline reload와 재생

이 fixture 음원은 낭독이 아닌 합성 timing tone이며, 재생 종료로 읽기 완료를 만들지 않는다. 실제
`published` pack에서 승인된 audio 권리 장부가 일치할 때만 완독이 읽기 완료를 만들 수 있다.

## 10장면 검수 후보

`content/books/tiger-full-review/source`는 창작 원고, 창작 placeholder, 실제 source 후보 메타데이터를
분리한 비공개 authoring source다. compiler는 10장면 compiled BookPack, source SHA-256과 권리, 문화,
교육, 접근성 pending review record를 만든다. desktop과 mobile에서 10장면, 근거 탐색, 추론, 검수 중
source 카드, reflection과 offline 재진입을 완주한다.

마지막 source 카드는 국립중앙박물관 `호랑이와 까치`, 동원2613을 후보로만 기록한다. 박물관 원본 이미지,
확정 문화 해석, 검수 낭독은 포함하지 않는다. `SOOMBOOK_REVIEW_BUILD=true`가 없는 build, 기본 build와
Pages build에는 이 후보가 들어가지 않는다.

## 현재 한계

- 공개 음성은 녹음 자산이 아니라 브라우저의 한국어 음성 합성 기능을 보조 기능으로 사용한다. 브라우저가
  지원하지 않으면 직접 읽기를 유지한다. 내부 timing fixture는 검수 낭독이나 공개 콘텐츠가 아니다.
- 실제 박물관 이미지, 소장품 정보, 문화 해석, 외부 font는 포함하지 않는다.
- 마무리에서 고른 문장이나 경로, 머문 시간은 상태나 기기 저장에 남기지 않는다. 완료 receipt는 이해나
  교육 효과가 아니라 의도적 마무리 조작만 뜻한다.
- 계정 간 진행 동기화, 교사 화면, 결제, 12권 카탈로그, 콘텐츠 제작 도구는 없다.
- 프로덕션 배포와 실제 아동 연구는 운영자 승인 대상이다.
- GitHub Pages 공개판은 검색 차단된 기술 체험판이며 응답 보안 헤더, 실기기, 교육, 문화 검수를 완료한
  운영 제품이 아니다.

## 실행 근거

- UI 진입점: `apps/reader-web/src/bookReader.tsx`
- 리더가 읽는 콘텐츠: `content/fixtures/tiger-demo/**`
- 비공개 대표작 검수 후보: `content/books/tiger-full-review/**`
- 대표작 기술 검수 계약: `docs/operation/representative-review.md`
- 콘텐츠 생성 원본: `packages/test-book-factory/src/createDemoBookPack.ts`
- 상태 전이: `packages/book-runtime/src/runtime.ts`
- 전체 여정 검증: `tests/e2e/readerFlow.spec.ts`
