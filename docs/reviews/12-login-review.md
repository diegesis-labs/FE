# Review 12: 로그인 화면과 401·403 처리

- 대상 phase: [12-login.md](../phases/12-login.md)
- 리뷰 대상: 브랜치 `feat/28-login`, 기준 커밋 `ebc01c2` (phase의 구현 커밋)
- 리뷰 계획 커밋:
- 작성일: 2026-11-25
- 결과: 진행 중

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff 2743680..ebc01c2` 기준 (`2743680`은 계획 변경 커밋, phase 문서만). 21개 파일, +383 / -38.

| 파일                                                        | 변경                                                                                                                               | 계획과 비교                                                   |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `src/entities/user/*`                                       | `Me`, `UserRole` 타입, `userKeys`, `meQuery`                                                                                       | 계획대로. `display_name`은 BE ERD대로 `string \| null`        |
| `src/shared/api/describe-error.ts`                          | 403을 `code`로 나눔 (`NOT_ALLOWED`, `ADMIN_ONLY`, `ORIGIN_MISMATCH`, 그 밖)                                                        | 계획대로                                                      |
| `src/shared/api/client.ts`, `index.ts`                      | `GOOGLE_LOGIN_URL`, 기본 주소가 같은 출처의 상대 경로여야 한다는 주석                                                              | 계획대로                                                      |
| `src/app/router/auth-redirect.ts`                           | 401·403을 어디로 보낼지 정하는 `authRedirectPath`, 이동 함수를 넣어 두는 `setAuthNavigator`, `redirectOnAuthError`                 | 계획대로 (import 순환을 끊는 방법은 구현 때 정하기로 했던 것) |
| `src/app/api/query-client.ts`                               | `QueryCache`·`MutationCache`의 `onError`, `meta.authRedirect` 타입                                                                 | 계획대로                                                      |
| `src/app/router/router.tsx`, `src/app/App.tsx`              | `/login` 라우트와 loader, 보호된 라우트의 loader, 목 전용 `/login/mock`, `getRouter()`로 늦게 만들기, loader 이동은 모두 `replace` | `replace`와 `getRouter()`는 **계획 변경**(phase 변경 기록)    |
| `src/app/layouts/AppLoading.tsx`                            | 첫 loader가 끝나기 전의 빈 바탕 (`HydrateFallback`)                                                                                | **계획에 없던 것**. 위험 4를 구현 중에 반영                   |
| `src/app/mocks/handlers.ts`, `session.ts`                   | `GET /me`, `POST /auth/logout`, 목 로그인 상태, `not-allowed` 시나리오. 기존 책 핸들러도 목 로그인 상태를 본다                     | 계획대로                                                      |
| `src/pages/login/*`                                         | 로그인 화면                                                                                                                        | 계획대로                                                      |
| `src/features/logout/*`, `src/widgets/header/ui/Header.tsx` | 로그아웃 버튼과 `useLogout`, 헤더에 배치                                                                                           | 계획대로                                                      |
| `docs/architecture.md`, `.env.example`                      | 3장의 API 주소·CORS·목 시나리오, "로그인 (Phase 12)" 절, `VITE_API_BASE_URL` 설명                                                  | 계획대로                                                      |

### 1.2 완료 기준 확인 방법

목은 `VITE_API_MOCK=true pnpm exec vite`로 띄우고, Chrome(Claude in Chrome)으로 본다. 주소, 화면의 글자, 네트워크 요청(`/api/`)을 기록한다.

| #   | 완료 기준                                                                                                            | 확인 방법                                                                                                                           | 결과 |
| --- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`가 통과한다                     | `ebc01c2`에서 다섯 명령의 종료 코드                                                                                                 |      |
| 2   | 목에서 로그아웃 상태로 `/`와 `/books/bombom`을 열면 `/login`으로 간다                                                | `diegesis-mock-session=out`으로 두 주소를 새로 열고 주소 확인                                                                       |      |
| 3   | 목에서 "Google로 로그인"을 누르면 `/`가 보인다. 이미 로그인한 상태로 `/login`을 열면 `/`로 간다                      | 버튼 클릭 뒤 주소와 헤더. 로그인한 상태로 `/login`을 새로 열고 주소 확인                                                            |      |
| 4   | `/login?error=NOT_ALLOWED`와 `?error=LOGIN_FAILED`에서 각각의 안내가 보이고, `?error=abc`에서는 안내가 없다          | 세 주소를 로그인 전과 로그인 뒤에 각각 열고 `[role=alert]`의 글자 확인 (로그인 뒤에도 첫 화면으로 가지 않는지, 계획 변경 `2743680`) |      |
| 5   | `unauthorized`는 `/login`, `not-allowed`는 `/login?error=NOT_ALLOWED`로 가고 이동이 반복되지 않는다                  | 시나리오마다 보호된 주소를 열고 2초 뒤 주소, 네트워크의 `/api/me` 요청 수(한 번)                                                    |      |
| 6   | 책 목록을 연 뒤 목 로그인 상태를 끄고 다른 데이터를 불러오면(쓰는 도중의 401) `/login`으로 간다                      | 목록에서 `diegesis-mock-session=out`으로 바꾸고 책 카드를 눌러 책 정보 요청이 401이 되게 한 뒤 주소 확인                            |      |
| 7   | "로그아웃"을 누르면 `POST /api/auth/logout`이 한 번 불리고 `/login`으로 가며, 뒤로 가기를 해도 `/login`으로 돌아온다 | 목록 → 리더 → 뒤로 → 로그아웃 → 뒤로. 네트워크의 로그아웃 요청 수와 마지막 주소, `/api/me`가 401인지                                |      |
| 8   | `describeError`가 403 `ADMIN_ONLY`, `ORIGIN_MISMATCH`, 코드 없는 403에 각각 다른 문구를 낸다                         | 개발 서버에서 `/src/shared/api/index.ts`를 import 해 `ApiError` 다섯 가지(위 셋, `NOT_ALLOWED`, 본문 없음)로 부르고 결과 비교       |      |
| 9   | 로그인 화면이 라이트·다크, 375px·1440px에서 깨지지 않고, Tab으로 테마 버튼과 로그인 버튼에 포커스 링이 보인다        | 두 폭과 두 테마의 스크린샷, Tab 두 번 뒤 스크린샷                                                                                   |      |
| 10  | 목을 끈 빌드의 번들에 `/login/mock`과 목 로그인 상태 코드가 없다                                                     | `pnpm build` 뒤 `dist/assets/*.js`에서 `login/mock`, `diegesis-mock-session` 검색. 목을 켠 빌드에서는 나오는지도 확인               |      |
| 11  | 제품 레이어에 `useEffect`나 타이머가 없다                                                                            | `pnpm lint`와 `grep -rn 'useEffect\|setTimeout' src/pages src/widgets src/features src/entities`                                    |      |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                                            | 확인 방법                                                                                                        | 결과 |
| ------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---- |
| FSD    | 아래 레이어가 위 레이어를 import 하지 않는다                         | `pnpm lint:fsd`(steiger)와 새 파일의 import 확인                                                                 |      |
| FSD    | 같은 레이어 슬라이스끼리 import 하지 않는다                          | 같음                                                                                                             |      |
| FSD    | 슬라이스 밖에서는 `index.ts`로만 import 한다                         | 같음                                                                                                             |      |
| 디자인 | 색은 의미 토큰만 쓴다 (`#hex`, 팔레트 직접 사용 없음)                | `pnpm lint`, 새 파일의 클래스 확인                                                                               |      |
| 디자인 | 라이트/다크 둘 다 깨지지 않는다                                      | 완료 기준 9                                                                                                      |      |
| 디자인 | 브랜드 버튼은 한 화면에 하나 이하다 (design-system 1.3)              | 로그인 화면 코드                                                                                                 |      |
| 접근성 | 글자 대비 4.5:1 이상, 키보드로 조작 가능, 아이콘 버튼에 `aria-label` | 안내 박스(`bg-accent` 위 `text-foreground`·`text-muted-foreground`) 대비를 design-system 1.7 표로 확인, Tab 이동 |      |
| 접근성 | 안내가 `role="alert"`, 로그아웃 중 버튼이 `disabled`·`aria-busy`     | 코드                                                                                                             |      |
| 상태   | 로딩, 빈 상태, 에러 상태가 있다                                      | 첫 진입의 `AppLoading`, 서버가 꺼졌을 때(목 시나리오 `error`)의 라우트 에러 화면                                 |      |
| 보안   | 새 의존성이 phase 문서에 적혀 있고 확인되었다                        | `package.json` diff (없어야 함)                                                                                  |      |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                                    | diff 검색                                                                                                        |      |

### 1.4 이번 변경에서 특히 볼 것

- **이동 반복**: loader의 `replace`, 쿼리 캐시의 이동, 로그인 화면의 loader가 서로 맞물려 같은 주소를 오가지 않는지. `setAuthNavigator`의 "로그인 화면에서 받은 401은 무시" 조건이 `?error=`를 지우지 않는지.
- **loader 안의 `onError`**: loader에서 부르는 `GET /api/me`에 `meta.authRedirect: false`가 붙어, 쿼리 캐시의 이동과 loader의 `replace`가 겹치지 않는지.
- **`getRouter()`**: 렌더 중에 라우터를 한 번만 만드는지 (StrictMode의 두 번 렌더에서도 하나). 목이 켜지기 전에 첫 `/api/me`가 나가지 않는지.
- **`/login/mock`**: 목이 꺼진 빌드에 라우트가 없고, `pages/login`이 목을 모르는지.
- **로그아웃 순서**: 화면을 옮긴 뒤 캐시를 비워서, 아직 그려진 책 목록이 다시 요청하지 않는지.
- **목 시나리오 `error`**: 모든 경로가 500이면 `/api/me`도 500이므로 보호된 화면은 라우트 에러 화면이 된다. 이 화면이 견딜 만한지.
- **문서**: `architecture.md`의 바뀐 문장이 BE 계약(BE#10)과 맞는지.

## 2. 발견 사항

| #   | 심각도 | 위치 | 내용 | 조치 |
| --- | ------ | ---- | ---- | ---- |

## 3. 확인 못 한 것

-

## 4. 결론
