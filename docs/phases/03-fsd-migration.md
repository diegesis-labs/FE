# Phase 03: FSD 구조로 전환

- 상태: 승인됨
- 선행 phase: [01 디자인 팔레트](01-design-palette.md) (완료), [02 CI와 브랜치 보호](02-ci-branch-protection.md) (완료. CI에서 FSD 검사까지 돌리기 위해 먼저 끝나야 시작)
- 관련 이슈: [#2 FE 아키텍처 설계 및 기술스택 선정](https://github.com/diegesis-labs/FE/issues/2)
- 브랜치: `setup/2-fsd-migration` (`main`의 `0039d14`에서 만듦. #2 초기 세팅 브랜치 `setup/2-init`은 PR #5로 머지됐다)
- 계획 커밋: (승인 후 기록)
- 구현 커밋: (구현 후 기록)
- 리뷰 문서: [03-fsd-migration-review.md](../reviews/03-fsd-migration-review.md) (리뷰 단계에서 작성)

## 목표

초기 세팅 코드를 [CLAUDE.md](../../CLAUDE.md)의 FSD(Feature-Sliced Design) 구조로 옮긴다. FSD 규칙을 어기면 lint에서 잡히게 만든다.

## 배경

초기 세팅 때는 `components/`, `lib/`, `pages/*.tsx` 같은 일반적인 구조로 시작했다. 팀이 FSD를 쓰기로 해서, 기능 개발을 시작하기 전에 구조를 맞춘다. 코드가 아직 적은 지금 옮기는 게 가장 싸다.

## 범위

### 하는 것

- 파일을 FSD 레이어/슬라이스/세그먼트로 옮기고, 슬라이스마다 `index.ts`(Public API)를 만든다.
- 헤더를 `RootLayout`에서 떼어 `widgets/header`로, 테마 전환 버튼을 `features/theme-toggle`로 분리한다.
- shadcn 설정(`components.json`)의 경로를 `shared/ui`, `shared/lib`로 바꾼다.
- FSD 규칙 검사 도구 `steiger`를 추가하고 `pnpm lint`에 포함한다.
- 경로가 바뀐 문서(`architecture.md`, `design-system.md`, `README.md`)를 고친다.

### 하지 않는 것

- 화면 모양, 동작, 디자인 토큰 값은 바꾸지 않는다. 옮기기만 한다.
- `entities`는 아직 실제 슬라이스가 없으므로 빈 폴더만 만든다. BE API가 정해지면 별도 phase에서 만든다.
- 라우트 추가, 새 기능 개발은 하지 않는다.

## 설계

### FSD 배치 (현재 → 이동 후)

| 현재                             | 이동 후                                        | 레이어   | 비고                                                                                 |
| -------------------------------- | ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `src/main.tsx`                   | 그대로                                         | –        | Vite 진입점. `@/app`만 import                                                        |
| `src/index.css`                  | `src/app/styles/index.css`                     | app      | 전역 스타일과 디자인 토큰                                                            |
| `src/app/App.tsx`                | `src/app/App.tsx`                              | app      | Provider 조립                                                                        |
| `src/app/query-client.ts`        | `src/app/api/query-client.ts`                  | app      | 서버 데이터 캐시 설정. steiger `segments-by-purpose` 때문에 `providers`가 아닌 `api` |
| `src/app/router.tsx`             | `src/app/router/router.tsx`                    | app      |                                                                                      |
| `src/app/RootLayout.tsx`         | `src/app/layouts/RootLayout.tsx`               | app      | 헤더는 widgets로 분리                                                                |
| (RootLayout 안의 헤더)           | `src/widgets/header/ui/Header.tsx`             | widgets  | 워드마크 + 테마 버튼                                                                 |
| `src/components/ThemeToggle.tsx` | `src/features/theme-toggle/ui/ThemeToggle.tsx` | features | 사용자 동작 "테마 바꾸기"                                                            |
| `src/shared/theme/*`             | `src/shared/lib/theme/*`                       | shared   | Provider와 `useTheme`. features와 app이 둘 다 써야 해서 shared에 둔다                |
| `src/components/ui/button.tsx`   | `src/shared/ui/button.tsx`                     | shared   | shadcn                                                                               |
| `src/lib/utils.ts`               | `src/shared/lib/utils.ts`                      | shared   | `cn`                                                                                 |
| `src/shared/api/client.ts`       | 그대로 + `src/shared/api/index.ts`             | shared   |                                                                                      |
| `src/pages/HomePage.tsx`         | `src/pages/home/ui/HomePage.tsx`               | pages    | 헬스체크 쿼리는 `pages/home/api/health.ts`로 분리                                    |
| `src/pages/NotFoundPage.tsx`     | `src/pages/not-found/ui/NotFoundPage.tsx`      | pages    |                                                                                      |
| `src/pages/RouteErrorPage.tsx`   | `src/pages/route-error/ui/RouteErrorPage.tsx`  | pages    | 라우터 `ErrorBoundary`                                                               |
| –                                | `src/entities/.gitkeep`                        | entities | 빈 레이어                                                                            |

이동 후 import 방향:

```
app ──> pages(home, not-found, route-error), widgets(header), shared
widgets/header ──> features/theme-toggle, shared/ui
features/theme-toggle ──> shared/lib/theme, shared/ui
pages/home ──> shared/api, shared/ui
```

### 설정 변경

- `components.json`: `tailwind.css` → `src/app/styles/index.css`, 별칭 `ui` → `@/shared/ui`, `utils` → `@/shared/lib/utils`, `lib` → `@/shared/lib`, `hooks` → `@/shared/lib/hooks`, `components` → `@/shared/ui`
- `.prettierrc.json`: `tailwindStylesheet` → `./src/app/styles/index.css`
- `eslint.config.js`: `react-refresh` 예외 경로를 `src/shared/ui/**`로 변경
- `package.json`: `lint:fsd` 스크립트 추가, `lint`가 ESLint와 steiger를 둘 다 실행

### 새 의존성

| 패키지                                           | 용도                                                        | 확인 결과                                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `steiger` (devDependency)                        | FSD 규칙 검사 (레이어 방향, Public API, 슬라이스 간 import) | FSD 공식 조직(`feature-sliced/steiger`)이 관리. 최신 0.10.0은 2026-11-09 배포라 3일 지연 설치 조건을 통과 |
| `@feature-sliced/steiger-plugin` (devDependency) | steiger의 FSD 규칙 모음                                     | 같은 조직. 0.8.2 (2026-11-01 배포)                                                                        |

설치 스크립트가 필요한지 설치할 때 확인한다. 필요하면 `allowBuilds`에 넣기 전에 사용자에게 묻는다.

## 작업 단계

- [ ] 1. 폴더를 만들고 파일을 옮긴다 (`git mv`로 이력 유지).
- [ ] 2. 슬라이스별 `index.ts`를 만들고 import 경로를 Public API 기준으로 고친다.
- [ ] 3. 헤더를 `widgets/header`로, 헬스체크 쿼리를 `pages/home/api`로 분리한다.
- [ ] 4. `components.json`, `.prettierrc.json`, `eslint.config.js` 경로를 고친다.
- [ ] 5. `steiger`를 설치하고 설정 파일(`steiger.config.ts`)과 `lint:fsd` 스크립트를 추가한다.
- [ ] 6. `architecture.md` 2장(폴더 구조), `design-system.md` 7장, `README.md`의 경로를 고친다.
- [ ] 7. `pnpm lint`, `pnpm typecheck`, `pnpm build`를 통과시킨다.
- [ ] 8. `pnpm dlx shadcn@latest add` 가 `shared/ui`에 파일을 만드는지 시험 삼아 확인하고, 시험 파일은 지운다.

## 완료 기준

- [ ] `src/components/`, `src/lib/`, `src/shared/theme/`가 더 이상 없다.
- [ ] 레이어 6개(`app`, `pages`, `widgets`, `features`, `entities`, `shared`)만 `src/` 아래에 있다 (`main.tsx`, `vite-env.d.ts` 제외).
- [ ] `pages`, `widgets`, `features`의 모든 슬라이스에 `index.ts`가 있고, 슬라이스 밖에서는 `index.ts`로만 import 한다.
- [ ] `pnpm lint`(ESLint + steiger), `pnpm typecheck`, `pnpm build`가 통과한다.
- [ ] 일부러 규칙을 어긴 import(예: `shared`에서 `features` import)를 넣으면 `pnpm lint:fsd`가 실패한다. 확인 후 되돌린다.
- [ ] shadcn CLI로 추가한 컴포넌트가 `src/shared/ui/`에 생긴다.
- [ ] 개발 서버에서 홈 화면, 404 화면, 테마 전환이 이전과 똑같이 동작한다.
- [ ] 문서의 폴더 구조와 경로가 실제 코드와 일치한다.

## 위험과 열린 질문

- steiger가 아직 0.x 버전이라 규칙이 바뀔 수 있다. 너무 엄격한 규칙(예: 슬라이스 하나만 쓰는 레이어 경고)은 설정에서 끈다. 구현 중 확인 결과: `fsd/insignificant-slice`(한 곳에서만 쓰는 슬라이스 경고)가 `features/theme-toggle`에 걸려서 끈다. 기능이 늘어 슬라이스가 여러 곳에서 쓰이면 다시 켤지 정한다.
- 화면 확인은 브라우저가 있어야 한다. 이 작업 환경에서 브라우저를 못 쓰면 리뷰 문서에 "확인 못 함"으로 남기고 사용자에게 확인을 부탁한다.

## 변경 기록

- 2026-11-19: 작성
- 2026-11-19: 01 → 02로 번호 변경. #4 디자인 팔레트 정렬을 먼저 하기로 해서 순서를 바꿈
- 2026-11-19: 02 → 03으로 번호 변경. CI와 브랜치 보호(새 Phase 02)를 먼저 하기로 함. FSD 검사(steiger)는 Phase 02에서 만든 CI의 `pnpm lint`로 함께 돌게 된다
- 2026-11-20: 브랜치를 `setup/2-init` → `setup/2-fsd-migration`으로 변경. PR #5가 머지되어 `main`에서 새로 땀. 이 phase가 끝나면 Phase 04 가드레일 lint([#8](https://github.com/diegesis-labs/FE/issues/8))를 시작할 수 있다
- 2026-11-20: 승인
- 2026-11-20: 계획 변경 - steiger 첫 실행 결과 반영. `app/providers` → `app/api` (`fsd/segments-by-purpose`: 세그먼트 이름은 내용물이 아니라 목적을 나타내야 함). `fsd/insignificant-slice`는 끈다 (위험에서 예상한 경우)
