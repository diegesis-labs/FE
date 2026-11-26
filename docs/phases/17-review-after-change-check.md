# Phase 17: 리뷰 없이 머지되는 PR을 작업 절차 검사로 막기

- 상태: 승인됨
- 선행 phase: [05 작업 절차 CI 검사](05-process-check.md), [16 실제 BE와 Google 로그인을 로컬에서 확인](16-be-login-local.md) (둘 다 `main`에 머지됨)
- 관련 이슈: [#41](https://github.com/diegesis-labs/FE/issues/41)
- 브랜치: `setup/41-review-after-change-check`
- 계획 커밋: `44e6e39`
- 구현 커밋: `d865a67`
- 리뷰 문서: [17-review-after-change-check-review.md](../reviews/17-review-after-change-check-review.md) (리뷰 단계에서 작성)

## 목표

PR이 링크한 리뷰 문서가 그 PR 안에서, 마지막 변경보다 뒤에 고쳐지지 않았으면 CI 작업 절차 검사가 실패하게 한다. 이미 끝난 리뷰 문서를 링크해서 리뷰 없이 머지하는 일(PR #38)을 기계로 막는다.

## 배경

- [16 리뷰](../reviews/16-be-login-local-review.md) 발견 사항 1: phase 15 후속 PR #38이 리뷰 계획과 리뷰 없이 머지됐다. PR 설명이 이미 끝난 15 리뷰 문서를 링크했고, 검사 5는 링크한 파일이 브랜치에 있는지만 봐서 통과했다. 사용자가 지적해서 알았다.
- 사용자 결정 (2026-11-26): "검사 보강하고 머지하자". 사람이 지키는 규칙으로만 두지 않고 검사로 막는다.
- CLAUDE.md 가드레일: "같은 실수를 두 번 고치게 되면, 이 문서에 한 줄을 더하기 전에 lint나 테스트로 만들 수 있는지 먼저 본다." 이번이 첫 번째지만, 리뷰를 건너뛰는 것은 작업 순서의 핵심이라 지금 막는다.
- Confluence 최신 회의록("2주차 전체 회의" 2026-11-25, 음악팀 1·2차 회의)에 FE 작업 절차에 관한 새 결정은 없다.

## 범위

### 하는 것

1. **검사 6 추가** (`scripts/check-process.mjs`): draft가 아니고 예외 줄(`- Phase: 없음`)이 없는 PR에서
   - PR이 링크한 리뷰 문서를 PR의 커밋(머지 커밋 제외) 중 하나 이상이 바꿨는지 본다. 없으면 실패: "리뷰 문서가 이 PR에서 바뀌지 않았습니다. 이 PR의 리뷰 계획과 결과를 적으세요."
   - 리뷰 문서를 바꾼 마지막 커밋이, 계획·리뷰 문서(`docs/phases/`, `docs/reviews/`) 밖의 파일을 바꾼 마지막 커밋보다 뒤인지 본다. 아니면 실패: "`<커밋>` 이후의 변경이 리뷰 문서에 기록되지 않았습니다." 리뷰 뒤에 고친 것(`fix: NN 리뷰 반영`)은 리뷰 결과 커밋이 뒤따라야 한다는 지금 규칙과 같다.
   - 로컬에서 PR 설명 없이 돌리면(`pnpm check:process`) 검사 5처럼 건너뛰고 알림만 낸다. `--body-file`을 주면 돈다.
2. **테스트** (`scripts/check-process.test.mjs`): PR #38 모양(리뷰 문서를 안 바꿈) 실패, PR #40 모양(구현 뒤 리뷰 계획·결과) 통과, 리뷰 결과 뒤에 코드를 고친 경우 실패, 리뷰 뒤 phase 문서만 고친 경우 통과, draft·예외 줄은 건너뜀, `runChecks`의 검사 목록.
3. **문서**: CLAUDE.md "CI와 머지"의 검사 목록과 "4. 리뷰 실행과 기록"(후속 PR도 리뷰 문서에 그 PR의 확인과 결과를 적은 뒤 머지한다), `docs/guardrails.md`의 표, `docs/architecture.md` 6장 CI 단계 3, `.github/pull_request_template.md` 주석.
4. **16 리뷰 문서**: 발견 사항 1의 조치에 이 phase를 적는다.

### 하지 않는 것

- 리뷰 문서의 내용 검사 (결과 칸이 비었는지, 커밋 해시가 맞는지). 형식이 phase마다 달라서 오탐이 많다. 이번에는 "PR 안에서, 마지막 변경 뒤에 고쳤는가"만 본다.
- 이미 머지된 PR을 다시 검사하기.
- Claude Code 훅(`gh pr merge` 전에 검사 6을 미리 돌리기). 훅은 머지 전에 사용자 확인을 받고 있고, CI `check`가 필수라서 검사 6이 실패하면 머지할 수 없다.
- ruleset, `ci.yml` 변경. 이미 `ready_for_review`, `edited`에도 돈다.

## 설계

### FSD 배치

제품 코드(`src/`)는 바꾸지 않는다.

| 파일                                       | 바꿀 것                                             |
| ------------------------------------------ | --------------------------------------------------- |
| `scripts/check-process.mjs`                | `checkReviewAfterChanges()`, `runChecks()`에 검사 6 |
| `scripts/check-process.test.mjs`           | 검사 6 사례, `runChecks` 사례 갱신                  |
| `CLAUDE.md`                                | 검사 목록, 후속 PR 리뷰 규칙 한 줄                  |
| `docs/guardrails.md`                       | "리뷰 계획·결과를 리뷰 문서에 남긴다" 줄            |
| `docs/architecture.md`                     | 6장 CI 단계 3의 검사 목록                           |
| `.github/pull_request_template.md`         | 주석에 리뷰 문서 조건                               |
| `docs/reviews/16-be-login-local-review.md` | 발견 사항 1 조치                                    |

### 검사 6

```js
/**
 * 검사 6: PR이 링크한 리뷰 문서가 이 PR에서 바뀌었고, 마지막 변경(계획·리뷰 문서 밖)보다 뒤에 바뀌었다.
 * commits는 오래된 것부터(머지 커밋 제외). reviewPath는 PR 설명의 리뷰 문서 경로.
 */
export function checkReviewAfterChanges({ commits, reviewPath }) { ... }
```

- 입력은 검사 3·4와 같은 커밋 목록(`{ sha, subject, files }`)이다. git을 새로 부르지 않는다.
- 리뷰 문서 경로가 없거나 브랜치에 없으면 검사 5가 이미 실패하므로 검사 6은 아무것도 내지 않는다 (같은 원인으로 두 번 실패하지 않게).
- 리뷰 문서의 이름을 이 PR에서 바꾼 경우(`git mv`)는 diff-tree의 새 이름으로 잡힌다.

### 지난 PR에 대 보기 (구현 때 실제 커밋으로 확인)

머지 커밋의 두 부모로 돌렸다 (`--base <머지>^1 --head <머지>^2 --body-file <PR 설명>`). 결과는 표와 같았다.

| PR  | 모양                                                  | 검사 6 |
| --- | ----------------------------------------------------- | ------ |
| #38 | 구현 `1c4b07f`, phase 문서만 더 고침, 15 리뷰 링크    | 실패   |
| #40 | 구현 `11e0282` 뒤 리뷰 계획 `6b88849`, 결과 `669a4df` | 통과   |
| #37 | 리뷰 반영 `a30666d` 뒤 리뷰 결과 `6038174`            | 통과   |
| #5  | 01·02 phase를 함께 올린 첫 PR. 설명은 01 리뷰만 링크  | 실패   |

그 밖에 머지된 PR(리뷰 링크가 있는 #7~#35)은 모두 통과했고, 예외 줄 PR(#22, #25, #26)은 검사 6을 하지 않았다. #5는 작업 절차 검사가 생기기 전(phase 05)의 PR이다. 마지막 변경 `ce5e76d`(02 리뷰 반영)는 02 리뷰 문서에 기록됐지만 설명은 01 리뷰만 링크했다. 오탐이 아니라, 설명이 마지막 리뷰를 가리키지 않은 경우다.

### 새 의존성

없음.

## 작업 단계

- [x] 1. `checkReviewAfterChanges()`와 테스트를 쓰고 `runChecks()`에 넣는다. `pnpm test:scripts` 통과.
- [x] 2. 지난 PR #37, #38, #40의 실제 커밋 범위로 검사를 돌려 위 표와 같은지 본다 (`--base`, `--head`, `--body-file`).
- [x] 3. CLAUDE.md, guardrails.md, architecture.md, PR 템플릿, 16 리뷰 문서를 고친다.
- [x] 4. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`, `pnpm check:process`를 통과시킨다.
- [ ] 5. 이 PR을 draft로 열어 CI가 통과하는지, 리뷰 결과를 쓰기 전에 draft를 풀면 검사 6이 실패하는지(일부러 한 번) 본다.

## 완료 기준

- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`, `pnpm check:process`가 통과한다.
- [ ] 리뷰 문서를 바꾸지 않은 non-draft PR, 리뷰 결과 뒤에 계획·리뷰 문서 밖의 파일을 바꾼 PR은 검사 6이 실패한다. 테스트와 PR #38 실제 커밋으로 확인한다.
- [ ] PR #37, #40 실제 커밋은 검사 6을 통과한다.
- [ ] draft PR, `- Phase: 없음` 예외 PR, Dependabot PR은 검사 6을 하지 않는다.
- [ ] 실패 메시지가 무엇을 고쳐야 하는지 말한다 (리뷰 문서 경로와 기준 커밋).
- [ ] CLAUDE.md, guardrails.md, architecture.md, PR 템플릿의 검사 설명이 같다.
- [ ] 이 PR 자체가 검사 6을 통과하고 머지된다.

## 위험과 열린 질문

1. **리뷰 문서에 한 줄만 더해도 통과한다**: 검사는 "고쳤는가"만 본다. 빈 리뷰를 막지는 못한다. 내용은 사람이 본다 (하지 않는 것).
2. **리뷰 뒤 작은 문서 수정**: `docs/architecture.md`처럼 계획·리뷰 문서 밖의 문서를 리뷰 뒤에 고치면 실패한다. 리뷰 문서에 한 줄(무엇을 고쳤는지) 더하면 된다. 의도한 동작이다.
3. **긴 PR의 리뷰 문서 재사용**: phase 하나에 PR이 여러 개면 각 PR이 같은 리뷰 문서에 그 PR의 절을 더한다 (PR #38이 했어야 하는 것).
4. **리뷰 문서를 여럿 링크한 PR**: 검사 5처럼 PR 설명의 첫 리뷰 문서 링크만 본다. phase 여러 개를 한 PR에 올리면(#5) 마지막 변경을 기록한 리뷰 문서를 먼저 적는다. 지금 규칙은 phase 하나에 PR 하나 이상이라 드물다.
5. **force push로 커밋 순서가 바뀌면**: 검사는 그 시점의 커밋 순서로만 본다. force push는 사용자 확인을 받는다.

## 변경 기록

- 2026-11-26: 작성. 16 리뷰 발견 사항 1 (PR #38이 리뷰 없이 머지됨)을 검사로 막기로 함 (사용자 결정)
- 2026-11-26: 사용자 승인. 이슈 #41, 브랜치 `setup/41-review-after-change-check`
- 2026-11-26: 단계 1~4 완료 (구현 `d865a67`). 지난 PR 대 보기에 #5(실패, 첫 리뷰 링크만 봄)를 더하고 위험 4를 적음. 계획 변경은 없음
