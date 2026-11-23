# Review 05: 작업 절차 CI 검사

- 대상 phase: [05-process-check.md](../phases/05-process-check.md)
- 리뷰 대상: 브랜치 `setup/11-process-check`, 기준 커밋 `849ea7b` (phase의 구현 커밋). `main`(06~09, #22)을 받은 머지 `5b32b2f` 위에서 확인
- 리뷰 계획 커밋: (1절까지 쓰고 커밋·푸시한 해시)
- 작성일: 2026-11-23
- 결과: 진행 중

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff fed0851..849ea7b` 기준 12개 파일, +1040 −45.

- `scripts/check-process.mjs`: 검사 함수 5개(순수 함수)와 진입점. CI는 `--event "$GITHUB_EVENT_PATH"`로 이벤트 JSON을 읽고, 로컬은 `--base`·`--body-file`·`--draft`. `git`은 `execFileSync` 인자 배열로만 부른다. 머지 커밋은 `--no-merges`로 뺀다.
- `scripts/check-process.test.mjs`: 검사별 통과·실패 사례.
- `.claude/settings.json`, `.claude/hooks/guard.mjs`: Claude Code 권한 규칙(deny·ask)과 훅 3개(Bash 전, Edit 전, Edit 후 ESLint).
- `scripts/claude-guard.test.mjs`: 훅을 직접 실행해 판정을 확인하는 사례.
- `.github/workflows/ci.yml`: PR 이벤트 `types`에 `edited`·`ready_for_review` 추가, `fetch-depth: 0`, 절차 검사 단계(PR일 때만), `pnpm test:scripts`.
- `package.json`: `check:process`, `test:scripts`.
- 문서: CLAUDE.md(커밋 종류 `ci`, 명령, CI 절, 훅), `docs/guardrails.md`, `docs/architecture.md` 6장, PR 템플릿.

계획과 다른 점: Claude Code 훅(범위 5)은 계획 변경 `69e7121`로 추가됨 (phase 변경 기록에 있음). 그 밖에 계획에 없던 파일 변경은 없다.

머지 `5b32b2f`: `main`의 06~09와 #22를 받았다. 충돌 없이 자동 머지됨. CLAUDE.md·`docs/guardrails.md`는 05와 09가 모두 고친 파일이라 두 변경이 함께 남았는지 본다.

### 1.2 완료 기준 확인 방법

| #   | 완료 기준                                                                                                                        | 확인 방법                                                                                                                                                       | 결과 |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`가 통과한다                                 | `5b32b2f`에서 다섯 명령 종료 코드. PR CI `check`                                                                                                                |      |
| 2   | 검사 5가지마다 통과 사례와 실패 사례가 `scripts/check-process.test.mjs`에 있고 모두 기대대로 나온다                              | 테스트 파일을 읽어 검사별 통과·실패 사례 개수를 센다. `pnpm test:scripts` 결과                                                                                  |      |
| 3   | 지난 PR #9, #10의 커밋과 설명으로 돌리면 통과한다                                                                                | `gh pr view`로 설명을 받고 각 PR의 base·head 커밋으로 `node scripts/check-process.mjs --base … --head … --body-file …`. 머지된 #16·#17·#20·#22도 같이 돌려 본다 |      |
| 4   | 이 phase의 PR에서 CI `check`가 절차 검사 단계를 실행하고 통과한다                                                                | 리뷰 문서를 넣고 draft를 해제한 뒤 PR CI 로그에서 "작업 절차 검사" 단계가 돌고 통과했는지                                                                       |      |
| 5   | 형식에 맞지 않는 커밋을 일부러 넣으면 CI가 실패하고, 메시지가 무엇을 고칠지 알려준다 (확인 후 되돌림)                            | 구현 때 확인한 run 45033783171(phase 변경 기록)을 근거로 쓴다. 로컬에서 빈 커밋을 만들어 `check:process`로 메시지를 다시 보고 지운다 (푸시하지 않음)            |      |
| 6   | PR 설명을 고치면(`edited`) CI가 다시 돈다                                                                                        | PR 설명에 리뷰 문서 링크를 넣을 때 새 run이 `pull_request`·`edited`로 시작되는지 (`gh run list`의 이벤트)                                                       |      |
| 7   | PR 제목·설명·브랜치 이름이 셸 명령으로 해석되지 않는다 (`ci.yml`에 `${{ github.event.pull_request.* }}`를 `run:`에 넣은 곳 없음) | `grep -n '\${{' .github/workflows/ci.yml`. 스크립트에서 `exec`·`execSync`·`shell: true`를 쓰지 않는지 `grep`                                                    |      |
| 8   | 새 의존성이 없다                                                                                                                 | `git diff fed0851..5b32b2f -- package.json pnpm-lock.yaml`에서 `dependencies` 변경 없음. import가 `node:` 모듈뿐인지                                            |      |
| 9   | `docs/guardrails.md`의 "작업 순서와 Git" 절이 실제 검사와 맞다                                                                   | 절의 줄마다 대응하는 검사 함수·훅 판정이 있는지 대조. 머지 후 09의 포커스 줄도 남아 있는지                                                                      |      |
| 10  | `scripts/claude-guard.test.mjs`가 "Claude Code 훅" 표의 판정마다 사례를 갖고 모두 기대대로 나온다                                | phase 문서의 훅 표 10줄과 테스트 사례를 하나씩 대조. `pnpm test:scripts` 결과                                                                                   |      |
| 11  | 새 Claude Code 세션에서 훅이 실제로 돈다 (`git push --force --dry-run`에 확인 창, `src/`에 팔레트 클래스를 넣으면 ESLint 오류)   | 이 브랜치의 worktree에서 `claude -p`로 새 세션을 열어 두 동작을 시키고 결과를 본다. 넣은 팔레트 클래스는 되돌린다                                               |      |

### 1.3 공통 확인 항목

| 영역   | 확인할 것                                                            | 확인 방법                                                   | 결과 |
| ------ | -------------------------------------------------------------------- | ----------------------------------------------------------- | ---- |
| FSD    | 아래 레이어가 위 레이어를 import 하지 않는다                         | `src/` 변경 없음을 diff로 확인 (05 커밋 범위), steiger 통과 |      |
| FSD    | 같은 레이어 슬라이스끼리 import 하지 않는다                          | 위와 같음                                                   |      |
| FSD    | 슬라이스 밖에서는 `index.ts`로만 import 한다                         | 위와 같음                                                   |      |
| 디자인 | 색은 의미 토큰만 쓴다 (`#hex`, 팔레트 직접 사용 없음)                | 해당 없음 (`src/` 변경 없음)                                |      |
| 디자인 | 라이트/다크 둘 다 깨지지 않는다                                      | 해당 없음 (화면 변경 없음)                                  |      |
| 접근성 | 글자 대비 4.5:1 이상, 키보드로 조작 가능, 아이콘 버튼에 `aria-label` | 해당 없음 (화면 변경 없음)                                  |      |
| 상태   | 로딩, 빈 상태, 에러 상태가 있다                                      | 해당 없음                                                   |      |
| 보안   | 새 의존성이 phase 문서에 적혀 있고 확인되었다                        | 1.2의 8                                                     |      |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                                    | diff 검색. CI 권한이 `contents: read`뿐인지                 |      |

### 1.4 이번 변경에서 특히 볼 것

- **훅 명령 정규식의 빈틈**: `git(?:\s+-C\s+\S+)?\s+(push|commit)`은 `-C` 말고 다른 전역 옵션이 붙은 명령(`git -c k=v push --force`)을 놓친다. 실제로 이 레포 작업에서 `git -c credential.helper=… push`를 썼다. 놓치는 범위와 위험 6(빈틈)에 적혀 있는지 확인한다.
- **훅 오탐**: `git commit -m "… -n …"`처럼 메시지 안의 `-n`·`--no-verify`가 막히는지. `git push origin feature-main` 같은 이름이 main 푸시로 잡히는지.
- **훅이 걸리는 범위**: 훅은 `$CLAUDE_PROJECT_DIR/.claude/`의 설정이라, 상위 폴더(`diegesis-labs/`)에서 연 세션이나 다른 worktree에서는 걸리지 않는다. 문서가 이 점을 말하는지.
- **머지 커밋 제외의 부작용**: `--no-merges`라서 `main`을 받는 머지에서 충돌을 풀며 바꾼 코드는 어떤 검사도 보지 않는다. 의도한 한계인지, 문서에 있는지.
- **예외 줄 파싱**: `- Phase: 없음 — 이유`. #22처럼 `- Phase: 없음. 이유`로 쓴 경우 이유가 어떻게 잡히는지. 템플릿과 CLAUDE.md의 안내가 같은지.
- **머지 결과 문서**: CLAUDE.md, `docs/guardrails.md`, `docs/architecture.md`에서 05와 09(그리고 #22)의 내용이 함께 남았고 서로 어긋나지 않는지.
- **이 브랜치가 오래 열려 있었음**: 06~09가 05 없이 머지됐다. 05가 머지된 뒤 열리는 PR부터 검사가 걸린다. 지금 열린 다른 PR이 없는지.
