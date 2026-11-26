# Diegesis FE

Diegesis 웹 프론트엔드. Vite + React 19 + TypeScript SPA. BE는 별도 서버다.

- 기술스택과 BE 연동: [docs/architecture.md](docs/architecture.md)
- 색상, 서체, 컴포넌트 규칙: [docs/design-system.md](docs/design-system.md)
- 작업 계획: [docs/phases/](docs/phases/)
- 리뷰 기록: [docs/reviews/](docs/reviews/)

## 작업 순서 (반드시 지킬 것)

모든 코드 작업은 아래 순서로 진행한다. **계획 문서는 항상 커밋·푸시한 뒤에** 다음 단계로 넘어간다. 그래야 계획과 실제 변경을 커밋 이력으로 비교할 수 있다.

```
phase 문서 작성 → 승인 → [커밋·푸시] → 구현 → [커밋·푸시]
→ 리뷰 계획 작성 → [커밋·푸시] → 리뷰 실행·수정 → [커밋·푸시]
```

### 1. 구현 전: phase 문서 작성

코드를 한 줄이라도 고치기 전에 `docs/phases/`에 phase 문서를 먼저 쓴다.

- 파일 이름: `NN-짧은-이름.md` (예: `03-fsd-migration.md`). **번호는 실행 순서**다. 보통은 기존 파일의 다음 번호를 쓴다.
- 새 phase를 아직 시작하지 않은 phase보다 먼저 해야 하면, 시작 전인 phase들의 번호를 뒤로 미루고(`git mv`) 각 문서의 "변경 기록"에 이유를 적는다. 이미 시작했거나 끝난 phase의 번호는 바꾸지 않는다.
- 다른 phase가 먼저 끝나야 하면 문서 위쪽에 `선행 phase`를 적는다.
- 양식: [docs/phases/_template.md](docs/phases/_template.md)를 복사해서 채운다.
- 쓰기 전에 Confluence Diegesis 스페이스의 최신 회의록을 읽고, 바뀐 결정(API 계약, 일정, 화면 규칙)을 계획에 반영한다. Claude Code는 그 세션에서 Confluence 문서를 읽지 않았으면 phase 문서를 쓸 수 없다(훅). Atlassian 커넥터가 없으면 `.claude/settings.local.json`의 `env`에 `"CONFLUENCE_GATE": "off"`를 넣고, 회의록은 직접 확인한다.
- 반드시 들어갈 것: 목표, 관련 이슈, 바꿀 범위와 **바꾸지 않을 범위**, FSD 기준 어느 레이어/슬라이스에 무엇을 만들지, 작업 단계, 완료 기준.
- 다 쓰면 사용자에게 요약을 보여주고 **승인을 받는다.**
- 승인되면 상태를 `승인됨`으로 바꾸고, **phase 문서만 따로 커밋해서 푸시한 뒤** 구현을 시작한다. 코드 변경을 같은 커밋에 섞지 않는다.
  - 커밋 메시지: `docs(phase): NN 제목`
- 구현하다 계획이 바뀌면 코드보다 phase 문서를 먼저 고치고, 맨 아래 "변경 기록"에 이유를 남긴다. 이 수정도 따로 커밋한다 (`docs(phase): NN 계획 변경 - 이유`).

예외: 오타, 문서 수정, 설정값 한 줄 변경처럼 동작이 바뀌지 않는 작은 수정은 phase 문서 없이 해도 된다.

### 2. 구현

- phase 문서의 작업 단계 체크박스를 진행하면서 체크한다.
- 아래 "아키텍처 (FSD)"와 [디자인 시스템](docs/design-system.md) 규칙을 따른다.
- 단계가 끝날 때마다 `pnpm lint`, `pnpm typecheck`를 통과시킨다.
- 구현이 끝나면 코드를 커밋·푸시한다. 이 커밋이 리뷰 대상의 기준이 된다.

### 3. 구현 후: 리뷰 계획 문서 작성

구현이 끝나면 바로 리뷰하지 않는다. `docs/reviews/`에 **리뷰 계획 문서를 먼저 새로 쓴다.**

- 파일 이름: phase와 같은 번호와 이름에 `-review`를 붙인다 (예: `03-fsd-migration-review.md`).
- 양식: [docs/reviews/_template.md](docs/reviews/_template.md)
- phase 문서를 다시 읽고, 완료 기준 하나하나를 **어떻게 확인할지**(명령, 볼 파일, 확인할 화면) 적는다.
- 실제 변경 내용(`git diff`)을 보고, 계획에 없던 변경이나 위험한 부분을 확인 항목에 추가한다.
- 기본 확인 항목: FSD 규칙, 디자인 시스템 토큰 사용, 접근성(대비, 키보드, aria), 에러·로딩 상태, 보안(새 의존성, 비밀값 노출).
- 리뷰 대상 기준 커밋(해시)을 문서에 적는다.
- **리뷰 계획(1절)까지 쓰면 리뷰를 시작하기 전에 커밋·푸시한다.** 결과 칸은 비워 둔 채로 올린다.
  - 커밋 메시지: `docs(review): NN 리뷰 계획`

### 4. 리뷰 실행과 기록

- 리뷰 계획 문서의 항목을 하나씩 확인하고, 같은 문서의 "결과" 칸에 통과/실패와 근거를 적는다.
- 발견한 문제는 "발견 사항"에 심각도(높음/중간/낮음)와 함께 적고, 고친 뒤 어떻게 고쳤는지 남긴다.
- 확인하지 못한 항목은 "확인 못 함"으로 솔직하게 적는다. 통과로 적지 않는다.
- 모든 항목이 끝나면 phase 문서의 상태를 `완료`로 바꾼다.
- 리뷰 중 고친 코드와 리뷰 결과를 커밋·푸시한다 (`fix: NN 리뷰 반영`, `docs(review): NN 리뷰 결과`).
- 이미 끝난 phase의 후속 PR도 리뷰를 건너뛰지 않는다. 그 phase의 리뷰 문서에 이 PR의 절(확인 항목과 결과)을 더하고 커밋한 뒤 머지한다.

## 아키텍처 (FSD)

[Feature-Sliced Design](https://feature-sliced.design)을 따른다.

### 레이어

위에서 아래로만 import 할 수 있다. 아래 레이어가 위 레이어를 import 하면 안 된다.

```
src/
├── app/        # 앱 초기화: 진입점, 라우터, 전역 Provider, 전역 스타일
├── pages/      # 라우트 하나 = 슬라이스 하나. 위젯과 기능을 조립만 한다
├── widgets/    # 여러 기능·엔티티를 묶은 큰 UI 블록 (헤더, 사이드바 등)
├── features/   # 사용자 동작 하나 = 슬라이스 하나 (로그인하기, 테마 바꾸기, 댓글 달기)
├── entities/   # 비즈니스 개념 (user, story 등): 타입, API, 표시용 UI
└── shared/     # 비즈니스와 무관한 공통 코드: ui(shadcn), api, lib, config
```

| 레이어     | import 가능한 레이어                       |
| ---------- | ------------------------------------------ |
| `app`      | pages, widgets, features, entities, shared |
| `pages`    | widgets, features, entities, shared        |
| `widgets`  | features, entities, shared                 |
| `features` | entities, shared                           |
| `entities` | shared                                     |
| `shared`   | (외부 패키지만)                            |

### 슬라이스와 세그먼트

- `pages`, `widgets`, `features`, `entities`는 **슬라이스**로 나눈다. 이름은 kebab-case (`features/theme-toggle`, `entities/story`).
- **같은 레이어의 슬라이스끼리는 import 하지 않는다.** (`features/a` → `features/b` 금지) 둘이 같이 쓰는 코드는 아래 레이어로 내린다.
- 슬라이스 안은 목적별 **세그먼트**로 나눈다. 필요한 것만 만든다.
  - `ui/`: 컴포넌트
  - `model/`: 상태, 훅, 타입, 비즈니스 로직
  - `api/`: API 호출 함수, TanStack Query 훅과 쿼리 키
  - `lib/`: 이 슬라이스 전용 헬퍼
  - `config/`: 상수, 설정
- `shared`와 `app`은 슬라이스 없이 바로 세그먼트로 나눈다 (`shared/ui`, `shared/api`, `shared/lib`, `shared/config`).

### Public API

- 각 슬라이스는 루트에 `index.ts`를 두고, 밖에서 쓸 것만 export 한다.
- 슬라이스 밖에서는 **`index.ts`로만 import** 한다. 내부 파일 경로로 직접 들어가지 않는다.

```ts
// 좋음
import { ThemeToggle } from '@/features/theme-toggle'
// 나쁨: 내부 파일 직접 import
import { ThemeToggle } from '@/features/theme-toggle/ui/ThemeToggle'
```

- 슬라이스 안에서는 상대 경로(`../model/...`)를 쓴다.
- `shared/ui`는 shadcn 컴포넌트가 파일 단위로 들어가므로 `@/shared/ui/button`처럼 파일별로 import 한다.

### 어디에 둘지 헷갈릴 때

1. 비즈니스와 상관없이 어디서나 쓰는가? → `shared`
2. 데이터 개념(명사)인가? (user, story) → `entities`
3. 사용자가 하는 동작(동사)인가? (로그인하기, 좋아요 누르기) → `features`
4. 여러 기능을 묶은 화면 블록인가? → `widgets`
5. 한 페이지에서만 쓰는가? → 그 `pages` 슬라이스 안에 둔다. **처음부터 widgets/features로 쪼개지 않는다.** 두 곳 이상에서 쓰이게 되면 그때 내린다.

## 코드 규칙

- import는 `@/` 별칭으로 레이어부터 쓴다 (`@/entities/story`).
- BE 호출은 항상 `@/shared/api`의 `apiClient`를 쓴다. axios 같은 HTTP 라이브러리를 추가하지 않는다.
- 서버 데이터는 TanStack Query로 다루고, 쿼리 키는 슬라이스의 `api/`에서 함께 정의한다.
- 색은 의미 토큰 클래스(`bg-background`, `text-muted-foreground`, `text-brand` 등)만 쓴다. `#333` 같은 값이나 팔레트 클래스(`bg-pine-700`)를 직접 쓰지 않는다. 의미 토큰을 쓰면 다크 모드는 저절로 맞춰진다. Tailwind 기본 팔레트(`red-500`, `white` 등)는 꺼져 있다.
- `pages`, `widgets`, `features`, `entities`에서는 `useEffect`와 타이머(`setTimeout`, `requestAnimationFrame` 등)를 쓰지 않는다. 서버 데이터는 TanStack Query, 파생 값은 렌더 중 계산, 외부 구독은 `shared/lib`에 목적이 드러나는 훅으로 만든다.
- shadcn 컴포넌트 추가: `pnpm dlx shadcn@latest add <name>` (`shared/ui`에 생긴다). 추가한 뒤 디자인 시스템 4장에 맞게 수정한다. 받은 컴포넌트에 들어 있는 `outline-none`, `focus-visible:ring-*`은 지운다 (포커스 표시는 전역, 4.6. `pnpm lint`가 잡는다).
- 사용자에게 보이는 문구는 한국어로 쓴다.

### 가드레일

위 규칙 중 기계로 검사할 수 있는 것은 `pnpm lint`가 막는다. 규칙마다 무엇이 강제하는지는 [docs/guardrails.md](docs/guardrails.md)에 있다.

- 같은 실수를 두 번 고치게 되면, 이 문서에 한 줄을 더하기 전에 lint나 테스트로 만들 수 있는지 먼저 본다.
- 규칙을 어기는 이유를 주석으로 남기지 않는다. 규칙이 틀렸으면 phase를 열어 규칙을 고친다. 제품 레이어에서는 `eslint-disable` 주석이 동작하지 않는다.
- ESLint 가드레일을 바꾸면 `scripts/check-guardrails.mjs`의 사례도 같이 고친다.
- Claude Code에는 `.claude/settings.json`의 훅이 추가로 걸린다: 섞인 커밋·`main` 커밋·squash 머지와 Confluence 회의록을 읽기 전의 phase 문서 쓰기를 막고, force push·PR 머지·가드레일 설정 수정 전에 사용자 확인을 받고, 고친 `src/` 파일을 바로 ESLint로 검사한다. 훅이 막으면 우회하지 말고 원인을 고친다. 훅을 바꾸면 `scripts/claude-guard.test.mjs`·`scripts/confluence-gate.test.mjs`도 같이 고친다.

## 명령

```bash
pnpm dev            # 개발 서버
pnpm lint           # ESLint + FSD 규칙 검사(steiger) + 가드레일 자체 검사
pnpm typecheck      # 타입 체크
pnpm build          # 타입 체크 + 빌드
pnpm format         # Prettier
pnpm test:scripts   # 작업 절차 검사·Claude Code 훅 테스트
pnpm check:process  # 현재 브랜치의 작업 절차 검사 (PR 설명은 --body-file pr.md)
```

pnpm이 없으면 `corepack enable`을 먼저 실행한다 (버전은 `package.json`의 `packageManager`로 고정).

## 의존성 보안

- 새 패키지를 추가하기 전에 이름(타이포스쿼팅), 관리 주체, 최근 배포일을 확인하고 phase 문서에 이유를 적는다.
- `pnpm-workspace.yaml`의 `minimumReleaseAge`(3일)와 `allowBuilds`(설치 스크립트 차단)를 끄거나 우회하지 않는다. 꼭 필요하면 사용자에게 먼저 묻는다.
- `.env*`(`.env.example` 제외)는 커밋하지 않는다. 클라이언트에 노출되는 값은 `VITE_` 접두사가 붙는다는 점을 주의한다.

## Git

- 브랜치: `<종류>/<이슈번호>-<짧은-설명>` (예: `setup/2-init`, `feat/12-story-list`). 종류는 `feat`, `fix`, `setup`, `refactor`, `docs`, `design`.
- PR 설명에 관련 이슈(`Closes #N`), phase 문서, 리뷰 문서 링크를 넣는다.
- 커밋·푸시는 위 "작업 순서"에 적힌 시점에만, **작업 브랜치에** 한다. 그 밖의 커밋·푸시는 사용자가 요청할 때만 한다.
- `main`에 직접 푸시, force push, PR 머지는 사용자가 명시적으로 요청할 때만 한다.
- 커밋 메시지는 `종류(범위): 설명` 형식으로 쓴다 (`feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `ci`). CI·워크플로 변경은 `ci`.
- 한 커밋에 계획 문서와 코드를 섞지 않는다.

### CI와 머지

- `main`은 ruleset으로 보호된다: PR 필수, CI(`check`) 통과 필수, 리뷰 댓글 해결 필수, force push·삭제 금지. 관리자도 우회할 수 없다. 자세한 내용은 [docs/architecture.md](docs/architecture.md) 6장.
- PR을 올리기 전에 로컬에서 `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`, `pnpm check:process`를 통과시킨다. CI도 같은 명령을 돌린다.
- CI는 PR마다 작업 절차도 검사한다 (`scripts/check-process.mjs`): 커밋 메시지 형식, 브랜치 이름, 계획·리뷰 문서와 다른 파일이 한 커밋에 섞였는지, 코드를 바꾼 첫 커밋 시점에 phase 문서가 승인됐는지, PR 설명에 `Refs #N`·phase 문서·(draft가 아니면) 리뷰 문서가 있는지, (draft가 아니면) 그 리뷰 문서가 이 PR에서 계획·리뷰 문서 밖의 마지막 변경(충돌을 풀며 고친 `main` 머지 포함)보다 뒤에 바뀌었는지. PR 설명을 고치거나 draft를 풀면 다시 돈다.
- phase가 필요 없는 작은 수정(위 "예외")은 PR 설명에 `- Phase: 없음 — 이유`를 쓴다. 이유를 비울 수 없고 CI 로그에 남는다. 이슈 링크는 예외 없이 필요하다.
- 머지는 **merge commit으로만** 한다. squash·rebase는 커밋 해시를 바꿔서 phase·리뷰 문서에 적은 해시가 끊긴다.
- 워크플로의 액션은 태그가 아니라 **커밋 SHA로 고정**한다 (`uses: owner/action@<40자리 SHA> # vX.Y.Z`). 레포 설정이 태그 사용을 거부한다.
- ruleset을 바꿀 때는 `.github/rulesets/main.json`을 먼저 고치고 API로 적용해서, 파일과 실제 설정을 항상 같게 유지한다. ruleset 변경과 일시 비활성화는 사용자 승인을 받고, 비활성화했다면 기록을 남긴다 ([architecture.md](docs/architecture.md) 6장 "긴급할 때").
