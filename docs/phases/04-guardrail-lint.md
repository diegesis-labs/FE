# Phase 04: 가드레일 lint

- 상태: 승인됨
- 선행 phase: [03 FSD 구조로 전환](03-fsd-migration.md) (레이어 폴더가 있어야 레이어별 규칙을 걸 수 있다)
- 관련 이슈: [#8 가드레일 lint: 코드 규칙을 ESLint로 강제](https://github.com/diegesis-labs/FE/issues/8)
- 브랜치: `setup/8-guardrail-lint` (`main`의 `17ae620`에서 만듦. `setup/2-init`은 PR #5로 머지됐다)
- 계획 커밋: (승인 후 기록)
- 구현 커밋: (구현 후 기록)
- 리뷰 문서: [04-guardrail-lint-review.md](../reviews/04-guardrail-lint-review.md) (리뷰 단계에서 작성)

## 목표

[CLAUDE.md](../../CLAUDE.md)에 글로만 적힌 코드 규칙 중 기계로 검사할 수 있는 것을 ESLint 규칙으로 옮긴다. 규칙을 어기면 `pnpm lint`(곧 CI)가 실패하고, 에러 메시지가 **무엇을 대신 써야 하는지** 한국어로 알려준다.

## 배경

- 사람과 에이전트가 같이 코드를 쓰면, 코드에 한 번 들어간 우회 코드나 안티패턴을 다음 작업자가 "이 레포의 방식"으로 보고 따라 쓴다. 글로 된 규칙(CLAUDE.md, 주석)은 읽고 지켜 주기를 바랄 뿐 강제가 안 된다.
- 참고: Lauren Tan, ["All Code Is Slop (Except Mine)"](https://youtu.be/O_zcc6Xl12g) (AI Engineer, 2026-11). 요지: 에이전트를 고칠 때마다 규칙 문서에 한 줄을 더하지 말고 lint·타입·테스트 같은 결정적 검사로 만든다. 쓰기 까다로운 API는 제품 코드에서 금지한다. 주석이 규칙 우회의 핑계가 되지 않게 한다.
- 이미 이렇게 하고 있는 것: FSD 규칙(Phase 03의 steiger), 액션 SHA 고정(레포 설정), 새 패키지 3일 지연(`minimumReleaseAge`). 이 phase는 남은 코드 규칙을 같은 방식으로 바꾼다.
- 코드가 거의 없는 지금은 기존 위반을 고칠 것이 거의 없어서 가장 싸게 도입할 수 있다 (2026-11-20 확인: 아래 규칙에 걸리는 코드는 `shared/theme/ThemeProvider.tsx`의 `useEffect` 2곳뿐이고, `shared`는 허용 범위라 고칠 것이 없다).

## 범위

### 하는 것

1. **BE 호출 규칙**: `shared/api` 밖에서 `fetch` 직접 호출 금지, HTTP 라이브러리(axios 등) import 금지.
2. **색 규칙**: className 문자열에 팔레트 클래스(`bg-pine-700` 등), Tailwind 기본 팔레트 클래스(`bg-red-500`, `text-white` 등), hex 임의값(`bg-[#333]`)을 쓰면 실패.
3. **Tailwind 기본 팔레트 끄기**: `index.css`의 `@theme` 맨 앞에 `--color-*: initial;`을 넣어 `red-500`, `stone-600`, `white`, `black` 같은 기본 색 클래스가 아예 생기지 않게 한다. 우리 팔레트와 의미 토큰만 남는다. `transparent`, `current`, `inherit`는 테마 색이 아니라 그대로 쓸 수 있다.
4. **까다로운 API 제한**: 제품 레이어(`pages`, `widgets`, `features`, `entities`)에서 `useEffect`, `useLayoutEffect`, 타이머(`setTimeout`, `setInterval`, `requestAnimationFrame`, `requestIdleCallback`) 금지. `shared`와 `app`에서만 쓴다.
5. **규칙 끄기 막기**: 제품 레이어에서는 `eslint-disable` 주석이 동작하지 않게 하고(`noInlineConfig`), 전체에서 쓰이지 않는 disable 주석을 에러로 본다.
6. **가드레일 자체 검사**: 위 규칙마다 "어기는 코드"와 "괜찮은 코드" 예시를 두고, 규칙이 실제로 걸리는지 확인하는 스크립트(`scripts/check-guardrails.mjs`)를 `pnpm lint`에 넣는다. 설정을 고치다 규칙이 조용히 꺼지는 것을 막는다.
7. **규칙 대응표**: `docs/guardrails.md`에 CLAUDE.md의 규칙마다 무엇이 강제하는지(ESLint 규칙, steiger, CI, ruleset, pnpm 설정, 없음) 적는다. "없음"인 규칙이 글로만 남은 규칙이다.
8. **CLAUDE.md 갱신**: "에이전트나 사람이 같은 실수를 고치게 되면 먼저 lint나 테스트로 만들 수 있는지 본다", "규칙을 어기는 이유를 주석으로 남기지 않는다. 규칙이 틀렸으면 phase를 열어 규칙을 고친다"를 추가하고 대응표를 링크한다. `docs/design-system.md` 1.2에 기본 팔레트가 꺼져 있다고 적는다.

### 하지 않는 것

- 주석 전체 금지. 지금 주석은 대부분 "왜 이렇게 했는지"를 설명하는 쓸모 있는 주석이다. 우회 수단인 `eslint-disable`만 막는다.
- `ThemeProvider`를 `useSyncExternalStore`로 바꾸는 리팩터링. `shared`라서 규칙 위반이 아니고, 동작을 바꾸지 않는 phase로 둔다.
- 작업 절차 검사(커밋 메시지 형식, 브랜치 이름, phase 문서와 코드가 한 커밋에 섞였는지, phase 문서 승인 여부). CI 워크플로를 고치는 일이라 별도 phase로 제안한다.
- 화면 검증(Playwright 스크린샷, axe 접근성 검사, 토큰 대비 계산). 테스트 도구를 들이는 별도 phase로 제안한다.
- "사용자 문구는 한국어" 규칙. 기계로 판단하기 어려워 대응표에 "없음"으로 남긴다.
- 우리 팔레트와 의미 토큰의 값. 기본 팔레트만 끄고 색 값은 바꾸지 않는다.

## 설계

### FSD 배치

코드 슬라이스는 만들지 않는다. 바뀌는 파일은 설정과 문서뿐이다.

| 파일                           | 바꿀 것                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `src/app/styles/index.css`     | `@theme` 맨 앞에 `--color-*: initial;` (Phase 03 이후 경로) |
| `docs/design-system.md`        | 1.2에 "Tailwind 기본 팔레트는 꺼져 있다" 추가               |
| `eslint.config.js`             | 아래 규칙 블록 추가                                         |
| `scripts/check-guardrails.mjs` | 새 파일. 규칙별 예시 코드를 ESLint Node API로 검사          |
| `package.json`                 | `lint:guardrails` 추가, `lint`에 포함                       |
| `docs/guardrails.md`           | 새 파일. 규칙 → 강제 수단 대응표                            |
| `CLAUDE.md`                    | 위 "하는 것 7"의 두 줄과 대응표 링크                        |
| `docs/architecture.md`         | 6장 CI의 `pnpm lint` 설명에 가드레일 검사 추가              |

### ESLint 규칙

모두 ESLint 내장 규칙(`no-restricted-imports`, `no-restricted-globals`, `no-restricted-properties`, `no-restricted-syntax`)과 `linterOptions`로 만든다. 새 의존성이 없다.

| 규칙               | 적용 범위                                  | 막는 것                                                                                                                             | 에러 메시지 (요지)                                                                                                             |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| BE 호출            | `src/**` 중 `src/shared/api/**` 제외       | 전역 `fetch`, `window.fetch`, `globalThis.fetch`                                                                                    | "fetch를 직접 쓰지 마세요. `@/shared/api`의 `apiClient`를 쓰세요."                                                             |
| HTTP 라이브러리    | `src/**`                                   | `axios`, `ky`, `ofetch`, `got`, `superagent` import                                                                                 | "HTTP 라이브러리를 추가하지 않습니다. `@/shared/api`의 `apiClient`를 쓰세요."                                                  |
| 팔레트 클래스      | `src/**`                                   | 문자열·템플릿 문자열 안의 `(bg\|text\|border\|ring\|fill\|stroke\|outline\|…)-(cream\|sand\|charcoal\|pine\|wood\|oak\|brick)-숫자` | "팔레트 색을 직접 쓰지 마세요. 의미 토큰(`bg-background`, `text-brand` 등)을 쓰세요. docs/design-system.md 1.5"                |
| 기본 팔레트 클래스 | `src/**`                                   | `-(red\|stone\|gray\|…)-숫자`, `-(white\|black)` (Tailwind 기본 색 이름 전체)                                                       | "Tailwind 기본 색은 꺼져 있어서 이 클래스는 아무 스타일도 만들지 않습니다. 의미 토큰을 쓰세요."                                |
| hex 임의값         | `src/**`                                   | 문자열 안의 `-[#` (예: `bg-[#333]`)                                                                                                 | 위와 같음                                                                                                                      |
| Effect             | `src/{pages,widgets,features,entities}/**` | `react`에서 `useEffect`, `useLayoutEffect` import, `React.useEffect` 형태 호출                                                      | "제품 코드에서 Effect를 쓰지 마세요. 서버 데이터는 TanStack Query, 파생 값은 렌더 중 계산, 외부 구독은 `shared/lib`의 훅으로." |
| 타이머             | `src/{pages,widgets,features,entities}/**` | 전역과 `window.`의 `setTimeout`, `setInterval`, `requestAnimationFrame`, `requestIdleCallback`                                      | "타이머로 문제를 덮지 마세요. 원인을 고치고, 정말 필요하면 `shared/lib`에 이유가 드러나는 훅으로 만드세요."                    |
| 인라인 설정 끄기   | `src/{pages,widgets,features,entities}/**` | `linterOptions.noInlineConfig: true` (`eslint-disable` 주석이 무시되고 경고가 난다)                                                 | ESLint 기본 메시지                                                                                                             |
| 안 쓰는 disable    | 전체                                       | `linterOptions.reportUnusedDisableDirectives: 'error'`                                                                              | ESLint 기본 메시지                                                                                                             |

설정 요지:

```js
// eslint.config.js (요지)
const PRODUCT_LAYERS = ['src/{pages,widgets,features,entities}/**/*.{ts,tsx}']
const PALETTE = 'cream|sand|charcoal|pine|wood|oak|brick'
const PALETTE_CLASS = `\\b[a-z-]+-(${PALETTE})-\\d+\\b`
const paletteMessage =
  '팔레트 색을 직접 쓰지 마세요. 의미 토큰(bg-background, text-brand 등)을 쓰세요.'

export default defineConfig([
  // … 기존 설정
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: [{ name: 'axios', message: '…' } /* … */] }],
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=/${PALETTE_CLASS}/]`, message: paletteMessage },
        { selector: `TemplateElement[value.raw=/${PALETTE_CLASS}/]`, message: paletteMessage },
        { selector: 'Literal[value=/-\\[#/]', message: paletteMessage },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/api/**'],
    rules: {
      'no-restricted-globals': ['error', { name: 'fetch', message: '…' }],
      'no-restricted-properties': ['error', { object: 'window', property: 'fetch', message: '…' }],
    },
  },
  {
    files: PRODUCT_LAYERS,
    linterOptions: { noInlineConfig: true },
    rules: {
      // Effect와 타이머 규칙. 같은 규칙 이름을 다시 쓰면 위 블록의 옵션을 덮어쓰므로,
      // 위 블록의 항목을 배열로 빼 두고 여기서 합쳐서 다시 넣는다.
    },
  },
  prettier,
])
```

기본 팔레트를 CSS에서 껐는데도 lint로 또 막는 이유: 꺼진 클래스(`bg-red-500`)를 쓰면 빌드는 성공하고 스타일만 조용히 빠진다. 사람도 에이전트도 알아채기 어려우므로 lint가 이유와 대안을 알려준다.

주의: flat config에서 같은 규칙(`no-restricted-syntax` 등)을 뒤 블록에서 다시 쓰면 옵션이 합쳐지지 않고 **통째로 바뀐다**. 그래서 규칙 옵션을 상수 배열로 만들고, 제품 레이어 블록에서는 공통 항목과 레이어 전용 항목을 합쳐서 넣는다. 이 실수를 잡는 것이 가드레일 자체 검사의 목적 중 하나다.

### 가드레일 자체 검사

`scripts/check-guardrails.mjs`는 ESLint의 `lintText(code, { filePath })`를 쓴다. 실제 파일을 만들지 않고 가상 경로로 검사하므로 `src`에 예시 파일이 남지 않는다.

```js
// 사례 하나 = 가상 경로 + 코드 + 기대 결과
{ filePath: 'src/features/x/ui/X.tsx', code: "import { useEffect } from 'react'", expect: 'no-restricted-imports' }
{ filePath: 'src/shared/lib/x.ts',     code: "import { useEffect } from 'react'", expect: null } // shared는 허용
{ filePath: 'src/shared/api/client.ts', code: 'fetch("/a")', expect: null }
{ filePath: 'src/pages/x/ui/X.tsx',    code: 'fetch("/a")', expect: 'no-restricted-globals' }
{ filePath: 'src/pages/x/ui/X.tsx',    code: 'const c = "bg-background"', expect: null }
{ filePath: 'src/pages/x/ui/X.tsx',    code: 'const c = "bg-pine-700"', expect: 'no-restricted-syntax' }
```

- 규칙마다 걸려야 하는 사례와 걸리면 안 되는 사례를 하나 이상 둔다.
- 기대와 다르면 어느 사례가 틀렸는지 출력하고 종료 코드 1로 끝난다.
- `pnpm lint` = `eslint . && steiger … && node scripts/check-guardrails.mjs`. CI는 이미 `pnpm lint`를 돌리므로 워크플로는 바꾸지 않는다.

### `docs/guardrails.md` 양식

| CLAUDE.md 규칙          | 강제 수단                         | 위치                         |
| ----------------------- | --------------------------------- | ---------------------------- |
| 위 레이어만 import      | steiger                           | `steiger.config.ts`          |
| BE 호출은 `apiClient`만 | ESLint `no-restricted-globals` 등 | `eslint.config.js`           |
| 사용자 문구는 한국어    | 없음 (글로만)                     | –                            |
| 머지는 merge commit만   | 레포 설정, ruleset                | `.github/rulesets/main.json` |
| …                       | …                                 | …                            |

### 화면과 상태

화면 변경 없음. 기본 팔레트를 쓰는 코드가 없어서 끄더라도 화면이 그대로다 (2026-11-20 확인: 복사본에서 `--color-*: initial`을 넣고 빌드하니 `bg-background`, `text-brand`, `bg-transparent` 등 쓰는 클래스는 그대로 생기고, 기본 색 변수만 빠졌다. 빠진 `bg-red-500`, `text-stone-600`은 이 문서의 예시 문구에서 생긴 것이었다. 아래 "열린 질문 2").

### 새 의존성

없음. ESLint 내장 규칙과 Node 기본 기능만 쓴다.

## 작업 단계

- [ ] 1. `index.css`에 `--color-*: initial;`을 넣고, 빌드한 CSS에 기본 색 변수가 없는지와 화면이 그대로인지 확인한다.
- [ ] 2. `eslint.config.js`에 규칙 옵션 상수와 규칙 블록을 추가한다.
- [ ] 3. `pnpm lint`를 돌려 기존 코드의 위반을 확인한다. 위반이 있으면 규칙이 맞는지 먼저 따지고, 코드를 고칠지 규칙 범위를 고칠지 phase 문서에 적는다.
- [ ] 4. `scripts/check-guardrails.mjs`와 사례를 만들고 `package.json`의 `lint`에 넣는다.
- [ ] 5. 설정에서 규칙 하나를 일부러 지워 보고 `pnpm lint:guardrails`가 실패하는지 확인한 뒤 되돌린다.
- [ ] 6. `docs/guardrails.md`를 쓰고 CLAUDE.md, `docs/architecture.md`를 고친다.
- [ ] 7. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`를 통과시킨다.

## 완료 기준

- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`가 통과한다.
- [ ] `pnpm lint`가 ESLint, steiger, 가드레일 자체 검사를 모두 실행한다.
- [ ] 위 규칙 표의 규칙마다 걸려야 하는 사례와 걸리면 안 되는 사례가 `scripts/check-guardrails.mjs`에 있고 모두 기대대로 나온다.
- [ ] `eslint.config.js`에서 규칙 하나를 빼면 `pnpm lint:guardrails`가 실패한다 (확인 후 되돌림).
- [ ] 제품 레이어 파일에 `// eslint-disable-next-line`을 붙여도 규칙 위반이 그대로 보고된다.
- [ ] 에러 메시지가 한국어이고 대신 쓸 것을 알려준다.
- [ ] `docs/guardrails.md`에 CLAUDE.md "코드 규칙"과 "Git" 절의 규칙이 모두 들어 있고, 각 규칙의 강제 수단이 실제 설정과 맞다.
- [ ] 새 의존성이 없다 (`package.json`, `pnpm-lock.yaml`의 의존성 목록이 바뀌지 않음).
- [ ] 빌드한 CSS(`dist/assets/*.css`)에 `--color-red-500`, `--color-white` 같은 Tailwind 기본 색 변수가 없다.
- [ ] 개발 서버에서 홈, 404, 테마 전환(라이트·다크) 화면이 이전과 똑같다.

## 위험과 열린 질문

1. **이슈** (해결): 새 이슈 [#8](https://github.com/diegesis-labs/FE/issues/8)을 만들고 `main`에서 `setup/8-guardrail-lint`를 땄다.
2. **Tailwind가 `docs/`도 스캔한다**: Tailwind v4는 프로젝트 전체를 스캔해서 문서의 예시 문구(`bg-pine-700` 등)로도 CSS를 만든다. 기본 팔레트를 끄면 문서 예시로 생기는 기본 색 클래스는 사라지지만, 우리 팔레트 클래스는 계속 생길 수 있다. `@source not "../../docs"`처럼 스캔에서 빼는 것은 이 phase 범위 밖이라 따로 정한다.
3. **`shared/ui` 예외**: shadcn 컴포넌트를 고칠 때 팔레트 클래스가 필요할 수 있다. 지금은 예외 없이 시작하고, 필요해지면 `src/shared/ui/**`만 예외로 둔다.
4. **정규식 오탐**: 팔레트 정규식이 클래스가 아닌 일반 문자열(예: 문구 안의 "wood-1")에 걸릴 수 있다. 사용자 문구는 한국어라 가능성이 낮지만, 걸리면 정규식을 Tailwind 접두사 목록으로 좁힌다.
5. **`noInlineConfig`는 경고만 낸다**: disable 주석이 무시된다는 메시지는 경고지만, 주석이 무시되므로 원래 규칙 위반은 에러로 그대로 남는다. 경고까지 막으려면 CI에서 `eslint --max-warnings 0`을 쓰는 것도 고려한다.
6. **Effect 금지가 막히는 경우**: 제품 코드에서 정말 Effect가 필요하면 우회하지 않고 `shared/lib`에 목적이 드러나는 훅(예: `useMediaQuery`)을 만든다. 이것도 어렵다면 규칙을 고치는 phase를 연다.

## 변경 기록

- 2026-11-20: 작성
- 2026-11-20: Tailwind 기본 팔레트 끄기를 범위에 넣음 (사용자 결정). 기본 색 클래스 lint 추가. PR #5 머지로 브랜치를 `main`에서 새로 따기로 함
- 2026-11-20: 승인. 이슈 #8 생성, 브랜치 `setup/8-guardrail-lint`
