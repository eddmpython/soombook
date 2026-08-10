# 10. Progress and Decision Ledger

상태: 활성 원장

완료된 구현 꼭지의 설명과 검증 결과는 `docs/**`의 현재 계약과 코드, 테스트가 소유한다. 이 원장에는
완료 이력을 쌓아 두지 않고, 아직 닫히지 않은 한 꼭지와 운영자 권한이 필요한 외부 gate만 남긴다.

## 현재 요약

| 필드 | 현재 값 |
|---|---|
| Primary goal ID | `completeMeaningfulStoryJourney` |
| 현재 Phase | `P1 release evidence review matrix` |
| 현재 제품 | 공개 4장면 수직 절편, 내부 5장면 fixture, 비공개 10장면 review 후보, 정적 PWA |
| 현재 자동화 | BookPack 전체 파일 결박, 권리 승인 경계, PWA 두 버전 갱신, 대표작 기술 promotion, 8-profile device matrix |
| 현재 손실 전이 | 공개 문구, 합성 성능 profile과 Pages response header 예외가 하나의 current release evidence와 전문 검수 quorum에 결박되지 않음 |
| 원격 상태 | `main` 기준선 push 완료, 현재 꼭지 변경은 push 전 |
| NEXT | public release evidence review matrix 완성 |

## 현재 확인 사실

- 공개 fixture 문구, 합성 성능 receipt와 Pages header 예외 검사는 각각 존재한다.
- 각 증거는 현재 build와 개별 checker에 연결되지만 하나의 release candidate identity와 reviewer ownership에
  exact하게 묶이지 않았다.
- device matrix 완료 근거는 `docs/operation/quality.md`, 코드, 테스트와 expert registry가 소유한다.
- 따라서 release evidence matrix만 활성 `NEXT`에 남긴다.

## 현재 결정

1. 완료된 권리 자동화, PWA 복구, BookPack 결박, 대표작 promotion과 device matrix 꼭지는 활성 원장에서
   삭제했다.
2. release matrix는 실제 배포 승인이나 운영자 승인으로 승격하지 않고 first-party 기술 release 증거로
   한정한다.
3. current release identity와 세 전문 에이전트 PASS가 모두 없으면 이 꼭지를 닫지 않는다.
4. 완료 뒤 확인된 현재 계약만 `docs/**`에 반영하고 이 `NEXT`를 삭제한다.

## OPERATOR GATE

아래 항목은 현재 자동 구현의 `NEXT`가 아니며, 외부 권한을 획득하기 전 실행하지 않는다.

| ID | 항목 | 현재 |
|---|---|---|
| OG-01 | 정식 브랜드와 상표 | 미확인 |
| OG-02 | 실제 문화자산 권리 | 미승인 |
| OG-03 | 문화 사실과 허구 | 미승인 |
| OG-04 | 초3 언어와 교육 | 미승인 |
| OG-05 | 실제 보조기기와 기기 | 미실시 |
| OG-06 | 실제 아동 연구 | 미승인 |
| OG-07 | 개인정보와 계정 | 범위 밖 |
| OG-08 | preview와 production 배포 | 미승인 |

## NEXT

`public release evidence review matrix`를 완성한다.

완료 조건:

1. 공개 fixture 문구, 합성 성능 profile과 Pages response header 예외의 정본 경로와 current release
   identity를 exact scope로 고정한다.
2. 저장 receipt를 신뢰하지 않고 현재 public과 Pages artifact, performance evidence를 다시 계산한다.
3. 누락, stale scope, artifact 교체, profile 축소와 예외 확대를 coherent 변조에도 차단한다.
4. product copy, performance evidence, deployment boundary 담당 전문 에이전트가 서로 다른 reviewer ref로
   같은 release evidence digest를 PASS한다.
5. 검증 결과를 현재 계약에 반영한 뒤 이 `NEXT`를 삭제한다.
