# Rights Review and Approved Asset Intake

확인일: 2026-08-10

이 문서는 외부 문화자산 후보를 저장소에 넣기 전에 사용하는 현재 검수 계약이다. 검수 요청, 승인 결정,
원본 byte, 변환 결과와 BookPack 출판 판정을 서로 다른 증거로 다룬다.

## 현재 후보

`tiger-full-review`의 동원2613 연결 카드는 국립중앙박물관 소장품 페이지와 공공누리 제1유형 정책을 source
후보로 사용한다. 저장소에는 metadata-only 요청만 있다.

- 요청: `content/books/tiger-full-review/review/dongwon2613-rights-review-request.json`
- 소장품 페이지: `https://www.museum.go.kr/MUSEUM/contents/M0502000000.do?relicId=8450&schM=view`
- 박물관 저작권 정책: `https://www.museum.go.kr/MUSEUM/contents/M3304000000.do`
- 공공누리 제1유형: `https://www.kogl.or.kr/info/licenseType1.do`
- 관찰한 표시 URL: 5개
- 서로 다른 표시 byte digest: 3개
- 실제 다운로드 file ID와 승인된 원본: 0개
- repository ingest 허용: false

요청은 current authoring source SHA-256과 target rights subject digest에도 결박된다. 검수 명령과 승인
명령은 저장된 compiled JSON을 신뢰하지 않고 현재 authoring JSON byte를 직접 다시 compile한다. source,
pack version 또는 target record가 바뀐 stale 요청은 두 명령에서 모두 실패한다.

표시 URL 관찰값은 승인된 다운로드 artifact가 아니다. 승인 전 박물관 image byte는 repository, review
artifact, public artifact와 PWA cache에 들어갈 수 없다.

## 검수 요청 확인

```powershell
npm run check:rights-review
```

이 명령은 요청 구조, HTTPS source, 중복 byte 관계, 안전한 출력 경로, 구조화 변환, attribution, 철회와
재검토 조건을 확인한다. receipt는 저장소 밖 `../soombook.out/rights-review/request-receipt.json`에 쓴다.

## 승인 입력

승인 입력과 증거는 저장소 밖에 둔다. 다음 값이 모두 같은 결정에 결박돼야 한다.

- 현재 request canonical SHA-256
- 권리 페이지 snapshot의 실제 byte SHA-256과 capture 시각
- 사용할 다운로드 artifact의 file ID, vault ref, JPEG byte SHA-256, 길이와 pixel 크기
- 각 구조화 변환 plan digest
- attribution digest
- 이용 범위, 제외 범위, 재검토 시각과 철회 owner
- 신뢰한 key ID와 Ed25519 signature

지원 명령은 repository 밖 absolute path만 받는다.

```powershell
npm run rights-review:verify -- `
  --approval <외부-approval.json> `
  --evidence-root <외부-evidence-directory> `
  --public-key <외부-public-key.pem> `
  --trusted-key-id <승인된-key-id>
```

`--stage`를 추가하면 승인된 JPEG를 고정된 Sharp version과 구조화 plan으로 WebP base와 detail로 변환한다.
`--project-review-pack`을 함께 쓰면 검증한 output을 현재 review BookPack의 asset, rights provenance, source
presentation과 rights review digest로 자동 투영한다. raw approval 객체는 이 API를 호출할 수 없고 같은
process에서 Ed25519 signature, trusted key fingerprint, 시각과 evidence byte를 검증해 만든 opaque approval만
받는다. 검증된 approval과 projection은 중첩 값까지 동결하고 생성 시점 digest를 module-private
commitment에 보관한다. staging output byte는 copy-on-read로만 노출하고 projection 직전에 committed hash와
다시 대조한다.

결과는 approval digest별 immutable directory에 원자적으로 생성하며 기존 directory를 덮어쓰지 않는다.
테스트는 별도 임시 output root와 `synthetic-test` authority를 써 운영 receipt를 오염시키지 않는다. staging과
projection은 source와 변환 동일성을 증명하지만 전체 BookPack publication을 승인하거나 repository를
수정하지 않는다.

## 자동 차단

다음은 test와 build gate에서 실패한다.

- 표시 URL을 다운로드 file로 가장함
- request, source snapshot, 원본 byte, plan, attribution 중 하나의 digest 불일치
- 승인 만료, 다른 pack version, 다른 rights record, 신뢰하지 않은 key 또는 잘못된 Ed25519 signature
- 절대 경로, path traversal, symlink와 repository 안 evidence
- 자유 형식 또는 미승인 변환
- 중복 output path, 빠진 crop·tone·overlay·detail tile 적용 여부 결정
- 같은 입력에서 달라지는 변환 output
- `content/books` 아래 binary 또는 관찰한 박물관 byte digest가 repository 어디에든 등장함
- first-party binary allowlist에 없는 image, audio, font, PDF 또는 확장자를 위장한 media magic
- XML 선언, 주석, processing instruction, DOCTYPE과 internal subset 뒤에 숨긴 SVG
- pending snapshot에 가짜 hash 또는 capture 시각을 기록함
- 승인 권리에 approval evidence digest나 file asset ingest receipt digest가 없음

현재 성공 경로는 테스트가 직접 만든 JPEG, snapshot과 일회용 Ed25519 key로 검증한다. 실제 박물관 byte를
테스트 fixture로 사용하지 않는다.

## 출판 경계

검증된 ingest receipt는 `createApprovedRightsProjection`이 기존 `AssetRecord`,
`RightsRecord.provenance`, `ReviewRecord`에 투영한다. BookPack validator는 exact subject coverage, lineage,
source snapshot, approval evidence digest, ingest receipt digest, approval lifecycle과 승인 대상 canonical
digest를 최종 판정한다. source lineage는 candidate ID, source SHA-256, evidence ref, derivative plan digest와
ingest receipt digest를 권리 provenance에 모두 대조한다.

공개 schema API는 평문 rights context를 받지 않는다. 출판 도구는 같은 process에서 만든 genuine
projection을 받는 `assertPublishableBookPack`만 사용한다. 이 경계는 최종 pack의 book ID, pack version,
rights record, output asset, source visual과 source card를 projection과 대조한 뒤 release 시각의 만료,
중단과 철회를 검사한다. synthetic positive publish와 cross-book replay negative test를 함께 유지한다.
status와 임의 digest 문자열만 바꿔서는 출판 경계가 열리지 않는다.

review build는 허용한 first-party binary의 exact digest를 검사하고 전체 파일의 path, byte length, SHA-256과
media type을 `../soombook.out/audit/review-build-integrity.json`에 기록한다.

이 자동화 꼭지는 content provenance, deployment stability, implementation quality 전문 에이전트 3명의
독립 검수를 통과했다. `npm run check:expert-reviews`는 검수 scope의 현재 digest가 당시 PASS 판정과 같은지
차단한다. 이 technical review receipt는 법률 승인이나 실제 아동 연구 결과가 아니다.

현재 동원2613 후보는 이 투영 전 단계이므로 `review` 전용이고 공개 fixture와 Pages artifact에는 포함되지
않는다. 제품은 승인된 제3자 image가 없어도 직접 제작 story art와 source link 카드로 완주할 수 있다.
