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
- 기본 주소는 `VITE_API_BASE_URL`, 비어 있으면 같은 출처의 `/api`로 보낸다. 이 값은 언제나 같은 출처의 상대 경로(`/api`)여야 한다. `http://localhost:8080/api` 같은 절대 주소를 넣으면 쿠키가 붙지 않고, BE가 상태를 바꾸는 요청을 출처가 다르다며 `403 ORIGIN_MISMATCH`로 거절한다 ([BE API.md](https://github.com/diegesis-labs/BE/blob/main/docs/API.md) 2.2절, 2.4절).
- 개발 중엔 Vite 개발 서버가 `/api`를 `API_PROXY_TARGET`(기본 `http://localhost:8080`)으로 넘긴다. 그래서 로컬에서는 CORS 설정 없이 BE에 붙을 수 있다.
- 쿠키 기반 인증을 쓸 수 있도록 `credentials: 'include'`로 보낸다. FE와 BE는 배포 환경에서도 한 주소를 함께 쓰므로(5장 "BE가 생기면") CORS 설정은 없다.
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
- 시나리오: 브라우저 콘솔에서 `localStorage.setItem('diegesis-mock', 'empty' | 'unauthorized' | 'not-allowed' | 'error')` 후 새로고침. `unauthorized`는 모든 경로가 401, `not-allowed`는 403 `NOT_ALLOWED`다. 되돌리기는 `localStorage.removeItem('diegesis-mock')`. 없는 책(`/books/nope`)은 404.
- 목 로그인 상태: `localStorage`의 `diegesis-mock-session`이 `out`이면 로그아웃한 상태다(값이 없으면 로그인한 상태). 헤더의 로그아웃이 `out`으로 바꾸고, 로그인 화면의 버튼(`/login/mock`)이 지운다. 실제 로그인 버튼은 화면 이동이라 MSW가 가로채지 못하므로, 목이 켜져 있을 때만 `/login/mock` 라우트가 생긴다.
- `public/mockServiceWorker.js`는 `msw init`이 만드는 파일이라 고치지 않는다. MSW를 올리면 `pnpm exec msw init public`으로 다시 만든다. 배포 결과에는 늘 복사되고, 데모 모드일 때만 등록된다.
- BE에 새 엔드포인트가 생기면 화면을 만들기 전에 목 핸들러부터 추가한다.

### BE와 합의할 것

BE [docs/API.md](https://github.com/diegesis-labs/BE/blob/main/docs/API.md) 1절에서 답을 받았다.

- [x] API 기본 경로와 로컬 포트: 모든 경로에 `/api`, 로컬 `8080`. 지금 설정 그대로.
- [x] 인증 방식: Google 로그인 후 BE가 심는 HttpOnly 쿠키. FE는 `credentials: 'include'`만 하면 된다. 401이면 로그인 화면으로 보낸다 (아래 "로그인").
- [x] 에러 응답 형식: `{ code, message, detail }`. `ApiError`가 읽는다.
- [x] API 스펙 공유: BE가 `/api/openapi.json`을 제공한다. BE 구현 후 타입 자동 생성을 검토한다. 그 전에는 `entities`에 BE 형식(snake_case) 그대로 타입을 쓴다.
- [x] 헬스체크: `GET /api/health` → `{ "status": "ok" }`.
- [ ] BE API.md 5절에 남은 것 (곡 구간 끝 처리, 크로스페이드, 위치 알림 묶기, 설정 화면 위치, 허용 목록 밖 계정 화면): 음악 phase에서 정한다.

### 로그인 (Phase 12)

계약은 [BE API.md](https://github.com/diegesis-labs/BE/blob/main/docs/API.md) 2.2절(관문), 2.4절(출처 확인), 4.2절(로그인과 로그아웃), 4.3절(내 정보)이다. 자세한 설계는 [phase 12](phases/12-login.md).

- 보호된 화면(`/`, `*`, `/books/:bookId`)은 라우터의 loader가 들어가기 전에 `GET /api/me`로 확인한다. 401이면 `/login`, 403 `NOT_ALLOWED`면 `/login?error=NOT_ALLOWED`로 보낸다. 어디로 보낼지는 `app/router/auth-redirect.ts`의 함수 하나가 정한다.
- 화면을 연 뒤에 받은 401·403 `NOT_ALLOWED`는 쿼리 캐시의 `onError`(`app/api/query-client.ts`)가 같은 함수로 보낸다. 쿼리나 요청에 `meta: { authRedirect: false }`를 달면 보내지 않는다.
- 로그인 버튼은 `fetch`가 아니라 브라우저 이동으로 `/api/auth/google/login`에 간다. 로그인 결과는 BE가 `/` 또는 `/login?error=NOT_ALLOWED|LOGIN_FAILED`로 보낸다.
- 로그아웃은 헤더의 버튼이 `POST /api/auth/logout`을 부르고, `/login`으로 옮긴 뒤 쿼리 캐시를 비운다.
- 라우터는 만드는 순간 첫 loader가 돌기 때문에, 목이 켜진 뒤 `App`이 그려질 때 `getRouter()`로 만든다.

### 실제 BE로 로컬 개발하기 (Phase 16)

로컬에 띄운 BE에 붙여 실제 Google 계정으로 로그인해 본다. [phase 16](phases/16-be-login-local.md)에서 2026-11-26에 BE `main`(`31e02ee`)으로 확인했다. BE 쪽 명령의 자세한 설명은 BE 레포 README의 "로컬에서 실행"과 "허용 목록"에 있다.

1. **BE 띄우기**: BE 레포 폴더에서 `docker compose up --build -d --wait`. BE 작업 폴더를 건드리지 않으려면 `main`을 임시 폴더에 풀어서 띄운다.

   ```bash
   mkdir -p /tmp/be-main && git -C ../BE archive origin/main | tar -x -C /tmp/be-main
   cd /tmp/be-main && cp .env.example .env   # GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET을 채운다. FRONTEND_URL은 http://localhost:5173 그대로
   docker compose up --build -d --wait
   curl http://localhost:8080/api/health     # {"status":"ok"}
   ```

   - 8080을 다른 프로그램이 쓰고 있으면 `.env`에 `API_PORT=8081`을 더하고 아래의 `8080`을 그 포트로 바꾼다.
   - `.env`는 커밋하지 않는다. Google 값은 GCP 콘솔의 OAuth 클라이언트에서 받는다. 이 클라이언트의 돌아올 주소에 `http://localhost:5173/api/auth/google/callback`이 있어야 한다. 동의 화면이 "테스트" 상태면 로그인할 계정을 테스트 사용자로도 넣는다.

2. **허용 목록에 계정 넣기**: 허용 목록에 없는 계정은 로그인해도 `/login?error=NOT_ALLOWED`로 돌아온다.

   ```bash
   docker compose exec db psql -U diegesis -d diegesis -c "INSERT INTO allowed_emails (email, role) VALUES (lower('me@example.com'), 'user') ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;"
   ```

3. **FE 띄우기** (둘 중 하나. 둘 다 5173을 쓴다. 다른 포트면 Google 돌아올 주소와 BE `FRONTEND_URL`이 맞지 않는다)
   - 개발 서버: `VITE_API_MOCK=false pnpm dev --strictPort`. BE 포트가 8080이 아니면 `API_PROXY_TARGET=http://localhost:8081`도 붙인다. 셸에서 준 값이 `.env.local`보다 우선한다.
   - 컨테이너(운영과 같은 nginx):

     ```bash
     docker build --build-arg VITE_API_MOCK=false -t diegesis-fe:local .
     docker run --rm -p 5173:8080 -e BE_ORIGIN=http://host.docker.internal:8080 diegesis-fe:local
     ```

4. **확인**: 평소 프로필이 아니라 Chrome 게스트 창에서 `http://localhost:5173`을 연다. 쿠키 없이 시작하고 Google 계정 로그인이 남지 않는다.
   - 로그인 → `/`. 책 목록 자리는 "찾을 수 없습니다"가 정상이다. BE에 `/api/books`가 아직 없어 404를 받는다 (BE Epic 2에서 생긴다).
   - 로그아웃 → `POST /api/auth/logout` 204, `/login`.
   - Google 화면에서 뒤로 가기를 누르면 BE를 거치지 않고 `/login`으로 돌아온다. 실패 안내가 없는 게 정상이다. `LOGIN_FAILED` 안내는 Google이 취소·오류를 BE로 돌려줄 때 나온다 (`/api/auth/google/callback?error=access_denied&state=x`를 직접 열어 볼 수 있다).
   - 끝나면 `docker compose down -v`로 BE와 데이터를 지운다.

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

> 관련 phase: [15 GCP Cloud Run 배포](phases/15-gcp-deploy.md) (이전: [10 Vercel 배포](phases/10-vercel-deploy.md))

GCP Cloud Run에 nginx 컨테이너로 올린다. 도메인은 사지 않고 Cloud Run 기본 주소를 운영 주소로 쓴다.

운영 주소: <https://diegesis-fe-872555598631.asia-northeast3.run.app>

- HTTPS 인증서는 구글이 발급하고 갱신한다. DNS 설정이 없다.
- 같은 서비스에 예전 형식의 주소(`https://diegesis-fe-fcfmer236q-du.a.run.app`)도 열려 있다. 문서, OAuth, 테스트 참가자에게는 위의 주소 하나만 쓴다. 두 주소는 출처가 달라서 로그인 쿠키를 나눠 쓰지 않는다.
- 주소에 프로젝트 번호가 들어간다. 프로젝트나 서비스를 다시 만들면 주소가 바뀐다 ([phase 15](phases/15-gcp-deploy.md) 위험 1).

### 구성

| 항목             | 값                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| GCP 프로젝트     | `diegesis-front` (번호 `872555598631`). BE와 다른 프로젝트                                                                    |
| 리전             | `asia-northeast3` (서울)                                                                                                      |
| Cloud Run 서비스 | `diegesis-fe`. 공개, CPU 1, 메모리 256Mi, 동시 요청 80, 인스턴스 0~2                                                          |
| 이미지 저장소    | Artifact Registry `diegesis`. 이미지 `asia-northeast3-docker.pkg.dev/diegesis-front/diegesis/fe:<커밋 SHA>`, 최근 10개만 남김 |
| 서비스 계정      | `fe-run`(실행, 권한 없음), `fe-build`(빌드·배포, 최소 권한. 아래 명령 참고)                                                   |
| GitHub 연결      | Cloud Build 저장소 연결 `github-diegesis` → `diegesis-labs/FE` (Cloud Build GitHub 앱, `FE`만 허용)                           |
| 트리거           | `fe-main`(`main` push → production), `fe-pr`(`main` 대상 PR → `pr-<번호>` 미리보기)                                           |
| 예산 알림        | 월 1만 원, 50%·90%·100%에서 결제 계정 관리자에게 메일 (비용을 막지는 않는다)                                                  |

### 컨테이너

- `Dockerfile`: 1단계에서 Node 24와 Corepack pnpm으로 `pnpm install --frozen-lockfile`, `pnpm build`. 2단계 nginx 이미지에는 `dist/`와 nginx 설정만 담는다. 기반 이미지는 digest로 고정한다.
- `deploy/nginx/`: Vercel에서 쓰던 `vercel.json`(phase 15 후속 PR에서 지움)이 하던 일을 그대로 옮겼다.
  - SPA: 실제 파일이 없는 경로는 `index.html`. 없는 경로는 앱의 404 화면이 보여 준다.
  - `/assets/`: 없는 파일은 404. 있는 파일만 1년 `immutable` 캐시.
  - 그 밖(`index.html`, `mockServiceWorker.js` 등)은 `no-cache`.
  - 헤더: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`. CSP는 아직 없다.
  - 접근 로그에 쿼리 문자열을 남기지 않는다 (Google 로그인 결과의 `code`). 다만 Cloud Run 자체 요청 로그에는 남는다 ([phase 15](phases/15-gcp-deploy.md) 위험 7).
  - `/api/`: 환경 변수 `BE_ORIGIN`이 비어 있으면 404 `text/plain`. 있으면 그 출처로 넘긴다 (아래 "BE가 생기면").
- 로컬에서 돌려 보기:

  ```bash
  docker build --build-arg VITE_API_MOCK=true -t diegesis-fe .
  docker run --rm -p 8080:8080 diegesis-fe                                   # 데모 모드
  ```

  로컬 BE로 `/api`를 넘겨 Google 로그인까지 보려면 3장 "실제 BE로 로컬 개발하기"의 컨테이너 경로를 따른다 (포트 5173, `VITE_API_MOCK=false`).

### 배포 흐름

`cloudbuild.yaml`이 빌드 → 이미지 올리기 → Cloud Run 배포를 한다. 트리거는 `fe-build` 서비스 계정으로 돈다.

- **`main`에 머지**: `fe-main`이 머지 커밋을 빌드해서 트래픽 없이 리비전을 만들고, production 트래픽 100%를 그 리비전으로 옮긴다. 리비전 이름은 `diegesis-fe-<커밋 7자리>-<빌드 ID 6자리>`다.
- **PR**: `fe-pr`이 같은 빌드를 트래픽 없이 배포하고 `pr-<번호>` 태그를 붙인다. 주소: `https://pr-<번호>---diegesis-fe-872555598631.asia-northeast3.run.app`. 조직 밖 사람의 PR은 `/gcbrun` 댓글 승인 뒤에만 돈다.
  - PR 미리보기는 공개 주소다 (Vercel Preview와 달리 로그인 보호가 없다).
  - 트래픽은 "가장 최근 리비전"이 아니라 이름으로 옮긴다. `main` 배포 도중에 PR 빌드가 리비전을 만들어도 production이 PR 코드로 바뀌지 않는다.
  - PR 빌드는 PR 브랜치의 `cloudbuild.yaml`로 돌고 `fe-build` 권한을 쓴다. 그래서 PR 코드가 production 서비스의 설정이나 트래픽을 바꿀 수 있다. 조직 밖 사람의 PR에 `/gcbrun`을 달기 전에 `cloudbuild.yaml`과 `Dockerfile`의 변경을 먼저 읽는다.
- **빌드 시점 값**: `VITE_API_MOCK`은 트리거의 대체 변수 `_VITE_API_MOCK`(지금 `true`, 데모 모드)이다.
- **실행 시점 값**: `BE_ORIGIN`은 Cloud Run 서비스의 환경 변수다. 배포가 이 값을 지우지 않는다.
- **CI와의 관계**: GitHub Actions에는 배포 비밀값이 없다. Cloud Build의 결과는 PR에 `fe-pr (diegesis-front)`로 보이지만 필수 검사가 아니다 (필수는 `check` 하나).
- **손으로 배포**(트리거가 안 될 때): 작업 트리가 깨끗한 상태에서

  ```bash
  gcloud builds submit --config=cloudbuild.yaml --region=asia-northeast3 \
    --service-account=projects/diegesis-front/serviceAccounts/fe-build@diegesis-front.iam.gserviceaccount.com \
    --gcs-source-staging-dir=gs://diegesis-front-build-src/source \
    --substitutions=_TAG=$(git rev-parse HEAD)
  ```

  소스는 서울 버킷 `gs://diegesis-front-build-src`(7일 뒤 자동 삭제)에 올라간다.

### 되돌리는 법

이전 리비전으로 트래픽을 옮긴다. 이미지를 다시 빌드하지 않는다.

```bash
gcloud run revisions list --service=diegesis-fe --region=asia-northeast3
gcloud run services update-traffic diegesis-fe --region=asia-northeast3 --to-revisions=<리비전 이름>=100
```

다음 `main` 머지 때 `fe-main`이 그 빌드의 리비전으로 트래픽을 옮긴다. 그 전에 원인을 고친다.

### PR 미리보기 정리

PR이 닫혀도 `pr-<번호>` 태그와 리비전이 남는다 (비용은 없다). 쌓이면 지운다.

```bash
gcloud run services update-traffic diegesis-fe --region=asia-northeast3 --remove-tags=pr-<번호>
```

### GCP 리소스를 만든 명령 (2026-11-25)

다시 만들 때 참고한다. `P=diegesis-front`, `R=asia-northeast3`, `B=fe-build@$P.iam.gserviceaccount.com`.

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com billingbudgets.googleapis.com
gcloud billing budgets create --billing-account=<결제 계정> --display-name="diegesis-front 월 예산" \
  --budget-amount=10000KRW --filter-projects=projects/$P \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0

# 이미지 저장소와 정리 정책 (최근 10개 Keep, 나머지 Delete)
gcloud artifacts repositories create diegesis --repository-format=docker --location=$R
gcloud artifacts repositories set-cleanup-policies diegesis --location=$R --policy=<정책 JSON> --no-dry-run

# 서비스 계정과 권한. fe-run에는 권한을 주지 않는다.
gcloud iam service-accounts create fe-run
gcloud iam service-accounts create fe-build
gcloud artifacts repositories add-iam-policy-binding diegesis --location=$R --member=serviceAccount:$B --role=roles/artifactregistry.writer
gcloud projects add-iam-policy-binding $P --member=serviceAccount:$B --role=roles/run.developer
gcloud projects add-iam-policy-binding $P --member=serviceAccount:$B --role=roles/logging.logWriter
gcloud iam service-accounts add-iam-policy-binding fe-run@$P.iam.gserviceaccount.com --member=serviceAccount:$B --role=roles/iam.serviceAccountUser

# 손으로 배포할 때 쓰는 소스 버킷 (7일 뒤 삭제)
gcloud storage buckets create gs://$P-build-src --location=$R --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update gs://$P-build-src --lifecycle-file=<age 7 Delete 규칙 JSON>
gcloud storage buckets add-iam-policy-binding gs://$P-build-src --member=serviceAccount:$B --role=roles/storage.objectViewer

# 첫 배포(위 "손으로 배포") 뒤, 소유자가 서비스를 한 번 공개한다. fe-build는 IAM을 바꿀 수 없다.
gcloud run services add-iam-policy-binding diegesis-fe --region=$R --member=allUsers --role=roles/run.invoker

# GitHub 연결: 콘솔에서 호스트 연결 github-diegesis를 만들고 Cloud Build GitHub 앱을 diegesis-labs에 설치(FE만)
gcloud builds repositories create FE --remote-uri=https://github.com/diegesis-labs/FE.git --connection=github-diegesis --region=$R
REPO=projects/$P/locations/$R/connections/github-diegesis/repositories/FE
SA=projects/$P/serviceAccounts/$B
gcloud builds triggers create github --name=fe-main --region=$R --repository=$REPO --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml --service-account=$SA --substitutions=_VITE_API_MOCK=true
gcloud builds triggers create github --name=fe-pr --region=$R --repository=$REPO --pull-request-pattern='^main$' \
  --comment-control=COMMENTS_ENABLED_FOR_EXTERNAL_CONTRIBUTORS_ONLY \
  --build-config=cloudbuild.yaml --service-account=$SA --substitutions=_VITE_API_MOCK=true
```

### 데모 모드 (BE가 생기기 전)

BE가 아직 없어서 배포된 화면은 MSW 목(3장 "목 API")으로 동작한다. 데이터는 저작권이 끝난 단편 3편이다. `/api/`는 404다.

### BE가 생기면

BE INFRA.md의 구성 A(FE와 BE가 한 주소를 함께 씀)로 붙인다. nginx가 `/api/`를 BE로 넘기므로 쿠키 로그인이 같은 출처에서 동작하고 CORS 설정이 필요 없다.

1. BE 주소를 Cloud Run 환경 변수로 넣는다. 이미지를 다시 만들지 않는다.

   ```bash
   gcloud run services update diegesis-fe --region=asia-northeast3 --update-env-vars=BE_ORIGIN=https://<BE 주소>
   ```

2. BE 쪽 설정: `FRONTEND_URL`은 위 운영 주소, Google OAuth의 돌아올 주소는 `<운영 주소>/api/auth/google/callback`.
3. 데모 모드를 끈다: `fe-main` 트리거의 `_VITE_API_MOCK`을 `false`로 바꾸고 다시 배포한다. PR 미리보기(`fe-pr`)를 데모 모드로 둘지는 그때 정한다.

   ```bash
   gcloud builds triggers update github fe-main --region=asia-northeast3 --update-substitutions=_VITE_API_MOCK=false
   ```

4. 이미 방문한 브라우저에 남은 MSW 서비스 워커를 정리한다 (등록 해제 코드 또는 `public/mockServiceWorker.js` 삭제. [phase 10](phases/10-vercel-deploy.md) 위험 4).

### Vercel (쓰지 않음)

2026-11-26에 Vercel 프로젝트 `diegesis`의 Git 연결을 끊고 `vercel.json`을 지웠다 ([phase 15](phases/15-gcp-deploy.md) 6단계). push와 PR이 Vercel 배포를 만들지 않는다. 마지막 배포(<https://diegesis-fe.vercel.app>)는 아직 남아 있지만 더 바뀌지 않으므로 테스트 참가자에게 보내지 않는다. 프로젝트 삭제는 나중에 사용자가 정한다. `.gitignore`, `.dockerignore`, `eslint.config.js`의 `.vercel` 항목은 그때까지 둔다.

## 6. CI와 브랜치 규칙

> 관련 phase: [02 CI와 브랜치 보호](phases/02-ci-branch-protection.md), [05 작업 절차 CI 검사](phases/05-process-check.md), [17 리뷰 뒤 머지 검사](phases/17-review-after-change-check.md)

### CI (GitHub Actions)

`.github/workflows/ci.yml`이 `main`을 향한 PR과 `main` 푸시 때 실행된다. PR은 열림, 새 커밋, 다시 열림, **설명 수정**, draft 해제 때 실행된다. job 이름은 `check`이고, 순서대로 실행한다.

1. 체크아웃 (`fetch-depth: 0`, 작업 절차 검사가 PR의 커밋을 하나씩 본다)
2. `pnpm install --frozen-lockfile` (lockfile 버전만 설치, `pnpm-workspace.yaml` 보안 설정 적용)
3. 작업 절차 검사 (PR일 때만): `node scripts/check-process.mjs --event "$GITHUB_EVENT_PATH"`. 커밋 메시지, 브랜치 이름, 계획 문서와 코드 분리, phase 승인 순서, PR 설명 링크, 리뷰 문서가 마지막 변경 뒤에 바뀌었는지 ([Phase 05](phases/05-process-check.md), [Phase 17](phases/17-review-after-change-check.md), [guardrails.md](guardrails.md))
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
