# Review 20: 화면 점검 MEDIUM 중 접근성과 색 고치기

- 대상 phase: [20-a11y-color.md](../phases/20-a11y-color.md)
- 리뷰 대상: 브랜치 `design/47-a11y-color`, 기준 커밋 `d122d29` (phase의 구현 커밋). 문서 기록 `6d42805`(20 구현 기록)까지 본다
- 리뷰 계획 커밋: (1절까지 쓰고 커밋·푸시한 해시)
- 작성일: 2026-11-28
- 결과: 진행 중

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff 64dc4f8..d122d29` 기준 (계획 변경 커밋부터 구현 커밋까지).

- `app/styles/index.css`: `--control-border`(라이트 `sand-600`, 다크 `pine-300`)와 `--color-control-border`.
- `shared/ui/button.tsx`: 기본에 `aria-disabled:pointer-events-none`, `ghost`에 `aria-disabled:text-foreground/50`, `outline` 테두리 `border-input` → `border-control-border`.
- `pages/book-reader/ui/ReaderBottomBar.tsx`: `이전/다음 페이지`를 `aria-disabled`로, 누를 때 `canPrev`/`canNext` 확인. `aria-live` `<p>`를 늘 두고 낭독 문장을 렌더 중에 만든다. `useChapterIntro`(이전 값 상태 비교)로 챕터가 바뀐 첫 쪽에만 챕터 제목, 책 끝이면 `마지막 페이지입니다`.
- `features/logout/ui/LogoutButton.tsx`: `disabled` → `aria-disabled`, 요청 중이면 `mutate`를 부르지 않는다. `aria-busy`는 그대로.
- `pages/book-reader/ui/ChapterToc.tsx`: `border-s-2 ps-3`, 지금 챕터 `border-brand-ink`, 나머지 `border-transparent`, `text-left` → `text-start`.
- `pages/login/ui/LoginPage.tsx`: 안내 제목 `text-destructive`, 문서 제목.
- `shared/lib/dom/use-document-title.ts`(새 파일): `useEffect`로 `document.title`. 책 목록·리더·로그인·없는 페이지·라우트 에러에서 부른다.
- `app/router/focus-on-navigate.ts`(새 파일): `router.subscribe`로 이동이 끝나고 경로가 바뀌면, 다음 프레임에 떠나는 화면의 것이 아닌 `h1`을 찾아(없으면 `MutationObserver`로 5초까지) 포커스가 `<body>`에 떨어져 있을 때만 `tabindex="-1"`과 `focus()`. 첫 화면(초기화 직후 경로)은 기준으로만 삼는다. `router.tsx`가 `getRouter()`에서 붙인다.
- `docs/design-system.md`: 1.5 `control-border` 줄, 1.7 "버튼·입력창 테두리" 표, 4.1 outline 테두리와 비활성(`aria-disabled`) 규칙, 4.2 입력창 테두리, 4.6 화면 이동 뒤 포커스, 결정 기록.
- 계획과 다른 점: `aria-disabled` 모양을 `opacity-50`에서 `ghost`의 글자색으로 (계획 변경 `64dc4f8`, 이유는 phase 변경 기록). 떠나는 화면의 `h1`을 건너뛰는 처리는 계획(위험 3)에서 예상한 경우라 계획 변경 없이 넣었다: 처음 구현은 다음 프레임에 아직 남아 있던 옛 `h1`에 포커스해서, 그 `h1`이 사라지며 포커스가 `<body>`로 떨어졌다.

### 1.2 완료 기준 확인 방법

화면 확인은 목 개발 서버(`VITE_API_MOCK=true pnpm dev --port 5199`)와 Playwright 스크립트(구현 때 쓴 `verify20.mjs`)를 리뷰 기준 커밋에서 다시 돌린다.

| #   | 완료 기준                                                                                  | 확인 방법                                                                                                      | 결과 |
| --- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts` 통과 | 리뷰 기준 커밋에서 명령 실행. PR의 CI `check`                                                                  |      |
| 2   | 책 끝·첫 쪽에서 포커스가 버튼에 남고, Enter를 눌러도 쪽·주소가 그대로                      | 마지막 챕터에서 `다음 페이지`에 포커스하고 Enter 반복. 끝에서 Enter·Space·→, 첫 쪽 `이전 페이지` Enter         |      |
| 3   | 끝 쪽 `다음 페이지`가 `aria-disabled="true"`, 흐리게, hover에 바탕이 그대로                | 속성, 계산된 글자색, 마우스를 올리기 전·후 바탕색. 포커스 링 대비(3:1)도 잰다                                  |      |
| 4   | 로그아웃 요청 중 `aria-disabled="true"`, 다시 눌러도 `/auth/logout` 요청 1번               | 클릭 3번 + Enter 2번 동안 요청 수와 속성                                                                       |      |
| 5   | 목차 지금 챕터 막대, 대비 3:1 이상 (라이트·다크)                                           | 계산된 `border-inline-start` 색과 바탕으로 대비 계산. 다른 챕터의 글자 시작 위치가 같은지                      |      |
| 6   | `outline` 테두리 대비 3:1 이상, 1.7 표와 같은 값                                           | 없는 페이지의 `홈으로` 테두리 색을 `cream-50/100/200`, 다크 바탕에 대해 계산. 1.7 표와 비교                    |      |
| 7   | 로그인 안내 제목이 `destructive`, 4.5:1 이상 (라이트·다크)                                 | `?error=NOT_ALLOWED`, `LOGIN_FAILED`에서 계산된 글자색과 상자 바탕으로 대비 계산                               |      |
| 8   | 다섯 화면의 `document.title`이 표와 같다                                                   | 각 화면에서 `page.title()`                                                                                     |      |
| 9   | 목록→리더, 리더→목록(뒤로 가기) 뒤 포커스가 `h1`. 쪽 넘김·첫 화면 열기에서는 그대로        | 클릭·키보드로 책 열기, 뒤로 가기 뒤 `document.activeElement`. 첫 화면, 로그인으로 보내진 첫 화면, 쪽 넘김 뒤도 |      |
| 10  | 알림 영역이 같은 DOM 노드, 챕터가 바뀐 첫 쪽에만 챕터 제목, 책 끝에 `마지막 페이지입니다`  | 첫 노드를 잡아 두고 책 끝까지 넘기며 문장 기록. 2장 첫 쪽에서 `이전 페이지`로 1장 끝에 들어가는 경우도         |      |
| 11  | 320px·1280px 가로 넘침 없음, 다크 모드에서 표시가 보인다                                   | 5개 화면 × 2폭 `scrollWidth`. 다크 스크린샷(목차, 로그인, 없는 페이지, 리더)                                   |      |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                    | 확인 방법                                                                   | 결과 |
| ------ | -------------------------------------------- | --------------------------------------------------------------------------- | ---- |
| FSD    | 아래 레이어가 위 레이어를 import 하지 않는다 | `pnpm lint:fsd`, 바뀐 파일의 import 읽기                                    |      |
| FSD    | 같은 레이어 슬라이스끼리 import 하지 않는다  | 같음                                                                        |      |
| FSD    | 슬라이스 밖에서는 `index.ts`로만 import 한다 | `useDocumentTitle`이 `@/shared/lib/dom`의 `index.ts`로 나가는지             |      |
| FSD    | 페이지 레이어에 `useEffect`·타이머가 없다    | `pages`, `features`의 diff 검색. `useEffect`는 `shared/lib`, 타이머는 `app` |      |
| 디자인 | 색은 의미 토큰만 쓴다                        | diff에서 `#hex`, 팔레트 클래스 검색. `index.css`의 토큰 정의만 팔레트 사용  |      |
| 디자인 | 라이트/다크 둘 다 깨지지 않는다              | 1.2절 11 스크린샷                                                           |      |
| 접근성 | 대비, 키보드, aria                           | 1.2절 2~10. `aria-disabled` 버튼의 이름이 그대로인지                        |      |
| 상태   | 로딩, 빈 상태, 에러 상태                     | 책 로딩 중 문서 제목(`Diegesis`), 책 에러·라우트 에러에서 제목과 포커스     |      |
| 보안   | 새 의존성 없음                               | `package.json`, `pnpm-lock.yaml` diff                                       |      |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다            | diff 검색                                                                   |      |

### 1.4 이번 변경에서 특히 볼 것

- **포커스를 빼앗지 않는가**: `focus-on-navigate`는 포커스가 `<body>`일 때만 옮긴다. 목차 서랍(Radix, 포커스를 가둠)에서 챕터를 고르면 경로는 그대로라 옮기지 않아야 한다. 서랍이 닫힌 뒤 포커스가 목차 버튼으로 돌아가는지.
- **기다림이 남지 않는가**: `MutationObserver`는 `h1`을 찾거나 5초가 지나거나 다음 이동이 오면 멈춘다. 빠르게 두 번 옮겼을 때 앞 이동의 기다림이 뒤 화면에 포커스를 주지 않는지 (코드 읽기).
- **로그인으로 보내기**: 로그아웃 뒤(`/login`으로 이동)와 리더에서 401로 보내질 때 포커스가 로그인 화면의 `h1`(`Diegesis`)로 가는지. 첫 화면 열기에서 로그인으로 보내질 때는 가지 않는지.
- **라우트 에러 화면**: 이동 중에 라우트 에러가 나면 에러 화면의 `h1`에 포커스가 가는지, 그 화면 제목이 정해지는지.
- **`tabindex="-1"`이 남는 것**: `h1`을 마우스로 눌러도 링이 생기지 않는지, Tab 순서에 들어가지 않는지.
- **챕터 제목 알림의 상태 비교**: 렌더 중 `setIntro`가 무한 렌더를 만들지 않는지(조건이 한 번만 참). 챕터 전환 중(`layout`이 비었다 생김) 제목이 빠지지 않는지. 개발 콘솔 경고 확인.
- **`text-foreground/50`**: 다크에서 흐린 아이콘이 보이는지(스크린샷). hover·포커스 때 글자색이 되살아나지 않는지.
- **`control-border`가 닿는 곳**: `outline`을 쓰는 곳 셋(에러 안내의 `다시 시도`, 없는 페이지 `홈으로`, 라우트 에러 `새로고침`). hover 때 테두리가 사라지고 반전되는지(그대로).
- **design-system 문서가 코드와 같은가**: 1.5·1.7 값과 `index.css`, 4.1의 `aria-disabled` 설명과 `button.tsx`.

## 2. 발견 사항

| #   | 심각도 | 위치 | 내용 | 조치 |
| --- | ------ | ---- | ---- | ---- |

## 3. 확인 못 한 것

-

## 4. 결론
