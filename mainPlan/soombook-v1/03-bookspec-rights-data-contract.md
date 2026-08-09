# 03. BookSpec, Rights, and Data Contract

상태: schema 설계 v1.0

범위: BookPack의 파일 구조, BookSpec, 장면과 상호작용, 진행 상태, 이벤트, 사실 claim, 자산 권리, 출판
상태 기계.

## 1. 핵심 결정

숨책의 장기 자산은 페이지 넘김 구현이 아니라 검증된 `BookPack`이다. 런타임은 임의 JSON과 원격 HTML을
실행하지 않고, schema와 무결성 검사를 통과한 versioned pack만 읽는다.

```text
authoring source
-> normalize
-> schema validate
-> asset and rights validate
-> accessibility validate
-> performance budget validate
-> signed or hashed BookPack
-> runtime
```

## 2. BookPack 디렉터리

```text
bookpack/
├─ manifest.json
├─ book.json
├─ scenes/
│  ├─ scene-01.json
│  ├─ scene-02.json
│  ├─ scene-03.json
│  └─ scene-04.json
├─ assets/
│  ├─ images/
│  ├─ audio/
│  └─ fonts/
├─ ledgers/
│  ├─ assets.json
│  ├─ rights.json
│  └─ claims.json
└─ integrity.json
```

V1은 폴더 형태와 압축 형태를 모두 허용할 수 있지만 논리 경로는 같다. 압축 포맷은 성능 spike 뒤
결정한다.

## 3. Manifest 계약

```json
{
  "format": "soombook-bookpack",
  "formatVersion": "1.0.0",
  "packId": "museum-night-tiger-demo",
  "packVersion": "0.1.0",
  "contentStatus": "fixture",
  "createdAt": "2026-08-09T00:00:00Z",
  "runtime": {
    "minVersion": "0.1.0",
    "maxVersionExclusive": "0.2.0"
  },
  "entry": "book.json",
  "integrity": "integrity.json",
  "locales": ["ko-KR"],
  "defaultLocale": "ko-KR"
}
```

### 불변조건

- `formatVersion`과 `packVersion`을 분리한다.
- 런타임 호환 범위를 명시한다.
- `contentStatus`는 `fixture`, `internal`, `review`, `published`, `withdrawn` 중 하나다.
- `fixture`와 `internal`은 production catalog에 등록할 수 없다.
- timestamp는 UTC ISO 8601이다.

## 4. Book 계약

```json
{
  "id": "museum-night-tiger",
  "version": "0.1.0",
  "locale": "ko-KR",
  "title": "호랑이가 그림에서 사라졌다",
  "series": {
    "id": "museum-night",
    "number": 1
  },
  "audience": {
    "gradeMin": 3,
    "gradeMax": 3,
    "readingSupport": ["light", "readAlong", "guided", "freeExplore"]
  },
  "session": {
    "label": "short",
    "targetMinutesMin": 6,
    "targetMinutesMax": 10
  },
  "themes": ["museum", "tiger", "observation"],
  "coverAssetId": "cover-demo-01",
  "sceneOrder": ["scene-01", "scene-02", "scene-03", "scene-04"],
  "completion": {
    "requiredSceneIds": ["scene-01", "scene-02", "scene-03", "scene-04"],
    "requiredInteractionIds": ["find-tiger-paw", "reason-tiger-left", "open-link-card"]
  },
  "reviewRefs": {
    "education": null,
    "culture": null,
    "rights": null,
    "accessibility": null
  }
}
```

V1 fixture는 사람 검토 ref가 null일 수 있다. `published` pack에서는 필수 review ref가 모두 승인 상태여야
한다.

## 5. Scene 계약

```json
{
  "id": "scene-03",
  "order": 3,
  "purpose": "세 발자국을 비교해 호랑이가 스스로 나간 흔적을 찾는다.",
  "kind": "story",
  "layout": {
    "desktop": "spread",
    "compact": "single",
    "leftAssetId": "scene-03-left-base",
    "rightAssetId": "scene-03-right-base",
    "detailAssetId": "scene-03-detail-tiles"
  },
  "textBlocks": [
    {
      "id": "scene-03-p1",
      "role": "narration",
      "text": "젖은 바닥에 서로 다른 발자국 세 줄이 남아 있었어요.",
      "placement": [0.55, 0.10, 0.36, 0.20],
      "audioTrackId": "scene-03-narration"
    }
  ],
  "vocabularyIds": ["trace", "infer"],
  "interactionIds": ["find-tiger-paw"],
  "claimIds": ["tiger-paw-shape-01"],
  "entry": {
    "state": "readable",
    "unlockAfter": []
  },
  "exit": {
    "requires": ["interaction:find-tiger-paw:completed"]
  },
  "accessibility": {
    "summary": "젖은 바닥에 크기와 모양이 다른 세 발자국이 그림 밖을 향해 이어진다.",
    "readingOrder": ["scene-03-p1", "explore-paw-list", "next-scene"],
    "linearExploreId": "scene-03-paws-linear"
  }
}
```

### 좌표 규칙

- 좌표는 0에서 1 사이 normalized number다.
- 원본 이미지 픽셀 크기와 무관하게 같은 논리 위치를 가리킨다.
- 장면 authoring 도구는 최소 target size와 화면 경계 충돌을 미리 경고한다.
- hotspot 정확도는 완주 조건이 아니다. 대체 선택 path가 항상 존재한다.

## 6. Interaction 계약

```json
{
  "id": "find-tiger-paw",
  "type": "narrativeClue",
  "required": true,
  "unlock": {
    "all": ["text:scene-03-p1:consumed"]
  },
  "targets": [
    {
      "id": "tiger-paw",
      "shape": "polygon",
      "points": [[0.62, 0.55], [0.71, 0.52], [0.75, 0.64], [0.65, 0.68]],
      "label": "크고 둥근 발자국"
    }
  ],
  "inputAdapters": ["lens", "regionTap", "keyboard", "linearExplore"],
  "hints": [
    {"level": 1, "kind": "text", "message": "본문에서 크기와 모양을 말한 부분을 다시 들어 볼까?"},
    {"level": 2, "kind": "text", "message": "세 발자국의 발가락 모양을 비교해 봐."},
    {"level": 3, "kind": "region", "targetId": "floor-right-third"},
    {"level": 4, "kind": "outline", "targetId": "tiger-paw"}
  ],
  "onComplete": [
    {"command": "revealNarrative", "ref": "tiger-left-voluntarily"},
    {"command": "collectClue", "ref": "tiger-paw-clue"}
  ],
  "analytics": {
    "eventClass": "coarseInteraction",
    "recordCoordinates": false
  }
}
```

### Interaction 불변조건

- 모든 `required: true` interaction은 `lens` 외에 적어도 하나의 단순 포인터 adapter와 keyboard adapter를
  가진다.
- `onComplete`는 허용된 command registry에 있는 선언형 command만 쓴다.
- BookPack에 임의 JavaScript, eval expression, remote script URL을 넣지 않는다.
- hint는 사용자의 능력 등급이나 점수를 변경하지 않는다.
- unlock cycle이 존재하면 validator가 실패한다.

## 7. Audio 계약

```json
{
  "id": "scene-03-narration",
  "assetId": "audio-scene-03-ko",
  "locale": "ko-KR",
  "durationMs": 6120,
  "normalization": {
    "integratedLufs": -18,
    "truePeakDb": -1
  },
  "segments": [
    {"id": "s1", "textRef": "scene-03-p1", "startMs": 420, "endMs": 2740}
  ],
  "review": {
    "status": "fixture",
    "reviewerRef": null
  }
}
```

Validator는 다음을 검사한다.

- `0 <= startMs < endMs <= durationMs`
- segment가 오름차순이며 허용된 overlap 외에는 겹치지 않음
- textRef 존재
- asset MIME과 확장자 일치
- locale 일치
- production audio의 loudness와 사람 검수 상태

## 8. Asset ledger

```json
{
  "id": "museum-tiger-image-001",
  "kind": "image",
  "path": "assets/images/tiger-source.webp",
  "mime": "image/webp",
  "bytes": 284112,
  "width": 1600,
  "height": 1200,
  "sha256": "sha256:...",
  "role": "museumSource",
  "truthStatus": "verifiedSource",
  "rightsId": "rights-museum-tiger-001",
  "derivedFrom": ["source-museum-tiger-001"],
  "transformations": ["crop", "colorBalance", "interactiveOverlay"],
  "altRefs": ["alt-museum-tiger-001"]
}
```

### Asset role

- `fixture`: 직접 제작한 기능 검증용 자산
- `illustration`: 허구 장면 삽화
- `museumSource`: 기관 원본
- `derivedMuseumAsset`: 기관 원본의 변경본
- `ui`: 아이콘, 질감, 도구
- `audio`: 낭독, 효과음, 환경음
- `font`: 글꼴

### Truth status

- `fiction`
- `fixture`
- `unverifiedClaim`
- `verifiedSource`
- `derivedFromVerifiedSource`

UI는 truth status를 근거로 fixture, 허구, 실제 자료를 구분한다.

## 9. Rights ledger

```json
{
  "id": "rights-museum-tiger-001",
  "assetId": "museum-tiger-image-001",
  "title": "소장품명",
  "sourceInstitution": "국립중앙박물관",
  "sourceUrl": "https://example.invalid/source",
  "sourceIdentifier": "museum-object-number",
  "license": "KOGL-1",
  "creator": null,
  "commercialUse": true,
  "derivativesAllowed": true,
  "attributionText": "출처 표시 초안",
  "attributionUrlRequired": true,
  "modifications": ["crop", "color balance", "interactive overlay"],
  "verifiedAt": "2026-08-09",
  "sourceSnapshot": {
    "path": null,
    "sha256": null
  },
  "reviewerRef": null,
  "status": "draft",
  "withdrawal": null
}
```

### Rights 상태 기계

```text
draft -> evidenceCaptured -> reviewed -> approved -> published
                    |             |
                    v             v
                 rejected      suspended -> withdrawn
```

### 상태 기준

| 상태 | 의미 | production 허용 |
|---|---|---:|
| `draft` | URL과 후보 조건만 있음 | 아니오 |
| `evidenceCaptured` | 원문 snapshot과 hash 있음 | 아니오 |
| `reviewed` | 상업, 변경, 표기 조건 검토 | 아니오 |
| `approved` | 권리 책임자 승인 | pack 생성 가능 |
| `published` | 실제 배포와 버전 연결 | 예 |
| `rejected` | 사용할 수 없음 | 아니오 |
| `suspended` | 조건 변경 또는 이의 제기 조사 중 | 아니오 |
| `withdrawn` | 공개 중단 및 replacement 기록 | 아니오 |

### 출판 blocking fields

- sourceInstitution
- sourceUrl
- sourceIdentifier, 존재하는 경우
- license 또는 별도 permission ref
- commercialUse
- derivativesAllowed
- attributionText
- modifications
- verifiedAt
- sourceSnapshot hash
- reviewerRef
- status `approved`

## 10. Claim ledger

이미지 권리와 내용 정확성을 분리한다. 자산을 쓸 수 있어도 설명이 사실이라는 뜻은 아니다.

```json
{
  "id": "tiger-paw-shape-01",
  "statement": "호랑이 발자국은 넓은 발바닥과 둥근 발가락 자국으로 표현할 수 있다.",
  "kind": "educationalFact",
  "audienceTextRef": "scene-03-p1",
  "sourceRefs": ["source-zoology-001"],
  "scope": "storySimplification",
  "caveats": ["실제 흔적은 바닥과 움직임에 따라 달라진다."],
  "review": {
    "status": "draft",
    "reviewerRef": null,
    "reviewedAt": null
  }
}
```

Claim kind:

- `fictionEvent`
- `storyInterpretation`
- `educationalFact`
- `museumMetadata`
- `licenseStatement`
- `safetyStatement`

`fictionEvent`는 사실 승인 대상이 아니지만 실제 역사와 혼동되는 문맥이면 문화 검토가 필요하다.

## 11. 진행 상태

```json
{
  "schemaVersion": 1,
  "bookId": "museum-night-tiger",
  "packVersion": "0.1.0",
  "profileSlot": "guest-1",
  "lastCommittedSceneId": "scene-03",
  "completedInteractionIds": ["open-cover", "find-tiger-paw"],
  "collectedClueIds": ["tiger-paw-clue"],
  "settings": {
    "readingMode": "readAlong",
    "supportLevel": "light",
    "reducedMotion": true,
    "sound": true,
    "textScale": "medium"
  },
  "updatedAt": "2026-08-09T00:00:00Z"
}
```

### 저장 금지

- 이름, 이메일, 전화번호, 학교, 학급
- 생년월일과 정확한 나이
- 자유 텍스트
- 음성 원본과 음성 특징
- 정확한 pointer 좌표와 궤적
- 광고 식별자와 cross-site ID
- 기기 fingerprint 재료

### migration

- pack patch version은 진행 호환을 기본으로 한다.
- scene 또는 interaction ID 변경은 migration map을 요구한다.
- migration 실패 시 기존 원본 state를 보존하고 명시적 재시작 선택을 제공한다.
- rollback은 이전 런타임이 알 수 없는 필드를 무시할 수 있어야 한다.

## 12. Event 계약

이벤트는 제품 결과와 기술 진단을 분리한다.

```json
{
  "eventVersion": 1,
  "eventId": "random-per-event",
  "journeyId": "random-per-intentional-session",
  "origin": "fixture",
  "name": "storySceneCommitted",
  "bookId": "museum-night-tiger",
  "packVersion": "0.1.0",
  "sceneId": "scene-03",
  "occurredAt": "2026-08-09T00:00:00Z",
  "privacyClass": "localProductState",
  "properties": {
    "inputAdapter": "keyboard",
    "supportLevel": "light"
  }
}
```

### Origin

- `automatedTest`
- `developer`
- `adultQa`
- `researchParticipant`
- `productionGuest`

승인 전에는 `researchParticipant`와 `productionGuest` 원격 수집기를 만들지 않는다.

### 허용 event name

- `storyOpened`
- `storyTextConsumed`
- `storyClueFound`
- `storyReasoningCompleted`
- `storyConnectionOpened`
- `storyCompleted`
- `assetLoadFailed`
- `audioPlaybackFailed`
- `progressMigrationFailed`
- `fallbackActivated`

임의 화면 클릭을 모두 수집하지 않는다.

## 13. 무결성 계약

`integrity.json`은 모든 pack 파일의 상대 경로, byte, SHA-256을 가진다.

```json
{
  "algorithm": "sha256",
  "files": [
    {"path": "book.json", "bytes": 1220, "digest": "..."},
    {"path": "scenes/scene-03.json", "bytes": 2048, "digest": "..."}
  ]
}
```

런타임은 다음을 거부한다.

- manifest에 없는 실행 파일
- path traversal
- 절대 경로
- remote script와 HTML injection
- hash 불일치
- 지원하지 않는 formatVersion
- 허용 목록 밖 MIME
- 압축 해제 크기와 파일 수 상한 초과

## 14. Validator gate

### Schema gate

- 모든 JSON이 versioned schema를 통과한다.
- 참조 ID가 존재하고 중복되지 않는다.
- scene order와 completion requirement가 순환하지 않는다.

### Rights gate

- production asset마다 approved rights가 있다.
- derived asset의 모든 source lineage가 승인됐다.
- attribution 문자열과 링크를 화면에 투영할 수 있다.

### Claim gate

- production educationalFact와 museumMetadata가 approved 상태다.
- 이야기 simplification caveat가 필요한 경우 존재한다.
- fixture와 fiction이 verified source로 표시되지 않는다.

### Accessibility gate

- required interaction에 simple pointer와 keyboard adapter가 있다.
- scene summary, reading order, controls label이 존재한다.
- audio에 textRef가 있고 소리 전용 핵심 정보가 없다.

### Performance gate

- asset별 byte와 dimension 상한을 검사한다.
- 첫 장면 critical asset 총량을 별도로 계산한다.
- high-resolution detail은 initial critical set에 들어가지 않는다.

### Publish gate 결과

```json
{
  "status": "blocked",
  "errors": [
    {
      "code": "RIGHTS_NOT_APPROVED",
      "path": "ledgers/rights.json",
      "ref": "rights-museum-tiger-001",
      "message": "published pack에는 승인된 권리 항목이 필요합니다."
    }
  ],
  "warnings": []
}
```

경고를 오류로 숨기거나 오류를 경고로 낮추지 않는다.

## 15. API와 Scene Studio 경계

V1 validator는 CLI와 library API를 먼저 제공한다.

```text
loadPack(path)
validatePack(pack, profile)
compilePack(source, output)
inspectRights(pack)
inspectClaims(pack)
buildAttribution(pack)
```

Scene Studio는 이 API의 미래 소비자다. Studio가 별도 schema, 별도 권리 규칙, 별도 publish 경로를 만들지
않는다.

## 16. 공개 사양 판단

BookSpec 공개는 다음 조건 뒤 검토한다.

1. 서로 다른 두 책이 같은 런타임에서 작동한다.
2. schema migration을 한 번 실제로 수행했다.
3. 외부 제작자가 문서만으로 fixture pack을 만들 수 있다.
4. 권리와 접근성 gate가 우회 불가능하다.
5. 공개 범위와 상표, sample asset 라이선스가 확정됐다.

그 전에는 사양을 안정된 표준처럼 홍보하지 않는다.
