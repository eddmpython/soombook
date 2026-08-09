# mainPlan

앞으로 구현할 임시 설계와 작업 순서다. 현재 제품 계약의 정본이 아니다. 현재 사실은 `docs/**`가 소유한다.

initiative 하나는 폴더 하나로 관리한다. 구현이 끝나면 코드와 실제 실행에서 확인한 사실을 `docs/**`에
반영하고 initiative 폴더를 삭제한다. `_done`으로 옮기지 않으며 영구 문서가 `mainPlan`을 근거로 삼지
않는다.

상태 범례: 🟢 활성 구현, 🟡 부분 구현, ⚪ 미착수 설계, 🔒 운영자 승인 대기

| Initiative | 상태 | Primary goal ID | 한 줄 |
|---|---|---|---|
| [soombook-v1](soombook-v1/) | 🟡 | `completeMeaningfulStoryJourney` | 창작 fixture의 무계정 4장면 완결 루프는 구현됐고, 실제 자산과 사람 승인 뒤 한 권 확장을 결정한다. |

## 운영 규칙

1. 활성 initiative는 primary goal ID를 정확히 하나 가진다.
2. 현재 손실 전이 하나를 먼저 고치고 무관한 기능 폭을 함께 열지 않는다.
3. 단계는 산출물 수가 아니라 사용자 결과와 검증 증거로 닫는다.
4. 외부 승인 대기는 별도 `OPERATOR GATE`로 분리하고 합성 fixture로 가능한 작업은 계속한다.
5. 각 구현 묶음은 롤백과 실패 판정을 가진다.
