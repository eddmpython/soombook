# 05. Child Safety, Accessibility, and Security

상태: V1 차단 계약 v1.0

범위: 초등학교 3학년 대상 4장면 수직 절편의 개인정보, 아동 연구, 정서 안전, 접근성, 콘텐츠 신뢰,
BookPack 보안, 브라우저와 공급망 안전, 사람 승인 경계.

이 문서는 기능 우선순위보다 앞선다. 이 문서의 차단 조건을 만족하지 못한 기능은 데모에 숨겨 넣거나
fallback으로 우회하지 않는다.

## 1. 안전 결과

`protectChildTrust`는 다음이 동시에 성립한 상태다.

1. 아이는 실명, 연락처, 학교, 정확한 나이, 음성, 얼굴을 내지 않고 핵심 여정을 완주한다.
2. 드래그, 시각 탐색, 음성 중 하나를 쓰지 못해도 같은 이야기 결과에 도달한다.
3. 실패, 힌트, 느린 읽기 때문에 벌, 수치, 순위, 손실을 받지 않는다.
4. fixture, 허구, 검증된 사실, 실제 문화유산이 화면과 데이터에서 구분된다.
5. 원격 코드, 조작된 BookPack, 잘못된 권리 상태가 읽기 런타임으로 승격되지 않는다.

## 2. V1 데이터 경계

### 2.1 처리하는 데이터

| 데이터 | 위치 | 목적 | 보존 | 원격 전송 |
|---|---|---|---|---:|
| 책 ID와 pack version | 기기 로컬 | 진행 호환 | 삭제 전까지 | 없음 |
| 마지막 확정 장면 | 기기 로컬 | 이어 읽기 | 삭제 전까지 | 없음 |
| 발견한 단서 ID | 기기 로컬 | 완주와 재독 | 삭제 전까지 | 없음 |
| 읽기, 소리, 동작 설정 | 기기 로컬 | 접근성 선호 | 삭제 전까지 | 없음 |
| coarse 오류 코드 | 현재 세션 메모리 | 로컬 진단 | 세션 종료 또는 export | 없음 |
| 자동 테스트 origin receipt | 테스트 산출물 | 회귀 검증 | CI 정책 | 제품 지표 아님 |

정확한 입력 시각도 장기 행동 프로필이 될 수 있으므로 V1 진행 상태에 저장하지 않는다. 오류 진단 export는
사용자가 명시적으로 만들 때만 기기, pack, 오류 코드의 제한된 집합을 포함한다.

### 2.2 처리하지 않는 데이터

- 이름, 이메일, 전화번호, 학교, 학급, 주소, 정확한 생년월일
- 얼굴, 사진, 카메라, 마이크 원본, 음성 특징
- 자유 텍스트와 열린 답변의 자동 저장
- 정확한 pointer 좌표, 궤적, 속도, 오답 횟수
- 광고 식별자, 제3자 쿠키, cross-site ID, 기기 fingerprint
- 공개 프로필, 댓글, 친구, 채팅, 순위
- 실제 위치와 박물관 방문 경로

향후 계정이나 원격 집계가 필요해지면 이 목록을 조용히 넓히지 않는다. 별도 privacy initiative에서 data
inventory, 목적, 동의, 보존, 삭제, export, 침해 대응을 다시 승인한다.

## 3. 법률과 정책 기준선

대한민국 개인정보 보호법 제22조의2는 만 14세 미만 아동 개인정보 처리에 법정대리인 동의가 필요한 경우
그 동의와 확인을 요구하고, 아동 고지를 이해하기 쉬운 양식과 명확한 언어로 하도록 정한다.

- [개인정보 보호법 제22조의2](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1020398521)

개인정보보호위원회는 14세 미만 아동이 주 이용자인 서비스에 맞춤형 광고 목적의 행태정보 수집 도구를
설치하지 않을 것을 권고한다.

- [맞춤형 광고 행태정보 정책 방안](https://www.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=9888)

제품 결정:

- V1은 법정대리인 동의 화면을 만들지 않는다. 동의가 필요한 개인정보 처리를 하지 않는 쪽으로 범위를
  줄인다.
- 광고와 맞춤형 광고 SDK는 영구 KILL이다.
- 이 문서는 법률 의견서가 아니다. 계정, 결제, 실제 연구, 원격 telemetry는 법률 검토 OPERATOR GATE다.

## 4. 실제 아동 연구 OPERATOR GATE

자동 테스트와 성인 QA가 끝나도 에이전트가 실제 아동 모집이나 관찰을 시작하지 않는다. 다음 문서가 사람
책임자에게 승인돼야 한다.

| 승인 증거 | 최소 내용 |
|---|---|
| 연구 목적 | 검증할 가설, 사용하지 않을 결과, 중단 기준 |
| 참여자 기준 | 학년, 모집 경로, 제외 기준, 강요 방지 |
| 보호자 동의 | 알기 쉬운 설명, 철회, 문의, 보상 |
| 아동 동의 | 아이가 이해할 말, 즉시 중단 선택 |
| 수집표 | 관찰 항목, 녹화 여부, 식별 가능성 |
| 보존과 삭제 | 저장 위치, 접근자, 삭제 시점, 철회 처리 |
| 진행자 안전 | 불안, 피로, 멀미, 수치 반응의 즉시 중단 절차 |
| 결과 해석 | 작은 표본을 시장 지표로 과장하지 않는 기준 |

승인 전에는 성인 연구자가 fixture로 동일한 조작을 수행하고, 테스트 origin은
`automatedTest`, `developer`, `adultQa` 중 하나로만 기록한다.

## 5. 정서와 교육 안전

### 5.1 금지하는 제품 문법

- 시간제한, 연속 출석 손실, 에너지 고갈, 확률 보상
- 빨간 실패, 틀림 횟수, 읽기 속도 순위, 다른 아이와 비교
- 힌트 사용을 약함이나 뒤처짐으로 표현
- 갑작스러운 큰 소리, 반복 점멸, 닫기 어려운 자동 재생
- 두려움, 외로움, 실종을 아이 탓이나 벌로 연결
- 캐릭터가 아이에게 비밀을 요구하거나 보호자에게 숨기도록 말함
- 보호자 영역처럼 보이는 위장 결제와 아이 대상 구매 압박

### 5.2 V1 감정 점검

호랑이가 그림 밖 솔향기에 호기심을 느껴 잠깐 걷는 허구는 다음 조건을 만족해야 한다.

- 아이가 호랑이를 구하거나 감정을 책임져야 한다고 압박하지 않는다.
- 호랑이의 감정은 하나의 이야기 해석이며 실제 옛 그림의 역사적 사실처럼 표시하지 않는다.
- 오답은 단서를 다시 보는 제안이며 능력 평가가 아니다.
- 무서움, 어두움, 빗소리를 끄거나 단순화할 수 있다.

교육 적합성, 감정 안전, 문화 해석은 각각 사람 검토이며 한 사람이 세 축을 자동 승인하지 않는다.

## 6. 접근성 목표

목표는 WCAG 2.2 AA다. W3C는 WCAG 2.2를 현재 웹 접근성 권고로 두며, 2.5.7은 드래그 동작에 같은
페이지의 단순 pointer 대체를 요구한다.

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [2.5.7 Dragging Movements 이해 문서](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)

WCAG 통과만으로 인지, 읽기, 아동 사용성이 모두 해결된다고 주장하지 않는다. 아동 문해와 감각 안전은
별도 사람 검토를 유지한다.

### 6.1 핵심 행동별 동등 경로

| 행동 | 감성 경로 | 단순 pointer | 키보드와 보조기기 | 같은 command |
|---|---|---|---|---|
| 책 열기 | 표지 drag | `책 열기` tap | Enter, Space | `OPEN_BOOK` |
| 장면 이동 | 모서리 drag | 이전, 다음 tap | ArrowLeft, ArrowRight | `LEAVE_SCENE` |
| 렌즈 이동 | 손잡이 drag | 영역 카드 tap | 후보 목록과 Enter | `COMPLETE_INTERACTION` |
| 이유 고르기 | 카드 선택 | 카드 tap | radio group | `COMPLETE_REASONING` |
| 연결 보기 | 카드 올리기 | `연결 보기` tap | button | `OPEN_CONNECTION` |

키보드만 추가하고 터치의 단순 tap 대체가 없으면 2.5.7을 만족한 것으로 보지 않는다.

### 6.2 필수 접근성 수용 기준

- 문서 언어, page title, heading, landmark, reading order가 의미와 일치한다.
- 모든 interactive control은 보이는 문구와 accessible name이 일치한다.
- 최소 pointer target은 24 x 24 CSS px 기준을 지키고, 주요 아동 조작은 44 x 44 CSS px 이상을 목표로 한다.
- focus가 가려지거나 장면 전환 뒤 사라지지 않는다. modal은 focus trap과 restore를 가진다.
- 200% 확대와 320 CSS px 폭 reflow에서 핵심 본문과 조작이 수평 scroll 없이 동작한다.
- 색, 위치, 소리, 움직임만으로 상태와 정답을 전달하지 않는다.
- 음성에는 같은 문장 text가 있고, 소리 전용 단서는 없다.
- `prefers-reduced-motion`에서 모든 장식 이동, 자동 흔들림, 곡률 전환을 끈다.
- CSS animation을 끈 상태에서도 상태 전이가 완료된다.
- 스크린리더 선형 탐색이 시각 렌즈와 같은 clue receipt를 만든다.
- 오류와 저장 실패는 `aria-live` 또는 동등한 상태 메시지로 알리되 반복 낭독하지 않는다.

### 6.3 지원 검증

자동화:

- semantic role과 accessible name 검사
- axe 기반 WCAG 자동 규칙
- keyboard-only 완주
- drag 없이 pointer-only 완주
- reduced motion, 200% zoom, mobile reflow
- focus order와 modal focus restore

사람 검수:

- NVDA 또는 Windows Narrator와 Chromium
- VoiceOver와 Safari, 기기 확보 뒤
- touch target, 손가락 가림, 화면 회전
- 쉬운 문구, 인지 부담, 소리와 움직임 민감성

## 7. 신뢰 경계와 위협 모델

### 7.1 신뢰 수준

| 입력 | 신뢰 | 처리 |
|---|---|---|
| 런타임 코드와 고정 schema | 추적되고 검증됨 | build와 CI gate |
| fixture BookPack | 데이터, 비운영 | schema와 integrity 검사, 명확한 fixture 표시 |
| published BookPack | 승인된 데이터 | schema, hash, rights, claim, accessibility gate |
| 외부 문화자산과 metadata | 비신뢰 입력 | snapshot, allowlist, 사람 승인 |
| BookPack 본문 | 비실행 데이터 | text node 렌더, HTML 금지 |
| 외부 URL | 비신뢰 navigation | https allowlist, 보호자 경계, opener 차단 |
| service worker cache | 교체 가능한 사본 | version key, rollback, 진행과 분리 |

### 7.2 주요 위협과 차단

| 위협 | 차단 |
|---|---|
| pack path traversal | 상대 경로 정규화, `..`, 절대 경로 거부 |
| script 또는 HTML 주입 | JSON 선언형 command만, `eval`, `innerHTML`, remote script 금지 |
| hash 바꿔치기 | integrity manifest와 SHA-256 대조 |
| zip bomb | 압축 도입 시 파일 수, 개별 byte, 총 해제 byte 상한 |
| 외부 링크 피싱 | protocol과 host policy, 보호자 확인, `noopener noreferrer` |
| service worker stale app | cache version 분리, HTML 재검증, 이전 pack rollback |
| dependency 공급망 | lockfile, 최소 의존성, audit, Dependabot 또는 동등 gate |
| secret 노출 | 브라우저 secret 0, `.env.example` 값 0, secret scanner |
| 진단을 통한 식별 | 허용 field allowlist, exact coordinate와 user text 금지 |
| 권리 철회 뒤 노출 | catalog 비활성화, 새 cache에서 제거, 기존 버전 회수 원장 |

## 8. 브라우저 보안 기준

- production에서는 inline 실행 코드와 `eval`을 허용하지 않는 CSP를 사용한다.
- `connect-src`는 app origin과 승인된 BookPack origin만 허용한다. V1 fixture는 same-origin이다.
- frame embed는 기본 거부하고 기관 embed가 필요할 때 별도 정책을 만든다.
- 외부 링크는 아동 여정에서 직접 열리지 않고 보호자 문맥으로 전환한다.
- referrer는 원본에 불필요한 내부 path나 상태가 전달되지 않게 제한한다.
- 서버가 없으므로 CSRF와 계정 session을 만들지 않는다. 미래 서버가 생기면 새 threat model이 필요하다.
- source map, 오류 메시지, diagnostic export에 secret과 로컬 절대 경로가 없는지 배포 전 검사한다.

## 9. 권리와 문화 안전

공공누리 제1유형은 상업 이용과 변경 이용을 허용하지만 출처 표시, 가능한 경우 원문 링크, 기관 후원 오인
금지, 저작인격권 존중 조건을 가진다.

- [공공누리 제1유형 일반증서](https://www.kogl.or.kr/info/licenseType1.do)

제품 규칙:

- API metadata의 개방 조건이 이미지 자산의 조건을 대신하지 않는다.
- 실제 asset마다 source snapshot, hash, 이용조건, 변경 내용, reviewer를 기록한다.
- 문화 사실 claim과 이미지 권리는 별도 승인한다.
- 기관명과 출처 표시는 제휴, 추천, 공식 인증 표식이 아니다.
- 승인 전에는 직접 제작한 `DEMO ASSET`, `실제 유물 아님` fixture를 사용한다.

## 10. OPERATOR GATE와 에이전트 권한

| 작업 | 에이전트 | 사람 책임자 |
|---|---:|---:|
| schema, reducer, fixture, 자동 테스트 | 수행 | 결과 검토 가능 |
| 접근성 자동화와 성인 키보드 QA | 수행 | 실기기 보조기기 검수 |
| 합성 fixture 시각과 문구 | 초안과 구현 | 공개 적합성 승인 |
| 권리 원문 수집과 체크리스트 | 준비 | 법률과 권리 승인 |
| 문화 사실 source 정리 | 준비 | 전문가 승인 |
| 아동 연구 문서와 관찰표 | 준비 | 연구 승인과 실제 수행 |
| 개인정보 처리방침 초안 | 준비 | 법률 검토와 게시 승인 |
| 프로덕션 공개와 기관 표현 | 준비 | 운영자 승인 |

사람 승인이 없으면 해당 공개 상태만 막는다. fixture 기반 런타임, 테스트, 성능, 접근성 개선은 계속한다.

## 11. 출시 차단과 완료 증거

다음 중 하나라도 있으면 공개 build를 차단한다.

- 필수 행동이 drag 또는 시각 좌표 하나에만 묶여 있다.
- focus trap, keyboard trap, 화면 밖 주요 control이 있다.
- 실제 자산의 권리나 사실 claim이 draft, suspended, withdrawn이다.
- 아이 데이터 또는 광고 SDK가 data inventory 밖에서 생성된다.
- BookPack이 executable code나 미검증 remote HTML을 포함한다.
- fixture가 실제 문화유산으로 보인다.
- 오류나 fallback이 아이의 진행을 조용히 잃는다.
- 자동 접근성 통과만으로 실제 보조기기와 인지 검수를 완료 처리한다.

완료 증거:

1. contract tests와 security negative fixture.
2. pointer-only, keyboard-only, reduced-motion 브라우저 receipts.
3. desktop, tablet, mobile viewport 스크린샷과 finding 원장.
4. local data inventory snapshot과 remote request 0 검사.
5. 권리와 문화 검토의 상태가 화면 표시와 일치한다는 operator checklist.
6. 미실시 실제 아동 연구는 `미확인`, 승인 대기는 `OPERATOR GATE`로 남긴 기록.
