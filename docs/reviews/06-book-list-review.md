# Review 06: 책 목록 랜딩과 책 데이터 연결

- 대상 phase: [06-book-list.md](../phases/06-book-list.md)
- 리뷰 대상: 브랜치 `feat/13-book-list`, 기준 커밋 `ee77320` (phase의 구현 커밋. 이후 `69d725b`는 phase 문서만 고친 커밋)
- 리뷰 계획 커밋: (1절까지 쓰고 커밋·푸시한 해시)
- 작성일: 2026-11-22
- 결과: 진행 중

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff 8184ca3..ee77320` 기준. `8184ca3`은 계획 변경 커밋(phase 문서만)이라 계획 커밋 `cf7260a`부터 봐도 코드 변경은 같다. 35개 파일, +2687 / -76. 그중 생성·데이터 파일이 `pnpm-lock.yaml` 305줄, `public/mockServiceWorker.js` 600줄, `fixtures/books.json` 1075줄이다.

| 파일                                                                    | 변경                                                                                                                           | 계획과 비교                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `src/entities/book/*`                                                   | 타입(BE 형식 snake_case), `bookKeys`, `bookListQuery`/`bookDetailQuery`/`chapterQuery`, `BookCard`/`BookCardSkeleton`          | 계획대로. 쿼리 이름이 계획(`booksQuery`/`bookQuery`)과 조금 다름 |
| `src/app/mocks/*`                                                       | MSW 핸들러 3개, 목 데이터 3권(각 3장), `enableMocking()`, `localStorage` 시나리오 전환                                         | 계획대로. 시나리오 전환은 **계획 변경**(`8184ca3`)으로 추가      |
| `src/main.tsx`, `src/app/index.ts`, `src/vite-env.d.ts`, `.env.example` | 목이 켜져 있으면 워커 준비 후 렌더, `VITE_API_MOCK` 타입과 예시                                                                | 계획대로                                                         |
| `src/pages/book-list/*`                                                 | 랜딩: 머리글, 책 카드 격자(2/3/4열), 로딩·빈 목록·에러                                                                         | 계획대로                                                         |
| `src/pages/book-reader/*`                                               | 책 정보, 챕터 링크, 본문(문장마다 `data-sentence-idx`), 이전/다음 챕터, 다음 챕터 미리 받기(마우스·포커스), `resolveChapterNo` | 계획대로. 줄 간격 1.8은 **계획 변경**                            |
| `src/app/router/router.tsx`                                             | `/` → `BookListPage`, `books/:bookId` → `BookReaderPage`                                                                       | 계획대로                                                         |
| `src/pages/home/*`                                                      | 삭제                                                                                                                           | 계획대로                                                         |
| `src/shared/api/client.ts`                                              | `ApiError.code`, BE 에러 본문의 `message` 사용, 기본 주소 `??` → `                                                             |                                                                  | `   | `   |     | `는 **계획 변경** (기존 버그 수정) |
| `src/shared/api/describe-error.ts`, `src/shared/ui/error-state.tsx`     | 에러 → 문구, 에러 안내 컴포넌트                                                                                                | **계획 변경** (두 페이지에서 쓰여 shared로)                      |
| `src/app/api/query-client.ts`                                           | 4xx는 재시도하지 않음                                                                                                          | **계획 변경**                                                    |
| `src/app/layouts/RootLayout.tsx`                                        | `ScrollRestoration`                                                                                                            | **계획 변경**                                                    |
| `eslint.config.js`, `.prettierignore`                                   | `public/mockServiceWorker.js` 검사 제외                                                                                        | **계획 변경**. 가드레일 설정 파일을 건드림                       |
| `package.json`, `pnpm-lock.yaml`                                        | `msw` 3.0.7(dev, 고정), `msw.workerDirectory`                                                                                  | 계획대로                                                         |
| `public/mockServiceWorker.js`                                           | `msw init`이 만든 파일                                                                                                         | 계획대로                                                         |
| `docs/architecture.md`                                                  | 폴더 구조, 3장 API 기준 문서·에러 처리·목 API 절, BE 합의 항목 답                                                              | 계획대로                                                         |
| `docs/phases/07-book-reader.md`                                         | 이 브랜치에서 계획 문서만 먼저 커밋 (`03f5f66`)                                                                                | 계획에 없던 것. 07 승인을 06과 함께 받아서                       |

### 1.2 완료 기준 확인 방법

| #   | 완료 기준                                                                                                                               | 확인 방법                                                                                                                                                                                                                                                                                                    | 결과 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 1   | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`가 통과한다                                                             | `ee77320`을 별도 worktree에 체크아웃하고 `pnpm install --frozen-lockfile` 후 네 명령의 종료 코드 확인. lockfile이 `package.json`과 맞는지도 이걸로 확인된다                                                                                                                                                  |      |
| 2   | `VITE_API_MOCK=true pnpm dev`로 `/`를 열면 목 책들이 카드로 나열된다 (모바일 2열, 데스크톱 4열)                                         | 내장 브라우저로 375·768·1440px에서 `main ul`의 `grid-template-columns` 열 수(2/3/4)와 카드 3개 확인. 스크린샷                                                                                                                                                                                                |      |
| 3   | 책 카드를 누르면 `/books/:bookId`로 가서 책 제목과 1장 본문이 보인다. 챕터 링크와 다음 챕터 버튼으로 이동하고 URL의 `?chapter`가 바뀐다 | 「운수 좋은 날」(이어 읽기 없음)을 눌러 1장이 나오는지, 챕터 링크·다음·이전 버튼마다 URL과 `aria-current`, 스크롤 위치(맨 위). 「봄·봄」은 이어 읽기로 2장이 나오는지. 뒤로 가기로 이전 챕터와 그 스크롤 위치가 돌아오는지                                                                                   |      |
| 4   | 로딩 스켈레톤, 빈 목록, 404, 401, 그 밖의 에러 화면을 각각 볼 수 있다                                                                   | `localStorage`의 `diegesis-mock`을 `empty`·`unauthorized`·`error`로 바꿔 목록과 책 페이지 각각에서 확인. 404는 `/books/nope`과 `/books/bombom?chapter=9`(챕터 없음 → 1장인지). 본문만 실패하는 경우는 `worker.use()`로 챕터 핸들러만 500을 주고 확인. 다시 시도 버튼이 실제로 다시 요청하는지(네트워크 로그) |      |
| 5   | `VITE_API_MOCK`이 없으면 목이 켜지지 않고 실제 `/api`로 요청한다                                                                        | 목 없이 다른 포트로 `pnpm dev`를 띄우고(BE 없음) 서비스 워커가 등록되지 않는지(`navigator.serviceWorker.getRegistrations()`), `/api/books` 요청이 Vite 프록시로 가서 실패하고 "서버에 연결하지 못했습니다"(또는 5xx 안내)가 뜨는지. 앞서 등록된 워커가 남아 있지 않게 새 프로필/포트에서 본다                |      |
| 6   | `pnpm build` 결과의 JS에 목 핸들러·목 데이터가 없다                                                                                     | `dist/assets/*.js`에서 목 책 본문(`새침하게`), 제목(`봄·봄`), `setupWorker`, `diegesis-mock`, `onUnhandledFrame` 검색 0건. `dist/mockServiceWorker.js`는 남는 것이 계획대로인지 확인                                                                                                                         |      |
| 7   | 키보드만으로 책을 골라 들어가고 챕터를 바꿀 수 있다. 포커스 링이 보인다                                                                 | Tab 순서 기록(헤더 → 카드들 → …), 카드·"책 목록" 링크·챕터 링크·이전/다음 버튼 각각 포커스 링 스크린샷, Enter로 이동                                                                                                                                                                                         |      |
| 8   | 라이트·다크 모드 모두 의미 토큰만 쓴다                                                                                                  | `pnpm lint` 통과 + 새 파일에서 팔레트 클래스·`#`·`rgb(` 검색. 라이트·다크 스크린샷으로 깨진 곳이 없는지                                                                                                                                                                                                      |      |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                                         | 확인 방법                                                                                                                                                                                                                                              | 결과 |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| FSD    | 레이어 방향, 슬라이스 간 import, Public API, 상대 경로            | `pnpm lint:fsd` 통과. 추가로 `app/mocks`가 `@/entities/book`을 `index.ts`로만 쓰는지, `pages/book-reader`가 `entities/book` 내부 경로를 쓰지 않는지 `grep`                                                                                             |      |
| FSD    | 둘 곳이 맞는가                                                    | `BookCard`가 entities에 있는 것(phase 근거), `ErrorState`·`describeError`가 shared에 있는 것(비즈니스 문구가 없는지), `resolveChapterNo`가 페이지 `lib`에 있는 것                                                                                      |      |
| 디자인 | 색은 의미 토큰만 쓴다                                             | 1.2 #8                                                                                                                                                                                                                                                 |      |
| 디자인 | 디자인 시스템 규칙 (모서리 없음, 그림자 없음, 카드 4.3, 서체 3.1) | 새 컴포넌트 클래스에서 `rounded`, `shadow` 검색. `font-typewriter`를 저자 이름 같은 짧은 문구에만 썼는지. 브랜드 색은 머리글과 현재 챕터 표시에만 썼는지                                                                                               |      |
| 접근성 | 대비                                                              | 새로 생긴 조합을 design-system 1.7 표로 확인: 카드 표지(`muted` 면 위 `foreground`·`muted-foreground`, hover 때 `accent` 면), 에러 안내(`muted` 면 위 `destructive`), 현재 챕터(`brand-ink`). 표에 없는 조합이 있으면 계산                             |      |
| 접근성 | 의미 구조                                                         | 랜딩의 제목 단계(`h1` 다음에 카드 `h3`가 바로 오는지 → 단계 건너뜀), 카드 링크의 접근 가능한 이름(표지가 `aria-hidden`이라 제목이 두 번 읽히지 않는지), 로딩 `aria-busy`·`sr-only` 문구, 에러 `role="alert"`, 챕터 `nav`의 `aria-label`·`aria-current` |      |
| 상태   | 로딩, 빈 상태, 에러 상태                                          | 1.2 #4                                                                                                                                                                                                                                                 |      |
| 보안   | 새 의존성이 phase 문서에 적혀 있고 확인되었다                     | `package.json` diff가 `msw` 하나(dev, 고정)뿐인지, lockfile에 들어온 패키지 목록(+35)을 훑어 이름이 이상한 것이 없는지, `pnpm-workspace.yaml`을 건드리지 않았는지, 설치 스크립트가 있는 패키지가 없는지(`pnpm install` 출력)                           |      |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                                 | diff에서 `token\|secret\|password\|key=` 검색. `.env.local`이 커밋되지 않았는지                                                                                                                                                                        |      |

### 1.4 이번 변경에서 특히 볼 것

- **목 워커가 실패하면 화면이 안 뜬다**: `main.tsx`는 `enableMocking()`이 끝난 뒤에 렌더한다. 워커 등록이 실패하면(HTTP가 아닌 주소, 서비스 워커를 못 쓰는 브라우저, `mockServiceWorker.js` 버전 불일치) Promise가 거부되어 빈 화면이 된다. 개발 전용이지만 원인을 알기 어려우니, 실패해도 렌더는 하고 콘솔에 남기는 게 맞는지 판단한다.
- **배포 번들에서 정말 빠지는가**: `import.meta.env.DEV`가 `false`로 바뀐 뒤 동적 import가 사라지는 것은 빌드 도구의 동작에 기대는 것이다. 1.2 #6 외에 `dist`의 청크 목록에 `browser-*.js` 같은 별도 청크가 생기지 않았는지도 본다.
- **4xx 재시도 끄기의 영향 범위**: `query-client.ts`의 기본값이라 앞으로 모든 쿼리에 걸린다. 408(시간 초과)·429(요청 과다)처럼 다시 시도하면 나아지는 4xx까지 막는 게 괜찮은지 판단한다. `failureCount < 1`이 "1번 재시도"가 맞는지 확인한다.
- **기본 주소 `||` 변경**: `VITE_API_BASE_URL`에 절대 주소(`https://api.example.com/api`)를 넣었을 때 요청 주소와 목 핸들러 주소가 같은지. 목 핸들러도 같은 식으로 주소를 만든다.
- **`ScrollRestoration`이 전역이다**: 모든 라우트에 걸린다. 뒤로 가기 때 스크롤 복원이 다른 화면(404 등)에서 이상하지 않은지, `sessionStorage`에 무엇을 남기는지 본다.
- **이어 읽기 챕터 선택**: `?chapter`가 없을 때 `last_position` 챕터로 가는데, 이때 URL에는 `?chapter`가 없다. 새로고침하면 서버의 `last_position`이 바뀌어 있을 경우 다른 챕터로 갈 수 있다. Phase 07의 URL 위치(`?chapter=&s=`) 설계와 부딪히지 않는지 본다. `last_position`의 챕터가 목록에 없을 때 첫 챕터로 가는지(`resolveChapterNo` 분기)도 확인한다.
- **다음 챕터 미리 받기**: `Button asChild` + `Link`에 `onMouseEnter`·`onFocus`가 실제로 전달되는지(네트워크 로그로 hover 때 챕터 요청이 나가는지), 터치 기기에서는 미리 받지 않는다는 한계가 있는지.
- **목 데이터의 품질과 출처**: 위키문헌 원문 정리(템플릿·링크·분류 제거)가 깨끗한지 각 권의 처음·끝 문장과 무작위 문장 10개를 읽어 본다. 문장 나누기가 이상한 곳(말줄임표, 따옴표 안 마침표, `...”` 같은 끝)을 기록한다. 세 작품과 작가의 저작권 만료 근거(작가 사망 연도)와 위키문헌 페이지의 라이선스 표시를 확인하고, `handlers.ts` 주석에 출처가 충분한지 본다.
- **문장 번호 규칙**: 책 전체에서 0부터 이어지는지, 챕터 메타의 `first_sentence`·`last_sentence`가 본문의 첫·마지막 `idx`와 같은지 세 권 모두 스크립트로 확인한다 (BE GLOSSARY "문장 번호").
- **가드레일 설정 수정**: `eslint.config.js`에 `globalIgnores` 항목을 하나 더한 것이 가드레일을 약하게 하지 않는지(`public/`의 다른 파일은 여전히 검사되는지). `scripts/check-guardrails.mjs` 사례를 고칠 필요가 없는지.
- **엔티티 UI에 라우트 지식이 없는가**: `BookCard`는 `to`를 받아 경로를 모르게 했다. 엔티티 안에 `/books/` 문자열이 없는지.
- **작업 절차**: 05 브랜치의 `scripts/check-process.mjs`로 PR 설명까지 넣어 검사(`--body-file`). 05가 먼저 머지되면 이 PR에도 CI 검사가 걸리므로, PR 설명에 `Refs #13`, phase·리뷰 문서 링크가 있어야 한다.

## 2. 발견 사항

| #   | 심각도 | 위치 | 내용 | 조치 |
| --- | ------ | ---- | ---- | ---- |

## 3. 확인 못 한 것

-

## 4. 결론
