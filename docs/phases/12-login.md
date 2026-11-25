# Phase 12: 로그인 화면과 401·403 처리

- 상태: 완료
- 선행 phase: 없음 (11 Confluence 확인 훅과 파일이 겹치지 않는다)
- 관련 이슈: [#28 로그인 화면과 401·403 처리](https://github.com/diegesis-labs/FE/issues/28)
- 짝 BE Epic: [diegesis-labs/BE#9 로그인과 허용 목록](https://github.com/diegesis-labs/BE/issues/9) (계약 PR [diegesis-labs/BE#10](https://github.com/diegesis-labs/BE/pull/10))
- 브랜치: `feat/28-login` (`main`의 `85726e2`에서 만듦)
- 계획 커밋: `5f6a8e8`
- 구현 커밋: `ebc01c2`
- 리뷰 문서: [12-login-review.md](../reviews/12-login-review.md) (리뷰 계획 `bffa052`, 리뷰 반영 `d4d9b35`)

## 목표

허용 목록에 있는 사람만 책 목록과 리더를 볼 수 있다. 로그인하지 않았으면 `/login`으로 가고, 거기서 Google로 로그인하면 첫 화면으로 돌아온다. 허용 목록 밖이거나 로그인이 실패하면 그 이유에 맞는 안내를 보고, 헤더에서 로그아웃할 수 있다. 403 응답은 `code`에 따라 다른 안내를 보여 준다.

## 배경

- BE Epic 1의 계약이 [diegesis-labs/BE#10](https://github.com/diegesis-labs/BE/pull/10)에서 정해졌다. FE가 따를 곳은 BE `docs/API.md`의 2.2절(관문과 응답별로 할 일), 2.4절(출처 확인), 4.2절(로그인과 로그아웃), 4.3절(내 정보)이다.
- 2026-11-24 FE·BE 회의(Confluence "FE, BE API/마일스톤 회의")에서 정한 것:
  - E1의 FE 짝 작업은 "로그인 화면, 401을 받으면 로그인으로 이동, 허용 목록 밖 안내 화면, 로그아웃"이고 목표는 2주차다.
  - 경로는 `/login`과 `/login?error=NOT_ALLOWED`로 확정했다 (결정 9).
  - 로그인 뒤에는 첫 화면으로 간다 (결정 10).
  - 회의에서는 FE가 관리자 화면에서 허용 목록을 다루기로 했지만, BE#10이 허용 목록 API를 없앴다 (BE D-54). 그래서 이 phase에도, 이후 관리자 화면에도 허용 목록은 없다.
- 지금 FE는 모든 403을 "접근할 수 없습니다"로 똑같이 보여 주고 (`shared/api/describe-error.ts`), 401도 안내만 할 뿐 로그인 화면으로 보내지 않는다 (phase 06 "하지 않는 것").

BE 계약 가운데 FE가 할 일은 다음과 같다.

| 받은 것                                 | FE가 할 일                                               |
| --------------------------------------- | -------------------------------------------------------- |
| `401 NOT_AUTHENTICATED`                 | `/login`으로 보낸다                                      |
| `403 NOT_ALLOWED`                       | `/login?error=NOT_ALLOWED`로 보낸다                      |
| `403 ADMIN_ONLY`                        | 안내만 한다 (관리자 화면이 아직 없음)                    |
| `403 ORIGIN_MISMATCH`                   | 안내만 한다. FE에서 받으면 결함이므로 알려 달라고 적는다 |
| 로그인 결과 `/login?error=LOGIN_FAILED` | 다시 로그인해 달라는 안내                                |
| 로그인 결과 `/login?error=NOT_ALLOWED`  | 테스트 참가자만 쓸 수 있다는 안내                        |
| `POST /api/auth/logout`                 | 언제나 `204`. 로그인 상태를 확인하지 않고 불러도 된다    |

## 범위

### 하는 것

- **로그인 화면** `/login`: 서비스 이름, 한 줄 소개, "Google로 로그인" 버튼(브랜드 버튼). `?error=NOT_ALLOWED`와 `?error=LOGIN_FAILED`면 버튼 위에 안내를 보여 준다. 그 밖의 `error` 값은 무시한다.
- **로그인 버튼**: `fetch`가 아니라 브라우저 이동으로 `/api/auth/google/login`에 간다 (BE API.md 4.2절).
- **보호된 화면**: 책 목록(`/`), 없는 경로(`*`), 리더(`/books/:bookId`)에 들어가기 전에 `GET /api/me`로 확인한다. 401이면 `/login`으로, 403 `NOT_ALLOWED`면 `/login?error=NOT_ALLOWED`로 보낸다. 그 밖의 에러(서버 에러, BE가 꺼짐)는 막지 않고 화면으로 넘긴다. 화면의 쿼리가 같은 에러를 다시 시도 버튼과 함께 보여 준다.
- **이미 로그인한 사람**이 `/login`에 오면 첫 화면으로 보낸다. 단 `?error=`가 있으면 보내지 않고 안내를 보여 준다. 로그인한 채로 다른 계정으로 로그인을 시도하다 실패하면 BE는 옛 로그인 상태를 그대로 두고 `/login?error=...`로 보내므로, 이때 첫 화면으로 보내면 안내가 사라진다.
- **쓰는 도중의 401·403**: 화면을 연 뒤의 쿼리나 요청이 401이나 403 `NOT_ALLOWED`를 받아도 같은 곳으로 보낸다. 로그인 상태가 만료됐거나, 백엔드 담당자가 허용 목록에서 뺀 경우다.
- **403 안내 문구**: `describeError`가 403을 `code`로 나눈다. `NOT_ALLOWED`, `ADMIN_ONLY`, `ORIGIN_MISMATCH`, 그 밖의 403.
- **로그아웃**: 헤더의 테마 버튼 옆에 "로그아웃" 버튼. 누르면 `POST /api/auth/logout`을 부르고, 쿼리 캐시를 비우고, `/login`으로 간다.
- **목 API**: `GET /api/me`, `POST /api/auth/logout`, 그리고 목에서 로그인과 로그아웃을 흉내 내는 방법. 데모 모드(Vercel)는 지금처럼 처음부터 책 목록이 보인다.
- **문서**: `docs/architecture.md` 3장의 인증과 API 주소 설명을 새 계약에 맞춘다. API 주소는 같은 출처의 상대 경로 `/api`만 쓴다 (BE API.md 2.2절). FE와 BE의 도메인이 다를 때의 CORS 문장을 지운다. `.env.example`의 `VITE_API_BASE_URL` 설명도 고친다.

### 하지 않는 것

- 관리자 화면과 `role`에 따른 메뉴 → 관리자 경로가 생기는 BE E3·E9 때
- 로그인 뒤에 원래 보던 화면으로 돌아가기 → BE가 MVP에서 하지 않기로 했다 (결정 10, BE ADR-025)
- 헤더에 사용자 이름이나 프로필 사진 보여 주기
- 리더 상단 막대에 로그아웃 넣기 (책 목록으로 돌아가서 헤더에서 한다)
- 실제 BE와의 연결 확인 → BE E1 구현이 `main`에 합쳐진 뒤 (아래 위험 1)
- `VITE_API_BASE_URL`을 코드로 막기. 이번에는 문서로만 정하고, 열린 질문 2에서 다시 본다.
- 테스트 프레임워크 추가 (phase 07의 열린 질문 그대로)

## 설계

### FSD 배치

| 레이어   | 슬라이스 | 세그먼트   | 만들거나 바꿀 것                                                                                                           |
| -------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| app      | –        | `router/`  | `/login` 라우트 추가. 보호된 라우트와 `/login`의 loader(`GET /api/me` 확인과 `redirect`). 목에서만 쓰는 로그인 흉내 라우트 |
| app      | –        | `api/`     | `QueryCache`·`MutationCache`의 `onError`에서 401과 403 `NOT_ALLOWED`를 받으면 `router.navigate`로 보낸다                   |
| app      | –        | `mocks/`   | `GET /me`, `POST /auth/logout` 핸들러, 목 로그인 상태, 시나리오 `not-allowed` 추가                                         |
| pages    | `login`  | ui         | 로그인 화면 (안내 문구, Google 로그인 버튼)                                                                                |
| widgets  | `header` | ui         | 테마 버튼 옆에 로그아웃 버튼                                                                                               |
| features | `logout` | ui, api    | 로그아웃 버튼과 `useMutation` (부르고, 캐시 비우고, `/login`으로)                                                          |
| entities | `user`   | model, api | `Me` 타입(`id`, `email`, `display_name`, `role`), `meQuery`와 쿼리 키                                                      |
| shared   | –        | `api/`     | `describeError`의 403 분기. 로그인 시작 주소(`API 기본 경로 + /auth/google/login`)를 만드는 함수                           |

- 화면 이동은 Effect로 하지 않는다. 들어가기 전의 확인은 React Router의 `loader`에서 `redirect`를 던지고, 쓰는 도중의 401·403은 `app`의 쿼리 캐시 `onError`에서 `router.navigate`를 부른다. 둘 다 컴포넌트 밖이라 제품 레이어의 `useEffect` 금지 규칙에 걸리지 않는다.
- loader는 `queryClient.ensureQueryData(meQuery)`를 쓴다. 그래서 들어갈 때 한 번 받은 `GET /api/me`는 캐시에 남고, 화면 안에서 다시 부르지 않는다.
- 401·403을 어디로 보낼지(`/login`인지, `?error=NOT_ALLOWED`인지, 보내지 않는지) 정하는 함수는 하나만 둔다. loader와 쿼리 캐시가 같은 함수를 쓴다.
- `router`가 `queryClient`를 쓰고 `queryClient`의 `onError`가 `router`를 쓰므로 import가 돌게 된다. 위의 함수와 이동을 맡는 작은 모듈을 `app` 안에 따로 두어 순환을 끊는다. 방법은 구현 때 정하고 구현 커밋 설명에 적는다.

### 라우트

| 경로             | 레이아웃                                  | loader                                                                      |
| ---------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| `/login`         | 화면 가운데 카드 (헤더 없음, 테마 버튼만) | `?error=`가 없고 `GET /api/me`가 성공하면 `/`로. 그 밖에는 그대로 보여 준다 |
| `/`, `*`         | `RootLayout` (헤더)                       | 보호된 화면 확인                                                            |
| `/books/:bookId` | 리더 전용                                 | 보호된 화면 확인                                                            |

- `/login`의 loader는 실패를 화면 이동으로 바꾸지 않는다. 그렇지 않으면 `?error=LOGIN_FAILED`를 보여 줘야 할 때 401 때문에 `/login`으로 다시 가며 `error`가 지워진다. 그래서 이 확인에는 쿼리 캐시의 이동을 끄는 표시(`meta`)를 단다.
- 이미 `/login`에 있을 때 쓰는 도중의 이동이 또 일어나지 않게 한다 (같은 주소로 이동을 반복하지 않음).

### API

BE `docs/API.md` 기준이다 (BE#10 머지 전이므로 그 브랜치의 문서).

- `GET /api/me` → `200 { id, email, display_name, role }`. `role`은 `user` 또는 `admin`. 401, 403 `NOT_ALLOWED`가 올 수 있다.
- `POST /api/auth/logout` → `204`, 본문 없음. `Origin`은 브라우저가 붙인다. `apiClient`는 본문이 없는 응답을 빈 문자열로 읽으므로 고칠 것이 없다.
- `GET /api/auth/google/login` → 브라우저 이동. 성공하면 BE가 `/`로, 실패하면 `/login?error=...`로 보낸다.

### 목 API

- 목 로그인 상태를 `localStorage`의 `diegesis-mock-session`에 둔다. 값이 없으면 로그인한 상태로 본다. 그래서 데모 모드는 지금처럼 바로 책 목록이 보인다.
- `GET /me`: 로그인 상태면 목 사용자(`role: user`), 로그아웃 상태면 401.
- `POST /auth/logout`: 상태를 로그아웃으로 바꾸고 `204`.
- 기존 시나리오 `unauthorized`는 모든 경로를 401로 만든다 (`/me` 포함). 새 시나리오 `not-allowed`는 모든 경로를 403 `NOT_ALLOWED`로 만든다.
- **목에서의 로그인**: 로그인 버튼은 브라우저 이동이라 MSW가 가로채지 못한다 (서비스 워커는 화면 이동 요청을 넘긴다). 그래서 목이 켜져 있을 때만 `/login/mock` 라우트를 등록하고, 로그인 버튼이 그 주소로 간다. 이 라우트의 loader가 목 로그인 상태를 켜고 `/`로 보낸다. `?error=` 화면은 주소를 직접 열어서 본다. 목 코드는 지금처럼 `app/mocks`와 `app/router`에만 두고, `pages/login`은 받은 주소로 가는 링크만 그린다.

### 화면과 상태

- **로그인 화면**: 가운데 정렬 카드. "Diegesis" 워드마크(제목 서체), 한 줄 소개, "Google로 로그인" 버튼(`variant="brand"`, 화면에 하나뿐). 위에 오른쪽에 테마 버튼.
- **안내** (`role="alert"`, 디자인 시스템 4.5의 안내 박스):
  - `NOT_ALLOWED`: "테스트 참가자만 쓸 수 있습니다" / "참가 신청한 Google 계정으로 로그인했는지 확인해 주세요."
  - `LOGIN_FAILED`: "로그인하지 못했습니다" / "잠시 뒤 다시 시도해 주세요."
- **로그인 확인 중**: loader가 끝날 때까지 이전 화면이 남는다. 첫 진입이면 빈 화면이 잠깐 보인다 (`GET /api/me` 한 번).
- **403 안내 문구** (`describeError`):
  - `NOT_ALLOWED`: "테스트 참가자만 쓸 수 있습니다" (보통은 화면 이동이 먼저 일어난다)
  - `ADMIN_ONLY`: "관리자만 쓸 수 있습니다"
  - `ORIGIN_MISMATCH`: "요청이 거절되었습니다" / "문제가 계속되면 알려 주세요." (FE에서 받으면 결함)
  - 그 밖의 403: 지금처럼 "접근할 수 없습니다"와 BE의 `message`
- **로그아웃**: 누르는 동안 버튼을 잠근다(`disabled`, `aria-busy`). 실패해도(네트워크 등) 캐시를 비우고 `/login`으로 간다. BE 로그아웃은 언제나 `204`이고, 남은 쿠키는 다음 로그인 때 BE가 지운다.

### 새 의존성

없음.

## 작업 단계

- [x] 1. `entities/user`: `Me` 타입, `meQuery`, 쿼리 키
- [x] 2. `shared/api`: `describeError`의 403 분기, 로그인 시작 주소
- [x] 3. `app/mocks`: `/me`, `/auth/logout` 핸들러, 목 로그인 상태, `not-allowed` 시나리오
- [x] 4. `app`: 401·403을 어디로 보낼지 정하는 함수와 이동, 쿼리 캐시 `onError`
- [x] 5. `pages/login`: 로그인 화면
- [x] 6. `app/router`: `/login`, 보호된 라우트의 loader, 목 전용 `/login/mock`
- [x] 7. `features/logout`과 헤더의 로그아웃 버튼
- [x] 8. `docs/architecture.md` 3장, `.env.example` 고치기
- [x] 9. `pnpm lint`, `pnpm typecheck`, `pnpm build`, 목 시나리오로 화면 확인

## 완료 기준

- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`가 통과한다.
- [ ] 목에서 로그아웃 상태로 `/`와 `/books/bombom`을 열면 `/login`으로 간다.
- [ ] 목에서 `/login`의 "Google로 로그인"을 누르면 책 목록(`/`)이 보인다. 이미 로그인한 상태로 `/login`을 열면 `/`로 간다.
- [ ] `/login?error=NOT_ALLOWED`와 `/login?error=LOGIN_FAILED`에서 각각의 안내가 보이고, `?error=abc`에서는 안내가 없다.
- [ ] 시나리오 `unauthorized`에서 보호된 화면은 `/login`으로, `not-allowed`에서는 `/login?error=NOT_ALLOWED`로 간다. 이동이 반복되지 않는다 (주소가 한 번만 바뀌고 멈춘다).
- [ ] 책 목록을 연 뒤에 목 로그인 상태를 끄고 리더의 다음 챕터를 불러오면(쓰는 도중의 401) `/login`으로 간다.
- [ ] 헤더의 "로그아웃"을 누르면 `POST /api/auth/logout`이 한 번 불리고 `/login`으로 가며, 뒤로 가기를 해도 책 목록 대신 `/login`으로 돌아온다.
- [ ] `describeError`가 403 `ADMIN_ONLY`, `ORIGIN_MISMATCH`, 코드 없는 403에 각각 다른 문구를 낸다 (목 응답을 잠깐 바꾸거나 콘솔에서 확인).
- [ ] 로그인 화면이 라이트·다크, 375px·1440px에서 깨지지 않고, Tab으로 테마 버튼과 로그인 버튼에 포커스 링이 보인다.
- [ ] 목을 끈 빌드(`pnpm build`)의 번들에 `/login/mock`과 목 로그인 상태 코드가 없다.
- [ ] 제품 레이어에 `useEffect`나 타이머가 없다 (`pnpm lint`).

## 위험과 열린 질문

1. **실제 BE로는 아직 확인할 수 없다.** BE E1이 구현되기 전이라 Google 로그인, 쿠키, `Origin` 확인은 목으로만 본다. BE E1이 `main`에 합쳐지면 로컬에서 docker compose로 띄운 BE에 붙여, 로그인, 허용 목록 밖, 로그아웃, 로그아웃 요청이 `ORIGIN_MISMATCH` 없이 `204`인지 확인한다. 이 확인은 리뷰 문서에 "확인 못 함"으로 남기고 BE E1 뒤에 채운다.
2. **`VITE_API_BASE_URL`을 남길지.** 새 계약은 FE가 언제나 같은 출처의 `/api`로 부르기를 요구한다. 절대 주소를 넣으면 쿠키와 출처 확인이 깨지는데, 지금 이 값을 쓰는 곳이 없다. 이번에는 문서로만 막고, BE와 붙인 뒤 값을 없앨지 정한다.
3. **데모 모드의 로그인 버튼**은 실제 Google로 가지 않고 `/login/mock`으로 간다. 데모를 보는 사람에게는 누르면 바로 들어가지는 버튼이다. BE가 생기면(5장 "BE가 생기면") 목을 끄면서 함께 사라진다.
4. **첫 진입의 빈 화면.** 보호된 화면은 `GET /api/me`가 끝나야 그려진다. 목 지연(400ms) 동안 빈 화면이 보인다. 거슬리면 리뷰에서 라우터의 대기 표시(`HydrateFallback` 등)를 더할지 본다.

## 변경 기록

- 2026-11-25: 작성
- 2026-11-25: 계획 변경 (`2743680`). 목으로 확인하다가, 로그인한 상태로 `/login?error=LOGIN_FAILED`에 오면 안내 없이 첫 화면으로 가는 것을 발견했다. 이미 로그인한 사람이 다른 계정으로 로그인하다 실패하는 경우다. `?error=`가 있으면 첫 화면으로 보내지 않기로 바꿨다.
- 2026-11-25: 구현 완료 (`ebc01c2`). 계획과 다른 점: loader의 이동을 모두 `replace`로 했다. 목으로 확인하다가, `redirect`(push)면 목 로그인 경로(`/login/mock`)가 기록에 남아 로그아웃 뒤 뒤로 가기로 다시 로그인되고, 보호된 화면에서 `/login`으로 간 뒤 뒤로 가기를 하면 같은 이동을 되풀이하는 것을 발견했다. 첫 화면의 loader가 끝나기 전에 보일 `AppLoading`(빈 바탕)을 더했다.
- 2026-11-25: 계획 변경 (리뷰 중). 보호된 화면의 확인에서 `GET /api/me`가 500이거나 BE가 꺼져 있으면 라우트 에러 화면(다시 시도 버튼 없음)이 화면 전체를 덮었다. 이 phase 전에는 책 목록 안에서 다시 시도할 수 있었으므로, 로그인과 무관한 에러는 화면으로 넘기기로 바꿨다 (리뷰 발견 사항 1).
- 2026-11-25: 리뷰 수정 후 통과. 실제 BE와의 연결 확인은 BE E1이 합쳐진 뒤 리뷰 문서 3절에 채운다.
