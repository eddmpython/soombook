# 10. Progress and Decision Ledger

상태: 활성 원장

완료된 구현 꼭지의 설명과 검증 결과는 `docs/**`의 현재 계약과 코드, 테스트가 소유한다. 이 원장에는
완료 이력을 쌓아 두지 않고, 아직 닫히지 않은 한 꼭지와 운영자 권한이 필요한 외부 gate만 남긴다.

## 현재 요약

| 필드 | 현재 값 |
|---|---|
| Primary goal ID | `completeMeaningfulStoryJourney` |
| 현재 Phase | `P1 operations documentation gate` |
| 현재 제품 | 공개 4장면 수직 절편, 내부 5장면 fixture, 비공개 10장면 review 후보, 정적 PWA |
| 현재 자동화 | BookPack 전체 파일 결박, 권리 승인 경계, PWA 두 버전 갱신, 대표작 기술 promotion, 8-profile device matrix, public release evidence와 first-party product baseline quorum |
| 현재 손실 전이 | 라이선스, 지원, 철회, 삭제, cache purge와 사고 대응 문서가 하나의 current operations contract로 결박되지 않음 |
| 원격 상태 | `main` 기준선 push 완료, 현재 꼭지 변경은 push 전 |
| NEXT | operations documentation gate 완성 |

## 현재 확인 사실

- first-party 10장면 review 후보의 source, compiled pack, CSS fallback, 빈 audio, pending ledger와 review
  artifact가 하나의 current product baseline digest로 결박돼 있다.
- 외부 문화자산은 metadata-only pending이며 승인 낭독은 absent와 not-implemented로 분리돼 있다.
- public release evidence 완료 근거는 `docs/**`, 코드, 테스트와 expert registry가 소유한다.
- 따라서 운영 문서의 exact inventory와 자동 gate만 활성 `NEXT`에 남긴다.

## 현재 결정

1. 완료된 first-party product baseline 꼭지는 활성 원장에서 삭제했다.
2. 운영 문서는 현재 자동화와 OPERATOR GATE를 혼합하지 않고 책임, 명령, 증거와 실패 복구를 exact하게 쓴다.
3. 문서 inventory, code projection과 negative gate가 모두 없으면 운영 문서 꼭지를 닫지 않는다.
4. 완료 뒤 확인된 현재 계약만 `docs/**`에 남기고 이 `NEXT`를 삭제한다.

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

`operations documentation gate`를 완성한다.

완료 조건:

1. 라이선스, 지원, 철회, 로컬 데이터 삭제, service worker와 cache purge, 사고 대응의 현재 문서 정본을
   exact inventory로 고정한다.
2. 각 절차의 책임 역할, 실행 명령, 입력, 증거, 실패 진단, 복구와 OPERATOR GATE를 machine-readable
   projection으로 결박한다.
3. 문서 누락, stale 명령, 책임자 부재, rollback·purge 순서 역전과 권한 상승 문구를 negative에서 차단한다.
4. 현재 코드와 workflow가 문서에 적힌 절차를 실제로 제공하는지 자동 검사한다.
5. 검증 결과를 현재 계약에 반영한 뒤 이 `NEXT`를 삭제한다.
