# Review 09: 포커스 표시 가드레일

- 대상 phase: [09-focus-style-guardrail.md](../phases/09-focus-style-guardrail.md)
- 리뷰 대상: 브랜치 `setup/19-focus-style-guardrail`, 기준 커밋 `b12e01a` (phase의 구현 커밋)
- 리뷰 계획 커밋: `7181760`
- 작성일: 2026-11-23
- 결과: 통과

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff ecc841f..b12e01a` 기준 7개 파일.

- `eslint.config.js`: 정규식 상수 `CLASS_START`, `OUTLINE_OFF`, `FOCUS_RING`, 메시지 `MSG.focus`, `focusSyntax`를 추가하고 `SRC` 블록과 제품 레이어 블록의 `no-restricted-syntax`에 넣었다.
- `scripts/check-guardrails.mjs`: 포커스 사례 14개 (걸려야 함 10, 통과해야 함 4).
- `src/entities/book/ui/BookCard.tsx`: `outline-none focus-visible:ring-[3px] focus-visible:ring-ring` 삭제.
- `src/pages/book-reader/ui/BookReaderPage.tsx`: `FOCUS_RING` 상수와 주석 삭제, 두 링크의 className에서 제거.
- `docs/guardrails.md`, `docs/design-system.md` 4.6, `CLAUDE.md`(shadcn 추가 줄).

계획과 다른 점: 변형 접두사 정규식을 `[\w-]+:`에서 `\S*:`로 넓혔고 `!`(important) 표기를 받는다 (phase 변경 기록에 적음). 통과 사례에 계획의 `outline-offset-2`·`group-focus-visible:`·`focus-visible:bg-*`를 함께 넣었다.

### 1.2 완료 기준 확인 방법

| #   | 완료 기준                                                                                                       | 확인 방법                                                                                                                                                                                                       | 결과                                                                                                                                                                                                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`가 통과한다                                     | `b12e01a`에서 네 명령 종료 코드. PR CI `check`                                                                                                                                                                  | 통과. `b12e01a`에서 네 명령 모두 종료 코드 0 (lint: steiger `No problems found!`, 가드레일 52개 사례 통과). CI는 PR에서 확인                                                                                                                                                                                                            |
| 2   | `src/**` 어디서든 금지 클래스가 있으면 `pnpm lint`가 에러를 내고, 메시지가 대신 쓸 것을 알려 준다               | 사례와 별도로 임시 파일을 레이어별(`shared/ui`, `app`, `entities`, `pages`)로 만들어 `eslint`를 돌리고 메시지 확인 후 삭제. JSX `className="..."`, `cn('...')` 인자, 템플릿 문자열, `cva` 객체 안의 문자열 각각 | 통과. 임시 파일 3개(`shared/ui`, `entities`, `app`)로 확인 후 삭제. `cva()` 기본 문자열과 variants 객체 안 문자열, `cn()` 인자, 템플릿 문자열(`${}` 뒤), JSX 문자열, `outline-none!`, `focus-within:ring-offset-1` 모두 에러 6개. 메시지에 클래스 삭제, `focus-visible:-outline-offset-2`, design-system 4.6이 나옴                     |
| 3   | 테두리용 `ring-1`, `focus-visible:border-ring`, `-outline-offset-2`, `aria-invalid:ring-*`는 걸리지 않는다      | 2와 같은 임시 파일에 통과해야 하는 클래스를 넣어 에러 0. shadcn `button.tsx`의 `aria-invalid:ring-*`가 걸리지 않는 것은 `pnpm lint` 통과로 확인                                                                 | 통과. `ring-1 ring-border`, `focus-visible:border-ring`, `focus-visible:-outline-offset-2`, `aria-invalid:ring-destructive/20`, `focus-visible:outline-ring`, `focus-visible:outline-2`, `group-focus-visible:ring-2`, `peer-focus:ring`, 문구 `'string focus: ring'`, `outline-nonesense` 모두 에러 0. `button.tsx`도 `pnpm lint` 통과 |
| 4   | `check-guardrails.mjs`에 사례가 있고, 제품 레이어 블록에서 규칙을 빼면 사례가 실패한다                          | 사례 목록 읽기. `eslint.config.js`에서 블록별로 `...focusSyntax`를 지워 실패 개수 확인 후 되돌림 (`git diff`로 원상 확인)                                                                                       | 통과. 사례 14개(걸려야 함 10, 통과 4). 제품 레이어 블록에서 `...focusSyntax`를 빼면 6개, `SRC` 블록에서 빼면 4개 실패. 되돌린 뒤 `git status` 깨끗함                                                                                                                                                                                    |
| 5   | `src/`에 `outline-none`과 `focus-visible:ring`이 남아 있지 않다                                                 | `grep -rn "outline-none\|outline-hidden\|focus[a-z-]*:ring" src`                                                                                                                                                | 통과. `grep -rnE 'outline-none                                                                                                                                                                                                                                                                                                          | outline-hidden | focus[a-z-]*:ring' src` 0건 |
| 6   | 책 카드와 리더 글자 링크의 키보드 포커스가 2px `ring` outline, 2px offset, `box-shadow: none`이다 (라이트·다크) | 구현 때 브라우저에서 확인한 값(phase 변경 기록)을 근거로 쓰고, 마우스 클릭에는 outline이 없는지 추가 확인                                                                                                       | 통과. 구현 때 브라우저 확인: 책 카드, 리더 `책 목록`·`2장` 링크가 라이트 `rgb(102,102,102)`·다크 `rgb(185,194,184)` solid 2px, offset 2px, `box-shadow: none`, `:focus-visible` true. 확대 스크린샷에서 카드 둘레에 틈을 두고 선이 보임. 마우스 클릭 동작은 전역 `:focus-visible` 그대로라 08에서 확인한 결과를 따름                    |
| 7   | guardrails.md, design-system.md 4.6, CLAUDE.md가 새 규칙을 설명한다                                             | 세 문서의 diff 읽기. 링크가 깨지지 않았는지, 문서의 예외 설명(안쪽 outline)과 규칙의 허용 목록이 같은지                                                                                                         | 통과. guardrails.md 새 줄(허용·못 잡는 것 포함), design-system 4.6에 lint 문장과 `-outline-offset-2` 예외(대비 근거 1.7), CLAUDE.md shadcn 줄. 문서의 허용 목록과 규칙 동작(2·3)이 같음. 상대 링크 `guardrails.md`는 `docs/` 안이라 맞음                                                                                                |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                                            | 확인 방법                                    | 결과                                                    |
| ------ | -------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| FSD    | 아래 레이어가 위 레이어를 import 하지 않는다                         | import 변경 없음을 diff로 확인, steiger 통과 | 통과. `src` import 변경 없음, steiger 통과              |
| FSD    | 같은 레이어 슬라이스끼리 import 하지 않는다                          | 위와 같음                                    | 통과. `src` import 변경 없음, steiger 통과              |
| FSD    | 슬라이스 밖에서는 `index.ts`로만 import 한다                         | 위와 같음                                    | 통과. `src` import 변경 없음, steiger 통과              |
| 디자인 | 색은 의미 토큰만 쓴다 (`#hex`, 팔레트 직접 사용 없음)                | 색 가드레일 통과                             | 통과. 색 가드레일 통과, 새 색 클래스 없음               |
| 디자인 | 라이트/다크 둘 다 깨지지 않는다                                      | 1.2의 6                                      | 통과 (1.2의 6)                                          |
| 접근성 | 글자 대비 4.5:1 이상, 키보드로 조작 가능, 아이콘 버튼에 `aria-label` | 글자 색 변경 없음을 diff로 확인. 1.2의 6     | 통과. 글자 색 클래스 변경 없음. 키보드 포커스는 1.2의 6 |
| 상태   | 로딩, 빈 상태, 에러 상태가 있다                                      | 해당 없음 (화면 상태 변경 없음)              | 해당 없음                                               |
| 보안   | 새 의존성이 phase 문서에 적혀 있고 확인되었다                        | `package.json`, lockfile diff 없음           | 통과. `package.json`, `pnpm-lock.yaml` 변경 없음        |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                                    | diff 검색                                    | 통과. diff에 토큰·비밀값 없음                           |

### 1.4 이번 변경에서 특히 볼 것

- **정규식 오탐과 누락**: `focus-visible:outline-ring`, `focus-visible:outline-2`(색·굵기 조정)는 허용되는지. `group-focus-visible:ring-2`, `peer-focus:ring`은 걸리지 않는데 이게 의도한 동작인지. `ring` 단어가 클래스가 아닌 문자열(`'string'`, `'focus: ring'`)에서 오탐하지 않는지.
- **esquery 정규식 파싱**: 셀렉터 안 정규식에 `/`가 없어야 하고, `\S`·`!?`·`(…)?`가 esquery에서 그대로 동작하는지 (사례가 통과하면 동작).
- **덮어쓰기 함정**: 같은 규칙을 두 블록에서 쓰므로 제품 레이어 블록이 `SRC` 블록 옵션을 덮어쓴다. 두 블록 모두 `focusSyntax`가 있는지.
- **07(PR #18)에 미치는 영향**: 07 브랜치를 `main`+09 위에 올리면 어떤 파일이 걸리는지 `git merge-tree`나 임시 worktree로 미리 세어 둔다 (고치지는 않음).
- **문서 스캔**: Tailwind가 `docs/`를 스캔하므로 새 문서 문구의 클래스 이름이 CSS 규칙을 만든다 (08 발견 2와 같은 종류). 양과 영향 확인.

## 2. 발견 사항

| #   | 심각도 | 위치                                          | 내용                                                                                                                                                                                                                                                                                                 | 조치                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 낮음   | `src/pages/book-reader/ui/BookReaderPage.tsx` | 07(PR #18) 브랜치와 이 파일에서 충돌한다. 07은 이미 `main`(PR #17)을 받아 리더의 자체 링을 지웠고(`cdf0fcf`) 이 파일을 크게 다시 썼다. 09 규칙으로 07 최신(`7f4086c`)을 lint하면 `BookCard.tsx` 하나만 걸리고, 이것은 09가 고친다                                                                    | 그대로 둠. 나중에 머지되는 쪽이 이 파일은 07 쪽 내용을 택하면 된다 (09의 변경은 `FOCUS_RING` 삭제뿐이고 07에는 이미 없음)                                                                                                                                                                                                                                                                                   |
| 2   | 낮음   | Tailwind 소스 스캔 (`docs/`, `scripts/`)      | 가드레일 사례와 문서 문구에 쓴 클래스 이름으로, 쓰이지 않는 CSS 규칙 25개가 빌드에 생긴다 (`.outline-hidden`, `.focus\:ring-2:focus` 등). CSS 28,917 → 32,761바이트(압축 전). 08 발견 2와 같은 원인인데, 금지 클래스를 일부러 적는 사례 파일 때문에 양이 늘었다. 동작 영향은 없다 (쓰는 요소가 없음) | 다음 작업으로. `index.css`에 `@source not`으로 `docs/`, `scripts/`, `eslint.config.js`를 빼는 작은 변경. 08에 이어 두 번째라 따로 처리한다. **→ 처리함** (#21, `39d662e`): `@source not` 대신 `@import 'tailwindcss' source('../..')`로 `src`만 스캔한다. `CLAUDE.md`·`README.md`도 같은 문제라 빼는 목록보다 넣는 목록이 맞다. 빌드 CSS 38,962 → 28,154바이트, 빠진 규칙은 모두 `src`에서 쓰지 않는 클래스 |

## 3. 확인 못 한 것

- **PR CI**: 리뷰 결과를 쓰는 시점에는 PR을 아직 올리지 않았다. PR에서 확인한다.
- **마우스 클릭 시 outline 없음**: 이번에 다시 보지 않았다. 전역 `:focus-visible` 규칙은 바뀌지 않았고 08에서 확인했다.
- **고대비 모드(forced-colors)**: 08과 같은 이유로 보지 못했다.

## 4. 결론

통과. 자체 포커스 링과 `outline-none`이 `src` 어디서든 lint 에러가 되고, 남아 있던 두 곳은 전역 표시로 바뀌었다. 남은 일은 Tailwind가 `docs/`·`scripts/`를 스캔해 생기는 안 쓰는 CSS를 빼는 것(발견 2)이다.
