# Soombook

초등학교 3학년을 위한 인터랙티브 독서와 문화유산 탐험 제품의 기획 및 구현 저장소다.

현재 저장소에는 가입 없이 작동하는 4장면 공개 체험용 수직 절편이 구현되어 있다. 아이는 이야기를 읽고,
세 길의 단서를 비교하고, 근거를 골라 생각하고, 현실의 질문 카드와 연결한 뒤 한 줄 회상 또는 보물
재확인으로 탐험을 완료할 수 있다.

별도 격리 profile에는 창작 원고와 placeholder만 사용한 10장면 대표작 `review` 후보가 있다. 권리,
문화, 초3 교육과 실기기 승인을 받지 않았으므로 공개 또는 출판 대상으로 취급하지 않는다.

외부 문화자산 후보는 metadata-only 요청, 저장소 밖 evidence, 서명 승인, 실제 byte 검증과 결정적 변환을
분리한다. 현재 명령과 차단 조건은 `docs/operation/rights-review.md`가 소유한다.

## 시작 위치

1. 에이전트와 개발자는 `CLAUDE.md`를 읽는다.
2. 현재 환경은 `docs/operation/workspace.md`에서 확인한다.
3. 현재 제품 동작은 `docs/product/reader-contract.md`, 차단 조건은 `docs/operation/quality.md`에서 확인한다.
4. `npm install` 뒤 `npm run setup:workspace`로 Git 원격과 추적되는 훅을 설정한다.
5. 개발은 `npm run dev`, 일반 전체 검증은 `npm run check:full`, 공개 후보 검증은
   `npm run check:release:automated`로 실행한다.

## 현재 판정

| 항목 | 상태 |
|---|---|
| Git 저장소 | `main` 브랜치로 초기화 |
| 제품 코드 | React 정적 PWA, provenance validator, 4장면 공개 fixture, 5장면 내부 fixture, 10장면 review 후보 |
| 제품 런타임 명령 | `npm run dev`, `npm run build`, `npm run check:full`, `npm run qa:performance` |
| GitHub Pages | `/soombook/` artifact와 수동 승인 workflow 준비, 공개 배포는 미승인 |
| 에이전트 작업 환경 | 구성됨 |
| 현재 제품 계약 | `docs/product/reader-contract.md` |
| 품질과 남은 승인 | `docs/operation/quality.md`, `docs/operation/operator-review.md` |

빌드와 브라우저 산출물은 저장소 밖 `../soombook.out`에 생성된다. 현재 화면은 실제 문화유산 자료가 아닌
창작 픽스처이며, review 후보에도 박물관 원본은 없다. 실제 자산 공개와 아동 연구, 최초 public push와
Pages 배포는 운영자 승인 전에는 진행하지 않는다.
