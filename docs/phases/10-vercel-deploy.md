# Phase 10: Vercel 배포

- 상태: 완료
- 선행 phase: 없음 (05~09 모두 `main`에 머지됨)
- 관련 이슈: [#23 Vercel 배포](https://github.com/diegesis-labs/FE/issues/23)
- 브랜치: `setup/23-vercel-deploy`
- 계획 커밋: `725e8ce`
- 구현 커밋: `682bedf` (이후 `a99d810` Node 24.x 고정, `604c052` 배포 주소)
- 리뷰 문서: [10-vercel-deploy-review.md](../reviews/10-vercel-deploy-review.md)

## 목표

FE를 Vercel에 올려 공개 주소에서 책 목록과 리더를 볼 수 있게 한다. `main`에 머지되면 production이 자동으로 바뀌고, PR마다 미리보기(Preview) 주소가 생긴다. BE가 아직 없으므로 배포된 화면은 MSW 목 데이터로 동작한다 (데모 모드).

## 배경

- [architecture.md](../architecture.md) 5장은 "정적 호스팅에 올리면 된다, 배포처는 아직 정하지 않았다"에서 멈춰 있다. 06·07로 책 목록과 리더가 생겨서 밖에서 보여 줄 화면이 있다.
- BE는 아직 서버 코드가 없고 배포처도 정하지 않았다 ([BE INFRA.md](https://github.com/diegesis-labs/BE/blob/main/docs/INFRA.md)). INFRA.md 2절은 로그인 쿠키 때문에 FE와 BE가 "같은 도메인 아래"에 있어야 한다고 하고, 그 방법으로 **구성 A**(FE 호스팅이 `/api` 요청을 BE로 넘겨줌)를 든다. Vercel은 `vercel.json`의 rewrite로 외부 주소에 요청을 넘길 수 있어서 구성 A가 된다. 이 phase는 그 자리를 비워 두고, BE 주소가 생기면 rewrite 한 줄을 더한다.
- 지금 MSW 목은 `import.meta.env.DEV`일 때만 켜져서 배포 빌드에는 들어가지 않는다 (architecture.md 3장). 그대로 배포하면 모든 화면이 에러 상태다.
- 결정 (2026-11-23, 사용자): 배포 데이터는 MSW 데모 모드, 배포 방식은 Vercel Git 연동, 계정은 개인 Hobby 팀 `def-uk`.

## 범위

### 하는 것

1. **데모 모드**: `VITE_API_MOCK=true`이면 배포 빌드에서도 MSW를 켠다. 값이 없으면 지금처럼 목 코드가 번들에 들어가지 않는다.
2. **`vercel.json`**: 빌드 설정, SPA rewrite(모든 경로 → `index.html`, `/api/` 제외), 보안 헤더, 해시 붙은 정적 파일의 장기 캐시.
3. **Vercel 프로젝트**: `def-uk` 팀에 프로젝트를 만들고 GitHub `diegesis-labs/FE`와 연결한다. production 브랜치는 `main`. 환경 변수 `VITE_API_MOCK=true`(Production, Preview), `ENABLE_EXPERIMENTAL_COREPACK=1`(pnpm 버전 고정).
4. **문서**: architecture.md 3장(목 켜는 조건), 5장(배포 구성, BE가 생기면 할 일), `.env.example`, README의 배포 주소.

### 하지 않는 것

- **`/api`를 BE로 넘기는 rewrite.** BE 주소가 없다. BE 배포가 정해지면 그 phase에서 `vercel.json`에 한 줄 더한다 (5장에 방법을 적어 둔다).
- **직접 등록한 도메인.** 기본 주소(`*.vercel.app`)만 쓴다. 구성 A는 도메인 없이도 된다 (INFRA.md 2.1).
- **CSP(Content-Security-Policy) 헤더.** `index.html`의 테마 인라인 스크립트, jsDelivr·Google Fonts, MSW 서비스 워커를 모두 허용하는 정책을 따로 설계해야 한다. 이번에는 기본 보안 헤더만 넣고, CSP는 위험과 열린 질문 3에 남긴다.
- **GitHub Actions에서 배포.** Vercel Git 연동을 쓰므로 CI에 비밀값(`VERCEL_TOKEN`)을 넣지 않는다. `ci.yml`과 ruleset은 바꾸지 않는다. Vercel의 커밋 상태는 필수 검사로 만들지 않는다.
- **화면 변경.** 데모 데이터라는 표시(배너 등)는 넣지 않는다 (위험과 열린 질문 2).
- 분석 도구(Vercel Analytics, Speed Insights). 새 의존성이 필요하다.

## 설계

### FSD 배치

| 레이어 | 슬라이스 | 세그먼트 | 만들거나 바꿀 것                                                |
| ------ | -------- | -------- | --------------------------------------------------------------- |
| app    | -        | mocks    | `enable-mocking.ts`: 켜는 조건에서 `import.meta.env.DEV`를 뺀다 |
| (설정) | -        | -        | `vercel.json` 새 파일, `.env.example` 주석                      |
| (문서) | -        | -        | `docs/architecture.md` 3장·5장, `README.md`                     |

### 데모 모드

```ts
// src/app/mocks/enable-mocking.ts
export async function enableMocking() {
  if (import.meta.env.VITE_API_MOCK !== 'true') return
  const { worker } = await import('./browser')
  await worker.start({ onUnhandledFrame: 'bypass' })
}
```

- Vite는 빌드 때 `import.meta.env.VITE_API_MOCK`을 문자열로 바꿔 넣는다. 값이 없으면 조건이 항상 참인 `return`이 되어 아래 동적 import가 번들에서 빠진다. 이것을 빌드 결과에서 확인한다 (완료 기준 2).
- 값이 `true`이면 목 핸들러와 `fixtures/books.json`(약 88KB, 저작권이 끝난 단편 3편)이 따로 떨어진 chunk로 들어가고, 첫 렌더 전에 받는다.
- 로컬 개발(`pnpm dev`)의 동작은 같다. 바뀌는 것은 `VITE_API_MOCK=true`로 **빌드**하면 목이 켜진다는 점뿐이다.
- `public/mockServiceWorker.js`는 이미 배포 결과에 복사되고 있다. 이제 데모 모드에서는 실제로 등록된다. 서비스 워커는 `/` 범위에 등록되고, 목 핸들러가 없는 요청(글꼴 등)은 그대로 네트워크로 보낸다.

### `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

- **SPA rewrite**: Vercel은 실제 파일(`/assets/…`, `/favicon.svg`, `/mockServiceWorker.js`)을 먼저 찾고, 없을 때만 rewrite를 적용한다. 그래서 `/books/bombom`을 새로 고쳐도 `index.html`이 오고, 없는 경로는 앱의 `NotFoundPage`가 보여 준다.
- **`/api/` 제외**: 나중에 `{ "source": "/api/:path*", "destination": "https://<BE 주소>/api/:path*" }`를 SPA rewrite **앞에** 더한다. 지금 `/api/…` 요청은 데모 모드에서는 MSW가 받고, 데모 모드가 아니면 Vercel이 404를 준다 (`index.html`을 JSON 대신 받는 일이 없다).
- **캐시**: `/assets/`의 파일 이름에는 내용 해시가 붙어 있어 1년 캐시해도 된다. `index.html`과 `mockServiceWorker.js`는 Vercel 기본값(매번 확인)을 둔다.
- **설치**: `--frozen-lockfile`로 CI와 같게 lockfile 버전만 설치한다. `pnpm-workspace.yaml`의 `minimumReleaseAge`·`allowBuilds`도 그대로 적용된다.
- **pnpm 버전**: `package.json`의 `packageManager`가 `pnpm@12.21.0`이다. Vercel이 이 버전을 쓰게 하려면 환경 변수 `ENABLE_EXPERIMENTAL_COREPACK=1`이 필요하다. 빌드 로그에서 버전을 확인한다.
- **Node**: `engines.node`가 `>=24`라서 Vercel이 24.x를 쓴다 (`.nvmrc`·CI와 같음).

### Vercel 프로젝트와 Git 연동

| 설정              | 값                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------- |
| 팀                | `def-uk` (Hobby)                                                                         |
| 프로젝트 이름     | `diegesis` (주소 `diegesis.vercel.app`. 이미 쓰이고 있으면 `diegesis-fe`)                |
| Git 저장소        | `diegesis-labs/FE` (Vercel GitHub 앱을 이 레포에만 허용)                                 |
| Production 브랜치 | `main`                                                                                   |
| Preview           | PR마다. Vercel 기본 보호(Vercel 로그인 필요)를 그대로 둔다                               |
| 환경 변수         | `VITE_API_MOCK=true` (Production, Preview), `ENABLE_EXPERIMENTAL_COREPACK=1` (모든 환경) |
| 설정 위치         | 빌드 명령·출력 폴더는 `vercel.json`이 기준. 대시보드에서 따로 고치지 않는다              |

- **사용자가 직접 할 것**: `diegesis-labs` 조직에 Vercel GitHub 앱을 설치하는 것은 조직 소유자의 브라우저 승인이 필요하다. 나머지(프로젝트 생성, 연결, 환경 변수)는 Vercel CLI로 한다 (`vercel project add`, `vercel git connect`, `vercel env add`).
- **ruleset과의 관계**: Vercel은 PR에 커밋 상태와 봇 댓글을 단다. 봇 댓글은 리뷰 대화가 아니라서 "리뷰 대화 해결 필수"에 걸리지 않는다. 필수 검사는 지금처럼 `check` 하나다.

### 화면과 상태

화면 코드는 바꾸지 않는다. 데모 모드의 로딩·빈 목록·에러·401 화면은 06에서 만든 MSW 시나리오(`localStorage`의 `diegesis-mock`)로 배포 주소에서도 볼 수 있다.

### 새 의존성

없음. `msw`는 이미 devDependencies에 있고, 빌드 때 번들에 들어갈 뿐이다.

## 작업 단계

- [x] 1. `enable-mocking.ts`의 조건을 바꾸고 주석을 고친다. `pnpm build`(변수 없음) 결과에 `msw`·`setupWorker`·목 본문이 없는지, `VITE_API_MOCK=true pnpm build && pnpm preview`에서 책 목록·리더가 목으로 동작하는지 확인한다.
- [x] 2. `vercel.json`을 만든다. `vercel build`로 로컬에서 같은 설정의 빌드가 되는지 본다.
- [x] 3. 사용자에게 Vercel GitHub 앱 설치를 부탁한다. 설치되면 CLI로 프로젝트를 만들고 레포를 연결하고 환경 변수를 넣는다.
- [x] 4. 이 phase의 PR에서 Preview 배포가 만들어지고, 빌드 로그의 pnpm·Node 버전이 맞는지 본다. Preview 주소에서 `/`, `/books/<id>` 직접 열기·새로 고침, 없는 경로, 헤더(`curl -I`)를 확인한다.
- [x] 5. architecture.md 3장·5장, `.env.example`, README를 고친다.
- [x] 6. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`를 통과시킨다.

## 완료 기준

- [x] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`가 통과한다.
- [x] `VITE_API_MOCK` 없이 빌드하면 `dist/`에 MSW 코드와 목 데이터가 없다 (`grep -rl "setupWorker\|운수 좋은 날" dist/assets` 0건).
- [x] `VITE_API_MOCK=true`로 빌드하면 목이 켜지고, 로컬 `pnpm preview`에서 책 목록과 리더가 보인다.
- [x] 이 phase의 PR에 Vercel Preview 배포가 생기고, 빌드 로그의 pnpm이 `12.21.0`, Node가 24.x다.
- [x] 배포 주소에서 `/`에 책 목록이 보이고, `/books/<id>?chapter=2`를 직접 열거나 새로 고쳐도 리더가 뜬다. 없는 경로는 앱의 404 화면이다.
- [x] 배포 주소의 응답에 보안 헤더 4개가 있고, `/assets/*`는 `immutable` 캐시, `index.html`은 장기 캐시가 아니다.
- [x] `main`에 머지되면 production 배포가 자동으로 생기고, production 주소가 README와 architecture.md 5장에 적혀 있다.
- [x] `ci.yml`, ruleset, 레포 시크릿이 바뀌지 않았다. 새 의존성이 없다.
- [x] architecture.md 5장에 BE가 생기면 할 일(`/api` rewrite 추가, 데모 모드 끄기)이 적혀 있다.

## 위험과 열린 질문

1. **pnpm 12와 Vercel**: Vercel이 lockfile만 보고 다른 pnpm 버전을 고르면 `--frozen-lockfile`이 실패할 수 있다. `ENABLE_EXPERIMENTAL_COREPACK=1`로 `packageManager` 버전을 쓰게 하고, 빌드 로그로 확인한다. 안 되면 `installCommand`에서 `corepack pnpm`을 직접 부른다.
2. **데모 데이터라는 표시가 없다**: 공개 주소의 책과 본문이 목 데이터라는 것이 화면에 드러나지 않는다. 지금 데이터는 실제 책(저작권이 끝난 단편)이라 오해의 소지는 작다. 필요하면 다음 phase에서 `app` 레이어에 작은 배지를 둔다.
3. **CSP 없음**: 보안 헤더 중 가장 효과가 큰 CSP를 이번에는 넣지 않는다. 인라인 테마 스크립트(해시로 허용), 외부 글꼴 두 곳, 서비스 워커를 고려한 정책을 따로 만들고 Report-Only로 먼저 확인하는 편이 안전하다.
4. **데모 모드를 끈 뒤의 서비스 워커**: 한 번 방문한 브라우저에는 MSW 서비스 워커가 남는다. 앱이 `worker.start()`를 부르지 않으면 워커는 요청을 그대로 통과시키지만, BE를 붙이는 phase에서 등록 해제 코드나 `mockServiceWorker.js` 삭제를 함께 정한다.
5. **Hobby 팀 제약**: 커밋 작성자가 Vercel 팀 구성원이 아니면 배포가 막힐 수 있다. 지금 FE 커밋은 사용자 혼자라 괜찮다. Dependabot PR의 Preview는 막힐 수 있고, 그래도 CI `check`에는 영향이 없다. 팀원이 늘면 팀 계정이나 GitHub Actions 배포를 다시 검토한다.
6. **Preview 보호**: Vercel 기본 보호로 Preview 주소는 Vercel에 로그인한 팀 구성원만 볼 수 있다. 다른 사람에게 Preview를 보여 줘야 하면 보호를 풀지, 공유 링크를 쓸지 정한다. Production 주소는 공개다.

## 변경 기록

- 2026-11-23: 작성
- 2026-11-23: 승인. 이슈 #23 생성, 브랜치 `setup/23-vercel-deploy`
- 2026-11-23: 구현 (`682bedf`, 단계 1·2·5·6). 계획과 다른 점: (1) `vercel link`가 `.gitignore`에 `.env*`를 덧붙여 `!.env.example` 예외를 덮어써서, `.vercel`만 남기고 지움. (2) `vercel build`가 로컬에 만드는 `.vercel/output/`을 ESLint가 검사해 실패해서 `eslint.config.js`의 `globalIgnores`에 `.vercel`을 더함. (3) 데모 모드 목 chunk `browser-*.js`는 474KB(gzip 184KB). 변수 없는 빌드는 이전과 같은 해시(`index-DJYhO8OM.js`)로 목이 빠짐. Vercel 프로젝트 `diegesis`(def-uk)를 만들고 환경 변수를 넣고 `vercel build` 성공. 단계 3의 Git 연결은 조직에 Vercel GitHub 앱이 없어 대기. 로컬 브라우저 확인은 Chrome 확장이 응답하지 않아 Preview에서 함
- 2026-11-23: 단계 3. Vercel GitHub 앱이 설치돼 `vercel git connect`로 `diegesis-labs/FE`를 연결함. 배포 방식은 Git 연동 유지 (GitHub Actions 배포와 비교 후 사용자 결정: CI에 비밀값을 두지 않는다). PR #24
- 2026-11-23: 단계 4. 계획과 다른 점: (1) `diegesis.vercel.app`은 다른 사람의 주소라서(보안 헤더 없음, SPA 경로 404) 계획대로 `diegesis-fe.vercel.app`을 쓴다. 프로젝트 이름을 바꾸지 않고 프로젝트 도메인으로 붙임. (2) Vercel이 `engines.node >=24`를 보고 26.x로 빌드해서 `engines`를 `24.x`로 고치고 프로젝트 설정도 24.x로 바꿈(`a99d810`). (3) 새 프로젝트의 첫 배포(`260373e`, PR 브랜치)가 production으로 잡힘. 내용은 이 PR과 같고, `main` 머지 때 production이 다시 만들어진다. 확인: pnpm 12.21.0(Corepack), SPA 경로·없는 경로 200 `text/html`, `/api/books` 404 `text/plain`, 보안 헤더 4개, `/assets/` immutable·`index.html` max-age=0, 목 chunk 배포됨. 화면 렌더링은 Chrome 확장이 응답하지 않아 사용자 확인 대기
- 2026-11-23: 리뷰 통과 ([리뷰 문서](../reviews/10-vercel-deploy-review.md)). 사용자가 `diegesis-fe.vercel.app`에서 책 목록과 리더를 확인. 남은 일: 머지 뒤 production 자동 배포 확인
- 2026-11-23: 머지 후 확인. PR #24 머지(`633164b`)로 `main` production 배포가 자동으로 생기고 `diegesis-fe.vercel.app`이 가리킴. 완료 기준 모두 확인
