# Contribution and Git Workflow

확인일: 2026-08-09

## 처음 한 번

```powershell
npm install
npm run setup:workspace
```

`setup:workspace`는 local `core.hooksPath`를 `.githooks`로 설정하고 `origin`을
`https://github.com/eddmpython/soombook.git`로 맞춘다. 기존 origin이 다른 경우 자동으로 덮지 않고
실패한다.

## 변경 순서

1. `git status --short --branch`로 기존 변경을 확인한다.
2. 관련 현재 계약과 활성 `mainPlan`을 읽는다.
3. 가장 좁은 test나 contract부터 수정한다.
4. `npm run check`를 통과시킨다.
5. 화면이나 공개 경계를 바꿨다면 `npm run check:full`을 통과시킨다.
6. `git diff --check`와 `git diff -- <명시 경로>`로 변경 범위를 검산한다.
7. 사용자가 commit을 요청한 경우에만 명시 경로를 `git add`한다.
8. 한국어 category prefix의 commit message를 사용한다.
9. 사용자가 push를 요청한 경우에만 remote와 branch를 재확인하고 push한다.

허용 메시지 예시는 `기능: 4장면 독서 상태 전이 추가`, `문서: BookPack 출판 게이트 기록`이다. 모델명,
생성 주체 표식, 기여자 trailer, em 대시는 commit hook이 거부한다.

## 공통 기억의 위치

개인 session memory는 저장소 계약이 아니다. 반복되어야 하는 결정은 다음 순서로 승격한다.

```text
개인 선호 발견 -> CLAUDE.md 또는 docs 기록 -> lint, test, CI로 강제
```

secret, 임시 경로, 브라우저 session, 스크린샷은 memory나 Git에 복사하지 않는다. 공통 규칙의 강제 권위는
추적되는 코드와 CI이며 local hook은 빠른 보조 장치다.
