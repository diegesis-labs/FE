# Phase 09: 포커스 표시 가드레일

- 상태: 승인됨
- 선행 phase: [08 포커스 표시 대비](08-focus-ring-contrast.md) (완료, `main`에 머지됨)
- 관련 이슈: [#19 포커스 표시 가드레일](https://github.com/diegesis-labs/FE/issues/19)
- 브랜치: `setup/19-focus-style-guardrail`
- 계획 커밋: (승인 후 이 문서만 커밋·푸시한 해시)
- 구현 커밋: (구현 완료 후 커밋 해시)
- 리뷰 문서: [09-focus-style-guardrail-review.md](../reviews/09-focus-style-guardrail-review.md) (리뷰 단계에서 작성)

## 목표

컴포넌트가 전역 포커스 표시(design-system 4.6)를 끄거나 자체 링을 덧붙이면 `pnpm lint`와 CI가 실패한다. 새 컴포넌트를 만들거나 shadcn 컴포넌트를 받을 때 포커스 스타일을 사람이 기억해서 맞출 필요가 없어진다.

## 배경

- 08에서 포커스 표시를 `index.css`의 전역 `:focus-visible` 한 곳(2px `ring` outline, 2px offset)으로 모았다. 아무 클래스도 주지 않은 요소는 이 표시를 그대로 받는다.
- 문제는 컴포넌트가 직접 `outline-none focus-visible:ring-[3px] focus-visible:ring-ring`을 붙이는 경우다. 포커스 표시가 두 가지가 되고, box-shadow 링은 고대비 모드(forced-colors)에서 사라진다.
- 실제로 계속 생기고 있다.
  - `main`: `src/entities/book/ui/BookCard.tsx:19`, `src/pages/book-reader/ui/BookReaderPage.tsx:14-15` (06에서 생김, 08 리뷰 발견 1).
  - PR #18(07 리더, 아직 열려 있음): `ChapterToc`, `ReaderBottomBar`, `ReaderTopBar`, shadcn `sheet.tsx`에 같은 클래스를 새로 넣었다. 07 리뷰 발견 5는 "같은 실수가 두 번이라 규칙으로 막을 일"이라고 적었다.
  - shadcn CLI(`pnpm dlx shadcn@latest add`)로 받는 컴포넌트는 이 클래스가 기본으로 들어 있다.
- [guardrails.md](../guardrails.md) 원칙: 같은 실수를 두 번 고치게 되면 lint로 만들 수 있는지 먼저 본다.

## 범위

### 하는 것

- `eslint.config.js`에 포커스 규칙을 추가한다. 04의 색 규칙처럼 문자열(`Literal`, `TemplateElement`) 안의 클래스 이름을 검사하는 `no-restricted-syntax`이고, `src/**` 전체에 건다.
  - 금지 1: `outline-none`, `outline-hidden`. 변형 접두사가 붙어도 금지 (`focus-visible:outline-none` 등).
  - 금지 2: `focus`, `focus-visible`, `focus-within` 변형이 붙은 `ring`·`ring-*`·`ring-offset-*` (`focus-visible:ring-[3px]`, `focus:ring-2`, `focus-visible:ring-ring/50`, `focus-visible:ring-offset-2` 등).
  - 메시지에 대신 쓸 것을 적는다: "클래스를 지우면 전역 `:focus-visible` outline이 붙는다. 스크롤 영역 안처럼 바깥 outline이 잘리면 `focus-visible:-outline-offset-2`로 안쪽에 그린다. design-system 4.6".
- 허용(걸리지 않아야 함): 포커스 변형이 없는 `ring-1 ring-border` 같은 테두리용 링, `focus-visible:border-ring`, `outline-offset-*`·`-outline-offset-*` 조정, `aria-invalid:ring-*` 같은 비포커스 변형.
- `scripts/check-guardrails.mjs`에 걸려야 하는 사례와 통과해야 하는 사례를 넣는다. 제품 레이어와 `shared/ui` 양쪽 경로로 넣어서, 제품 레이어 블록의 덮어쓰기 함정(04 위험 1)에도 규칙이 남는지 본다.
- `main`에 있는 위반 두 곳을 고친다: `BookCard.tsx`, `BookReaderPage.tsx`의 `outline-none focus-visible:ring-[3px] focus-visible:ring-ring`, `FOCUS_RING` 상수, 지워진 `outline-ring/50`을 가리키는 주석.
- 문서
  - [guardrails.md](../guardrails.md) 코드 규칙 표에 "포커스 표시는 전역 `:focus-visible`만 쓴다" 줄을 추가한다.
  - [design-system.md](../design-system.md) 4.6에 lint가 막는다는 것과 안쪽 outline(`-outline-offset-2`) 예외를 적는다.
  - [CLAUDE.md](../../CLAUDE.md) shadcn 추가 줄에 "받은 컴포넌트의 `outline-none`·`focus-visible:ring-*`은 지운다 (lint가 잡는다)"를 덧붙인다.

### 하지 않는 것

- PR #18(07) 브랜치의 파일은 고치지 않는다. 07은 다른 작업이 진행 중이다. 어느 쪽이 먼저 머지되든 나중 쪽이 맞춘다 (아래 "위험과 열린 질문" 1).
- 인라인 `style={{ outline: 'none' }}`, 임의 속성 `[outline:none]`, CSS 파일 안의 `outline: none`은 검사하지 않는다. 지금 코드에 없고, 클래스 검사와 방식이 달라 따로 다룬다. guardrails.md에 "못 잡는 것"으로 적는다.
- 동적으로 조립한 클래스(`` `focus-visible:${x}` ``)는 못 잡는다. 색 규칙과 같은 한계.
- 포커스 색(`--ring`)과 전역 `:focus-visible` 규칙 자체는 바꾸지 않는다 (08에서 정함).
- `eslint --max-warnings 0` 도입 같은 lint 실행 방식 변경은 하지 않는다.

## 설계

### FSD 배치

| 레이어   | 슬라이스      | 세그먼트 | 만들거나 바꿀 것                                                    |
| -------- | ------------- | -------- | ------------------------------------------------------------------- |
| (설정)   | -             | -        | `eslint.config.js` 포커스 규칙, `scripts/check-guardrails.mjs` 사례 |
| entities | `book`        | ui       | `BookCard.tsx`의 자체 포커스 링 제거                                |
| pages    | `book-reader` | ui       | `BookReaderPage.tsx`의 `FOCUS_RING`과 주석 제거                     |

### 규칙 모양

색 규칙과 같은 방식으로 정규식 상수를 만들고 `colorSyntax` 옆에 `focusSyntax`를 둔다. 같은 규칙(`no-restricted-syntax`)을 뒤 블록에서 다시 쓰면 옵션이 통째로 바뀌므로, `SRC` 블록과 제품 레이어 블록 양쪽에 `...focusSyntax`를 넣는다.

정규식(초안, 구현 때 사례로 확정):

```js
// 클래스 하나의 시작: 문자열 처음이나 공백 뒤. 앞에 변형 접두사(`md:`, `hover:` 등)가 붙을 수 있다.
const CLASS_START = String.raw`(^|\s)([\w-]+:)*`
const OUTLINE_OFF = String.raw`${CLASS_START}outline-(none|hidden)(\s|$)`
const FOCUS_RING = String.raw`${CLASS_START}focus(-visible|-within)?:([\w-]+:)*ring(-|\s|$)`
```

`ring(-|\s|$)`는 `ring`, `ring-2`, `ring-[3px]`, `ring-ring/50`, `ring-offset-2`를 모두 잡고 `focus-visible:border-ring`은 잡지 않는다.

### 예외가 필요할 때

- 바깥 outline이 잘리는 곳(스크롤 목록, `overflow-hidden` 안): `focus-visible:-outline-offset-2`로 요소 안쪽에 그린다. 이때 링은 요소 면과 맞닿는다. 목록 항목 면은 보통 `background`나 `accent`(hover·선택)인데, 08의 1.7 표에서 `accent`(라이트 `cream-200` 4.75, 다크 `pine-700` 4.91)도 3:1을 넘는다. 다른 면 위라면 대비를 계산해 보고 쓴다.
- 그래도 꺼야 하는 경우: disable 주석으로 넘기지 않는다 (CLAUDE.md 가드레일 규칙, 제품 레이어는 `noInlineConfig`라 동작하지도 않는다). 규칙이 틀린 것이므로 phase를 열어 허용 패턴을 규칙에 추가한다.

### 화면과 상태

화면이 새로 생기지 않는다. 고친 두 곳은 08에서 정한 전역 표시(2px outline, 2px offset)로 바뀐다.

- 책 카드: 지금은 카드 바로 둘레에 3px 링. 바뀐 뒤에는 2px 떨어진 2px outline. 카드 표지 이미지가 outline을 가리지 않는지 확인한다.
- 리더의 글자 링크(목록으로, 챕터 이동): 3px 링 → 2px outline.

### 새 의존성

없음.

## 작업 단계

- [ ] 1. `eslint.config.js`에 `focusSyntax`와 메시지를 추가하고 `SRC`·제품 레이어 두 블록에 넣는다.
- [ ] 2. `scripts/check-guardrails.mjs`에 사례를 추가한다 (걸려야 함: `outline-none`, `outline-hidden`, `focus-visible:outline-none`, `focus-visible:ring-[3px]`, `focus:ring-2`, `focus-within:ring-ring/50`, `focus-visible:ring-offset-2`, 템플릿 문자열 안의 위반. 통과해야 함: `ring-1 ring-border`, `focus-visible:border-ring`, `focus-visible:-outline-offset-2`, `aria-invalid:ring-destructive/20`, `outline-offset-2`).
- [ ] 3. 규칙을 빼 보는 확인: 제품 레이어 블록에서 `focusSyntax`를 빼면 제품 레이어 사례가 실패하는지 본다.
- [ ] 4. `pnpm lint`로 `main`의 위반 두 곳이 걸리는 것을 확인한 뒤 `BookCard.tsx`, `BookReaderPage.tsx`를 고친다.
- [ ] 5. 개발 서버에서 책 목록 카드, 리더의 글자 링크를 Tab으로 포커스해 라이트·다크 스크린샷과 `outline-*`·`box-shadow` 값을 확인한다.
- [ ] 6. guardrails.md, design-system.md 4.6, CLAUDE.md를 고친다.
- [ ] 7. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## 완료 기준

- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`가 통과한다.
- [ ] `src/**` 어디서든 `outline-none`·`outline-hidden`, 포커스 변형이 붙은 `ring*` 클래스가 있으면 `pnpm lint`가 에러를 내고, 메시지가 대신 쓸 것(클래스 삭제, `-outline-offset-2`, design-system 4.6)을 알려 준다.
- [ ] 테두리용 `ring-1`, `focus-visible:border-ring`, `-outline-offset-2`, `aria-invalid:ring-*`는 걸리지 않는다.
- [ ] `scripts/check-guardrails.mjs`에 위 사례가 있고, 제품 레이어 블록에서 규칙을 빼면 사례가 실패한다.
- [ ] `src/`에 `outline-none`과 `focus-visible:ring`이 남아 있지 않다 (`grep`).
- [ ] 책 카드와 리더 글자 링크의 키보드 포커스가 2px `ring` outline, 2px offset, `box-shadow: none`이다 (라이트·다크).
- [ ] guardrails.md, design-system.md 4.6, CLAUDE.md가 새 규칙을 설명한다.

## 위험과 열린 질문

1. **PR #18(07)과의 순서**: 07 브랜치는 자체 링을 여러 곳에 새로 넣었고, 지금 `main`과 충돌 상태다. 09가 먼저 머지되면 07은 `main`을 받을 때 lint가 실패하므로 그 클래스들을 지워야 한다 (`sheet.tsx`, `ChapterToc`처럼 스크롤 안에 있는 것은 `-outline-offset-2`). 07이 먼저 머지되면 09에서 그 파일까지 고친다. 어느 쪽이든 규칙 메시지가 고칠 방법을 알려 준다.
2. **outline이 잘리는 곳**: 책 카드가 `overflow-hidden` 부모 안에 있으면 2px 바깥 outline이 잘릴 수 있다. 단계 5에서 확인하고, 잘리면 `-outline-offset-2`나 부모 여백으로 맞춘다.
3. **정규식 오탐**: `outline-none`이 클래스가 아닌 일반 문자열(문서 문구, 테스트 이름)에 들어가도 걸린다. 지금 `src/`에는 그런 문자열이 없다. 생기면 문구를 바꾸고, 바꿀 수 없으면 규칙의 정규식을 고친다.
4. **스크린 리더 전용 포커스 처리**: 프로그램으로 포커스를 옮기는 컨테이너(`tabIndex={-1}`)에서 outline을 끄고 싶을 수 있다. 지금은 없다. 생기면 `shared/ui`에 목적이 드러나는 컴포넌트로 만든다.

## 변경 기록

- 2026-11-23: 작성, 승인
