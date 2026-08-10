# Representative Candidate Technical Review

확인일: 2026-08-10

이 문서는 10장면 `tiger-full-review` 후보의 자동 콘텐츠, 교육 구조, 접근성 검수와
기술 promotion 판정을 소유한다. 현재 후보는 first-party 창작 원고와 CSS placeholder만 사용하며,
외부 문화자산 byte와 검수 낭독을 포함하지 않는다.

## 정본과 identity

| 항목 | 정본 |
|---|---|
| authoring source | `content/books/tiger-full-review/source/book-source.json` |
| compiled payload | `content/books/tiger-full-review/compiled/**` |
| review plan | `content/books/tiger-full-review/review/agent-review-plan.json` |
| static checker | `scripts/representativeReview.mjs` |
| browser journey | `tests/review/reviewCandidate.spec.ts` |
| expert quorum | `tests/audit/expert-reviews.json` |
| decision CLI | `scripts/decideRepresentativeReview.mjs` |

candidate digest는 authoring source SHA-256, semantic BookPack digest, whole-file pack content digest와 review
plan digest를 canonical projection으로 묶는다. build 영수증은 현재 artifact의 모든 파일을 다시 열거해
path, byte length와 SHA-256를 대조한다. browser 영수증은 같은 candidate와 artifact digest를
참조해야 한다.

2026-08-10 기준 기술 후보는 다음 identity로 `expand`를 통과했다.

- candidate: `sha256-41061427afeda995c67fbce1c304b2b2a5129511d625cdc18ba9ab618f599080`
- plan: `sha256-80615d0f07f1bad5fd4001a3eaef7a700560d2028ede30bfd33be4f481fab90c`
- build artifact: `sha256-2a3fb85f3555d982cc7e571994d1113a21caa3c8b2370d885832cda8f405bd49`

## 정적 검수

`npm run check:representative-review`는 현재 source를 다시 compile하고 stored compiled payload와 대조한 뒤
다음 세 profile을 독립 실행한다.

1. `content-provenance`: 모든 아동 노출 surface, truth status, claim, source card, reflection,
   rights, asset과 pending review ledger를 exact digest로 검사한다.
2. `education-structure`: 10장면 순서, 장면별 핵심 개념, 필수 행동 0개 또는 1개, 질문 전 독립
   근거, 정답, retry 계보, 납인 금지 문구와 어휘 계약을 검사한다.
3. `accessibility-delivery`: 유효한 alt, visible truth 문구, lens의 region tap, keyboard와 linear list
   대체 경로, browser evidence 하한을 검사한다.

review plan의 nested record나 array가 손상되면 검사기가 예외로 중단되지 않고
`review.planStructure` blocker와 수리 제안을 담은 실패 영수증을 만든다.

## Browser 영수증

`npm run test:review-candidate:browser`는 production review build를 port 4175에서 열고 다음 두 경로를
처음부터 offline 완료까지 실행한다.

- desktop keyboard: artwork에서 Enter를 눌러 첫 선형 선택지로 focus를 이동한 뒤 완주한다.
- mobile pointer: BookPack의 현재 단서 목표 74%, 65%를 실제 artwork box 좌표로 tap하고
  `data-clue-found=true`를 확인한다.

두 profile은 10장면 reading, 오답 retry, connection open을 포함한 13개 상태의 axe와 overflow를
정확히 한 번씩 검사한다. mobile은 320 CSS px과 root text scale 200%를 전체 여정에 유지한다.
두 경로의 최종 local state digest가 같아야 한다.

## 전문 에이전트 판정

`representative-candidate-promotion` topic은 다음 세 reviewer role을 exact quorum으로 요구한다.

- content provenance
- education structure
- accessibility delivery

세 review는 서로 다른 `reviewerRef`, 같은 candidate, plan과 scope digest, `passed` 상태를 가져야
한다. scope 파일이 하나라도 변하면 `npm run check:expert-reviews`가 실패하며, 세 reviewer가
현재 scope를 다시 판정하기 전에는 승격 결정을 만들 수 없다.

## Promotion 결정

`npm run review:decide`는 current source, static receipt, 현재 artifact 재열거, desktop과 mobile receipt,
세 에이전트 review를 다시 대조한 뒤에만 `expand`, `improve`, `repair`, `revert` 중 하나를
만든다. evidence 손상은 제품 결정으로 해석하지 않고 `promotion.evidenceStructureInvalid`
수리 판정으로 수렴한다.

결정 파일은
`../soombook.out/audit/representative-promotion-<candidate>-<artifact>.json`에 쓴다. 같은 candidate라도
artifact가 바뀌면 별도 evidence identity로 보존한다. 같은 candidate와 artifact의 기존 파일은
byte-exact 결정일 때만 멱등으로 인정하고, 다른 결정으로 덮어쓰지 않는다.

현재 `expand`는 first-party review 후보의 기술 품질만 뜻한다. 결정은 다음 값을 항상
유지한다.

- `publicationAuthority: none`
- `publicationEligible: false`
- `rightsApprovalDerived: false`
- `childStudyApprovalDerived: false`
- `externalRightsStatus: pending`

외부 자산과 아동 연구를 현재 제품 범위에서 제외하는 한, 이 대기 상태는 first-party 후보의
다음 기술 꼭지를 막지 않는다.

## 실행 순서

1. `npm run check:review-candidate`
2. `npm run check:representative-review`
3. `npm run build:review-candidate`
4. `npm run test:review-candidate:browser`
5. 세 전문 에이전트 review를 current scope로 기록
6. `npm run check:expert-reviews`
7. `npm run review:decide`
8. `npm run test:review-candidate`로 browser와 멱등 decision을 다시 확인
