# GitHub Pages Public Preview Contract

확인일: 2026-08-10

## 현재 결정

GitHub Pages는 무계정 4장면 창작 체험판의 1단계 공개 호스트다. 목표 URL은
`https://eddmpython.github.io/soombook/`이며 현재 배포는 승인되지 않았다.

이 선택은 운영 제품의 최종 호스트 결정이 아니다. 응답 보안 헤더, 보호된 PR preview, 즉시 rollback,
계정, 결제, 외부 입력, 실제 아동 연구 또는 승인 문화자산의 빠른 철회가 필요해지면 Cloudflare Workers
Static Assets나 동등한 제어 가능한 호스트로 승격한다. Cloudflare Pages는 기존 Pages 기능이 특별히
필요할 때의 대안이며 신규 정적 SPA 기본 선택은 Workers Static Assets다.

## 공개 profile

| 항목 | 로컬 기본 profile | GitHub Pages profile |
|---|---|---|
| base | `/` | `/soombook/` |
| build | `npm run build` | `npm run build:pages` |
| browser | `npm run test:e2e` | `npm run test:pages` |
| sourcemap | 기본 꺼짐 | 꺼짐과 artifact 차단 |
| 검색 | 해당 없음 | `noindex, nofollow, noarchive` |
| 배포 | 없음 | 운영자 승인 뒤 수동 workflow |

`SOOMBOOK_PUBLIC_BASE` 하나가 Vite base, manifest id, start URL, scope, icon, 앱 홈과 favicon URL을
소유한다. Pages profile은 이 값을 `/soombook/`로 고정한다. 별도 URL route는 현재 없으며 첫 방문 deep
link를 지원한다고 주장하지 않는다.

## PWA 두 버전 갱신과 실패 복구

service worker는 `prompt` 방식으로 등록한다. 새 worker가 준비되면 열린 문서를 자동 reload하지 않고
waiting worker만 활성화한다. 따라서 이미 연 v1 문서는 v1 화면을 유지하고 다음 navigation부터 v2를
사용한다. runtime local progress는 service worker lifecycle의 삭제 대상이 아니며 버전 교체와 offline
reload 뒤에도 같은 byte로 남는다.

등록 함수가 반환되기 전에 갱신 신호가 와도 요청을 보존하고 updater를 정확히 한 번 실행한다. updater
rejection, 동기 등록 예외와 등록 오류 callback은 하나의 복구 경로로 합류한다. 복구가 시작된 뒤 늦게 온
ready, offline-ready와 reload callback은 `online-only` 상태를 덮지 못한다.

복구는 현재 앱 URL과 정확히 같은 scope의 registration만 해제한다. cache는 `soombook-reader-` prefix와
현재 app scope suffix를 모두 만족할 때만 삭제한다. 같은 origin의 다른 프로젝트 service worker와 cache는
보존한다. 복구가 끝나면 화면에 `SW_REGISTER_001`과 online-only 안내를 표시하며 저장된 진행은 삭제하지
않는다.

`npm run test:pwa-update`는 production v1과 v2 artifact를 따로 만들고 열린 v1 유지, 새 navigation의 v2,
동일 local progress, v2 offline reload를 실제 Chromium에서 검증한다. lifecycle unit test는 중복 갱신,
동기 callback, updater rejection, 등록 예외, 다른 scope 비침범과 복구 뒤 늦은 callback을 차단한다.

## 공개 artifact 차단

`npm run build:pages`는 production build 뒤 canonical `release.json`, BookPack build 결박, bundle budget,
Pages artifact 검사를 순서대로
실행한다. 검사는 다음을 차단한다.

- `/soombook/` 밖의 root asset URL
- 잘못된 manifest id, start URL, scope, icon URL 또는 192·512 PNG 설치 icon
- production `.map` 파일
- 내부 검증 fixture의 식별자, 그림 또는 timing WAV
- 사용자 홈과 동기화 폴더 로컬 경로
- 누락된 index, manifest, service worker, OG image와 release receipt
- symbolic link와 외부 script
- 누락되거나 값이 다른 meta CSP, referrer, noindex와 offline navigation fallback

`npm run check:source`는 artifact 밖 공개 source tree도 따로 검사해 자격증명 파일, env 파일, secret 패턴,
Windows와 Unix 사용자 홈 경로, 동기화 폴더 경로와 symbolic link를 차단한다. `release.json`은 commit,
profile, Node version, book ID, pack version, semantic BookPack digest, 전체 file-set digest와 artifact 전체
content SHA-256을 기록한다. canonical integrity, binding과 worker artifact의 경로 및 SHA-256도 기록한다.
세 역할 경로는 서로 달라야 하고 Pages public base `/soombook/`와 같은 build에서 나온 값이어야 한다.
artifact 검사는 release 파일을 제외한 전체 파일 hash를 다시 계산해 digest와 대조한다.

`bookpack-integrity.json`, `bookpack-binding.json`, worker와 모든 BookPack asset은 service worker의 실제
precache literal 목록에 포함된다. remote smoke는 cache-busting release를 읽은 뒤 세 역할 artifact를 직접
fetch해 byte SHA와 identity를 다시 대조한다.

앱 shell의 JS와 CSS gzip 예산은 350KB, 첫 화면 critical raster 예산은 600KB다. 공유 미리보기
`og.png`는 runtime critical raster에서 분리하고 2MB 예산을 적용한다.

## 데이터와 보안 경계

앱 코드는 계정, 원격 telemetry, form, 광고, 제3자 script와 외부 asset 요청을 사용하지 않는다. HTML meta
CSP와 `referrer=no-referrer`, HTTPS, 외부 origin 0 브라우저 검사를 적용한다. `media-src`는 향후 승인된
자체 호스팅 낭독을 위해 `'self'`만 허용하지만 현재 공개 tiger pack은 직접 읽기만 선언하고 오디오 파일을
artifact에 넣지 않는다.

GitHub Pages에서는 `frame-ancestors`, Permissions-Policy, HSTS 같은 custom response header를 저장소에서
제어할 수 없다. 자동 정책의 exact 예외는 `content-security-policy:frame-ancestors`, `permissions-policy`,
`strict-transport-security` 세 항목뿐이며 `public-technical-demo`와 GitHub Pages 조합에서만 허용한다. 예외
추가나 wildcard는 release evidence를 실패시킨다. 이 예외는 창작 기술 체험판에만 허용한다. 계정, 아동 조사, 자유 입력, 제휴 콘텐츠 또는
민감한 거래를 넣기 전에 호스트를 재평가한다.

`npm run qa:performance`는 clean output에서 root와 Pages artifact를 각각 빌드하고 mobile, desktop 네 profile을
측정한다. `npm run check:public-release-evidence`는 current tiger source integrity와 두 artifact의 BookPack
digest, active `head > meta`의 noindex, 공개 문구, 고정 성능 profile과 위 세 header 예외를 한 release
evidence에 결박한다. product copy, performance evidence, deployment boundary 세 전문 reviewer의 exact
quorum은 같은 stable digest를 승인한다. 실행별 raw 성능과 full `release.json` byte는 별도 run evidence로
다시 대조한다.

앱의 원격 행동 추적이 없더라도 GitHub는 Pages 보안 운영을 위해 방문 IP 주소를 처리할 수 있다. 화면의
보호자 안내에 이 한계와 저장 범위, 삭제 제어를 표시한다. public repository에는 미승인 원고, 연구 자료,
개인정보, 자격증명과 협의 자료를 넣지 않는다.

## 수동 배포 순서

1. `npm run check:release:automated`를 통과한다. 이 명령은 가장 먼저 root와 Pages 합성 성능과 공개 release
   evidence를 격리 실행하고 세 전문 reviewer quorum을 확인한 뒤 `check:full`, Pages build, current byte
   대조와 Pages browser gate를 순서대로 실행한다.
2. 공개 문서와 artifact에서 비밀정보, 사용자 절대 경로, 미승인 자산이 없음을 확인한다.
3. 운영자가 최초 commit과 public push를 별도로 승인한다.
4. repository Settings에서 Pages source를 GitHub Actions로 선택한다.
5. `github-pages` environment를 main branch로 제한하고 required reviewer를 설정한다.
6. 운영자가 `pages-preview` workflow를 수동 실행하고 deploy environment를 승인한다.
7. workflow가 quality, 성능, Pages build, 하위 경로 브라우저 검증 뒤 artifact를 배포한다. 모든 외부
   action은 검토한 full commit SHA로 고정하고 Node와 Python도 exact version으로 고정한다.
8. 배포 URL에서 cache-busting `release.json`의 commit과 artifact digest가 build job output과 같은지 먼저
   확인하고 같은 전체 여정, manifest, service worker와 offline 검사를 실행한다.
9. 운영자가 화면, 보호자 안내, release SHA와 remote smoke 결과를 release receipt로 승인한다.

workflow는 자동 push 배포를 사용하지 않는다. public push와 실제 배포는 서로 다른 승인이다. release와
rollback workflow는 같은 `github-pages` concurrency group과 `queue: max`를 써 대기 중인 승인 실행이 새
dispatch 때문에 사라지지 않게 한다.
remote smoke는 배포 뒤 실행되므로 실패한 artifact가 자동으로 원복되지는 않는다. 실패하면 운영자가 신규
공개를 중단하고 마지막 정상 SHA의 `pages-rollback`을 승인한다. 즉시 자동 rollback이 필수인 운영 제품은
Pages 범위를 벗어난다.

## Rollback과 철회

정상 SHA로 rollback할 때는 `pages-rollback` workflow에 소문자 40자리 SHA를 입력한다. workflow는 해당
SHA가 `origin/main` 이력에 있는지 확인하고 detached checkout에서 전체 gate를 다시 실행한 artifact만
재배포한다. workflow 재실행 가능 기간을 넘긴 release도 검산할 수 있도록 `release.json`에 commit SHA,
profile과 artifact content SHA-256을 기록한다. Pages artifact와 자동 검수 영수증은 30일 보존한다.

PWA는 사이트를 unpublish한 뒤에도 기기 cache에서 열릴 수 있다. 권리 또는 안전 문제로 콘텐츠를 철회할
때는 먼저 service worker cache를 제거하거나 안전한 대체 화면을 제공하는 release를 배포하고, remote
확인 뒤 Pages를 중단한다. 단순 unpublish를 cache 철회로 간주하지 않는다.

## OPERATOR GATE

- 최초 public commit과 push
- GitHub Pages source 설정
- `github-pages` environment main 제한과 required reviewer
- GitHub 호스팅의 IP 처리와 보안 헤더 예외 고지
- 창작 fixture, 문구, OG image와 브랜드 공개
- 최초 workflow 실행과 remote smoke 승인
- custom domain, DNS, 실제 문화자산, 실제 아동 연구는 별도 승인

공식 운영 근거:

- [Vite GitHub Pages 배포](https://vite.dev/guide/static-deploy.html#github-pages)
- [GitHub Pages custom workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [GitHub Pages 한계](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [GitHub Actions concurrency queue](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
