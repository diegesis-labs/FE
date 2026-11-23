# Phase 05: 작업 절차 CI 검사

- 상태: 리뷰 중
- 선행 phase: [04 가드레일 lint](04-guardrail-lint.md) (완료)
- 관련 이슈: [#11 작업 절차 CI 검사](https://github.com/diegesis-labs/FE/issues/11)
- 브랜치: `setup/11-process-check` (`main`의 `c7b7231`에서 만듦)
- 계획 커밋: `fed0851`
- 구현 커밋: `849ea7b` (`39b5130`~`849ea7b`)
- 리뷰 문서: [05-process-check-review.md](../reviews/05-process-check-review.md)

## 목표

[CLAUDE.md](../../CLAUDE.md) "작업 순서"와 "Git" 절의 규칙 중 PR에서 기계로 확인할 수 있는 것을 CI(`check`)에 넣는다. 커밋 메시지 형식, 브랜치 이름, 계획 문서와 코드가 한 커밋에 섞였는지, 코드보다 phase 승인이 먼저인지, PR 설명에 이슈·phase·리뷰 링크가 있는지를 PR마다 검사하고, 어기면 무엇을 고칠지 한국어로 알려주며 실패한다.

그중 일부는 PR보다 앞에서, Claude Code가 명령을 실행하거나 파일을 고치려는 순간에도 막는다 (Claude Code 프로젝트 훅).

## 배경

- [docs/guardrails.md](../guardrails.md) "작업 순서와 Git" 절에서 강제 수단이 "없음"인 규칙이 4개, "일부"인 규칙이 3개다. 지금은 사람과 에이전트가 지켜 주기를 바랄 뿐이다.
- 실제로 이번 세션에서도 절차 실수가 있었다. Phase 03 계획 변경 커밋에 스테이징돼 있던 파일 이동이 섞여 들어갔고(푸시 전에 발견), Phase 04 리뷰 결과 커밋은 포맷 검사가 실패한 채 푸시됐다(CI가 잡기 전에 고침). 첫 번째는 이 phase의 검사로 잡을 수 있다.
- Phase 04와 같은 원칙: 같은 실수를 두 번 고치게 되기 전에 결정적 검사로 만든다.
- CI는 푸시된 뒤에야 잡는다. 이 레포의 커밋·푸시는 대부분 Claude Code가 하는데, `FE/.claude/`에 설정이 없어 Claude에게는 CLAUDE.md 글만 있다. force push, PR 머지처럼 되돌리기 어려운 동작은 실행 전에 막거나 사용자 확인을 받아야 한다.

### 지금 이력에 적용하면 (2026-11-20 확인)

| 검사                       | `main`의 머지가 아닌 커밋·PR에 적용한 결과                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 커밋 메시지 형식           | 2개 불일치: `2d0e17b`, `984c2da`가 `ci:`로 시작한다. CLAUDE.md 종류 목록에 `ci`가 없다. `ci`를 더하기로 해서 해소 (아래 "열린 질문 1") |
| 계획·리뷰 문서와 다른 파일 | 섞인 커밋 0개                                                                                                                          |
| 브랜치 이름                | PR #5 `setup/2-init`, #7 `docs/2-phase02-complete`, #9 `setup/2-fsd-migration`, #10 `setup/8-guardrail-lint` 모두 통과                 |
| PR 설명                    | #7, #9, #10은 통과. #5는 `Refs`/`Closes` 줄이 없다 (이 phase 전의 PR이라 문제 삼지 않음)                                               |

## 범위

### 하는 것

1. **검사 스크립트** `scripts/check-process.mjs` (Node 기본 기능과 `git`만 사용, 새 의존성 없음). PR의 커밋(`base..head`, 머지 커밋 제외)과 PR 정보를 받아 아래 5가지를 검사한다.
2. **스크립트 테스트** `scripts/check-process.test.mjs` (Node 내장 `node:test`). 검사 함수마다 통과·실패 사례를 둔다. Phase 04의 가드레일 자체 검사와 같은 목적: 검사가 조용히 무력해지는 것을 막는다.
3. **CI**: `check` job에 PR일 때만 도는 단계를 추가한다. 같은 job이라 ruleset의 필수 검사(`check`)는 바꾸지 않는다.
4. **문서**: `docs/guardrails.md`의 해당 줄을 "CI"로 바꾸고, CLAUDE.md, `docs/architecture.md` 6장, PR 템플릿을 고친다.
5. **Claude Code 훅** `.claude/settings.json`, `.claude/hooks/guard.mjs`와 그 테스트 `scripts/claude-guard.test.mjs`. 아래 "Claude Code 훅" 절.

### 하지 않는 것

- **사람의 승인 자체를 확인하는 것.** CI는 phase 문서의 `상태:` 줄이 코드 커밋보다 먼저 `승인됨`이 되었는지만 본다. 누가 승인했는지는 알 수 없다. 이 한계를 `docs/guardrails.md`에 "일부"로 적는다.
- 로컬 커밋 훅(husky, lefthook 등). 새 의존성이 필요하고, CI에서 잡으면 충분하다. 대신 로컬에서 같은 검사를 돌리는 명령(`pnpm check:process`)을 둔다. (Claude Code 훅은 git 훅이 아니다. Claude가 도구를 쓸 때만 돌고 새 의존성이 없다.)
- 사람이 터미널에서 직접 하는 작업을 훅으로 막는 것. 사람의 작업은 CI와 ruleset이 본다.
- ruleset 변경. 새 job을 만들지 않고 `check`에 단계를 더하므로 필요 없다.
- 이미 머지된 PR과 커밋을 고치는 것. 검사는 새 PR부터 적용된다.
- 화면 검증(Playwright, axe). 별도 phase.

## 설계

### FSD 배치

코드 슬라이스는 만들지 않는다. 바뀌는 파일은 스크립트, CI, 문서뿐이다.

| 파일                               | 바꿀 것                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------- |
| `scripts/check-process.mjs`        | 새 파일. 검사 함수 5개 + PR 정보를 모으는 진입점                        |
| `scripts/check-process.test.mjs`   | 새 파일. 검사 함수별 통과·실패 사례                                     |
| `.github/workflows/ci.yml`         | PR 이벤트 종류 추가, 체크아웃 전체 이력, 절차 검사·스크립트 테스트 단계 |
| `package.json`                     | `check:process`, `test:scripts` 스크립트                                |
| `.github/pull_request_template.md` | 필수 줄 형식 안내, "Phase: 없음" 예외 쓰는 법                           |
| `docs/guardrails.md`               | "작업 순서와 Git" 절의 강제 수단 갱신                                   |
| `CLAUDE.md`                        | 검사 내용 요약과 명령 추가                                              |
| `docs/architecture.md`             | 6장 CI 단계 목록                                                        |
| `.claude/settings.json`            | 새 파일. Claude Code 권한 규칙(deny·ask)과 훅 등록                      |
| `.claude/hooks/guard.mjs`          | 새 파일. git·gh 명령 검사, `src/` 수정 전 phase 확인, 수정 후 ESLint    |
| `scripts/claude-guard.test.mjs`    | 새 파일. 훅 판정 사례 테스트                                            |

### 검사 5가지

| #   | 검사                       | 규칙 (CLAUDE.md)                         | 통과 조건                                                                                                                                                                                         | 실패 메시지 (요지)                                                                                                              |
| --- | -------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 커밋 메시지                | `종류(범위): 설명`                       | PR의 머지가 아닌 커밋 제목이 모두 `^(feat\|fix\|refactor\|docs\|chore\|style\|ci)(\([^)]+\))?: .+` (`ci` 추가는 "열린 질문 1")                                                                    | "`abc1234` 커밋 제목이 형식에 맞지 않습니다. `종류(범위): 설명`으로 고치세요 (git rebase -i 후 force push는 작업 브랜치에서만)" |
| 2   | 브랜치 이름                | `<종류>/<이슈번호>-<짧은-설명>`          | `^(feat\|fix\|setup\|refactor\|docs\|design)/[0-9]+-[a-z0-9-]+$`. `dependabot/` 브랜치는 제외                                                                                                     | "브랜치 이름은 `종류/이슈번호-설명` 형식이어야 합니다 (예: `feat/12-story-list`)"                                               |
| 3   | 계획 문서와 코드 분리      | 한 커밋에 계획 문서와 코드를 섞지 않는다 | `docs/phases/`나 `docs/reviews/` 파일을 바꾼 커밋은 그 두 폴더 밖의 파일을 바꾸지 않는다                                                                                                          | "`abc1234`가 계획·리뷰 문서와 다른 파일을 함께 바꿨습니다. 커밋을 나누세요"                                                     |
| 4   | phase 승인이 코드보다 먼저 | phase 문서 승인 → 커밋 → 구현            | PR에 **코드 변경**(아래 정의)이 있으면, PR 설명이 가리키는 phase 문서가 있어야 하고, 코드를 바꾼 첫 커밋 시점의 그 문서 `상태:`가 `계획`이 아니어야 한다 (`승인됨`, `진행 중`, `리뷰 중`, `완료`) | "코드 커밋 `abc1234` 시점에 `docs/phases/05-…md`가 아직 승인되지 않았습니다. phase 문서를 먼저 승인·커밋하세요"                 |
| 5   | PR 설명                    | 관련 이슈, phase 문서, 리뷰 문서 링크    | `Closes #N` 또는 `Refs #N`가 있다. `docs/phases/NN-….md`를 가리키고 그 파일이 있다. draft가 아니면 `docs/reviews/NN-…-review.md`를 가리키고 그 파일이 있다                                        | "PR 설명에 `Refs #N`(또는 `Closes #N`) 줄이 없습니다" 등                                                                        |

- **코드 변경의 정의**: `docs/` 아래 파일과 루트의 `*.md`(CLAUDE.md, README.md)를 뺀 모든 파일. 설정 파일과 `.github/`도 코드로 본다.
- **예외 (CLAUDE.md "예외: 오타, 문서 수정, 설정값 한 줄 변경")**: PR 설명에 `- Phase: 없음 — <이유>` 줄을 쓰면 검사 4와 5의 phase·리뷰 링크를 건너뛴다. 이유가 비어 있으면 실패한다. CI 로그에 "phase 없이 머지되는 PR입니다: <이유>"를 남겨 리뷰어가 보게 한다. 이슈 링크(`Refs #N`)는 예외 없이 필요하다.
- **Dependabot**: PR 작성자가 `dependabot[bot]`이면 검사 1만 한다 (Dependabot 커밋은 `chore(deps): …` 형식이라 통과한다).

### CI 변경

```yaml
on:
  pull_request:
    branches: [main]
    # PR 설명을 고치면 다시 검사한다 (edited), draft 해제 때도 (ready_for_review)
    types: [opened, synchronize, reopened, edited, ready_for_review]
  push:
    branches: [main]

steps:
  - uses: actions/checkout@<SHA> # v7.0.1
    with:
      persist-credentials: false
      fetch-depth: 0 # PR의 커밋을 하나씩 보려면 전체 이력이 필요하다
  # … 기존 단계
  - run: pnpm test:scripts
  - name: 작업 절차 검사
    if: github.event_name == 'pull_request'
    run: node scripts/check-process.mjs --event "$GITHUB_EVENT_PATH"
```

- **보안**: PR 제목·설명·브랜치 이름은 외부 입력이다. `${{ github.event.pull_request.body }}`를 `run:`에 직접 넣으면 셸 명령 주입이 된다. 스크립트가 `GITHUB_EVENT_PATH`의 JSON 파일을 직접 읽게 하고, `git` 호출은 `execFileSync`에 인자 배열로 넘겨 셸을 거치지 않는다. 토큰 권한은 지금처럼 `contents: read`만 쓰고 `pull_request_target`은 쓰지 않는다.
- `fetch-depth: 0`으로 체크아웃 시간이 조금 늘어난다 (레포가 작아 몇 초 수준).

### 로컬에서 쓰기

```bash
pnpm check:process            # 현재 브랜치를 origin/main과 비교. PR 설명은 --body-file로
pnpm test:scripts             # 검사 스크립트 테스트
```

`check:process`는 PR 설명이 없으면 검사 5를 건너뛰고 1~4만 한다.

### Claude Code 훅

`.claude/settings.json`은 커밋해서 이 레포를 여는 모든 Claude Code 세션에 적용한다. 판정은 세 가지다: **막음**(deny), **사용자 확인**(ask), 통과.

| 시점         | 대상                                                                                                         | 판정        | 근거 (CLAUDE.md)                        |
| ------------ | ------------------------------------------------------------------------------------------------------------ | ----------- | --------------------------------------- |
| Bash 실행 전 | `main`에서 `git commit`                                                                                      | 막음        | 커밋은 작업 브랜치에                    |
| Bash 실행 전 | 스테이징에 `docs/phases`·`docs/reviews`와 다른 파일이 함께 있는 `git commit`                                 | 막음        | 계획 문서와 코드를 섞지 않는다 (검사 3) |
| Bash 실행 전 | `--no-verify`                                                                                                | 막음        | 검사를 건너뛰지 않는다                  |
| Bash 실행 전 | `gh pr merge --squash`·`--rebase`                                                                            | 막음        | merge commit으로만                      |
| Bash 실행 전 | force push, `main`으로 푸시, `gh pr merge`, `gh api`로 ruleset 변경                                          | 사용자 확인 | 사용자가 명시적으로 요청할 때만         |
| 파일 수정 전 | `pnpm-workspace.yaml`, `eslint.config.js`, `steiger.config.ts`, `scripts/check-guardrails.mjs`, `.github/**` | 사용자 확인 | 의존성 보안, 가드레일·ruleset 변경      |
| Bash 실행 전 | `pnpm add`, `pnpm update`                                                                                    | 사용자 확인 | 새 패키지는 확인 후 phase에 적는다      |
| 파일 수정 전 | `src/` 파일인데 상태가 `승인됨`·`진행 중`·`리뷰 중`인 phase 문서가 없음                                      | 사용자 확인 | 코드보다 phase 승인이 먼저 (검사 4)     |
| 파일 수정 후 | 고친 `src/**/*.{ts,tsx}`를 ESLint로 검사, 실패하면 오류를 Claude에게 돌려준다                                | 고치게 함   | 단계마다 `pnpm lint`                    |
| 파일 읽기    | `.env`, `.env.local`, `.env.*.local`                                                                         | 막음        | 비밀값 노출 주의                        |

- 훅 스크립트는 Node 내장 기능과 `git`만 쓴다. 판정 사례는 `scripts/claude-guard.test.mjs`가 훅을 직접 실행해 확인한다 (`pnpm test:scripts`에 포함).
- phase 확인을 "막음"이 아니라 "사용자 확인"으로 둔 이유: CLAUDE.md가 오타·설정값 한 줄 같은 예외를 허용하고, 훅은 그 판단을 할 수 없다.

### 화면과 상태

화면 변경 없음.

### 새 의존성

없음. Node 내장(`node:test`, `node:child_process`, `node:fs`)과 `git`만 쓴다.

## 작업 단계

- [x] 1. `scripts/check-process.mjs`에 검사 함수 5개를 순수 함수로 만들고(입력: 커밋 목록·파일 목록·문서 내용·PR 정보), 진입점에서 `git`과 이벤트 JSON으로 입력을 모은다.
- [x] 2. `scripts/check-process.test.mjs`에 검사마다 통과·실패 사례를 만든다. 위 "지금 이력에 적용하면" 표의 실제 사례(`ci:` 커밋, PR #10 설명 등)를 포함한다.
- [x] 3. `package.json`에 `check:process`, `test:scripts`를 추가한다.
- [x] 4. 지난 PR #9, #10의 커밋 범위로 `check:process`를 돌려 통과하는지 확인한다 (PR 설명은 `gh pr view`로 받은 파일).
- [x] 5. `ci.yml`을 고친다. 이 phase의 PR에서 검사가 실제로 돌고 통과하는지, 일부러 어긴 커밋을 넣으면 실패하는지 확인한다 (확인용 커밋은 되돌린다).
- [x] 6. `.claude/settings.json`과 `.claude/hooks/guard.mjs`를 만들고, `scripts/claude-guard.test.mjs`에 위 표의 판정마다 사례를 만든다.
- [x] 7. `docs/guardrails.md`, CLAUDE.md, `docs/architecture.md` 6장, PR 템플릿을 고친다.
- [x] 8. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`를 통과시킨다.

## 완료 기준

- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`가 통과한다.
- [ ] 검사 5가지마다 통과 사례와 실패 사례가 `scripts/check-process.test.mjs`에 있고 모두 기대대로 나온다.
- [ ] 지난 PR #9, #10의 커밋과 설명으로 돌리면 통과한다.
- [ ] 이 phase의 PR에서 CI `check`가 절차 검사 단계를 실행하고 통과한다.
- [ ] 이 phase의 PR에 형식에 맞지 않는 커밋을 일부러 넣으면 CI가 실패하고, 메시지가 무엇을 고칠지 알려준다 (확인 후 되돌림).
- [ ] PR 설명을 고치면(`edited`) CI가 다시 돈다.
- [ ] PR 제목·설명·브랜치 이름이 셸 명령으로 해석되지 않는다 (`ci.yml`에 `${{ github.event.pull_request.* }}`를 `run:`에 넣은 곳이 없다).
- [ ] 새 의존성이 없다.
- [ ] `docs/guardrails.md`의 "작업 순서와 Git" 절이 실제 검사와 맞다.
- [ ] `scripts/claude-guard.test.mjs`가 "Claude Code 훅" 표의 판정마다 사례를 갖고 모두 기대대로 나온다.
- [ ] 새 Claude Code 세션에서 훅이 실제로 돈다 (예: `git push --force --dry-run`에 확인 창이 뜬다, `src/` 파일에 팔레트 클래스를 넣으면 ESLint 오류가 돌아온다).

## 위험과 열린 질문

1. **커밋 종류 목록** (결정): `ci`를 더한다 (2026-11-20 사용자 결정). CI·워크플로 변경은 `ci:`로 쓴다. 이력의 `ci:` 커밋 2개도 형식에 맞게 된다. CLAUDE.md의 종류 목록도 구현 때 같이 고친다.
2. **"승인됨"은 스스로 적는 값이다**: CI는 순서만 확인한다. 승인 없이 `승인됨`으로 바꾸고 커밋해도 통과한다. 사람의 확인은 여전히 리뷰와 PR 머지 단계에 남는다.
3. **예외 줄(`Phase: 없음 — 이유`)이 우회로가 될 수 있다**: 영상과 Phase 04에서 경계한 "핑계가 되는 탈출구"와 같은 종류다. 이유를 비울 수 없게 하고 CI 로그에 남기는 것으로 시작하고, 남용되면 코드 변경 줄 수 상한을 둔다.
4. **이미 열린 PR에 소급 적용**: 이 phase가 머지된 뒤 열려 있는 PR은 다음 push 때 검사를 받는다. 지금 열린 PR은 없다.
5. **커밋 메시지를 고치려면 force push가 필요하다**: 작업 브랜치에서만 하고, CLAUDE.md의 "force push는 사용자가 요청할 때만"과 부딪힌다. 실패 메시지에 "작업 브랜치에서만"을 적고, force push 전에 사용자에게 묻는 절차를 유지한다. Claude Code 훅이 force push마다 사용자 확인을 받으므로 이 절차가 기계로 지켜진다.
6. **Claude Code 훅의 빈틈**: Claude에게만 걸린다. `git add … && git commit`을 한 명령으로 실행하면 훅이 보는 시점에 아직 스테이징 전이라 섞인 커밋을 놓친다 (검사 3이 PR에서 잡는다). `.env` 읽기 금지는 Read 도구에만 적용되고 `cat .env` 같은 셸 명령은 막지 못한다. 명령 문자열을 정규식으로 보므로 별칭·스크립트로 감싼 명령은 못 잡는다.

## 변경 기록

- 2026-11-20: 작성
- 2026-11-20: 승인. 커밋 종류에 `ci` 추가하기로 함. 이슈 #11 생성, 브랜치 `setup/11-process-check`
- 2026-11-22: 계획 변경 - Claude Code 프로젝트 훅 추가 (사용자 요청). CI는 푸시 뒤에야 잡으므로, force push·머지·섞인 커밋처럼 되돌리기 어려운 동작을 Claude가 실행하기 전에 막는다. 범위 5, "Claude Code 훅" 절, 작업 단계 6, 완료 기준 2개, 위험 6을 더함. 계획 커밋 해시 기록
- 2026-11-22: 구현 (단계 5의 PR 확인 전). 지난 PR #9, #10은 통과. 이 phase 전의 PR #5는 검사 3(`_template.md`와 CLAUDE.md를 함께 바꾼 커밋 2개), 4, 5에서 실패하며, 소급 적용하지 않으므로 그대로 둔다
- 2026-11-22: 단계 5 확인 (PR #12). draft에서 CI 통과(run 45032271794). draft 해제 때 리뷰 문서가 없어 검사 5가 실패(run 45033228321)해서 draft로 되돌림. 형식에 맞지 않는 빈 커밋 `1558ab3`을 넣자 검사 1만 실패하며 고칠 형식을 알려줌(run 45033783171). 사용자 승인 후 force push로 `1558ab3` 제거
