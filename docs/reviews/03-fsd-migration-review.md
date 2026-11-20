# Review 03: FSD 구조로 전환

- 대상 phase: [03-fsd-migration.md](../phases/03-fsd-migration.md)
- 리뷰 대상: 브랜치 `setup/2-fsd-migration`, 기준 커밋 `b7a3d43` (phase의 구현 커밋. 이후 `8d34b27`, `435e75b`는 phase 문서만 고친 커밋)
- 리뷰 계획 커밋: (1절까지 쓰고 커밋·푸시한 해시)
- 작성일: 2026-11-20
- 결과: 진행 중

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff -M 4798bb3..b7a3d43` 기준 (`4798bb3`은 마지막 계획 변경 커밋). 37개 파일, +437 / -84. 대부분은 파일 이동이다.

| 영역            | 변경                                                                                                                                                                           | 계획과 비교                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `src/` 이동     | 계획 표대로 `git mv`. `components/`, `lib/`, `shared/theme/`가 사라지고 레이어 6개로 정리                                                                                      | 계획대로. 단 `app/providers` → `app/api` (계획 변경 `4798bb3`에서 미리 문서를 고침)                                  |
| Public API      | `index.ts` 추가: `app`, `pages/home`, `pages/not-found`, `pages/route-error`, `widgets/header`, `features/theme-toggle`, `shared/api`, `shared/lib/theme`                      | 계획대로. `app/index.ts`는 계획 표에 없었지만 "`main.tsx`는 `@/app`만 import"를 지키려고 추가 (**계획에 없던 추가**) |
| 분리            | 헤더 → `widgets/header/ui/Header.tsx`, 헬스체크 쿼리 → `pages/home/api/health.ts` (`queryOptions`)                                                                             | 계획대로                                                                                                             |
| 전역 CSS import | `main.tsx`에서 `App.tsx`(`./styles/index.css`)로 옮김                                                                                                                          | **계획에 없던 변경**. `main.tsx`가 `@/app`만 import 하게 하려고                                                      |
| 설정            | `components.json`, `.prettierrc.json`, `eslint.config.js` 경로. `package.json`에 `lint:fsd`, `lint` = ESLint + steiger. `steiger.config.ts` 추가(`fsd/insignificant-slice` 끔) | 계획대로 (`insignificant-slice`는 "위험과 열린 질문"에서 예상한 경우)                                                |
| 의존성          | `steiger` 0.10.0, `@feature-sliced/steiger-plugin` 0.8.2 (devDependencies). `pnpm-lock.yaml` +307줄 (하위 패키지 37개)                                                         | 계획대로. 버전이 `^` 없이 **정확한 버전으로 고정**됨 (다른 패키지는 `^`)                                             |
| 문서            | `architecture.md` 2장(폴더 구조 다시 씀)·6장, `design-system.md` 경로 3곳, `README.md`·`CLAUDE.md`의 `pnpm lint` 설명                                                          | 계획대로. `CLAUDE.md`는 계획 표에 없었음 (**계획에 없던 추가**, 명령 설명 한 줄)                                     |
| 기타            | `index.html` 주석의 경로, `src/features/.gitkeep` → `src/entities/.gitkeep`                                                                                                    | 계획대로                                                                                                             |

### 1.2 완료 기준 확인 방법

| #   | 완료 기준                                                                                                   | 확인 방법                                                                                                                                                                                                                                                        | 결과 |
| --- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `src/components/`, `src/lib/`, `src/shared/theme/`가 더 이상 없다                                           | `b7a3d43`을 체크아웃한 상태에서 `ls` / `git ls-tree -r --name-only b7a3d43 src`                                                                                                                                                                                  |      |
| 2   | 레이어 6개만 `src/` 아래에 있다 (`main.tsx`, `vite-env.d.ts` 제외)                                          | `git ls-tree --name-only b7a3d43 src/`의 결과가 `app entities features main.tsx pages shared vite-env.d.ts widgets`인지 확인                                                                                                                                     |      |
| 3   | `pages`, `widgets`, `features`의 모든 슬라이스에 `index.ts`가 있고, 슬라이스 밖에서는 `index.ts`로만 import | 슬라이스 폴더마다 `index.ts` 존재 확인. `grep -rn "from '@/\(pages\|widgets\|features\|entities\)/[^']*/"` 로 내부 경로 import가 0건인지 확인. steiger `fsd/no-public-api-sidestep` 결과와 교차 확인                                                             |      |
| 4   | `pnpm lint`(ESLint + steiger), `pnpm typecheck`, `pnpm build`가 통과한다                                    | 깨끗한 설치(`pnpm install --frozen-lockfile`) 후 `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build` 실행. 출력에 steiger의 `No problems found`가 있는지 확인                                                                                       |      |
| 5   | 일부러 규칙을 어긴 import를 넣으면 `pnpm lint:fsd`가 실패한다. 확인 후 되돌린다                             | 세 가지를 하나씩 넣고 실패하는지, 종료 코드가 0이 아닌지 확인: `shared` → `features` import, `pages/a` → `pages/b` import, Public API 우회 import. 되돌린 뒤 `git status`가 깨끗한지 확인                                                                        |      |
| 6   | shadcn CLI로 추가한 컴포넌트가 `src/shared/ui/`에 생긴다                                                    | 구현 중 `pnpm exec shadcn add badge`로 확인한 기록(phase 변경 기록)을 근거로 하고, 리뷰 때 한 번 더 실행해 생기는 위치와 import(`cn`)를 확인한 뒤 지운다. `package.json`이 바뀌지 않는지도 확인                                                                  |      |
| 7   | 개발 서버에서 홈 화면, 404 화면, 테마 전환이 이전과 똑같이 동작한다                                         | `pnpm dev`를 띄우고 브라우저로 확인: `/`(홈, 버튼 2개, "BE 연결 확인" 눌러 에러 상태 문구), `/없는-경로`(404, "홈으로" 링크), 헤더 워드마크 링크, 테마 버튼으로 시스템→라이트→다크 전환과 새로고침 후 유지. 가능하면 `main`(`0039d14`)과 같은 화면을 나란히 비교 |      |
| 8   | 문서의 폴더 구조와 경로가 실제 코드와 일치한다                                                              | `architecture.md` 2장 트리를 `find src -type f`와 대조. 문서 전체에서 옛 경로 검색: `grep -rn -E "src/(components\|lib/\|index\.css\|shared/theme)\|@/components\|@/lib" --exclude-dir=node_modules . ` (phase·리뷰 문서의 과거 기록은 제외)                     |      |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                                            | 확인 방법                                                                                                                                                                   | 결과 |
| ------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| FSD    | 아래 레이어가 위 레이어를 import 하지 않는다                         | steiger `fsd/forbidden-imports` 결과. `src/shared`, `src/features`에서 위 레이어 import를 `grep`으로 한 번 더 확인                                                          |      |
| FSD    | 같은 레이어 슬라이스끼리 import 하지 않는다                          | steiger 결과와 `grep`                                                                                                                                                       |      |
| FSD    | 슬라이스 밖에서는 `index.ts`로만 import 한다                         | 1.2 #3과 같음                                                                                                                                                               |      |
| FSD    | 슬라이스 안에서는 상대 경로를 쓴다                                   | `pages/home/ui/HomePage.tsx` → `../api/health`, `shared/lib/theme` 안의 import 확인. steiger `fsd/import-locality` 결과                                                     |      |
| 디자인 | 색은 의미 토큰만 쓴다 (`#hex`, 팔레트 직접 사용 없음)                | `grep -rn -E "#[0-9a-fA-F]{3,6}\|-(cream\|sand\|charcoal\|pine\|wood\|oak\|brick)-[0-9]" src --include=*.tsx` (CSS 토큰 정의 제외)                                          |      |
| 디자인 | 라이트/다크 둘 다 깨지지 않는다                                      | 1.2 #7의 화면 확인에서 라이트·다크 각각                                                                                                                                     |      |
| 접근성 | 글자 대비 4.5:1 이상, 키보드로 조작 가능, 아이콘 버튼에 `aria-label` | 이번 변경은 이동만 하므로 회귀만 본다: 테마 버튼 `aria-label` 유지, Tab으로 워드마크 → 테마 버튼 → 본문 버튼 순서로 이동되는지                                              |      |
| 상태   | 로딩, 빈 상태, 에러 상태가 있다                                      | `HomePage`의 `isFetching`/`isSuccess`/`isError` 분기가 유지됐는지 코드 확인. 화면에서 BE 없이 눌러 "연결 실패" 문구 확인                                                    |      |
| 보안   | 새 의존성이 phase 문서에 적혀 있고 확인되었다                        | `package.json` diff가 steiger 2개뿐인지. `pnpm view`로 관리 주체(feature-sliced 조직)·배포일 재확인. lockfile에 설치 스크립트 요구 패키지가 없는지(`allowBuilds` 변경 없음) |      |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                                    | `git diff 4798bb3..b7a3d43`에서 `token\|secret\|key=\|password` 검색, `.env*` 파일이 커밋에 없는지                                                                          |      |

### 1.4 이번 변경에서 특히 볼 것

- **CI에서 steiger가 실제로 도는지**: 로컬에서만 확인했다. PR을 열어 CI `check`의 `pnpm lint` 단계 로그에 steiger 출력이 있는지 본다. PR은 리뷰 실행 때 사용자 확인을 받고 연다.
- **전역 CSS import 위치 변경**: `main.tsx` → `App.tsx`. 스타일이 첫 화면에 그대로 적용되는지, 빌드한 CSS 크기가 `main`과 비슷한지(`dist/assets/*.css`) 확인한다.
- **테마 깜빡임 방지 스크립트**: `index.html`의 저장 키(`diegesis-theme`)와 `shared/lib/theme/theme-context.ts`의 `THEME_STORAGE_KEY`가 여전히 같은지. 다크로 바꾼 뒤 새로고침할 때 흰 화면이 번쩍이지 않는지 본다.
- **`react-refresh` 예외 경로**: `eslint.config.js`의 예외가 `src/shared/ui/**`로 바뀌었다. `button.tsx`(컴포넌트와 `buttonVariants`를 같이 export)가 lint를 통과하는 것이 예외가 적용된다는 근거인지, 예외를 빼면 실패하는지로 확인한다.
- **git 이력**: `RootLayout.tsx`와 `HomePage.tsx`는 내용이 많이 바뀌어 이동이 아니라 삭제·추가로 잡힌다. `git log --follow`로 이력이 이어지는지 확인하고, 안 되면 발견 사항(낮음)으로 남긴다.
- **steiger 버전 고정 방식**: `^` 없이 정확한 버전으로 들어갔다. 0.x라 규칙이 바뀔 수 있어 고정이 오히려 맞는지, 다른 패키지와 맞출지 판단한다.
- **peer 경고**: 설치 때 `tsconfck`(steiger의 하위 의존성)가 TypeScript ^5를 원한다는 경고가 났다. tsconfig `paths`(`@/*`)를 steiger가 제대로 읽는지는 1.2 #5의 위반 검출로 확인된다. 오탐이나 미탐이 없는지 본다.
- **꺼 둔 규칙**: `fsd/insignificant-slice`를 끈 것 외에 recommended 규칙이 그대로인지 `steiger.config.ts`를 확인한다.

## 2. 발견 사항

| #   | 심각도 | 위치 | 내용 | 조치 |
| --- | ------ | ---- | ---- | ---- |

## 3. 확인 못 한 것

-

## 4. 결론
