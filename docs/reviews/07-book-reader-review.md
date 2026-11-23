# Review 07: 페이지 넘김 리더

- 대상 phase: [07-book-reader.md](../phases/07-book-reader.md)
- 리뷰 대상: 브랜치 `feat/14-book-reader`, 기준 커밋 `aaafe12` (phase의 구현 커밋. 이후 `6997c4a`는 phase 문서만 고친 커밋)
- 리뷰 계획 커밋: (1절까지 쓰고 커밋·푸시한 해시)
- 작성일: 2026-11-23
- 결과: 진행 중

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff 688173f..aaafe12` 기준. `688173f`는 PR #16 머지 커밋으로, 07 계획 커밋 `03f5f66`과 첫 계획 변경 `57c9a08`이 이미 들어 있다. 그 뒤 계획 변경 `3a1f81c`(문서만)와 구현 `aaafe12`. 24개 파일, +1146 / -138. 새 의존성 없음 (`package.json`, `pnpm-lock.yaml` 변경 없음).

| 파일                                                                       | 변경                                                                                                                                                                           | 계획과 비교                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `src/shared/lib/dom/*`                                                     | `useElementSize`(ResizeObserver), `useMediaQuery`, `useFontsReady`(`useSyncExternalStore`), `useWindowKeydown`(`useEffectEvent`)                                               | 계획대로                                                             |
| `src/shared/ui/sheet.tsx`                                                  | shadcn `sheet`를 디자인 시스템에 맞게 고침: `bg-overlay`, 그림자·모서리 없음, `motion-safe` 슬라이드, 닫기 버튼 `size-10`·`sr-only` "닫기"                                     | 계획대로                                                             |
| `src/app/styles/index.css`                                                 | `--overlay` 토큰(라이트·다크)과 `--color-overlay`                                                                                                                              | **계획 변경**(`3a1f81c`). design-system 1.2에 값만 있고 CSS에 없었음 |
| `src/app/router/router.tsx`                                                | `/books/:bookId`를 `RootLayout` 밖 최상위 라우트로, `ErrorBoundary: RouteErrorPage`                                                                                            | 계획대로                                                             |
| `src/pages/book-reader/lib/geometry.ts`                                    | 쪽 크기 계산: 최대 660px, 두 쪽 사이 80px, 여백, 쪽 높이를 줄 높이(28.8px) 배수로                                                                                              | 계획대로. 줄 높이 배수 맞춤은 구현 중 추가(구현 기록에 있음)         |
| `src/pages/book-reader/lib/paginate.ts`                                    | `buildPageLayout`, `pageForAnchor`, `visibleRange`, `measurePages`                                                                                                             | 계획대로. 이름이 계획(`paginate`, `spreadOf`)과 다름                 |
| `src/pages/book-reader/lib/swipe.ts`, `keyboard.ts`, `resolve-position.ts` | `decideSwipe`·`decideTap`, 키 → 방향과 무시 규칙, URL → 위치(`s` → `last_position` → 챕터 첫 문장)                                                                             | 계획대로. 버튼·링크에서 Space만 양보하는 규칙은 구현 중 정함         |
| `src/pages/book-reader/model/use-pagination.ts`                            | ref 콜백에서 쪽 표를 잼 (키: 책·챕터·쪽 크기·간격·글꼴)                                                                                                                        | **계획 변경**(`3a1f81c`). Effect 대신 ref 콜백                       |
| `src/pages/book-reader/model/use-reader.ts`                                | 위치(URL), 넘기기, 챕터 경계 `leaving`/`entering`, 미리 받기, 목차 이동                                                                                                        | 계획대로                                                             |
| `src/pages/book-reader/model/use-swipe.ts`                                 | Pointer 이벤트 드래그, 끝 저항, 탭 판정. 끄는 동안 `--drag-dx`·인라인 `transition`·`data-settling`만 바꿈                                                                      | 계획대로                                                             |
| `src/pages/book-reader/ui/*`                                               | `BookReaderPage`(`h-dvh`, 로딩·에러), `PageStage`(다단 띠, 슬라이드, `data-*` 범위), `ReaderTopBar`, `ReaderBottomBar`(쪽수 `aria-live`, 끝 안내), `ChapterToc`, `ChapterBody` | 계획대로. 범위 `data-*` 속성을 항상 노출하는 것은 구현 중 정함       |
| `src/entities/book`                                                        | 변경 없음                                                                                                                                                                      | 계획의 `VisibleRange` 타입은 "필요하면"이었고 만들지 않음            |
| `docs/architecture.md`                                                     | "리더 (Phase 07)" 절, 폴더 구조에 `shared/lib/dom`                                                                                                                             | 계획대로                                                             |
| `docs/phases/07-book-reader.md`                                            | 계획 변경 기록(`3a1f81c`), 작업 단계 체크                                                                                                                                      | 계획대로                                                             |

### 1.2 완료 기준 확인 방법

| #   | 완료 기준                                                                                                                       | 확인 방법                                                                                                                                                                                                                                                                                             | 결과 |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`가 통과한다                                                     | `aaafe12`를 별도 worktree에 체크아웃하고 `pnpm install --frozen-lockfile` 후 네 명령의 종료 코드 확인                                                                                                                                                                                                 |      |
| 2   | 리더 화면에 세로 스크롤이 없고, 어느 쪽에서도 글줄이 잘리지 않는다 (375×812, 768×1024, 1024×768, 1440×900)                      | 네 크기에서 `document.scrollingElement.scrollHeight === clientHeight`, 보이는 영역(`[role=region]`) 경계에 걸쳐 잘린 줄이 있는지 각 문장 `getClientRects()`의 위·아래가 영역 안인지로 검사. 세 권 × 처음·중간·끝 쪽. 스크린샷                                                                         |      |
| 3   | 1440×900, 1024×768에서는 두 쪽, 375×812, 768×1024에서는 한 쪽                                                                   | 각 크기에서 보이는 영역 안의 단(쪽) 수를 문장 위치로 셈. 1023×768(기준 바로 아래), 1200×1300(넓지만 세로)도 한 쪽인지 추가 확인                                                                                                                                                                       |      |
| 4   | 768×1024 ↔ 1024×768로 돌리면 모드가 바뀌고, 돌리기 전 첫 문장이 돌린 뒤에도 보인다. 창 크기를 바꿔도 마찬가지                   | 「봄·봄」 2장 중간에서 `data-first-sentence`를 기록하고 크기를 바꾼 뒤 그 문장이 보이는 범위에 드는지. 왕복(768 → 1024 → 768)했을 때 처음 쪽으로 돌아오는지(같은 문장에서 점점 앞으로 밀리지 않는지)도 확인. 챕터 마지막 쪽에서 크기를 바꿔도 마지막 쪽에 남는지                                      |      |
| 5   | 버튼, `←`/`→`, `PageUp`/`PageDown`, `Space`, 좌우 탭으로 넘어가고 약 300ms 미끄러진다. `prefers-reduced-motion`이면 바로 바뀐다 | 입력마다 `s`와 `data-first-sentence`가 바뀌는지. 슬라이드 시간은 창을 앞에 둔 상태(`tabs_context`로 표시 확인)에서 `getAnimations()`/`transitionend` 시각 차로 측정. `resize_window`나 CDP 에뮬레이션이 안 되면 reduced motion은 `matchMedia`를 덮어써 넘김 직후 `transform`이 바로 목표값인지로 확인 |      |
| 6   | 끌면 쪽이 따라오고, 20%를 넘기거나 빠르게 튕기면 넘어가며, 짧게 끌면 돌아온다. 책 처음·끝에서는 넘어가지 않는다                 | `PointerEvent`를 보내 (가) 25% 천천히 → 넘김, (나) 10% 빠르게(> 0.5px/ms) → 넘김, (다) 10% 천천히 → 제자리, (라) 책 첫 쪽에서 오른쪽 끌기 → 1/3만 따라오고 제자리, (마) 세로로 더 많이 움직이면 드래그가 아님. 끈 뒤 `--drag-dx`·`data-settling`·인라인 `transition`이 남지 않는지                    |      |
| 7   | 두 쪽 모드에서 두 쪽씩 넘어가고, 챕터는 왼쪽 쪽에서 시작하며, 홀수 쪽 챕터의 마지막 오른쪽 쪽은 비어 있다                       | 1440×900에서 넘길 때마다 쪽수 표시가 `1–2`, `3–4`…로 바뀌는지. 세 권 9챕터의 쪽 수를 기록해 홀수인 챕터의 마지막 펼침에서 오른쪽 단에 문장이 없는지. 홀수 챕터가 없으면 창 높이를 바꿔 만든다                                                                                                         |      |
| 8   | 챕터 마지막 쪽에서 넘기면 다음 챕터 첫 쪽이 같은 방향으로 들어오고, 첫 쪽에서 이전으로 가면 이전 챕터 마지막 쪽이 나온다        | 버튼·키보드·드래그 각각으로 경계를 넘김. 들어오는 래퍼의 애니메이션 클래스(`slide-in-from-right`/`left`), 결과 `chapter`·`s`, 방문 기록(챕터 바꿈만 `push`, 뒤로 가기로 이전 챕터), 다음 챕터 본문 요청이 경계 전에 이미 나갔는지(네트워크 로그)                                                      |      |
| 9   | 넘기면 URL의 `s`가 보이는 첫 문장 번호로 바뀌고, 새로고침하면 같은 쪽이 나온다                                                  | 넘길 때마다 `s` = `data-first-sentence`인지, `history.length`가 늘지 않는지(`replace`). 한 쪽·두 쪽 모드 각각 3곳에서 새로고침해 쪽수 표시와 범위가 같은지. 잘못된 `s`(`-1`, 다른 챕터 범위, 문자열)와 잘못된 `chapter`가 계획대로 처리되는지                                                         |      |
| 10  | 계산한 `first_sentence`·`last_sentence`가 실제로 보이는 첫·마지막 문장과 같다 (한 쪽·두 쪽 각 5곳 이상)                         | 보이는 영역의 `getBoundingClientRect()`와 각 문장 `getClientRects()`가 겹치는 문장의 최소·최대 `idx`를 스크립트로 구해 `data-*` 속성과 비교. 한 쪽(375×812)·두 쪽(1440×900) 각 5곳 이상, 쪽을 걸치는 문장이 있는 곳을 일부러 포함                                                                     |      |
| 11  | 목차에서 챕터를 누르면 첫 쪽으로 가고 서랍이 닫힌다. 서랍은 키보드로 열고 닫고 포커스가 갇힌다                                  | Tab으로 목차 버튼 → Enter → Tab을 여러 번 눌러 포커스가 서랍 밖으로 나가지 않는지, 현재 챕터 표시(`aria-current`), Esc로 닫을 때 목차 버튼으로 돌아오는지, 챕터 선택 시 `s`가 그 챕터 `first_sentence`인지                                                                                            |      |
| 12  | 쪽수 표시가 스크린 리더에 읽히고(`aria-live`), Tab이 화면 밖 쪽으로 가지 않는다                                                 | 하단 막대의 `aria-live`·`sr-only` 문구 확인. Tab 순서 전체 기록(본문 안에 멈추는 곳이 없는지). `[role=region]`의 `overflow` 계산값이 `clip`인지, `scrollLeft`가 넘긴 뒤에도 0인지. Ctrl+F 대신 `window.find()`로 화면 밖 쪽의 글을 찾았을 때 띠가 스크롤되는지                                        |      |
| 13  | 제품 레이어에 `useEffect`·타이머가 없다. 라이트·다크 모두 의미 토큰만 쓴다                                                      | `pnpm lint` 통과 + 변경 파일에서 팔레트 클래스·`#hex`·`rgb(` 검색(`index.css` 제외). 라이트·다크에서 리더, 목차 서랍(배경 `overlay`), 마지막 쪽 안내, 에러 화면 스크린샷                                                                                                                              |      |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                                         | 확인 방법                                                                                                                                                                                                 | 결과 |
| ------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| FSD    | 레이어 방향, 슬라이스 간 import, Public API, 상대 경로            | `pnpm lint:fsd` 통과. `shared/lib/dom`·`shared/ui/sheet`가 위 레이어를 import 하지 않는지, `pages/book-reader`가 `@/entities/book/` 내부 경로를 쓰지 않는지 `grep`                                        |      |
| FSD    | 둘 곳이 맞는가                                                    | `shared/lib/dom` 훅에 책·리더 같은 비즈니스 지식이 없는지. 리더 전용 계산이 `pages/book-reader/lib`에만 있는지                                                                                            |      |
| 디자인 | 색은 의미 토큰만 쓴다                                             | 1.2 #13                                                                                                                                                                                                   |      |
| 디자인 | 디자인 시스템 규칙 (모서리·그림자 없음, 움직임 5장, 여백 2.2·2.3) | 새 UI에서 `rounded`·`shadow` 검색. 슬라이드 300ms `ease-in-out`, 서랍 전환이 5장 "이동"과 맞는지. 두 쪽 사이에 선·그림자가 없는지. `overlay` 값이 design-system 1.2 표와 같은지                           |      |
| 접근성 | 대비                                                              | 새 조합: 서랍(`background` 면, `overlay` 위), 하단 막대 쪽수(`muted-foreground`), 비활성 버튼, 마지막 쪽 안내. 1.7 표에 없으면 계산                                                                       |      |
| 접근성 | 키보드·의미 구조                                                  | 1.2 #5, #11, #12. 아이콘 버튼 `aria-label`("이전 페이지", "다음 페이지", "목차", "닫기"), 제목 단계(리더 화면의 `h1`이 무엇인지), `role="region"` `aria-label="본문"`, 포커스 링이 모든 컨트롤에 보이는지 |      |
| 접근성 | 확대                                                              | 본문 영역 `touch-action`이 계획(`pan-y pinch-zoom`)과 같은지. 지금 클래스는 `touch-pan-y`뿐이라 핀치 확대가 막히는지 확인 (1.4 참고). 브라우저 확대 200%에서 쪽이 다시 나뉘고 잘리지 않는지               |      |
| 상태   | 로딩, 에러, 마지막 쪽                                             | 책 정보 로딩(`aria-busy`), 본문 로딩 스켈레톤, 쪽 계산 전 숨김(`invisible`), 401·404·500(`diegesis-mock` 시나리오), 본문만 실패, 마지막 쪽 안내                                                           |      |
| 보안   | 새 의존성 없음                                                    | `package.json`·`pnpm-lock.yaml`·`pnpm-workspace.yaml` diff 없음. `sheet`가 이미 설치된 `radix-ui`만 쓰는지                                                                                                |      |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                                 | diff에서 `token\|secret\|password\|key=` 검색. `.env*` 커밋 없음                                                                                                                                          |      |

### 1.4 이번 변경에서 특히 볼 것

- **ref 콜백 측정**: `use-pagination`은 키가 바뀌면 새 콜백을 만들어 커밋 직후 잰다. 키에 들어가지 않는 변화(본문 데이터가 같은 키로 다시 들어옴, 글꼴 로딩 뒤 줄바꿈이 바뀌었는데 `fontsReady`가 이미 `true`)에서 쪽 표가 낡지 않는지. React 19 Strict Mode에서 ref 콜백이 두 번 불려도 문제없는지, 정리 함수를 돌려주는지.
- **`transitionend`에 기대는 상태**: 챕터 경계의 `leaving` → 챕터 전환은 `transitionend`가 와야 끝난다. 전환이 시작되지 않는 경우(같은 `transform` 값, 탭이 백그라운드라 전환이 건너뛰어짐, 경계 중에 창 크기 변경, 자식 요소의 `transitionend` 버블링)에 `leaving`에 갇히지 않는지. reduced motion이 슬라이드 도중 바뀌면 어떻게 되는지.
- **연타와 겹친 입력**: 슬라이드 중 다시 넘기기, 드래그 중 키보드, 경계 `leaving` 중 목차 이동이나 뒤로 가기. `turn`이 진행 중 상태를 무시하거나 올바르게 이어 가는지.
- **`data-settling`과 인라인 스타일 정리**: 놓은 뒤 전환이 없는 경우(거리 0, `pointercancel`)에도 `--drag-dx`·`transition: none`이 지워지는지. 지워지지 않으면 다음 넘김이 미끄러지지 않는다.
- **드래그 판정**: 가로 10px·세로보다 많이 움직임 기준, `setPointerCapture` 뒤 버튼·링크 클릭이 막히지 않는지(하단 막대는 무대 밖이지만 무대 위에 다른 컨트롤이 없는지), 마우스 오른쪽 버튼·멀티 터치를 무시하는지, 드래그 끝에 `click`이 탭으로 다시 처리되지 않는지.
- **`touch-action` 계획과 다름**: 계획은 `pan-y pinch-zoom`, 구현은 `touch-pan-y`. `pan-y`만 있으면 핀치 확대가 막혀 WCAG 1.4.4(텍스트 크기 조정)에 걸릴 수 있다.
- **iOS 가장자리 뒤로 가기**: 화면 왼쪽 끝에서 오른쪽으로 끄는 제스처와 "이전 페이지" 드래그가 겹친다. 기기가 없어 코드로만 판단할 수 있다면 가장자리 몇 px를 드래그 시작에서 뺄지 결정한다.
- **`100dvh`와 모바일 주소창**: 주소창이 접히고 펴질 때마다 높이가 바뀌어 다시 나뉜다. 다시 나뉠 때 미끄러짐 없이 같은 문장으로 돌아오는지(크기 변경은 `animate`가 꺼져야 함), 깜빡임이 있는지 높이를 몇 번 바꿔 확인.
- **`overflow: clip`과 찾기**: 화면 밖 쪽의 글은 Ctrl+F로 찾아져도 보이지 않는다. 찾기가 띠를 스크롤하지 못하는 대신 찾은 글이 안 보이는 한계를 기록한다. 바깥 무대가 `overflow-hidden`이라 무대 쪽이 스크롤될 여지는 없는지.
- **보이는 범위 경계**: 다단의 단 위치를 `floor((left + 1) / stride)`로 쪽을 정한다. 소수점 너비, 브라우저 확대, `devicePixelRatio`가 다를 때 한 쪽씩 밀리지 않는지. 쪽을 걸치는 문장이 두 쪽 범위에 모두 들어가는지, 빈 쪽(홀수 챕터 마지막 오른쪽)이 범위를 깨지 않는지.
- **`data-*` 범위 속성을 항상 노출**: 개발 전용이 아니라 배포에도 나간다. 계산 전(`layout` 없음)에 낡은 값이나 빈 값이 나가는지, 음악 phase가 이 값을 믿어도 되는지.
- **`last_position` 이어 읽기와 URL**: `?chapter` 없이 들어오면 `last_position`의 쪽으로 열리고, 첫 넘김 전에는 URL에 `s`가 없다. 이때 새로고침하면 서버 값에 기대는지, 챕터 링크만 있는 URL(`?chapter=2`)은 `last_position`을 무시하는지.
- **미리 받기 시점**: 다음 챕터는 마지막 2쪽(펼침)에 이를 때, 이전 챕터는 1쪽 이하에서 `prefetchQuery`. 목차로 바로 이동하거나 URL로 마지막 쪽에 들어왔을 때는 넘김이 없어 미리 받지 않는데, 그때 경계 넘김이 기다리는지(로딩 중 띠가 빈 화면으로 미끄러지는지).
- **창 keydown과 목차 판정**: 목차가 열렸는지를 `document.querySelector('[data-reader-toc][data-state="open"]')`로 본다. 다른 Radix 대화상자(앞으로 생길 것)가 열렸을 때도 키가 먹는 문제가 있는지. `Space`로 화면이 스크롤되지 않는지(`preventDefault`), IME 조합 중(`isComposing`) 키를 무시하는지.
- **`overlay` 토큰과 PR #17 충돌**: 열려 있는 PR #17(`design/15-focus-ring-contrast`, phase 08)도 `src/app/styles/index.css`와 `docs/design-system.md`를 고친다. 머지 순서에 따라 충돌이 나는 줄이 있는지 `git merge-tree`로 미리 본다. 08이 바꾸는 `--ring`과 이번 `sheet` 닫기 버튼·하단 막대 버튼의 포커스 링이 어떻게 맞물리는지.
- **`sheet` 고친 부분**: shadcn 원본과 비교해 접근성 속성(`SheetTitle`, `SheetDescription` 또는 `aria-describedby={undefined}`)이 빠져 Radix 경고가 콘솔에 나오지 않는지. 서랍 폭이 375px 화면에서 넘치지 않는지.
- **라우트 이동의 부작용**: 리더가 `RootLayout` 밖으로 나가 `ScrollRestoration`이 없다. 리더 → 목록 → 뒤로 가기에서 목록 스크롤 복원이 여전히 되는지. 리더 안의 404·에러 경계(`RouteErrorPage`)가 리더 레이아웃 없이도 돌아갈 길을 주는지.
- **문서와 코드 이름**: phase가 말한 `paginate`·`spreadOf`가 다른 이름으로 구현되었다. architecture.md와 phase 문서가 실제 이름과 맞는지.
- **작업 절차**: 05 브랜치의 `scripts/check-process.mjs`로 PR 설명까지 넣어 검사(`--body-file`). PR 설명에 `Closes #14`, phase·리뷰 문서 링크.

#### 1.4 결과

(리뷰 실행 후 기록)

## 2. 발견 사항

| #   | 심각도 | 위치 | 내용 | 조치 |
| --- | ------ | ---- | ---- | ---- |

## 3. 확인 못 한 것

(리뷰 실행 후 기록)

## 4. 결론

(리뷰 실행 후 기록)
