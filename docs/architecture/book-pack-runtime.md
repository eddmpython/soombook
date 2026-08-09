# BookPack and Runtime Contract

확인일: 2026-08-10

## 패키지 방향

```text
book-schema <- book-runtime <- reader-web
      ^                         ^
      ├─ test-book-factory -> generated content/fixtures
      └─ book-authoring -> content/books/*/compiled
```

- `book-schema`가 콘텐츠 type, JSON Schema, 의미 검증과 배포 검증을 소유한다.
- `book-runtime`은 콘텐츠를 변경하지 않고 직렬화 가능한 진행 상태와 command 전이를 소유한다.
- `test-book-factory`는 외부 권리가 필요 없는 독립 BookPack 픽스처의 생성 원본이다.
- `book-authoring`은 10장면 검수 후보의 source digest, pending review record와 compiled BookPack을 만들고,
  저장소 밖 권리 evidence와 서명 승인을 검증해 결정적 asset staging receipt를 만든다.
- `content/fixture-registry.json`은 공개, 내부, 검수 후보와 향후 출판 등급을 소유한다.
- `content/fixtures`는 서로 독립된 2개 BookPack을 29개 JSON으로 직렬화한 리더 입력이다. 공개
  `tiger-demo`는 4장면, 내부 `lantern-demo`는 5장면이며 후자는 반복 제작성과 오디오 엔진만 검증한다.
- Vite의 configured BookPack plugin은 registry에서 현재 build가 허용한 fixture 하나만 가상 모듈로 만든다.
  기본과 Pages build에는 공개 fixture만 들어간다. 내부 fixture와 검수 후보는 각각 명시적인 격리 build
  환경에서만 허용되고 `fixture`, `review`, `publish` validator profile을 서로 바꿔 쓸 수 없다.
- `reader-web`은 선택된 JSON을 다시 BookPack으로 조립하고 전용 Web Worker에서 정본 validator로 검증한
  뒤 모든 입력을 runtime command로 변환한다. 검증 실패는 렌더 전 복구 화면으로 전파된다.
- 각 `index.ts`는 공개 심볼 재내보내기만 담당한다.

`npm run content:sync`가 JSON을 생성하고 `npm run check:content`가 생성 원본과 1 byte라도 달라지면
실패한다. 따라서 앱이 test factory를 production bundle에서 직접 가져오지 않으며 두 표현의 drift도
허용하지 않는다.

`npm run check:fixtures`는 두 번째 fixture 추가에 core runtime 분기나 특정 책 조건문이 생기지 않았는지
검사하고 제작 receipt를 저장소 밖에 남긴다. `npm run check:assets`는 두 pack의 파일 자산 5개를 실제
SHA-256 byte와 대조한다. 공개 build budget gate는 공개 tiger 자산의 존재와 내부 lantern 자산 및 식별자의
부재를 함께 확인한다.

## 전체 파일과 build 결박

각 BookPack root의 `integrity.json`은 BookPack 객체 밖의 detached manifest다. format version 2는 payload의
모든 JSON과 파일 자산을 POSIX 상대 경로, byte length, media type과 SHA-256으로 정렬해 기록한다. sidecar
자신과 fixture 설명용 README만 payload에서 제외한다. 현재 payload 수는 공개 tiger 16개, 내부 lantern
18개, review 후보 20개다.

fixture와 review compiler가 생성할 파일 집합을 먼저 정하고 checker가 disk 전체와 exact set equality를
검사한다. 누락과 추가 파일, 절대 경로, drive 경로, 역슬래시, `.`과 `..`, 대소문자 충돌, file symlink와
directory junction, JSON과 media 위장, byte length와 digest drift, canonical 순서 drift를 차단한다.

Vite는 검증한 파일을 한 번만 읽은 snapshot에서 BookPack과 binary asset을 emit한다. build에는 canonical
`bookpack-integrity.json`과 `bookpack-binding.json`이 들어가고, worker와 main application 모두 semantic
BookPack digest와 file-set digest를 포함한다. worker는 게시 전 payload digest를 계산하며 main document도
수신 payload를 다시 계산하고 별도 virtual module에서 받은 asset URL map과 worker map을 exact 비교한다.

build checker는 profile, exposure, slug, public base, payload 수, worker 한 개, generated chunk 역할별 한 개,
source와 emitted asset 확장자, asset byte 1대1, 고정 PWA artifact의 MIME과 내용을 검사한다. service worker의
실제 `precacheAndRoute` 첫 literal 배열에는 worker, 두 BookPack artifact와 모든 asset이 있어야 한다. 조건식,
getter, 문자열 decoy와 후행 배열은 precache 증거가 아니다. Pages `release.json`은 같은 public base와
BookPack identity, 역할별 경로와 SHA-256을 기록하고 전체 artifact digest가 이를 바깥에서 결박한다.

`published-reader`는 평문 환경변수나 JSON으로 열리지 않는다. 같은 process에서 검증한 rights projection과
final pack byte로 만든 branded snapshot만 programmatic Vite build에 전달할 수 있으며, review sidecar를
published build에 재사용할 수 없다.

JSON Schema는 AJV로 build time standalone validator를 생성한다. `npm run validator:sync`가 생성하고
`npm run check:validator`가 drift를 차단한다. 브라우저 runtime은 동적 code generation을 사용하지 않아
`unsafe-eval` 없는 CSP에서 같은 구조 검증을 실행한다.

## BookPack 검증

`BookPack`은 format version과 별개인 `packVersion`, book metadata, scenes, interactions, reasoning prompts,
completion review, connection cards, rights, claims, assets, audio tracks, review records를 한 계약으로 묶는다.
`validateBookPack`과 실제 자산 검사는 다음을 차단한다.

- 구조, 필수 값, 지원 format version 위반
- 중복 ID와 끊어진 장면, 상호작용, 추론, 주장, 권리 참조
- keyboard와 linearExplore가 모두 없는 핵심 탐색
- lens 또는 regionTap을 선언하고 BookPack pointer target을 빠뜨리거나 화면 밖 geometry를 쓴 탐색
- choices에 없는 탐색 정답과 필수 interaction이 아닌 완주 보물
- choices에 없는 정답 참조
- 배포 profile에서 `published`가 아닌 상태
- 승인되지 않은 권리 또는 사실 주장
- `assets/` 밖 상대 경로, 절대 경로, URL, 역슬래시와 path traversal
- 파일 자산의 경로, SHA-256 무결성 누락, 실제 byte 불일치와 등록되지 않은 파일
- 오디오 track의 다른 장면 text 참조, 겹치거나 역전된 segment와 duration 이탈
- 직접 읽기 fallback 부재, 오디오 모드가 있는데 빠진 장면 track이나 text segment
- 검수 오디오 없이 `listen`을 공개하는 published pack
- asset ID를 정확히 덮지 않는 권리 기록, source snapshot과 변환 계보가 없는 검수 후보
- kind, scope, caveat, source evidence와 화면 글 참조가 없는 claim
- 현재 pack version과 subject SHA-256에 결박되지 않은 권리, 문화, 교육, 접근성, 오디오 승인

현재 두 픽스처는 `fixture` profile만 통과한다. `tiger-full-review`는 10장면 `review` profile과 pending
review 7건으로만 통과한다. 승인 문자열만 바꾼 pack과 승인 뒤 내용이 달라진 pack은 각각 증거 누락과
subject digest 불일치로 실패한다.

외부 source snapshot이 아직 없으면 provenance는 `pending`, SHA-256과 capture 시각은 `null`이다. authoring
source digest를 외부 권리 snapshot digest로 재사용하지 않는다. 승인 권리는 exact approval evidence
digest를 요구하고 file asset을 덮는 승인 권리는 결정적 ingest receipt digest도 요구한다. 현재 검수 명령과
입력 경계는 `docs/operation/rights-review.md`가 소유한다.

외부 source 파생 asset은 candidate ID, source byte SHA-256, vault evidence ref, derivative plan digest와
ingest receipt digest를 `sourceLineage`에 보존한다. rights provenance의 verified source 목록과 다섯 값을
교차 검증한다. 공개 schema API는 평문 publish context를 받지 않으며, authoring의 genuine projection
resolver만 최종 pack의 ID, version, rights, asset, visual과 source card를 결박해 publish validator를 연다.

권리 lifecycle은 `pending`, `active`, `suspended`, `withdrawn`을 provenance에 보존한다. publish 검증은
release 시각에 approval과 ingest digest를 외부 verified evidence context로 다시 resolve하고 next review
시각을 검사한다. 따라서 전에 staging한 asset도 만료, 중단 또는 철회 뒤에는 출판할 수 없다.

공개 fixture `packVersion`은 `0.3.0`, 내부 fixture는 `0.1.0`이다. 진행 key가 pack version을 포함하므로
새 pack을 열어도 이전 pack의 원본 진행을 삭제하지 않는다. 공개 뒤에는 pack version을 바꾸기 전에 명시적
scene과 completion ID migration, 이전 build와 새 build를 왕복하는 A-B-A golden test를 먼저 제공한다.

## 상태 권위

`BookRuntimeState`가 현재 장면, 읽은 글, 완료 상호작용, 완료 추론, 연 연결 카드, reading mode, text scale,
motion preference, 힌트 단계, 오답 재시도 수, 여정 단계와 처리한 command ID를 현재 세션에서 소유한다.
원문 선택지, 회상 경로와 자유 텍스트는 상태에 보관하지 않는다. `localStorage`에는 storage version 4 최소
projection을 pack별 key로 저장하며 receipt, command ID, hint, 오답 횟수, 음원 위치와 재생 속도는 세션
종료 때 사라진다. 완료 불변조건 검증에 실패한 현재 pack 값만 제거하고, 다른 pack version의 원본은
보존한다.

새 reader는 version 4 key와 함께 storage version 2 호환 mirror를 쓴다. version 3은 `direct` reading
mode로 안전하게 이관한다. mirror에 다른 pack version이 이미
있으면 덮어쓰지 않는다. 이 방식은 정적 앱 rollback이 이전 reader의 마지막 정상 진행을 읽게 하면서 새
reader가 pack별 진행을 잃지 않게 한다. 사용자가 진행 삭제를 확정하면 해당 책의 모든 pack별 key와 legacy
mirror를 함께 제거한다.

runtime의 `reflecting`은 rollback 호환 projection에서 `status: reading`과
`completionPhase: reflecting`으로 저장한다. 새 reader는 이를 `reflecting`으로 복구하고 해당 optional field를
모르는 이전 reader는 마지막 장면의 `reading`으로 안전하게 낮춘다. `completed`와 `reflecting` 저장 값은
마지막 장면의 읽기와 모든 필수 interaction, reasoning, connection이 확인될 때만 복구한다.

상태 전이는 `applyBookCommand` 하나가 소유한다. UI의 렌즈, 영역 탭, 키보드와 선형 목록은 같은
`interactionCompleted` 결과로 수렴한다. 정확한 시각 hotspot은 `COMPLETE_INTERACTION`, 키보드와 선형
비교는 닫힌 선택지를 검증하는 `ANSWER_INTERACTION`을 사용하지만 동일 interaction ID만 완료한다. 장면
완료와 전체 완료는 runtime이 판단하며 컴포넌트가 별도 계산하지 않는다.

렌즈 성공 geometry와 자산 실패 때 보이는 CSS decoration은 BookPack 데이터가 소유한다. 공개 호랑이와
내부 등불은 서로 다른 타원 target과 fallback decoration을 사용하며 같은 전역 좌표나 호랑이 DOM을
재사용하지 않는다.

장면 전이는 `PREVIOUS_SCENE`과 비최종 `ADVANCE_SCENE`이 소유한다. 최종 장면은
`ENTER_REFLECTION`으로만 `reflecting`에 들어가며, 회상 카드 또는 이미 찾은 보물로
`COMPLETE_REFLECTION`을 수행한 뒤에만 `storyCompleted`와 `completed`가 생긴다.

## 오류와 롤백

- 알 수 없는 참조와 손상 BookPack은 렌더 전에 실패한다.
- 지원하지 않는 음성 합성은 읽기 흐름을 막지 않는다.
- 기기 저장소가 막히면 현재 memory session을 유지하고 저장 불가를 표시한다. 현재 pack의 손상 값은 새
  상태로 복구하되 다른 pack과 해석할 수 없는 legacy 원본은 보존한다.
- 파일 자산은 렌더 전에 SHA-256을 확인한다. detail 이미지가 없거나 손상되면 기본 이미지와 선형 탐색으로,
  오디오가 없거나 hash, duration, 재생이 실패하면 직접 읽기로 명시적으로 강등한다.
- 오디오 controller는 장면 이동, 직접 읽기 전환, 화면 숨김, 마무리, 완료와 unmount에서 재생과 frame,
  listener를 정리한다. media current time이 segment highlight 권위이며 seek와 속도 변경 허용 오차는
  250ms다.
- 앱 롤백은 검증된 main SHA의 정적 빌드를 다시 만드는 workflow로 수행한다. 현재 projection version은
  4이며 호환되지 않는 미래 변경은 명시적 migration과 A-B-A 검증이 필요하다.
