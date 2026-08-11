# Third-Party Notices

확인일: 2026-08-10

Soombook의 당사자 software는 Apache-2.0을 따른다. 설치 의존성은 각 package의 원 라이선스를 유지한다.
`package-lock.json`이 실제 의존성 버전의 정본이며 release 전 license inventory를 다시 생성하고 검토한다.

2026-08-10 설치된 직접 의존성의 package metadata 확인 결과:

| Package | Version | License |
|---|---:|---|
| ajv | 8.20.0 | MIT |
| react, react-dom | 19.2.8 | MIT |
| sharp | 0.35.3 | Apache-2.0 |
| @axe-core/playwright | 4.12.1 | MPL-2.0 |
| @eslint/js, eslint | 9.39.4 | MIT |
| @playwright/test | 1.62.1 | Apache-2.0 |
| @types/node | 22.19.19 | MIT |
| @types/react | 19.2.18 | MIT |
| @types/react-dom | 19.2.4 | MIT |
| @vitejs/plugin-react | 6.0.5 | MIT |
| eslint-plugin-jsx-a11y | 6.10.2 | MIT |
| eslint-plugin-react | 7.37.5 | MIT |
| eslint-plugin-react-hooks | 7.1.1 | MIT |
| globals | 16.4.0 | MIT |
| parse5 | 8.0.1 | MIT |
| prettier | 3.9.6 | MIT |
| typescript | 6.0.3 | Apache-2.0 |
| typescript-eslint | 8.66.0 | MIT |
| vite | 8.2.1 | MIT |
| vite-plugin-pwa | 1.3.0 | MIT |
| vitest | 4.1.10 | MIT |
| yaml | 2.9.0 | ISC |

실제 박물관 이미지, 음성, font, 3D, 외부 삽화는 현재 포함하지 않는다. 향후 포함할 때는 이 문서와 각
BookPack `ledgers/rights.json`을 같은 변경에서 갱신한다.

`apps/reader-web/public/og.png`는 외부 원본을 쓰지 않은 당사자 social preview로 분류하며 third-party
notice 대상이 아니다. 생성 방식과 hash는 `docs/operation/licensing.md`가 소유한다.

이 문서는 dependency의 license 전문을 대체하지 않는다.
