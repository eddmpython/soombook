# 11. Productization Completion Audit

확인일: 2026-08-10

이 문서는 PRD 요구, 현재 코드 증거, 미구현, 사람 승인을 한 표에서 추적한다. `구현`은 실제 실행 증거가
있는 항목, `부분`은 일부 수용 기준만 통과한 항목, `OPERATOR GATE`는 사람 책임을 뜻한다.

## 기능 요구

| ID | 판정 | 현재 증거 | 남은 완료 조건 |
|---|---|---|---|
| FR-01 | 구현 | 무계정 시작, 비파괴 재시도, 정적 첫 장면 fallback | 실제 asset 오류 실기기 검수 |
| FR-02 | 기술 구현 | 세 viewport, 320px·200% 자동 완주, 회전 보존, 1280px 정적 양면 | 실제 browser zoom과 실기기는 OG-05 |
| FR-03 | 기술 구현 | 이전·다음·좌우 화살표, 보이는 edge tap, 제한 drag, lens lock, 취소 정리, 20회 no-skip | drag 발견성과 보조기기 충돌은 OG-05·06, drag는 H2 실험 |
| FR-04 | 기술 구현 | 공개 direct-only, 내부 fixture의 direct·guided·listen, mode 위치 보존과 비자동재생 | 승인 한국어 낭독, 권리와 발음 검수는 OG-02·04 |
| FR-05 | 기술 구현 | 장면별 track, 전체 text segment, highlight, sentence seek, 0.8·1.0·1.2배와 250ms 동기 | 실제 음원 segment 청취 검수와 실기기 drift |
| FR-06 | fixture 구현 | SHA-256 base·detail, BookPack별 pointer geometry와 fallback decoration, 실제 렌즈, 404·hash 실패와 선형 fallback | 실제 문화자산 detail은 OG-02·03 |
| FR-07 | 구현 | tap, keyboard, linear list가 같은 interaction에 수렴 | 실제 보조기기 검수 |
| FR-08 | 구현 | 말·방향·영역·직접 4단계, 건너뛰기, 누적 재열람 | 아동 이해 검수 |
| FR-09 | 기술 구현 | 단서 의존, 원인 근거, 낙인 없는 retry | OG-04, OG-06 |
| FR-10 | review 후보 구현 | fixture, fiction, unverified, verified source UI와 10장면 pending source 카드 | 실제 카드에는 OG-02, OG-03 승인과 exact attribution |
| FR-11 | 구현 | storage v4, reading mode, local profile slot, pack별 보존, v3 이관, v2 mirror, 삭제, 손상 차단 | 공개 뒤 A-B-A golden migration 지속 |
| FR-12 | 구현 | OS 설정과 `system|reduced` 수동 설정, reload·회전 보존 | 실제 기기 검수 |
| FR-13 | 구현 | `reading -> reflecting -> completed`, 회상 또는 보물 | OG-04, OG-06 |
| FR-14 | 기술 구현 | review·publish profile, exact subject coverage, source snapshot, claim scope, review digest, 전체 파일 manifest, 공개·내부·검수 build와 artifact 결박 | 실제 승인 자산은 외부 제품 범위에서만 별도 ingest |

## 비기능 요구

| ID | 판정 | 남은 조건 |
|---|---|---|
| NFR-01 | 자동 구현 | 8-profile cross-engine·CSS root 200%·forced-colors·reduced-motion·high-contrast·touch 모의와 21-state AX·focus·offline 검수. 실제 zoom·기기·보조기기는 OG-05 |
| NFR-02 | 자동 구현 | root와 Pages의 mobile·desktop 3회 합성 lab과 5회 heap green. field와 실기기는 OG-05 필요 |
| NFR-03 | 기술 구현 | TTS 정리, detail 404·hash fallback, audio 404·hash·duration·playback fallback과 offline 재생 |
| NFR-04 | 구현 | 한 번 연 뒤 처음부터 완료까지 offline browser journey |
| NFR-05 | 기술 구현 | 원격 수집·광고 0, 실제 연구는 OG-06 |
| NFR-06 | 부분 | lockfile, meta CSP, 외부 origin 0, source hygiene. response header는 Pages 예외 |
| NFR-07 | OPERATOR GATE | production 자산은 OG-02 |
| NFR-08 | 기술 구현 | fixture, fiction, unverified, verified source를 schema, 검수 후보와 화면에서 구분. 실제 source 승인은 OG-02·03 |
| NFR-09 | 구현 기반 | pack version key와 legacy mirror, rollback workflow. 공개 뒤 golden test 유지 |
| NFR-10 | 부분 | 로컬 오류 코드와 release receipt는 있음, 승인된 집계는 범위 밖 |

## Phase 판정

| Phase | 판정 | 근거 또는 결손 |
|---|---|---|
| P0A | 구현 | workspace, lockfile, 22 gate, CI, 공개 source 검사 |
| P0B | 구현 | 2개 fixture, generic serializer, standalone validator, 전체 파일 integrity manifest, main·worker·precache·release 결박과 negative test |
| P0C | 구현 | reducer, storage v4 최소 저장, pack별 rollback 보존, v3 이관, v2 mirror, delete, memory fallback |
| P0D | 기술 체험판 구현 | 공개 직접 읽기, 내부 3 mode 오디오, 정적 양면, edge 제어, 보조 음성, 반응형, reduced motion |
| P0E | 구현 | 4장면, 4단계 힌트, 근거 추론, 연결, reflection, offline |
| P0F | 자동 구현 | 접근성, offline과 root·Pages mobile·desktop performance green. 실제 기기와 보조기기는 OG-05 |
| P0G | 준비 완료 | 운영자 시트, 기기 checklist, 연구 초안, license, rollback runbook 존재. 승인은 미완료 |
| P1 review 후보 | 기술 검수 완료 | 10장면 source, compiler, exact 검수 matrix, 세 전문 에이전트 quorum, desktop keyboard·mobile actual pointer·offline 2건과 immutable `expand` decision. 외부 자산과 낭독은 현재 first-party 제품 범위 밖 |

## 남은 순서

1. fixture 공개 문구, 합성 성능 profile과 Pages response header 예외를 에이전트 release review matrix로 고정한다.
2. commit과 push 없이도 재현 가능한 final local release receipt, rollback floor와 remote smoke 입력 검증 도구를 완성한다.
3. first-party 10장면 후보를 제품 기준으로 고정하고 외부 자산과 낭독은 선택적 확장으로 분리한다.
4. 라이선스, 지원, 철회, 삭제, cache purge와 사고 대응 문서를 자동 gate에 결박한다.
5. 모든 현재 계약과 영수증을 `docs/**`로 승격하고 활성 `mainPlan/soombook-v1`을 삭제한다.

현재 전체 제품화 판정은 `부분`이다. 공개 자동 후보와 실제 제품을 같은 완료로 합치지 않는다.
