# 10. Progress and Decision Ledger

상태: 활성 원장

완료된 구현 꼭지의 설명과 검증 결과는 `docs/**`의 현재 계약과 코드, 테스트가 소유한다. 이 원장에는
완료 이력을 쌓아 두지 않고, 아직 닫히지 않은 한 꼭지와 운영자 권한이 필요한 외부 gate만 남긴다.

## 현재 요약

| 필드 | 현재 값 |
|---|---|
| Primary goal ID | `completeMeaningfulStoryJourney` |
| 현재 Phase | `P1 first-party review candidate product baseline` |
| 현재 제품 | 공개 4장면 수직 절편, 내부 5장면 fixture, 비공개 10장면 review 후보, 정적 PWA |
| 현재 자동화 | BookPack 전체 파일 결박, 권리 승인 경계, PWA 두 버전 갱신, 대표작 기술 promotion, 8-profile device matrix, public release evidence quorum |
| 현재 손실 전이 | first-party 10장면 제품 기준과 선택적 외부 자산·낭독 확장 경계가 하나의 current product baseline으로 결박되지 않음 |
| 원격 상태 | `main` 기준선 push 완료, 현재 꼭지 변경은 push 전 |
| NEXT | first-party review candidate product baseline 완성 |

## 현재 확인 사실

- first-party 10장면 review 후보, pending 권리·검수 ledger와 기술 promotion 증거가 존재한다.
- 외부 문화자산과 승인 낭독은 현재 제품 기준에 포함되지 않지만, 이 부재와 선택적 확장 경계를 하나의
  current product baseline receipt가 아직 소유하지 않는다.
- public release evidence 완료 근거는 `docs/**`, 코드, 테스트와 expert registry가 소유한다.
- 따라서 first-party 제품 기준과 선택적 확장 경계만 활성 `NEXT`에 남긴다.

## 현재 결정

1. 완료된 release evidence matrix 꼭지는 활성 원장에서 삭제했다.
2. first-party 제품 기준은 외부 문화자산, 승인 낭독, 출판, 교육 효과 또는 실제 기기 승인을 파생하지 않는다.
3. current product baseline과 세 전문 에이전트 PASS가 모두 없으면 이 꼭지를 닫지 않는다.
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

`first-party review candidate product baseline`을 완성한다.

완료 조건:

1. first-party 10장면 후보의 source, BookPack, asset, audio와 pending ledger 정본을 exact scope로 고정한다.
2. 현재 제품에 필수인 first-party 파일과 선택적 외부 문화자산·승인 낭독의 경계를 machine-readable
   projection으로 분리한다.
3. 외부 자산이나 낭독의 무단 편입, 필수 first-party 파일 누락, pending 상태 제거와 제품 기준 위조를
   coherent 변조에도 차단한다.
4. content boundary, delivery boundary, extension boundary 담당 전문 에이전트가 서로 다른 reviewer ref로
   같은 product baseline digest를 PASS한다.
5. 검증 결과를 현재 계약에 반영한 뒤 이 `NEXT`를 삭제한다.
