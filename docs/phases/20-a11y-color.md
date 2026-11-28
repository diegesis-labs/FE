# Phase 20: 화면 점검 MEDIUM 중 접근성과 색 고치기

- 상태: 승인됨
- 선행 phase: [19 화면 점검 HIGH 3건 고치기](19-interface-blockers.md) (`main`에 머지됨)
- 관련 이슈: [#47](https://github.com/diegesis-labs/FE/issues/47) (MEDIUM 13건 중 6건. 나머지는 다음 phase)
- 브랜치: `design/47-a11y-color`
- 계획 커밋: (승인 후 이 문서만 커밋·푸시한 해시)
- 구현 커밋: (구현 완료 후 커밋 해시)
- 리뷰 문서: [20-a11y-color-review.md](../reviews/20-a11y-color-review.md) (리뷰 단계에서 작성)

## 목표

키보드와 화면 낭독기 사용자가 리더 끝에서 포커스를 잃지 않고, 화면을 옮기거나 쪽을 넘길 때 어디에 있는지 듣는다. 지금 챕터와 보조 버튼, 로그인 실패 안내를 색에 기대지 않고도 알아볼 수 있다.

## 배경

2026-11-28 FE 전체 화면 점검의 MEDIUM 13건(#47) 가운데 접근성과 색 6건을 먼저 고친다. 키보드·낭독기 사용자가 실제로 길을 잃는 문제라서다. 문구·타이포그래피·UI·모션 7건은 phase 21로 둔다.

Confluence 최신 회의록을 읽었다.

- 전체 회의 2026-11-24: 데이터 업로드 계약과 데이터셋 결정. FE 화면 규칙 변경 없음.
- 페어 회의 2026-11-26, 11-27: BGM 태깅 실험. FE 변경 없음.
- 동욱·래우 회의 2026-11-28: 장면 속 노래는 Spotify API로, 분위기 음악은 자체 벡터 DB로 재생하는 양방향 방향. 아직 API 계약이 없어 이 phase와 상관없다.

## 범위

### 하는 것

1. **마지막 쪽에서 포커스가 사라짐**: `ReaderBottomBar`의 `이전/다음 페이지`, `LogoutButton`의 대기 중 상태를 `disabled`에서 `aria-disabled`로. 버튼은 포커스를 받고, 눌러도 아무 일이 없다.
2. **목차의 지금 챕터**: 색과 굵기에 더해 시작 쪽 2px 막대(`border-s-2`, `brand-ink`)로 표시한다. 같은 줄의 `text-left`는 `text-start`로 (#47 LOW 중 같은 줄).
3. **outline 버튼 테두리 대비**: 버튼용 테두리 토큰 `control-border`를 새로 두고 `outline` 버튼이 쓴다. 바탕 위 3:1 이상.
4. **로그인 실패 안내**: 제목을 `text-destructive`로 (design-system 4.5).
5. **화면마다 `<title>`, 화면을 옮긴 뒤 포커스**: 라우트마다 문서 제목을 정하고, 경로가 바뀌면 그 화면의 `h1`로 포커스를 옮긴다.
6. **쪽 알림**: `aria-live` 영역을 늘 두고 내용만 바꾼다. 챕터가 바뀌면 챕터 제목을, 책 끝이면 `마지막 페이지입니다`도 함께 알린다.
7. 디자인 시스템 문서(1.5 의미 토큰, 1.7 대비, 4.1 버튼, 4.2 입력창, 4.6 포커스)를 위 결정에 맞춘다.

### 하지 않는 것

- #47의 문구·타이포그래피·UI·모션 MEDIUM 7건 (phase 21).
- #47 LOW. 2번의 `text-start`만 예외로, 고치는 줄과 같은 줄이라 함께 바꾼다.
- 리더의 `<main>` 랜드마크(LOW). 포커스는 `h1`로 옮기므로 이 phase에 필요하지 않다.
- 버튼 말고 다른 곳의 테두리(`border` 토큰, 구분선). 장식선이라 3:1 대상이 아니다.
- 로그인 화면 `?error=` 안내 문구 자체.

## 설계

### FSD 배치

| 레이어   | 슬라이스                                         | 세그먼트 | 만들거나 바꿀 것                                                         |
| -------- | ------------------------------------------------ | -------- | ------------------------------------------------------------------------ |
| app      | (없음)                                           | styles   | `--control-border` 토큰(라이트·다크), `--color-control-border` 매핑      |
| app      | (없음)                                           | router   | 경로가 바뀌면 새 화면의 `h1`으로 포커스를 옮긴다 (`router.subscribe`)    |
| shared   | (없음)                                           | ui       | `button.tsx`: `aria-disabled` 모양, `outline`이 `border-control-border`  |
| shared   | (없음)                                           | lib      | `useDocumentTitle(title)`: `document.title`을 `제목 · Diegesis`로        |
| pages    | `book-reader`                                    | ui       | `ReaderBottomBar` 버튼·알림 영역, `ChapterToc` 지금 챕터 표시, 문서 제목 |
| pages    | `book-list`, `login`, `not-found`, `route-error` | ui       | 문서 제목. `LoginPage` 안내 제목 색                                      |
| features | `logout`                                         | ui       | 대기 중 `aria-disabled`                                                  |

### 1. `aria-disabled`

- `button.tsx` 기본 클래스에 `aria-disabled:pointer-events-none`, `ghost` 변형에 `aria-disabled:text-foreground/50`을 더한다. 마우스로는 `disabled`처럼 흐리고 hover도 없다.
- `opacity-50`은 쓰지 않는다. `opacity`는 요소의 포커스 링까지 흐리게 해서, 포커스를 받는 `aria-disabled` 버튼의 링이 3:1 아래로 떨어진다. 글자·아이콘 색만 흐리게 한다. 지금 `aria-disabled`를 쓰는 버튼은 모두 `ghost`다.
- 키보드 Enter·Space는 여전히 `click`을 낸다. `ReaderBottomBar`의 `turn`은 끝에서 이미 아무것도 하지 않지만, 버튼에서도 `canPrev`/`canNext`가 거짓이면 부르지 않는다. `LogoutButton`은 `isPending`이면 `mutate`를 부르지 않는다.
- 다른 곳의 `disabled`는 그대로 둔다 (지금은 이 세 곳뿐).

### 2. 목차 지금 챕터

- 모든 챕터 버튼에 `border-s-2 border-transparent ps-3`, 지금 챕터만 `border-brand-ink`. 글자 위치는 모든 줄이 같다.
- 막대 대비(비텍스트 3:1): `brand-ink`는 라이트 `wood-600` 6.05 / 5.63 / 5.07, 다크 `wood-300` 7.85 / 6.73 / 5.69 / 4.79 (design-system 1.7 글자 표와 같은 값). hover 바탕 `accent` 위에서도 넘는다.

### 3. `control-border` 토큰

팔레트에 있는 색만 쓴다 (새 팔레트 값 없음). 대비는 구현 때 다시 계산해 1.7에 적는다.

| 모드   | 값         | 바탕                                              | 대비                      |
| ------ | ---------- | ------------------------------------------------- | ------------------------- |
| 라이트 | `sand-600` | `cream-50` / `cream-100` / `cream-200`            | 5.31 / 4.94 / 4.45        |
| 다크   | `pine-300` | `pine-950` / `pine-900` / `pine-800` / `pine-700` | 8.06 / 6.90 / 5.84 / 4.91 |

- 라이트는 포커스 링(`charcoal-500`)과 다른 색이다. 다크는 링과 같은 `pine-300`이지만 링은 2px 띄워 그리므로 테두리와 링이 겹치지 않는다(4.6).
- 4.2 입력창의 테두리도 같은 토큰으로 문서에 적는다 (입력창은 아직 없다).

### 4. 로그인 실패 안내

- `role="alert"` 상자의 제목만 `text-destructive`. 바탕 `accent`(`cream-200` / `pine-700`) 위 `brick-600` 4.89, `brick-300` 4.89로 4.5를 넘는다. 설명은 `text-muted-foreground` 그대로.

### 5. 문서 제목과 화면 이동 뒤 포커스

- 문서 제목은 `shared/lib`의 `useDocumentTitle`로 정한다. 페이지 레이어는 `useEffect`를 쓰지 않으므로 외부(문서 제목) 쓰기를 shared 훅으로 둔다. React 19의 `<title>`은 `index.html`의 `<title>`과 둘이 되어 쓰지 않는다.

| 화면        | 제목                                                |
| ----------- | --------------------------------------------------- |
| 책 목록     | `오늘 읽을 책 · Diegesis`                           |
| 리더        | `<책 제목> · Diegesis` (불러오기 전에는 `Diegesis`) |
| 로그인      | `로그인 · Diegesis`                                 |
| 없는 페이지 | `페이지를 찾을 수 없어요 · Diegesis`                |
| 라우트 에러 | `화면을 표시하지 못했습니다 · Diegesis`             |

- 포커스: `app/router`에서 `router.subscribe`로 `location.pathname`이 바뀌고 이동이 끝나면(`navigation.state === 'idle'`) 다음 그리기에서 `h1`에 `tabindex="-1"`을 주고 포커스한다. 첫 화면 열기, `?chapter&s`만 바뀌는 쪽 넘김, 같은 경로는 옮기지 않는다. `h1`이 없으면 아무것도 하지 않는다.
- 포커스 표시는 전역 `:focus-visible` 그대로다. 키보드로 이동했을 때만 링이 보인다.

### 6. 쪽 알림

- `aria-live="polite"` 영역(`<p>`)을 `layout`이 있든 없든 늘 둔다. 보이는 쪽수(`aria-hidden`)와 낭독용 문장(`sr-only`)을 나눈 지금 구조는 그대로.
- 낭독 문장: 기본 `11쪽 중 3쪽`. 챕터가 바뀐 뒤 첫 알림은 앞에 챕터 제목(`2장 비 오는 날, 11쪽 중 1쪽`). 책 끝이면 뒤에 `마지막 페이지입니다`.
- 챕터가 바뀌었는지는 렌더 중에 "지난 챕터 번호"를 상태로 들고 비교한다 (React의 이전 값 저장 방식. `useEffect`·ref를 쓰지 않는다).

### API

없음.

### 화면과 상태

- 리더: 첫 쪽에서 `이전 페이지`, 책 끝에서 `다음 페이지`가 흐리게 보이고 포커스를 받는다. 낭독기에는 "사용할 수 없음"으로 읽힌다.
- 로그아웃 대기 중: 흐린 버튼, 포커스 유지, 다시 눌러도 요청이 한 번만 간다.
- 로딩·에러·빈 상태는 바꾸지 않는다. 문서 제목은 로딩·에러 중에도 그 화면의 제목이다(리더는 책을 받기 전 `Diegesis`).

### 새 의존성

없음.

## 작업 단계

- [ ] 1. `control-border` 토큰과 `button.tsx`(`aria-disabled` 모양, `outline` 테두리)
- [ ] 2. `ReaderBottomBar`·`LogoutButton`을 `aria-disabled`로
- [ ] 3. `ChapterToc` 지금 챕터 막대, `text-start`
- [ ] 4. `LoginPage` 안내 제목 색
- [ ] 5. `useDocumentTitle`과 다섯 화면의 문서 제목
- [ ] 6. 라우터의 화면 이동 뒤 `h1` 포커스
- [ ] 7. `ReaderBottomBar` 알림 영역 상시 유지, 챕터 제목·책 끝 알림
- [ ] 8. design-system 1.5, 1.7, 4.1, 4.2, 4.6 고치기
- [ ] 9. Playwright로 화면 확인 (아래 완료 기준), `pnpm format:check`·`lint`·`typecheck`·`build`·`test:scripts`

## 완료 기준

- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`가 통과한다.
- [ ] 리더에서 키보드로 `다음 페이지`를 눌러 책 끝까지 가도 포커스가 `다음 페이지`에 남는다 (`document.activeElement`가 `<body>`가 아님). 책 끝에서 Enter를 눌러도 쪽·주소가 그대로다. 첫 쪽의 `이전 페이지`도 같다.
- [ ] 끝 쪽의 `다음 페이지`가 `aria-disabled="true"`이고 흐리게 보이며, 마우스 hover에 바탕이 바뀌지 않는다.
- [ ] 로그아웃 요청 중 버튼이 `aria-disabled="true"`이고, 그동안 다시 눌러도 `/auth/logout` 요청이 한 번만 간다.
- [ ] 목차에서 지금 챕터에 시작 쪽 막대가 보이고, 막대와 바탕의 대비가 라이트·다크 모두 3:1 이상이다 (계산 값을 리뷰 문서에).
- [ ] `outline` 버튼 테두리와 바탕의 대비가 라이트(`cream-50/100/200`)·다크(`pine-950/900/800/700`) 모두 3:1 이상이다. 1.7 표에 같은 값이 있다.
- [ ] `/login?error=NOT_ALLOWED`, `?error=LOGIN_FAILED`의 안내 제목이 `destructive` 색이고 대비 4.5:1 이상이다 (라이트·다크).
- [ ] 다섯 화면(책 목록, 리더, 로그인, 없는 페이지, 라우트 에러)의 `document.title`이 위 표와 같다.
- [ ] 책 목록에서 책을 눌러 리더로, 리더에서 `책 목록으로`·뒤로 가기로 목록에 오면 포커스가 새 화면의 `h1`에 있다. 쪽 넘김(`?chapter&s`만 바뀜)과 첫 화면 열기에서는 포커스가 움직이지 않는다.
- [ ] 쪽을 넘길 때 `aria-live` 영역 요소가 그대로(같은 DOM 노드)이고, 챕터를 넘기면 그 영역 문장에 새 챕터 제목이 들어가며, 같은 챕터 안의 다음 쪽에서는 빠진다. 책 끝에서 `마지막 페이지입니다`가 들어간다.
- [ ] 바뀐 화면에서 320px·1280px 가로 넘침이 없고, 다크 모드에서도 위 표시가 보인다 (스크린샷).

## 위험과 열린 질문

1. **`aria-disabled` 버튼의 Enter**: 리더는 전역 ←→ 키 처리도 있다. 버튼 위에서 Enter/Space와 ←→가 둘 다 쪽을 넘기지 않는지(끝에서) 본다.
2. **화면 이동 뒤 포커스와 리더의 키 처리**: 리더 `h1`(상단 막대 제목)에 포커스가 있을 때 ←→로 쪽이 넘어가는지 확인한다. 전역 키 처리가 포커스 위치를 가리면 넘어가지 않을 수 있다.
3. **`router.subscribe` 시점**: 구독은 상태가 바뀔 때 불리고 React가 그리기 전일 수 있다. 다음 그리기에서 찾되, 책 목록처럼 `h1`이 바로 있는 화면만 확실하다. 리더의 `h1`은 책을 받은 뒤에 생길 수 있어서, 그때도 포커스가 가는지 본다. 안 가면 계획을 고친다.
4. **챕터 제목 알림이 너무 길면**: 챕터 제목이 긴 책에서 쪽마다 읽히지 않고 챕터가 바뀔 때만 읽히는지가 핵심이다.
5. **`useDocumentTitle`이 화면을 떠날 때**: 되돌리지 않는다. 모든 화면이 제목을 정하므로 다음 화면이 덮는다. 라우트 에러 화면도 정한다.

## 변경 기록

- 2026-11-28: 작성. #47 MEDIUM 중 접근성·색 6건을 먼저 하기로 함
- 2026-11-28: 사용자 승인. 이슈 #47, 브랜치 `design/47-a11y-color`
- 2026-11-28: 계획 변경. `aria-disabled` 버튼을 `opacity-50` 대신 글자색(`text-foreground/50`, `ghost`)으로 흐리게. 구현 중 끝 쪽 `다음 페이지`의 포커스 링이 `opacity`에 같이 흐려지는 것을 스크린샷에서 봤다
