# Review 10: Vercel 배포

- 대상 phase: [10-vercel-deploy.md](../phases/10-vercel-deploy.md)
- 리뷰 대상: 브랜치 `setup/23-vercel-deploy`, 기준 커밋 `682bedf` (phase의 구현 커밋). 이후 코드 변경 `a99d810`(Node 24.x 고정), `604c052`(배포 주소 문서)까지 포함
- 리뷰 계획 커밋: `46f01e6`
- 작성일: 2026-11-23
- 결과: 통과

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff 725e8ce..604c052`에서 `docs/phases`를 뺀 8개 파일, +65 −11.

- `src/app/mocks/enable-mocking.ts`: 켜는 조건에서 `import.meta.env.DEV`를 뺌. `VITE_API_MOCK === 'true'`만 본다.
- `vercel.json` (새 파일): 설치·빌드 명령, 출력 폴더, SPA rewrite(`/api/` 제외), 보안 헤더 4개, `/assets/` 1년 immutable 캐시.
- `package.json`: `engines.node`를 `>=24`에서 `24.x`로 (계획에 없던 변경, phase 변경 기록에 있음).
- `.gitignore`: `.vercel` 추가. `eslint.config.js`: `globalIgnores`에 `.vercel` (계획에 없던 변경).
- 문서: architecture.md 3장(목 켜는 조건, 서비스 워커), 5장(배포 구성, 주소, BE가 생기면 할 일), `.env.example`, README.

Vercel 쪽 (레포 밖): 프로젝트 `diegesis`(def-uk), Git 연결, 환경 변수 5개, Node 24.x, 도메인 `diegesis-fe.vercel.app`.

### 1.2 완료 기준 확인 방법

| #   | 완료 기준                                                                                                      | 확인 방법                                                                                                     | 결과                                                                                                                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`가 통과한다               | 브랜치 끝에서 다섯 명령. PR CI `check`                                                                        | 통과. `46f01e6`에서 다섯 명령 종료 코드 0 (`test:scripts` 97개). PR CI `check`도 통과                                                                                                                                                                                                                                          |
| 2   | `VITE_API_MOCK` 없이 빌드하면 `dist/`에 MSW 코드와 목 데이터가 없다                                            | 변수 없이 `pnpm build` 후 `grep -rl "setupWorker\|운수 좋은 날" dist/assets`. `main`과 번들 해시 비교         | 통과. 변수 없이 빌드한 `dist/assets/index-DJYhO8OM.js`는 `main`과 같은 해시, `grep` 0건                                                                                                                                                                                                                                        |
| 3   | `VITE_API_MOCK=true`로 빌드하면 목이 켜지고, 로컬 `pnpm preview`에서 책 목록과 리더가 보인다                   | 목 chunk가 생기는지. 화면은 배포 주소에서 확인 (로컬 브라우저 확인이 안 되면 그 사실을 적는다)                | 통과. `VITE_API_MOCK=true` 빌드에 목 chunk `browser-BdDOQLh-.js`(gzip 184KB)가 생김. 로컬 `vite preview`는 `curl`로 `/`·`/books/…`·`/mockServiceWorker.js` 200까지 확인. 로컬 브라우저 확인은 Chrome 확장이 응답하지 않아 못 했고, 화면은 배포 주소에서 사용자가 확인 (5)                                                      |
| 4   | PR에 Vercel Preview 배포가 생기고, 빌드 로그의 pnpm이 `12.21.0`, Node가 24.x다                                 | `vercel ls`, PR 상태 검사, `vercel inspect --logs`. Node는 프로젝트 설정과 `engines` 변경 뒤 배포의 로그·설정 | 통과. PR #24에 `Vercel`·`Vercel Preview Comments` 상태가 생기고 성공. 빌드 로그: `ENABLE_EXPERIMENTAL_COREPACK=1`과 `pnpm@12.21.0` 감지, `pnpm v12.21.0`으로 설치, 설치 명령은 `vercel.json`의 `--frozen-lockfile`. Node는 처음 26.x(`engines >=24` 경고)였고 `engines` `24.x`·프로젝트 설정 24.x로 고친 뒤 경고 없음 (발견 1) |
| 5   | 배포 주소에서 `/`에 책 목록, `/books/<id>?chapter=2` 직접 열기·새로 고침에 리더, 없는 경로는 앱의 404 화면이다 | `curl`로 상태 코드와 `content-type`. 화면은 사용자 확인                                                       | 통과. `diegesis-fe.vercel.app`에서 `/`, `/books/unsu-joeun-nal?chapter=2`, `/nope/route` 모두 200 `text/html`(SPA rewrite), `/favicon.svg`·`/mockServiceWorker.js`는 실제 파일. 사용자가 브라우저에서 책 목록과 리더(새로 고침 포함)를 확인함 (2026-11-23)                                                                     |
| 6   | 보안 헤더 4개, `/assets/*`는 `immutable`, `index.html`은 장기 캐시가 아니다                                    | `curl -I`로 `/`, 임의 경로, `/assets/index-*.js`                                                              | 통과. `/`와 임의 경로 응답에 `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`. `/assets/index-jloKDGVZ.js`는 `public, max-age=31536000, immutable`, `index.html`은 `max-age=0, must-revalidate`                                                                                            |
| 7   | `main` 머지 때 production 배포가 자동으로 생기고, production 주소가 README와 architecture.md 5장에 있다        | 주소는 문서 `grep`. 머지 뒤 production 배포는 PR 머지 후 확인 (머지 전에는 확인 못 함으로 적는다)             | 통과. 주소는 README와 architecture.md 5장에 있음 (`diegesis-fe.vercel.app`). PR #24 머지(`633164b`) 직후 Vercel이 `main` 커밋으로 production 배포 `dpl_7q6fvmZC8qLoCY4rDjnoFDFc5UfB`를 자동으로 만들고 Ready, `diegesis-fe.vercel.app`이 이 배포를 가리킴 (머지 후 확인, 2026-11-23)                                           |
| 8   | `ci.yml`, ruleset, 레포 시크릿이 바뀌지 않았다. 새 의존성이 없다                                               | `git diff 725e8ce.. -- .github pnpm-lock.yaml`, `gh secret list`, ruleset `updated_at`, `package.json` diff   | 통과. `.github/`·`pnpm-lock.yaml` diff 없음, `gh secret list` 비어 있음, ruleset `updated_at` 2026-11-19 그대로. `package.json`은 `engines`만 바뀜 (의존성 변경 없음)                                                                                                                                                          |
| 9   | architecture.md 5장에 BE가 생기면 할 일(`/api` rewrite 추가, 데모 모드 끄기)이 적혀 있다                       | 5장 읽기. rewrite 예시가 SPA rewrite 앞에 들어가야 한다는 것, 서비스 워커 정리가 있는지                       | 통과. 5장 "BE가 생기면": `/api/:path*` rewrite를 `rewrites` 맨 앞에, `VITE_API_MOCK` 삭제, 서비스 워커 정리(phase 위험 4)                                                                                                                                                                                                      |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                                            | 확인 방법                                                                     | 결과                                                                                                                                                          |
| ------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FSD    | 아래 레이어가 위 레이어를 import 하지 않는다                         | `src` 변경은 `app/mocks` 한 파일, import 변경 없음                            | 통과. `src` 변경은 `app/mocks/enable-mocking.ts` 한 파일, import 변경 없음, steiger 통과                                                                      |
| FSD    | 같은 레이어 슬라이스끼리 import 하지 않는다                          | 위와 같음, steiger                                                            | 통과 (위와 같음)                                                                                                                                              |
| FSD    | 슬라이스 밖에서는 `index.ts`로만 import 한다                         | 위와 같음                                                                     | 통과 (위와 같음)                                                                                                                                              |
| 디자인 | 색은 의미 토큰만 쓴다 (`#hex`, 팔레트 직접 사용 없음)                | 해당 없음 (화면 코드 변경 없음)                                               | 해당 없음                                                                                                                                                     |
| 디자인 | 라이트/다크 둘 다 깨지지 않는다                                      | 해당 없음 (화면 코드 변경 없음)                                               | 해당 없음                                                                                                                                                     |
| 접근성 | 글자 대비 4.5:1 이상, 키보드로 조작 가능, 아이콘 버튼에 `aria-label` | 해당 없음                                                                     | 해당 없음                                                                                                                                                     |
| 상태   | 로딩, 빈 상태, 에러 상태가 있다                                      | 06의 MSW 시나리오가 배포에서도 같은 코드로 도는지                             | 통과. 화면 코드는 그대로이고, 목 핸들러와 시나리오 전환(`localStorage`)은 개발 때와 같은 코드가 배포 chunk에 들어감                                           |
| 보안   | 새 의존성이 phase 문서에 적혀 있고 확인되었다                        | 1.2의 8                                                                       | 통과 (1.2의 8)                                                                                                                                                |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                                    | diff 검색. `vercel link`가 만든 `.env.local`(OIDC 토큰)이 git에 안 들어가는지 | 통과. `vercel link`가 만든 `.env.local`(OIDC 토큰)은 `.gitignore`의 `.env.*`로 무시되고 추적 파일·이력에 없음. `.env.example`은 계속 추적. diff에 비밀값 없음 |

### 1.4 이번 변경에서 특히 볼 것

- **`.gitignore`와 비밀값**: `vercel link`가 만든 `.env.local`에 `VERCEL_OIDC_TOKEN`이 있다. `git check-ignore`로 무시되는지, 커밋 이력에 없는지. `.env.example`이 계속 추적되는지.
- **데모 모드의 공개 범위**: production은 공개 주소다. 목 데이터가 저작권이 끝난 글인지(06 결정), 목 시나리오 전환(`localStorage`)이 배포에서 누구에게 무엇을 노출하는지.
- **Vercel 설정의 출처**: 빌드 설정은 `vercel.json`이 기준인데, 대시보드에 남은 값(Framework Preset "Other" 등)이 덮어쓰지 않는지. 빌드 로그가 `vercel.json`의 설치 명령을 쓰는지.
- **Preview 보호**: 프로젝트의 `ssoProtection`이 Preview를 막고 production 주소는 공개인지.
- **첫 배포가 production**: PR 브랜치 코드가 머지 전에 production에 나가 있다. 내용이 이 PR과 같은지, 머지하면 바뀌는지.
- **`/api/` 404**: 데모 모드에서는 MSW가 `/api`를 받으므로 404가 사용자에게 보이지 않는지. 목이 켜지기 전(서비스 워커 준비 전)에 나가는 요청이 없는지 (`main.tsx`가 목 준비 뒤에 렌더함).

## 2. 발견 사항

| #   | 심각도 | 위치                     | 내용                                                                                                                                               | 조치                                                                                                            |
| --- | ------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | 중간   | `package.json` `engines` | `>=24`라서 Vercel이 Node 26.x로 빌드했다. CI·`.nvmrc`(24)와 다른 버전으로 배포되고, 새 메이저가 나오면 저절로 올라간다                             | 고침 (`a99d810`). `engines`를 `24.x`로, Vercel 프로젝트 설정도 24.x. 로컬에서 Node 26을 쓰면 pnpm이 경고만 낸다 |
| 2   | 낮음   | Vercel 도메인            | `diegesis.vercel.app`은 다른 사람의 주소였다 (보안 헤더 없음, SPA 경로 404). 그대로 문서에 적었으면 남의 사이트를 가리켰다                         | 고침 (`604c052`). 계획의 대안대로 `diegesis-fe.vercel.app`을 프로젝트 도메인으로 붙이고 문서를 고침             |
| 3   | 낮음   | Vercel 첫 배포           | 새 프로젝트의 첫 배포(`260373e`, PR 브랜치)가 production으로 잡혀 머지 전 코드가 공개 주소에 나가 있다. 내용은 이 PR과 같다                        | 그대로 둠. 머지하면 `main`으로 다시 배포된다 (1.2의 7에서 확인)                                                 |
| 4   | 낮음   | `vercel link`            | `.gitignore` 끝에 `.env*`를 덧붙여 위의 `!.env.example` 예외를 덮어썼다. `.env.example`은 이미 추적 중이라 당장 문제는 없지만 새로 만들면 무시된다 | 고침 (`682bedf`). `.vercel`만 남김                                                                              |
| 5   | 낮음   | `eslint.config.js`       | `vercel build`가 만든 `.vercel/output/`을 ESLint가 검사해 `pnpm lint`가 실패했다                                                                   | 고침 (`682bedf`). `globalIgnores`에 `.vercel`                                                                   |

## 3. 확인 못 한 것

- ~~**`main` 머지 뒤 production 자동 배포 (1.2의 7)**~~: 머지 후 확인함 (1.2의 7). 첫 배포가 production이던 것(발견 3)도 이 배포로 `main` 기준이 됨.
- **로컬 브라우저에서 데모 빌드 확인 (1.2의 3)**: Chrome 확장이 응답하지 않았다. 같은 빌드가 배포 주소에서 사용자 확인을 통과했다.
- **Preview 주소 화면**: Vercel 보호(`ssoProtection`)로 로그인이 필요해 `curl`로는 보지 않았다. 같은 커밋의 production 주소로 확인했다.

## 4. 결론

통과. 공개 주소 `diegesis-fe.vercel.app`에서 데모 모드로 책 목록과 리더가 뜨고, SPA 라우팅·헤더·캐시·pnpm·Node 버전이 계획과 같다. 머지 뒤 production 자동 배포도 확인했다 (`633164b`).
