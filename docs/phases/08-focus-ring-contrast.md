# Phase 08: 포커스 표시 대비

- 상태: 리뷰 중
- 선행 phase: 없음 (06이 먼저 `main`에 머지되면 06의 책 카드·책 페이지 링크까지 이 phase에서 정리한다. 작업 단계 5 참고)
- 관련 이슈: [#15 포커스 표시 대비](https://github.com/diegesis-labs/FE/issues/15)
- 브랜치: `design/15-focus-ring-contrast`
- 계획 커밋: `e80c768`
- 구현 커밋: `aed20b0`
- 리뷰 문서: [08-focus-ring-contrast-review.md](../reviews/08-focus-ring-contrast-review.md) (리뷰 단계에서 작성)

## 목표

키보드로 이동할 때 보이는 포커스 표시가 라이트·다크의 모든 바탕에서 WCAG 1.4.11(비텍스트 대비 3:1) 이상이 된다. 포커스 스타일을 따로 주지 않은 링크도 같은 표시를 받는다.

## 배경

- Phase 06 리뷰 발견 6 ([06-book-list-review.md](../reviews/06-book-list-review.md)): 포커스 링 색 `ring` = `line-strong` = 라이트 `rgb(51 51 51 / 0.35)`는 크림 바탕에서 1.99:1이다. 06 전부터 있던 문제이고 디자인 토큰을 바꾸는 일이라 06에서 고치지 않았다.
- 전역 기본값 `* { outline-ring/50 }` 때문에 포커스 스타일이 없는 링크(헤더 워드마크 등)는 이 색의 50%(1.38:1) outline만 보인다.
- 다시 계산해 보니 다크 값 `rgb(255 254 241 / 0.4)`도 `pine-950`(3.51), `pine-900`(3.29), `pine-800`(3.04)은 통과하지만 `pine-700`(hover·선택 면) 위에서는 **2.79**로 모자란다.

### 계산 (WCAG 상대 휘도, 투명색은 sRGB에서 바탕과 섞은 값)

라이트 (바탕 `cream-50` / `cream-100` / `cream-200`)

| 후보                         | 대비                   | 판정            |
| ---------------------------- | ---------------------- | --------------- |
| 지금 `rgb(51 51 51 / 0.35)`  | 1.99 / 1.96 / 1.93     | 실패            |
| 지금 전역 outline (위의 50%) | 1.38 / 1.37 / 1.36     | 실패            |
| `rgb(51 51 51 / 0.55)`       | 3.23 / 3.15 / 3.05     | 겨우 통과       |
| `rgb(51 51 51 / 0.6)`        | 3.69 / 3.59 / 3.45     | 통과            |
| **`charcoal-500`** (불투명)  | **5.66 / 5.27 / 4.75** | 통과, 채택      |
| `charcoal-800` (불투명)      | 12.45 / 11.59 / 10.44  | 통과, 너무 강함 |

다크 (바탕 `pine-950` / `pine-900` / `pine-800` / `pine-700`)

| 후보                          | 대비                          | 판정            |
| ----------------------------- | ----------------------------- | --------------- |
| 지금 `rgb(255 254 241 / 0.4)` | 3.51 / 3.29 / 3.04 / **2.79** | `pine-700` 실패 |
| `rgb(255 254 241 / 0.55)`     | 5.36 / 4.87 / 4.37 / 3.90     | 통과            |
| **`pine-300`** (불투명)       | **8.06 / 6.90 / 5.84 / 4.91** | 통과, 채택      |

## 범위

### 하는 것

- `ring`(와 같은 값을 쓰는 `sidebar-ring`) 토큰 값을 라이트 `charcoal-500`, 다크 `pine-300`으로 바꾼다. 둘 다 이미 `muted-foreground`로 쓰는 색이라 새 색이 늘지 않고, 글자 보조색과 같은 무게라 "조용하게" 원칙에 맞는다. 투명색 대신 불투명색을 고른 이유: 바탕이 바뀌어도 대비가 일정해서 표 한 줄로 보장할 수 있다.
- 포커스 표시 방식을 하나로 정한다: **`:focus-visible`에 2px 실선 outline, 바깥으로 2px 띄움** (`outline-2 outline-offset-2 outline-ring`). `index.css`의 `@layer base`에 전역으로 둔다.
  - 띄우는 이유: 링이 버튼 면에 붙으면 면 색과 링 색의 대비가 문제된다 (`charcoal-500` 대 `wood-500` 브랜드 버튼 1.16, `brick-600` 위험 버튼 1.03). 2px 틈에 페이지 바탕이 보이므로 링은 항상 바탕 하고만 맞닿는다.
  - box-shadow 링(`ring-[3px]`) 대신 outline을 쓰는 이유: 고대비 모드(forced-colors)에서 box-shadow는 사라지고 outline은 남는다. 3px 면보다 2px 선이 "면과 얇은 선으로 구분한다"(0장, 2.3)에 맞는다. 그림자를 쓰지 않는 원칙과도 겹치지 않는다.
- `shared/ui/button.tsx`에서 `outline-none focus-visible:ring-[3px] focus-visible:ring-ring`을 빼고 전역 표시를 쓴다.
- `docs/design-system.md`: 1.2 `line-strong` 줄 정리(포커스 링 전용이었음), 1.5 `ring` 줄 갱신, 1.7에 "포커스 링 (비텍스트, 3:1)" 표 추가, 4장에 포커스 표시 규칙(4.6) 추가.

### 하지 않는 것

- 입력창 포커스(4.2 "테두리를 `charcoal-800`으로")는 아직 입력창이 없어 손대지 않는다.
- 포커스 스타일을 lint로 강제하는 가드레일(예: `focus-visible:ring` 금지)은 만들지 않는다. 다시 생기면 그때 가드레일로 만든다.
- 다른 색 토큰, 버튼 모양, hover 동작은 바꾸지 않는다.
- 06이 머지되지 않은 상태로 구현이 끝나면 06의 `BookCard`·`BookReaderPage` 코드는 이 브랜치에서 고치지 않는다 (아래 위험 참고).

## 설계

### FSD 배치

| 레이어                | 위치                                      | 바꿀 것                                                            |
| --------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| app                   | `app/styles/index.css`                    | `--ring`, `--sidebar-ring` 값 (라이트·다크), 전역 `:focus-visible` |
| shared                | `shared/ui/button.tsx`                    | 자체 포커스 링 클래스 제거                                         |
| (06 머지 시) entities | `entities/book/ui/BookCard.tsx`           | 자체 포커스 링 클래스 제거                                         |
| (06 머지 시) pages    | `pages/book-reader/ui/BookReaderPage.tsx` | `FOCUS_RING` 상수 제거                                             |

헤더 워드마크(`widgets/header`)와 404의 "홈으로" 링크는 코드 변경 없이 전역 표시를 받는다.

### API

없음.

### 화면과 상태

포커스 상태만 바뀐다. 마우스 클릭에는 표시가 나오지 않는다(`:focus-visible`).

### 새 의존성

없음.

## 작업 단계

- [x] 1. `index.css`: `--ring`·`--sidebar-ring`을 라이트 `var(--color-charcoal-500)`, 다크 `var(--color-pine-300)`으로 바꾼다.
- [x] 2. `index.css` `@layer base`: `* { outline-ring/50 }`을 `outline-ring`으로, `:focus-visible { outline-2 outline-offset-2 }`를 추가한다.
- [x] 3. `button.tsx`: 자체 포커스 링 클래스를 뺀다.
- [x] 4. `docs/design-system.md` 1.2, 1.5, 1.7, 4.6을 고친다. 대비 값은 위 계산을 옮긴다.
- [x] 5. (건너뜀: 구현 시작 때 `main`은 `c7b7231`로 06 머지 전. PR에 후속 작업으로 남긴다) 구현 시작 전에 06이 `main`에 머지됐으면 `main`을 받아 `BookCard`, `BookReaderPage`의 자체 포커스 링도 빼고 전역 표시로 통일한다. 머지 전이면 건너뛰고 PR에 후속 작업으로 남긴다.
- [x] 6. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- [x] 7. 브라우저에서 라이트·다크로 Tab을 돌며 헤더 워드마크, 테마 버튼, 404 "홈으로" 링크(outline 버튼), (06 머지 시) 책 카드·글자 링크의 포커스 표시를 스크린샷으로 남기고, 계산한 색이 실제로 그려지는지 `getComputedStyle`로 확인한다.

## 완료 기준

- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`가 통과한다.
- [ ] 라이트 `ring`이 `cream-50`·`cream-100`·`cream-200` 위에서, 다크 `ring`이 `pine-950`·`pine-900`·`pine-800`·`pine-700` 위에서 모두 3:1 이상이다 (design-system 1.7 표에 값이 있다).
- [ ] 포커스 스타일을 따로 주지 않은 링크(헤더 워드마크)도 2px `ring` outline을 받는다.
- [ ] 버튼의 포커스 표시가 면에서 2px 떨어져 그려져, 브랜드·위험 버튼에서도 링이 바탕과만 맞닿는다.
- [ ] 마우스 클릭 때는 포커스 표시가 나오지 않는다.
- [ ] 라이트·다크 스크린샷이 리뷰 문서에 기록돼 있다.

## 위험과 열린 질문

- **06과의 충돌**: 06 브랜치의 `BookCard`, `BookReaderPage`는 `outline-none focus-visible:ring-[3px] focus-visible:ring-ring`을 쓴다. 이 phase가 먼저 머지돼도 토큰 색이 바뀌므로 3:1은 넘는다. 다만 표시 방식이 두 가지(3px 면 링 / 2px outline)로 갈리므로, 06 머지 후 두 파일의 클래스를 빼는 작은 후속 작업이 필요하다.
- **잘리는 outline**: `overflow-hidden` 부모 안의 요소는 바깥으로 띄운 outline이 잘릴 수 있다. main에는 해당 요소가 없다. 06의 카드는 리뷰 때 확인한다.
- 링 색이 보조 글자색과 같아, 보조 글자 링크 바로 옆에서는 구분이 약할 수 있다. 2px 틈과 실선 모양으로 구분된다고 보고, 스크린샷으로 확인한다.

## 변경 기록

- 2026-11-22: 작성, 승인
- 2026-11-22: 구현 완료 (`aed20b0`). 작업 단계 5는 06 머지 전이라 건너뜀
