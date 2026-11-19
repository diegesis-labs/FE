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

```
src/
├── app/                # 앱 전체 설정: 진입 컴포넌트, 라우터, QueryClient, 공통 레이아웃
│   ├── App.tsx
│   ├── router.tsx      # 모든 라우트 정의
│   ├── RootLayout.tsx
│   └── query-client.ts
├── pages/              # 라우트 하나 = 페이지 컴포넌트 하나. 화면 조립만 하고 로직은 features로
├── features/           # 기능 단위 모듈 (예: features/auth, features/story)
│   └── <feature>/
│       ├── api.ts      # 이 기능의 API 함수 + TanStack Query 훅
│       ├── components/ # 이 기능에서만 쓰는 컴포넌트
│       └── types.ts
├── components/
│   └── ui/             # shadcn/ui 컴포넌트 (pnpm dlx shadcn add <name>)
├── shared/             # 기능에 상관없이 공통으로 쓰는 코드
│   └── api/client.ts   # fetch 래퍼, ApiError
└── lib/utils.ts        # cn() 등 유틸
```

규칙:

- import는 `@/` 별칭을 쓴다 (`@/features/auth/api`).
- `features/A`가 `features/B`의 내부 파일을 직접 가져다 쓰지 않는다. 여러 기능이 같이 쓰게 되면 `shared/`로 올린다.
- `pages/`는 얇게 유지한다. 데이터 호출과 상태는 `features/`의 훅으로 뺀다.

## 3. BE API 연동

- 모든 요청은 `apiClient`(`src/shared/api/client.ts`)를 거친다. JSON 직렬화, 쿼리스트링, 에러(`ApiError`, `status`/`body` 포함)를 한곳에서 처리한다.
- 기본 주소는 `VITE_API_BASE_URL`, 비어 있으면 같은 도메인의 `/api`로 보낸다.
- 개발 중엔 Vite 개발 서버가 `/api`를 `API_PROXY_TARGET`(기본 `http://localhost:8080`)으로 넘긴다. 그래서 로컬에서는 CORS 설정 없이 BE에 붙을 수 있다.
- 쿠키 기반 인증을 쓸 수 있도록 `credentials: 'include'`로 보낸다. 배포 환경에서 FE와 BE 도메인이 다르면 BE에서 CORS(`Access-Control-Allow-Credentials`, 허용 origin)를 맞춰야 한다.
- 서버 데이터는 TanStack Query로 가져온다. 기능별로 아래처럼 쿼리 훅을 만든다.

```ts
// src/features/story/api.ts
export const storyKeys = {
  all: ['stories'] as const,
  detail: (id: string) => ['stories', id] as const,
}

export function useStory(id: string) {
  return useQuery({
    queryKey: storyKeys.detail(id),
    queryFn: () => apiClient.get<Story>(`/stories/${id}`),
  })
}
```

### BE와 합의할 것 (TODO)

- [ ] API 기본 경로(`/api` 접두사 여부)와 로컬 포트
- [ ] 인증 방식: 쿠키 세션 vs 토큰(Authorization 헤더)
- [ ] 에러 응답 형식 (예: `{ code, message }`)
- [ ] API 스펙 공유 방식 (OpenAPI 문서가 있으면 타입 자동 생성 검토)
- [ ] 헬스체크 엔드포인트 (홈 화면의 "BE 연결 확인" 버튼이 `/health`를 호출함)

## 4. 의존성 보안 (공급망 공격 대비)

`pnpm-workspace.yaml`에 설정되어 있다.

- `minimumReleaseAge: 4320`: 배포된 지 3일이 안 된 버전은 설치하지 않는다. 악성 버전은 대부분 몇 시간 안에 발견되어 내려가기 때문이다. 급한 보안 패치가 필요하면 `minimumReleaseAgeExclude`에 해당 패키지를 잠깐 추가한다.
- `allowBuilds: {}`: 의존성의 설치 스크립트(postinstall 등)는 기본으로 실행하지 않는다. axios 사고도 설치 스크립트로 악성코드를 실행했다. 빌드 스크립트가 꼭 필요한 패키지만 검토 후 허용한다.
- `pnpm-lock.yaml`은 항상 커밋하고, CI에서는 `pnpm install --frozen-lockfile`로 설치한다.
- 새 패키지를 추가할 땐 이름(타이포스쿼팅), 관리 주체, 최근 소유권 변경 여부를 확인한다.

## 5. 배포

정적 파일(`dist/`)만 나오므로 Vercel, Netlify, Cloudflare Pages 같은 정적 호스팅에 올리면 된다. SPA라서 모든 경로를 `index.html`로 돌려주는 rewrite 설정이 필요하다. 배포처는 아직 정하지 않았다.
