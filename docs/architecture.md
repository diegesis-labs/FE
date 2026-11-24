# FE 아키텍처

> 관련 이슈: [#2 FE 아키텍처 설계 및 기술스택 선정](https://github.com/diegesis-labs/FE/issues/2)

## 1. 기술스택

| 영역           | 선택                                                    | 버전(세팅 시점) |
| -------------- | ------------------------------------------------------- | --------------- |
| 빌드/개발 서버 | Vite                                                    | 8               |
| UI             | React + TypeScript                                      | 19 / 6          |
| 라우팅         | React Router (Data mode)                                | 8               |
| 서버 상태      | TanStack Query                                          | 5               |
| 스타일         | Tailwind CSS + shadcn/ui (Radix)                        | 4               |
| HTTP           | 브라우저 기본 `fetch` 래퍼 (`src/shared/api/client.ts`) | –               |
| 린트/포맷      | ESLint + Prettier                                       | 10 / 3          |
| 패키지 매니저  | pnpm (Corepack으로 버전 고정)                           | 12              |
| Node           | 24 LTS                                                  | –               |

### 왜 이렇게 골랐나

- **SPA(Vite + React)로 시작한다.** 6주 MVP이고, BE는 별도 서버이며, 지금은 검색 노출(SEO)이 중요하지 않다. SSR 프레임워크(Next.js 등)는 서버 운영·배포·데이터 패칭 위치를 함께 고민해야 해서 MVP 속도를 늦춘다.
- **나중에 SEO가 필요해지면 React Router framework mode로 옮긴다.** 지금 쓰는 Data mode(`createBrowserRouter`)와 같은 라이브러리라서 라우트·컴포넌트를 대부분 그대로 두고 SSR이나 정적 생성(prerender)을 라우트 단위로 켤 수 있다. 이를 위해 페이지는 라우트 단위 파일로 나눠 둔다.
- **axios 대신 `fetch`를 쓴다.** 2026-03 axios npm 계정 탈취로 악성 버전(1.14.1, 0.30.4)이 배포된 사고가 있었다. 우리 용도엔 `fetch` 래퍼와 TanStack Query로 충분하므로 의존성 자체를 줄인다.
- **shadcn/ui는 Radix 기반**으로 세팅했다. 컴포넌트 코드가 레포에 복사되는 방식이라 디자인(#3, #4)에 맞춰 직접 고치기 쉽고, Radix는 예시와 레퍼런스가 가장 많다.

## 2. 폴더 구조

[Feature-Sliced Design](https://feature-sliced.design)을 따른다. 레이어, 슬라이스, Public API 규칙은 [CLAUDE.md](../CLAUDE.md) "아키텍처 (FSD)"에 있고, `pnpm lint`가 steiger(`steiger.config.ts`)로 검사한다.

```
src/
├── main.tsx                  # Vite 진입점. @/app만 import (목을 켜고 렌더)
├── app/                      # 앱 초기화
│   ├── App.tsx               # Provider 조립, 전역 스타일 import
│   ├── index.ts
│   ├── api/query-client.ts   # TanStack Query 기본 설정
│   ├── layouts/RootLayout.tsx
│   ├── mocks/                # 개발용 MSW 목 API (3장 "목 API")
│   ├── router/router.tsx     # 모든 라우트 정의
│   └── styles/index.css      # 전역 스타일, 디자인 토큰
├── pages/                    # 라우트 하나 = 슬라이스 하나
│   ├── book-list/            # / 랜딩, 책 목록
│   ├── book-reader/          # /books/:bookId 이북 리더 (헤더 없이 화면 전체, 3장 아래 "리더")
│   ├── not-found/
│   └── route-error/          # 라우터 ErrorBoundary
├── widgets/
│   └── header/               # 워드마크 + 테마 버튼
├── features/
│   └── theme-toggle/         # 사용자 동작 "테마 바꾸기"
├── entities/
│   └── book/                 # 책 타입, 쿼리(목록·정보·챕터), 책 카드
└── shared/
    ├── api/                  # apiClient(fetch 래퍼), ApiError, describeError
    ├── lib/
    │   ├── dom/              # 브라우저 구독 훅: 요소 크기, 미디어 쿼리, 글꼴 로딩, 창 keydown
    │   ├── theme/            # ThemeProvider, useTheme
    │   └── utils.ts          # cn()
    └── ui/                   # shadcn/ui 컴포넌트 (pnpm dlx shadcn add <name>)
```

규칙 요약 (자세한 것은 CLAUDE.md):

- 위 레이어만 아래 레이어를 import 한다. 같은 레이어의 슬라이스끼리는 import 하지 않는다.
- 슬라이스 밖에서는 `index.ts`로만 import 한다 (`@/features/theme-toggle`). `shared/ui`만 파일별로 import 한다 (`@/shared/ui/button`).
- `pages`는 얇게 유지한다. 한 페이지에서만 쓰는 코드는 그 페이지 슬라이스 안에 두고, 두 곳 이상에서 쓰이면 아래 레이어로 내린다.

## 3. BE API 연동

- BE의 엔드포인트와 요청·응답 형식은 BE 레포의 [docs/API.md](https://github.com/diegesis-labs/BE/blob/main/docs/API.md)가 기준이다. BE가 구현되면 `/api/openapi.json`이 세부 형식의 기준이 된다.
- 모든 요청은 `apiClient`(`src/shared/api/client.ts`)를 거친다. JSON 직렬화, 쿼리스트링, 에러(`ApiError`, `status`/`body`/`code` 포함)를 한곳에서 처리한다. BE 에러 본문 `{ code, message, detail }`의 `message`가 `ApiError.message`가 된다.
- 화면에 에러를 보여 줄 때는 `describeError()`(문구)나 `shared/ui/error-state.tsx`(안내 + 다시 시도)를 쓴다. 4xx는 다시 요청해도 같으므로 쿼리가 재시도하지 않는다 (`app/api/query-client.ts`).
- 기본 주소는 `VITE_API_BASE_URL`, 비어 있으면 같은 도메인의 `/api`로 보낸다.
- 개발 중엔 Vite 개발 서버가 `/api`를 `API_PROXY_TARGET`(기본 `http://localhost:8080`)으로 넘긴다. 그래서 로컬에서는 CORS 설정 없이 BE에 붙을 수 있다.
- 쿠키 기반 인증을 쓸 수 있도록 `credentials: 'include'`로 보낸다. 배포 환경에서 FE와 BE 도메인이 다르면 BE에서 CORS(`Access-Control-Allow-Credentials`, 허용 origin)를 맞춰야 한다.
- 서버 데이터는 TanStack Query로 가져온다. 기능별로 아래처럼 쿼리 훅을 만든다.

```ts
// src/entities/book/api/book-queries.ts
export const bookKeys = {
  all: ['books'] as const,
  detail: (bookId: string) => ['books', bookId] as const,
}

export const bookDetailQuery = (bookId: string) =>
  queryOptions({
    queryKey: bookKeys.detail(bookId),
    queryFn: () => apiClient.get<BookDetail>(`/books/${encodeURIComponent(bookId)}`),
  })

// 쓰는 곳: const book = useQuery(bookDetailQuery(bookId))
```

### 목 API (MSW)

BE가 구현되기 전에는 [MSW](https://mswjs.io)로 BE API 문서 형식 그대로 응답하는 목을 쓴다. 네트워크 단에서 가로채므로 화면 코드는 실제 BE와 똑같이 `apiClient`를 쓴다.

- 켜기: `.env.local`에 `VITE_API_MOCK=true`를 넣고 `pnpm dev`. 빌드도 같은 값으로 정한다: `VITE_API_MOCK=true pnpm build`이면 배포 결과에서도 목이 켜지고(데모 모드, 5장), 값이 없으면 목 코드가 번들에 들어가지 않는다. 목 코드와 데이터는 따로 떨어진 파일(`browser-*.js`, gzip 약 184KB)로 들어가 목이 켜질 때만 받는다.
- 위치: `src/app/mocks/` (`handlers.ts`, `fixtures/books.json`, `enable-mocking.ts`). 목은 엔티티 타입을 쓰므로 모든 레이어를 import 할 수 있는 `app`에 둔다.
- 목 데이터: 저작권 보호 기간이 끝난 한국 단편 3편을 위키문헌에서 가져와 3장씩 나눴다. 출처는 `handlers.ts` 머리 주석에 있다.
- 시나리오: 브라우저 콘솔에서 `localStorage.setItem('diegesis-mock', 'empty' | 'unauthorized' | 'error')` 후 새로고침. 되돌리기는 `localStorage.removeItem('diegesis-mock')`. 없는 책(`/books/nope`)은 404.
- `public/mockServiceWorker.js`는 `msw init`이 만드는 파일이라 고치지 않는다. MSW를 올리면 `pnpm exec msw init public`으로 다시 만든다. 배포 결과에는 늘 복사되고, 데모 모드일 때만 등록된다.
- BE에 새 엔드포인트가 생기면 화면을 만들기 전에 목 핸들러부터 추가한다.

### BE와 합의할 것

BE [docs/API.md](https://github.com/diegesis-labs/BE/blob/main/docs/API.md) 1절에서 답을 받았다.

- [x] API 기본 경로와 로컬 포트: 모든 경로에 `/api`, 로컬 `8080`. 지금 설정 그대로.
- [x] 인증 방식: Google 로그인 후 BE가 심는 HttpOnly 쿠키. FE는 `credentials: 'include'`만 하면 된다. 401이면 로그인 화면으로 보낸다 (로그인 화면은 아직 없음).
- [x] 에러 응답 형식: `{ code, message, detail }`. `ApiError`가 읽는다.
- [x] API 스펙 공유: BE가 `/api/openapi.json`을 제공한다. BE 구현 후 타입 자동 생성을 검토한다. 그 전에는 `entities`에 BE 형식(snake_case) 그대로 타입을 쓴다.
- [x] 헬스체크: `GET /api/health` → `{ "status": "ok" }`.
- [ ] BE API.md 5절에 남은 것 (곡 구간 끝 처리, 크로스페이드, 위치 알림 묶기, 설정 화면 위치, 허용 목록 밖 계정 화면): 음악 phase에서 정한다.

### 리더 (Phase 07)

`/books/:bookId`는 일반 레이아웃(`RootLayout`) 밖의 라우트다. 자세한 설계는 [phase 07](phases/07-book-reader.md).

- 챕터 글을 CSS 다단으로 쪽(단) 너비만큼씩 이어 놓고, 보이는 영역이 한 쪽 또는 두 쪽(가로 1024px 이상)만 잘라 보여 준다. 쪽을 넘기면 띠가 `translateX`로 미끄러진다.
- 위치는 URL `?chapter=N&s=M`(보이는 첫 문장 번호)이 기준이다. 화면 크기가 바뀌어도 같은 문장이 보이는 쪽으로 돌아온다.
- 화면에 보이는 문장 범위는 무대 요소의 `data-chapter`·`data-first-sentence`·`data-last-sentence`에 있다. 음악 phase에서 위치 알림(`POST /books/{id}/position`)에 쓴다.
- 제품 레이어에서 Effect를 쓰지 않으려고, 쪽 재기는 ref 콜백에서, 크기·미디어 쿼리·글꼴은 `shared/lib/dom`의 구독 훅으로, 슬라이드 끝은 `transitionend`로 처리한다.

## 4. 의존성 보안 (공급망 공격 대비)

`pnpm-workspace.yaml`에 설정되어 있다.

- `minimumReleaseAge: 4320`: 배포된 지 3일이 안 된 버전은 설치하지 않는다. 악성 버전은 대부분 몇 시간 안에 발견되어 내려가기 때문이다. 급한 보안 패치가 필요하면 `minimumReleaseAgeExclude`에 해당 패키지를 잠깐 추가한다.
- `allowBuilds: {}`: 의존성의 설치 스크립트(postinstall 등)는 기본으로 실행하지 않는다. axios 사고도 설치 스크립트로 악성코드를 실행했다. 빌드 스크립트가 꼭 필요한 패키지만 검토 후 허용한다.
- `pnpm-lock.yaml`은 항상 커밋하고, CI에서는 `pnpm install --frozen-lockfile`로 설치한다.
- 새 패키지를 추가할 땐 이름(타이포스쿼팅), 관리 주체, 최근 소유권 변경 여부를 확인한다.

## 5. 배포

> 관련 phase: [10 Vercel 배포](phases/10-vercel-deploy.md)

Vercel에 정적 파일(`dist/`)로 올린다. 주소: <https://diegesis-fe.vercel.app>

프로젝트 이름은 `diegesis`인데 `diegesis.vercel.app`은 다른 사람이 쓰고 있어서, production 주소로 `diegesis-fe.vercel.app`을 프로젝트 도메인에 따로 붙였다. 자동으로 붙은 `diegesis-indol.vercel.app`도 같은 배포를 가리킨다. Node 버전은 `engines`(`24.x`)와 프로젝트 설정 모두 24.x다.

- **연결**: Vercel 프로젝트 `diegesis`(개인 Hobby 팀 `def-uk`)가 이 레포와 Git으로 연결돼 있다. `main`에 머지되면 production, PR마다 Preview 주소가 생긴다. Preview는 Vercel 기본 보호로 팀 구성원만 볼 수 있다.
- **설정 파일**: `vercel.json`이 기준이다 (설치·빌드 명령, 출력 폴더, rewrite, 헤더). 대시보드에서 같은 값을 따로 고치지 않는다.
  - SPA rewrite: 실제 파일이 없는 경로는 모두 `index.html`로 보낸다 (`/api/` 제외). 없는 경로는 앱의 404 화면이 보여 준다.
  - 헤더: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`. `/assets/`는 파일 이름에 해시가 있어 1년 `immutable` 캐시. CSP는 아직 없다.
  - 설치는 CI와 같이 `pnpm install --frozen-lockfile`. `pnpm-workspace.yaml` 보안 설정도 그대로 적용된다.
- **환경 변수** (Vercel 프로젝트 설정): `VITE_API_MOCK=true`(Production, Preview, 데모 모드), `ENABLE_EXPERIMENTAL_COREPACK=1`(`packageManager`의 pnpm 버전을 쓰게 함).
- **CI와의 관계**: 배포는 Vercel이 한다. GitHub Actions에는 배포 비밀값이 없고, Vercel의 커밋 상태는 필수 검사가 아니다 (필수는 `check` 하나).

### 데모 모드 (BE가 생기기 전)

BE가 아직 없어서 배포된 화면은 MSW 목(3장 "목 API")으로 동작한다. 데이터는 저작권이 끝난 단편 3편이다.

### BE가 생기면

BE INFRA.md의 구성 A(FE와 BE가 한 주소를 함께 씀)로 붙인다. 쿠키 로그인이 같은 사이트에서 동작하고 CORS 설정이 필요 없다.

1. `vercel.json`의 `rewrites` **맨 앞에** `{ "source": "/api/:path*", "destination": "https://<BE 주소>/api/:path*" }`를 더한다.
2. Vercel 환경 변수에서 `VITE_API_MOCK`을 지운다.
3. 이미 방문한 브라우저에 남은 MSW 서비스 워커를 정리한다 (등록 해제 코드 또는 `public/mockServiceWorker.js` 삭제. [phase 10](phases/10-vercel-deploy.md) 위험 4).

## 6. CI와 브랜치 규칙

> 관련 phase: [02 CI와 브랜치 보호](phases/02-ci-branch-protection.md), [05 작업 절차 CI 검사](phases/05-process-check.md)

### CI (GitHub Actions)

`.github/workflows/ci.yml`이 `main`을 향한 PR과 `main` 푸시 때 실행된다. PR은 열림, 새 커밋, 다시 열림, **설명 수정**, draft 해제 때 실행된다. job 이름은 `check`이고, 순서대로 실행한다.

1. 체크아웃 (`fetch-depth: 0`, 작업 절차 검사가 PR의 커밋을 하나씩 본다)
2. `pnpm install --frozen-lockfile` (lockfile 버전만 설치, `pnpm-workspace.yaml` 보안 설정 적용)
3. 작업 절차 검사 (PR일 때만): `node scripts/check-process.mjs --event "$GITHUB_EVENT_PATH"`. 커밋 메시지, 브랜치 이름, 계획 문서와 코드 분리, phase 승인 순서, PR 설명 링크 ([Phase 05](phases/05-process-check.md), [guardrails.md](guardrails.md))
4. `pnpm format:check`
5. `pnpm lint` (ESLint + steiger FSD 검사 + 가드레일 자체 검사, [guardrails.md](guardrails.md))
6. `pnpm typecheck`
7. `pnpm build`
8. `pnpm test:scripts` (작업 절차 검사와 Claude Code 훅의 테스트)

보안 설정:

- 워크플로 토큰 권한은 `contents: read`뿐이다. 비밀값은 쓰지 않고, `pull_request_target`도 쓰지 않는다.
- PR 제목·설명·브랜치 이름은 외부 입력이라 `${{ github.event.pull_request.* }}`를 `run:`에 넣지 않는다. 작업 절차 검사는 이벤트 JSON 파일을 직접 읽고, `git`은 셸 없이 인자 배열로 부른다.
- 액션은 커밋 SHA로 고정한다. 레포 설정(`sha_pinning_required`)이 태그로 지정한 액션의 실행을 거부한다.
- Dependabot이 매주 GitHub Actions 업데이트를 PR로 올린다. 배포된 지 3일 지난 버전만 제안한다. npm 패키지는 자동 업데이트하지 않는다.

### `main` 보호 (ruleset)

설정 파일: `.github/rulesets/main.json`

| 규칙                  | 값                                        |
| --------------------- | ----------------------------------------- |
| PR 필수               | 켬 (직접 푸시 금지)                       |
| 필수 승인 수          | 0 (쓰기 권한자가 1명이라서. 늘면 1로)     |
| 리뷰 대화 해결 필수   | 켬                                        |
| 필수 상태 검사        | `check` (GitHub Actions에서 온 것만 인정) |
| 최신 `main` 반영 필수 | 끔                                        |
| 머지 방식             | merge commit만                            |
| force push, 삭제      | 금지                                      |
| 우회                  | 없음 (관리자 포함)                        |

ruleset을 바꿀 때는 파일을 먼저 고친 뒤 적용한다.

```bash
# 처음 만들 때
gh api -X POST repos/diegesis-labs/FE/rulesets --input .github/rulesets/main.json
# 바꿀 때 (ID는 gh api repos/diegesis-labs/FE/rulesets 로 확인)
gh api -X PUT repos/diegesis-labs/FE/rulesets/<ID> --input .github/rulesets/main.json
```

### 긴급할 때 (ruleset 우회)

ruleset에는 우회 권한이 없어서 관리자도 CI를 건너뛸 수 없다. 정말 급하게 `main`을 고쳐야 하면(예: CI 자체가 고장 나서 어떤 PR도 머지할 수 없을 때):

1. 사용자(레포 관리자)의 승인을 받는다.
2. ruleset을 잠시 끈다: `.github/rulesets/main.json`의 `enforcement`를 `disabled`로 바꿔 `PUT`으로 적용한다.
3. 필요한 작업을 한 뒤 바로 `active`로 되돌려 적용한다.
4. 언제, 왜, 무엇을 했는지 해당 phase 문서나 이슈에 기록한다.

### 레포 설정

- 머지 방식: merge commit만 허용 (squash, rebase 끔)
- 머지 후 브랜치 자동 삭제: 켬
- 새 PR 작성 화면에는 `.github/pull_request_template.md`가 자동으로 들어간다.
