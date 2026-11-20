# Review 04: 가드레일 lint

- 대상 phase: [04-guardrail-lint.md](../phases/04-guardrail-lint.md)
- 리뷰 대상: 브랜치 `setup/8-guardrail-lint`, 기준 커밋 `6bf180a` (phase의 구현 커밋. 이후 `7692df5`는 phase 문서만 고친 커밋)
- 리뷰 계획 커밋: (1절까지 쓰고 커밋·푸시한 해시)
- 작성일: 2026-11-20
- 결과: 진행 중

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff 78046c2..6bf180a` 기준. `78046c2`는 구현 직전에 `main`(Phase 03)을 머지한 커밋이라, 계획 커밋 `9dbb1c1`부터 보면 Phase 03 변경이 섞인다. 9개 파일, +364 / -14.

| 파일                           | 변경                                                                                                                | 계획과 비교                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/styles/index.css`     | `@theme` 맨 앞에 `--color-*: initial;`, 위 주석 "가능하면" → "만"                                                   | 계획대로                                                                                                                                    |
| `eslint.config.js`             | 가드레일 상수와 블록 3개(모든 소스 / `shared/api` 밖 / 제품 레이어) + 전역 `reportUnusedDisableDirectives: 'error'` | 계획대로. 금지 목록을 넓힘: `useInsertionEffect`, 전역 객체 `self`, `node-fetch`·`cross-fetch`, Tailwind 새 색 이름 4개 (**계획보다 넓음**) |
| `scripts/check-guardrails.mjs` | 새 파일. 28개 사례를 `lintText`로 검사                                                                              | 계획대로                                                                                                                                    |
| `package.json`                 | `lint:guardrails` 추가, `lint`에 포함                                                                               | 계획대로                                                                                                                                    |
| `docs/guardrails.md`           | 새 파일. 규칙 → 강제 수단 대응표 (코드 규칙, FSD, 작업 순서와 Git, 의존성 보안)                                     | 계획대로. FSD와 의존성 보안 절은 계획 양식보다 넓음                                                                                         |
| `CLAUDE.md`                    | 색 규칙에 팔레트 클래스·기본 팔레트 문구, Effect·타이머 규칙 추가, "가드레일" 절 추가, `pnpm lint` 설명             | 계획대로. Effect·타이머 규칙을 "코드 규칙"에 한 줄로 넣은 것은 계획에 명시되지 않았음 (**계획에 없던 추가**, 규칙을 글로도 남김)            |
| `docs/design-system.md`        | 1.2에 기본 팔레트가 꺼져 있다는 것과 팔레트 클래스를 컴포넌트에서 직접 쓰면 lint가 막는다는 것                      | 계획대로. "`bg-cream-100`처럼 쓸 수 있다"는 기존 문장을 바꿈                                                                                |
| `docs/architecture.md`         | 6장 CI의 `pnpm lint` 설명                                                                                           | 계획대로                                                                                                                                    |
| `README.md`                    | `pnpm lint` 설명. 표 폭이 바뀌어 Prettier가 표 전체를 다시 맞춤                                                     | 계획에 없던 파일이지만 명령 설명 한 줄 (**계획에 없던 추가**)                                                                               |

### 1.2 완료 기준 확인 방법

| #   | 완료 기준                                                                                              | 확인 방법                                                                                                                                                                                                                                                                                                 | 결과 |
| --- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`가 통과한다                            | `6bf180a`의 별도 worktree에서 `pnpm install --frozen-lockfile` 후 네 명령의 종료 코드 확인                                                                                                                                                                                                                |      |
| 2   | `pnpm lint`가 ESLint, steiger, 가드레일 자체 검사를 모두 실행한다                                      | `pnpm lint` 출력에 `eslint .`, `steiger ./src`, `node scripts/check-guardrails.mjs`가 차례로 나오는지. 앞 단계가 실패하면 뒤가 돌지 않는 것(`&&`)도 확인                                                                                                                                                  |      |
| 3   | 규칙 표의 규칙마다 걸려야 하는 사례와 통과해야 하는 사례가 있고 모두 기대대로 나온다                   | phase 문서 "ESLint 규칙" 표의 8개 규칙과 사례를 하나씩 대응시킨 표를 만든다. 통과 사례가 없는 규칙이 있으면 실패로 본다                                                                                                                                                                                   |      |
| 4   | `eslint.config.js`에서 규칙 하나를 빼면 `pnpm lint:guardrails`가 실패한다                              | 구현 때 해 본 세 가지(색 규칙 덮어쓰기, 타이머, `noInlineConfig`)에 더해, 리뷰에서 **다른 두 가지**를 새로 빼 본다: `shared/api` 밖 `fetch` 블록 전체, `reportUnusedDisableDirectives`. 종료 코드 1인지와 되돌린 뒤 `git status`가 깨끗한지 확인                                                          |      |
| 5   | 제품 레이어 파일에 `// eslint-disable-next-line`을 붙여도 위반이 그대로 보고된다                       | 실제 파일(`src/pages/home/ui/HomePage.tsx`)에 `fetch` 한 줄과 disable 주석을 넣고 `pnpm exec eslint` 실행. 에러가 남는지, 경고 메시지가 무엇인지 기록. 되돌림                                                                                                                                             |      |
| 6   | 에러 메시지가 한국어이고 대신 쓸 것을 알려준다                                                         | 실제 위반 파일로 규칙마다 ESLint 출력을 모아서 메시지를 읽는다. `noInlineConfig`·안 쓰는 disable 주석은 ESLint 기본 메시지라 예외 (phase 문서에 적혀 있음)                                                                                                                                                |      |
| 7   | `docs/guardrails.md`에 CLAUDE.md "코드 규칙"과 "Git" 절 규칙이 모두 있고, 강제 수단이 실제 설정과 맞다 | CLAUDE.md "코드 규칙"·"Git"·"CI와 머지" 절의 항목을 하나씩 대응표와 비교. 적힌 강제 수단을 실제로 확인: ESLint 규칙(설정 파일), steiger 규칙(`steiger.config.ts`), ruleset(`.github/rulesets/main.json`과 `gh api`의 실제 ruleset), `sha_pinning_required`(`gh api`), `.gitignore`, `pnpm-workspace.yaml` |      |
| 8   | 새 의존성이 없다                                                                                       | `git diff 78046c2..6bf180a -- package.json pnpm-lock.yaml`에 `dependencies`·`devDependencies`·lockfile 변경이 없는지                                                                                                                                                                                      |      |
| 9   | 빌드한 CSS에 Tailwind 기본 색 변수가 없다                                                              | `pnpm build` 후 `dist/assets/*.css`에서 `--color-(red\|white\|black\|stone\|…)` 검색 0건. `main` 빌드와 클래스 목록을 비교해 빠진 클래스가 문서 예시에서 온 것뿐인지                                                                                                                                      |      |
| 10  | 개발 서버에서 홈, 404, 테마 전환(라이트·다크) 화면이 이전과 똑같다                                     | Phase 03 리뷰와 같은 시나리오로 `main`과 비교(홈 문구, BE 실패 상태, 테마 전환·새로고침 유지, 404, Tab 순서, 스크린샷 해시). Claude in Chrome이 되면 실제 브라우저로도 한 번 본다                                                                                                                         |      |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                              | 확인 방법                                                                  | 결과 |
| ------ | ------------------------------------------------------ | -------------------------------------------------------------------------- | ---- |
| FSD    | 레이어 방향, 슬라이스 간 import, Public API, 상대 경로 | `pnpm lint:fsd` 통과. 이번 변경은 `src/` 코드 없음                         |      |
| 디자인 | 색은 의미 토큰만 쓴다                                  | 새 ESLint 규칙이 `src` 전체에서 0건으로 통과하는 것                        |      |
| 디자인 | 라이트/다크 둘 다 깨지지 않는다                        | 1.2 #10                                                                    |      |
| 접근성 | 대비, 키보드, `aria-label`                             | 화면 변경이 없으므로 1.2 #10의 Tab 순서와 스크린샷 동일 여부로 회귀만 확인 |      |
| 상태   | 로딩, 빈 상태, 에러 상태                               | 해당 없음 (UI 변경 없음). 1.2 #10에서 에러 상태 문구가 그대로인지만        |      |
| 보안   | 새 의존성이 phase 문서에 적혀 있고 확인되었다          | 1.2 #8                                                                     |      |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                      | diff에서 `token\|secret\|key=\|password` 검색                              |      |

### 1.4 이번 변경에서 특히 볼 것

- **규칙의 빈틈**: 정규식과 선택자가 놓치는 경우를 찾아 사례로 시험한다. 막아야 하는데 안 막히면 고칠지, 대응표에 "일부"로 적을지 판단한다.
  - 인라인 스타일의 색 값: `style={{ color: '#333' }}` (hex 정규식은 `[#…` 임의값만 본다)
  - 임의값의 다른 형태: `bg-[rgb(0,0,0)]`, `bg-[var(--color-pine-700)]`, `bg-(--color-pine-700)`
  - 동적으로 조립한 클래스: `` `bg-${tone}-700` ``
  - Effect 우회: `import * as R from 'react'` 후 `R.useEffect`, `import { useEffect as ue }`
  - 타이머 우회: `const t = window; t.setTimeout(...)`
- **shadcn과의 충돌**: shadcn 기본 컴포넌트(예: `dialog`, `sheet`)는 `bg-black/50` 같은 기본 색을 쓴다. 기본 팔레트를 껐으니 그대로 추가하면 오버레이 색이 사라진다. `pnpm exec shadcn add dialog`로 실제로 무엇이 생기는지, lint가 잡는지 확인하고 지운다. `design-system.md`의 "추가한 뒤 고친다" 절차로 충분한지 판단한다.
- **덮어쓰기 함정이 다시 생길 여지**: 제품 레이어 블록이 공통 상수를 다시 합쳐 넣는 구조다. 새 규칙을 공통 블록에만 넣고 제품 블록에 빠뜨리면 제품 레이어에서만 꺼진다. 자체 검사 사례가 제품 레이어 경로로도 공통 규칙을 시험하는지 확인한다.
- **`noInlineConfig` 경고**: 제품 레이어에 disable 주석을 쓰면 경고가 난다. `pnpm lint`는 경고로 실패하지 않으므로, 주석 자체는 남을 수 있다. CI에서 `--max-warnings 0`이 필요한지 판단한다 (phase "위험 5").
- **`scripts/` lint 범위**: ESLint 설정이 `**/*.{ts,tsx}`만 보므로 `scripts/check-guardrails.mjs`는 lint되지 않는다. 문제가 되는지 본다.
- **Tailwind의 `docs/` 스캔**: `docs/guardrails.md`, `design-system.md`의 예시 문구(`bg-pine-700` 등)로 CSS가 생기는지, 크기 영향이 있는지 본다 (phase "위험 2").
- **`self` 전역 금지의 부작용**: `self`는 Web Worker에서 쓰인다. 아직 Worker가 없지만, 규칙이 `self.fetch`만 막는지(전역 `self` 사용 자체는 허용) 확인한다.

## 2. 발견 사항

| #   | 심각도 | 위치 | 내용 | 조치 |
| --- | ------ | ---- | ---- | ---- |

## 3. 확인 못 한 것

-

## 4. 결론
