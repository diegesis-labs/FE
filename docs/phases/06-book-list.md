# Phase 06: 책 목록 랜딩과 책 데이터 연결

- 상태: 승인됨
- 선행 phase: 없음 ([05 작업 절차 CI 검사](05-process-check.md)와 독립. `main`에서 분기)
- 관련 이슈: [#13 책 목록 랜딩과 책 데이터 연결](https://github.com/diegesis-labs/FE/issues/13)
- 브랜치: `feat/13-book-list` (`main`의 `c7b7231`에서 만듦)
- 계획 커밋: (승인 후 이 문서만 커밋·푸시한 해시)
- 구현 커밋: (구현 완료 후 커밋 해시)
- 리뷰 문서: [06-book-list-review.md](../reviews/06-book-list-review.md) (리뷰 단계에서 작성)

## 목표

첫 화면(`/`)에 읽을 수 있는 책이 나열되고, 책을 누르면 `/books/:bookId`로 들어가 그 책의 본문을 볼 수 있다. BE가 아직 구현되지 않았으므로 BE API 문서와 같은 형식의 목(mock) API로 개발하고, BE가 나오면 목만 끄면 그대로 붙는다.

## 배경

- 서비스의 핵심은 "책을 읽는 화면에서 장면에 맞는 음악이 흐르는 경험"이다 (#3). 그 전에 책을 고르고 읽는 기본 흐름이 있어야 한다.
- BE는 [docs/API.md](https://github.com/diegesis-labs/BE/blob/main/docs/API.md)에 엔드포인트 초안을 정해 두었지만 구현은 아직 없다 (`app/books`가 빈 폴더). FE가 BE를 기다리지 않도록 API 문서 형식 그대로 목을 만든다.
- 와이어프레임(#3)은 아직 없다. 화면은 [디자인 시스템](../design-system.md) 규칙만으로 만들고, 와이어프레임이 나오면 다듬는다.
- 리더(페이지 나누기·넘기기)는 어려운 부분이라 [Phase 07](07-book-reader.md)로 나눈다. 이 phase의 `/books/:bookId`는 본문을 위에서 아래로 그대로 보여 주는 임시 화면이다.

## 범위

### 하는 것

- `entities/book`: BE API 4.5, 4.6절의 응답 타입, 쿼리 키, 쿼리 옵션(목록, 책 정보, 챕터 본문), 책 카드 UI
- MSW로 목 API: `GET /api/books`, `GET /api/books/{book_id}`, `GET /api/books/{book_id}/chapters/{chapter_no}`
- 목 데이터: 저작권이 끝난 한국 단편 2~3권, 권마다 챕터 2개 이상 (페이지 나누기를 시험할 만큼 길게)
- 랜딩 페이지(`/`): 책 목록. 로딩, 빈 목록, 에러 상태
- 책 페이지(`/books/:bookId`): 책 제목·저자, 챕터 목록, 현재 챕터 본문을 문단 단위로 표시, 이전/다음 챕터 이동. 챕터는 `?chapter=N`으로 URL에 둔다. 첫 진입은 `last_position`의 챕터, 없으면 1장
- `ApiError`에서 BE 에러 형식(`{ code, message, detail }`)을 읽어 화면에 쓸 수 있게 한다
- 에러 처리: 401은 "로그인이 필요합니다" 안내(로그인 화면은 아직 없음), 404는 "책을 찾을 수 없습니다", 그 밖은 다시 시도 버튼
- 지금의 임시 홈(`pages/home`, BE 연결 확인 버튼)을 책 목록으로 바꾼다

### 하지 않는 것

- 페이지 나누기, 페이지 넘기기, 목차 서랍, 보이는 문장 범위 계산 → Phase 07
- 위치 알림(`POST /position`), 음악 재생, 반응 기록 → 이후 phase
- 로그인·로그아웃 화면, 401 때 로그인 화면으로 보내기 → 이후 phase (BE 로그인 구현 후)
- 책 검색, 정렬, 필터, 표지 이미지 (API에 표지 필드가 없음)
- OpenAPI 타입 자동 생성 (BE가 `/api/openapi.json`을 제공한 뒤 검토)
- 테스트 프레임워크 추가

## 설계

### FSD 배치

| 레이어   | 슬라이스      | 세그먼트       | 만들거나 바꿀 것                                                               |
| -------- | ------------- | -------------- | ------------------------------------------------------------------------------ |
| app      | –             | `mocks/`       | MSW 핸들러, 목 데이터, `enableMocking()`                                       |
| app      | –             | `router/`      | `/` → 책 목록, `/books/:bookId` → 책 페이지                                    |
| app      | –             | `layouts/`     | `ScrollRestoration` 추가: 챕터를 바꾸면 맨 위로                                |
| app      | –             | `api/`         | 쿼리 재시도: 4xx는 다시 시도하지 않음                                          |
| pages    | `book-list`   | ui             | 랜딩. 책 카드 목록과 상태 표시                                                 |
| pages    | `book-reader` | ui, lib        | 책 정보, 챕터 목록, 챕터 본문, 이전/다음 챕터. Phase 07에서 페이지 리더로 바뀜 |
| entities | `book`        | model, api, ui | 타입, `bookKeys`, `booksQuery`/`bookQuery`/`chapterQuery`, `BookCard`          |
| shared   | –             | `api/`         | `ApiError`에 BE 에러 본문(`code`, `message`) 읽기 추가, `describeError()`      |
| shared   | –             | `ui/`          | `error-state.tsx`: 에러 안내 + 다시 시도 (두 페이지에서 씀)                    |
| pages    | `home`        | –              | 삭제 (책 목록이 랜딩이 됨). `health` 쿼리도 함께 삭제                          |

- 목은 엔티티 타입을 써야 해서 `shared`에 둘 수 없다. 모든 레이어를 import 할 수 있는 `app/mocks/`에 둔다.
- 책 카드는 책 목록에서만 쓰지만 "책"이라는 명사를 표시하는 UI이고 Phase 07 이후 이어 읽기 등에서도 쓸 예정이라 `entities/book/ui`에 둔다.
- 응답 타입은 BE 형식(`snake_case`) 그대로 둔다. 나중에 OpenAPI로 타입을 생성하면 그대로 바꿔 끼울 수 있다.

### API

[BE docs/API.md](https://github.com/diegesis-labs/BE/blob/main/docs/API.md) 4.5, 4.6절을 따른다.

| 요청                                             | 쿼리 키                        | 쓰는 곳        |
| ------------------------------------------------ | ------------------------------ | -------------- |
| `GET /api/books`                                 | `['books']`                    | 책 목록        |
| `GET /api/books/{book_id}`                       | `['books', id]`                | 책 페이지      |
| `GET /api/books/{book_id}/chapters/{chapter_no}` | `['books', id, 'chapters', n]` | 책 페이지 본문 |

- 챕터 본문은 바뀌지 않으므로 `staleTime: Infinity`. 다음 챕터는 미리 받아 둔다(`prefetchQuery`, 이벤트 핸들러에서).
- 목 켜기: `.env.local`에 `VITE_API_MOCK=true`. `src/main.tsx`가 `import.meta.env.DEV && VITE_API_MOCK === 'true'`일 때만 `@/app`의 `enableMocking()`을 기다린 뒤 렌더한다. 목 코드는 동적 import라 배포 번들에 들어가지 않는다.
- 처리하지 못한 요청은 실제 네트워크로 보낸다(`onUnhandledFrame: 'bypass'`. MSW 3에서 이름이 바뀜). 목에는 400ms 정도 지연을 넣어 로딩 상태를 볼 수 있게 한다.
- 목에서 에러 상태를 볼 수 있도록 없는 `book_id`는 404(`NOT_FOUND`)를 돌려준다.
- 빈 목록·401·500은 `localStorage`의 `diegesis-mock` 값(`empty`, `unauthorized`, `error`)으로 바꿔 본다. 핸들러 코드를 고치지 않고 리뷰·시연할 수 있게 한다.
- 4xx 응답은 다시 요청해도 같으므로 TanStack Query가 재시도하지 않게 한다. 재시도 1번(기본 1초 대기) 때문에 401·404 안내가 늦게 떴다.

### 화면과 상태

**랜딩 (`/`)**

- 머리글(eyebrow, `text-brand-ink`) + 제목(`font-display`) + 한 줄 소개.
- 책 카드 격자: 모바일 2열, `md` 3열, `lg` 4열. 카드는 디자인 시스템 4.3을 따른다. 표지 이미지가 없으므로 `bg-muted` 면(세로 비율 `aspect-[3/4]`)에 제목을 `font-display`로 얹은 글자 표지를 쓰고, 아래에 제목(Medium)과 저자(`muted-foreground`), 챕터 수를 둔다.
- 카드 전체가 `<Link>` 하나다. 키보드 포커스 링이 보인다.
- 로딩: 같은 격자에 `bg-muted` 스켈레톤 카드 8개. 빈 목록: "아직 읽을 수 있는 책이 없습니다." 에러: 위 에러 처리 규칙 + 다시 시도 버튼.

**책 페이지 (`/books/:bookId`)** — Phase 07 전까지의 임시 화면

- 위: "← 책 목록" 링크, 책 제목, 저자.
- 챕터 선택: 챕터 목록 링크(현재 챕터 표시, `aria-current`).
- 본문: `max-w-165`, 16px, 줄 간격 1.8(Phase 07 리더와 같게), 문단마다 `<p>`. 문장은 `<span data-sentence-idx>`로 감싸 Phase 07에서 그대로 쓴다.
- 아래: 이전/다음 챕터 버튼. 첫·마지막 챕터에서는 숨긴다.
- 로딩·에러는 책 정보와 본문을 따로 보여 준다 (책 정보는 떴는데 본문만 실패할 수 있음).
- 잘못된 `?chapter` 값(숫자가 아님, 범위 밖)은 1장으로 바꾼다.

### 새 의존성

| 패키지 | 버전 (고정) | 종류 | 이유                                                                                                          |
| ------ | ----------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| `msw`  | `3.0.7`     | dev  | BE 없이 API 문서 형식 그대로 개발. 네트워크 단에서 가로채므로 화면 코드는 실제 BE와 똑같이 `apiClient`를 쓴다 |

확인 결과 (2026-11-22):

- 이름: `msw` (Mock Service Worker). 저장소 `github.com/mswjs/msw`, 관리자 kettanaito 1명 (원 작성자). 타이포스쿼팅 아님.
- 최신 3.0.7, 2026-11-18 배포 → `minimumReleaseAge`(3일) 통과.
- `postinstall` 스크립트 없음 → `allowBuilds: {}`를 바꾸지 않아도 된다.
- 하위 의존성 12개(`@mswjs/interceptors`, `yargs`, `tough-cookie` 등). dev 의존성이라 배포 번들에는 들어가지 않는다.
- `public/mockServiceWorker.js`는 `pnpm exec msw init public --save`로 만들어 커밋한다 (`package.json`에 `msw.workerDirectory`가 생김). 생성 파일이라 고치지 않고, ESLint `globalIgnores`와 `.prettierignore`에 넣는다.
- 설치 때 나오는 peer 경고(`tsconfck`가 TypeScript 5를 원함)는 기존 `steiger` 쪽 경고이고 `msw`와는 상관없다.

## 작업 단계

- [ ] 1. 이슈 생성, `main`에서 브랜치 생성
- [ ] 2. `ApiError`에 BE 에러 본문 읽기(`code`, `message`) 추가
- [ ] 3. `entities/book`: 타입, 쿼리 키·옵션, `BookCard`
- [ ] 4. `msw` 설치, 워커 파일 생성, `app/mocks`(핸들러·목 데이터·`enableMocking`), `main.tsx` 연결, `.env.example`에 `VITE_API_MOCK` 추가
- [ ] 5. `pages/book-list` 랜딩, 라우터 연결, `pages/home` 삭제
- [ ] 6. `pages/book-reader` 임시 책 페이지, 라우터 연결
- [ ] 7. 문서 갱신: `architecture.md` 2장 폴더 구조, 3장 목 사용법과 BE 합의 항목(BE 답 반영)
- [ ] 8. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` 통과, 브라우저로 확인

## 완료 기준

- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`가 통과한다.
- [ ] `VITE_API_MOCK=true pnpm dev`로 `/`를 열면 목 책들이 카드로 나열된다 (모바일 2열, 데스크톱 4열).
- [ ] 책 카드를 누르면 `/books/:bookId`로 가서 책 제목과 1장 본문이 보인다. 다음 챕터 버튼과 챕터 링크로 다른 챕터로 가고 URL의 `?chapter`가 바뀐다.
- [ ] 로딩 스켈레톤, 빈 목록, 404, 401, 그 밖의 에러 화면을 각각 볼 수 있다 (목 핸들러를 바꿔 확인).
- [ ] `VITE_API_MOCK`이 없으면 목이 켜지지 않고 실제 `/api`로 요청한다.
- [ ] `pnpm build` 결과의 JS에 목 핸들러·목 데이터가 없다 (`dist/assets`에서 목 책 제목 검색).
- [ ] 키보드만으로 책을 골라 들어가고 챕터를 바꿀 수 있다. 포커스 링이 보인다.
- [ ] 라이트·다크 모드 모두 의미 토큰만 쓴다 (lint 통과로 확인).

## 위험과 열린 질문

- **목 데이터의 본문**: 저작권이 끝난 작품(예: 김유정 「봄·봄」, 현진건 「운수 좋은 날」, 이상 「날개」. 작가 사망 후 70년 경과)을 위키문헌에서 가져와 문단·문장으로 나눈다. AI 레포 #3(테스트용 소설 챕터 수집)이 쓰는 작품과 맞추는 게 좋은지 AI 담당에게 확인.
- **문장 나누기**: BE는 문장 단위로 나눠서 준다. 목에서는 마침표·물음표·느낌표 기준으로 단순하게 나눈다. 실제 BE의 나누기 결과와 다를 수 있다.
- **`dist/mockServiceWorker.js`**: `public/`에 있어서 배포 결과에도 복사된다. 등록하는 코드가 번들에 없으면 동작하지 않지만, 빼고 싶다면 빌드 때 지우는 설정을 추가한다. (기본: 두고 문서에 적는다)
- **로그인 전제**: BE의 책 API는 로그인한 사용자만 쓸 수 있다. 실제 BE에 붙이면 로그인 phase 전까지는 401 안내만 보인다.
- 랜딩 문구(머리글, 소개 한 줄)는 임시로 쓰고 #3 와이어프레임이 나오면 바꾼다.

## 변경 기록

- 2026-11-22: 작성
- 2026-11-22: 승인. 이슈 #13 생성
- 2026-11-22: 계획 변경 (구현 중 발견)
  - 에러 안내가 두 페이지에서 쓰여 `shared/api`의 `describeError()`와 `shared/ui/error-state.tsx`로 내렸다.
  - 4xx 쿼리 재시도를 끈다 (`app/api/query-client.ts`). 401·404 안내가 1초 넘게 늦게 떴다.
  - 챕터를 바꿔도 스크롤이 아래에 남아 `RootLayout`에 `ScrollRestoration`을 넣었다.
  - `apiClient`의 기본 주소를 `??`에서 `||`로 고쳤다. `.env.example`처럼 `VITE_API_BASE_URL=`(빈 값)이면 `/api` 없이 요청하던 기존 버그.
  - MSW 3에서 `onUnhandledRequest`가 `onUnhandledFrame`으로 바뀌었다.
  - `mockServiceWorker.js`를 ESLint·Prettier 검사에서 뺀다 (생성 파일, `eslint.config.js` 한 줄).
  - 목 시나리오(빈 목록, 401, 500)를 `localStorage`로 바꿀 수 있게 했다.
  - 목 데이터 작품을 「날개」 대신 「메밀꽃 필 무렵」(이효석)으로 바꿨다. 위키문헌에서 「날개」 원문을 받지 못했다.
