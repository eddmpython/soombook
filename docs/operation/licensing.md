# Licensing Contract

확인일: 2026-08-09

## Software

이 저장소의 당사자 software와 code documentation은 [Apache License 2.0](../../LICENSE)을 따른다.

Apache-2.0은 source와 object의 사용, 수정, 배포를 허용하고 contributor의 명시적 특허 허여를 포함한다.
license와 NOTICE 보존, 변경 파일 표시 의무를 따른다. license는 `Soombook`, `숨책`, logo 또는 기관 표시에
대한 상표 사용 권리를 주지 않는다.

## First-party content

현재 `content/fixtures/**`는 기능 검증을 위해 직접 제작한 fixture다. 실제 문화유산이나 기관 승인 자료가
아니며 화면에서 이를 명시한다. 현재 repository license 범위에 포함되지만 운영 콘텐츠 승인으로 해석하지
않는다.

`content/fixtures/lantern-demo/assets/lantern-timing.wav`는 외부 녹음이나 음성을 쓰지 않고 저장소 script가
결정론적으로 생성한 4초 mono timing tone이다. Apache-2.0 범위의 내부 테스트 자산이며 검수 낭독, 사람
목소리, 교육 콘텐츠 또는 공개 catalog 자산이 아니다. SHA-256은
`D8AA2370280A494E74B8E7B47C1FB08979DC0F374BBC92AA13C7F4F1FED1601D`다. 기본과 Pages artifact에는
포함하지 않는다.

`apps/reader-web/public/og.png`는 이 프로젝트의 창작 장면과 문구만 지시한 단일 image generation 결과를
1200x630 social preview로 잘라 만든 당사자 체험판 자산이다. 제3자 문화유산 원본, 인물, 상표나 외부
이미지를 입력으로 사용하지 않았다. SHA-256은
`A69E460B15ACF56DDB59584F6675F082D87EB72E6B621BF7A3496407326A7CB7`이다. 정식 브랜드와 콘텐츠
라이선스 승인 전에는 체험판 미리보기 외 용도로 승격하지 않는다.

향후 당사자 story, illustration, narration을 CC BY 4.0 또는 다른 콘텐츠 조건으로 공개하려면 별도 운영자
결정을 기록하고 파일 단위 표시를 추가한다. 결정 전에는 repository의 Apache-2.0 범위를 따른다.

## Third-party content

<a id="ops-license-inventory"></a>
### OPS-LICENSE-INVENTORY

책임 역할은 `license-maintainer`다. 입력은 `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES.md`, lockfile과 모든
BookPack rights ledger다. 검증 명령은 `npm run check:source`, `npm run check:assets`와
`npm run check:operations`다. 증거에는 dependency 이름·version·license, 자산별 source와 license URL,
rights lifecycle과 검토자가 포함된다.

결정 책임자는 `license-maintainer`, 실행자는 `repository-maintainer`, 검증자는 `license-reviewer`다. 절차
단계 ID는 `license-freeze`, `license-repair`, `license-remove-unapproved`, `license-recheck` 순서다. 이
절차는 `OG-01`, `OG-02` 상태를 대신 승인하지 않는다.

`OPS_LICENSE_INVENTORY_DRIFT` 또는 `OPS_LICENSE_AUTHORITY_ESCALATION`이면 신규 release를 동결하고
미확인 자산을 제외한 뒤 inventory와 rights gate를 다시 실행한다. OG-01과 OG-02 승인 전에는 상표나 외부
자산 권위를 확대하지 않는다. 자동 검수 PASS는 법률 의견이나 권리 승인이 아니다.

제3자 문화자산, font, audio, image, 3D와 library는 각 원 라이선스를 유지한다. 이 저장소의 LICENSE는 이를
Apache-2.0으로 재허여하지 않는다.

실제 BookPack asset은 다음이 있어야 한다.

- source와 원문 URL
- license 또는 별도 허락
- 상업 이용과 변경 이용 범위
- attribution과 원문 link
- 변경 내용
- source snapshot과 hash
- 확인일과 reviewer
- 승인, 중단, 철회 상태

실제 dependency와 포함 자산 목록은 [Third-Party Notices](../../THIRD_PARTY_NOTICES.md)에 둔다.

`tests/audit/binary-assets.json`의 9개 당사자 binary는 파일 저작권 조건을 Apache-2.0으로 고정한다. 이
분류는 `Soombook`, `숨책`과 mark의 상표 사용을 허여하지 않으며 production content 승인도 아니다.

## Brand and institutions

`Soombook`, `숨책`, logo와 visual identity는 별도 상표와 brand 정책 대상이다. 박물관 이름과 출처를
표시하는 것은 제휴, 추천, 공식 인증을 뜻하지 않는다.

상표, 외부 자산, 실제 공개 전 최종 판단은 사람 책임자에게 남는다. 이 문서는 법률 의견서가 아니다.
