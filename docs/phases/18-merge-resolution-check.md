# Phase 18: 충돌을 푼 `main` 머지도 검사 6에서 변경으로 보기

- 상태: 리뷰 통과 (머지와 머지 뒤 `fe-main` 확인 남음)
- 선행 phase: [17 리뷰 없이 머지되는 PR을 작업 절차 검사로 막기](17-review-after-change-check.md) (`main`에 머지됨)
- 관련 이슈: [#43](https://github.com/diegesis-labs/FE/issues/43)
- 브랜치: `setup/43-merge-resolution-check`
- 계획 커밋: `762f51c`
- 구현 커밋: `013d6c5`
- 리뷰 문서: [18-merge-resolution-check-review.md](../reviews/18-merge-resolution-check-review.md) (리뷰 단계에서 작성)

## 목표

작업 브랜치에 `main`을 머지하면서 충돌을 풀어 고친 파일이 있으면, 검사 6이 그 머지 커밋도 "변경"으로 본다. 리뷰 결과 뒤에 충돌을 푼 머지가 있는데 리뷰 문서에 기록이 없으면 CI가 실패한다.

## 배경

- [17 리뷰](../reviews/17-review-after-change-check-review.md) 발견 사항 1 (낮음): 검사 6은 커밋을 `rev-list --no-merges`로 모아서 머지 커밋을 보지 않는다. 지난 머지 PR 중 6개가 `main`을 머지해 들어왔고, 그중 #18(`614a183`)과 #20(`25317b0`)이 충돌을 풀며 `src/` 파일을 고쳤다. #18은 그 뒤 리뷰 결과를 다시 적었지만 #20은 리뷰 결과 뒤의 머지라 기록이 없는데도 검사 6을 통과한다.
- 사용자 결정 (2026-11-26): "발견사항 phase로 열자".
- Confluence 최신 회의록("2주차 전체 회의" 2026-11-25, 음악팀 1·2차 회의)에 FE 작업 절차에 관한 새 결정은 없다.

## 범위

### 하는 것

1. **커밋 모으기** (`scripts/check-process.mjs` `collectCommits`): 머지 커밋도 모은다. 머지 커밋의 파일은 `git show --remerge-diff --name-only`로 얻는다. 자동 머지 결과와 실제 머지 결과가 다른 파일, 곧 충돌을 풀며 손댄 파일만 나온다. 충돌 없이 된 머지는 파일이 없다. 커밋마다 `merge: true/false`를 붙인다.
2. **검사 나누기** (`runChecks`): 검사 1·3·4는 지금처럼 머지가 아닌 커밋만 본다. 머지 커밋 제목("Merge branch ...")이 검사 1에 걸리지 않게 하고, 검사 3·4의 판단도 바꾸지 않는다. 검사 6만 머지 커밋까지 본다.
3. **검사 6 메시지**: 기준 커밋이 머지면 "`<커밋>`(충돌을 푼 머지) 이후의 변경이 ... 기록되지 않았습니다"로 알린다.
4. **테스트** (`scripts/check-process.test.mjs`): #20 모양(리뷰 결과 뒤 충돌을 푼 머지) 실패, #18 모양(머지 뒤 리뷰 결과) 통과, 충돌 없는 머지 통과, 머지 커밋이 검사 1·3·4에 들어가지 않음.
5. **문서**: CLAUDE.md "CI와 머지"의 검사 6 설명, `docs/guardrails.md` 검사 6 줄, 17 리뷰 문서 발견 사항 1 조치.
6. **phase 17 머지 뒤 기록**: 17 문서·17 리뷰 문서에 머지 `5817ee4`의 `fe-main` 결과와 `pr-42` 태그 정리를 적고, 17 상태를 `완료`로 바꾼다 (별도 커밋).

### 하지 않는 것

- 충돌을 푼 내용이 맞는지 보기. 검사는 "리뷰 문서에 기록됐는가"만 본다 (17과 같음).
- 검사 3(계획 문서와 코드 분리)을 머지 커밋에 적용하기. 충돌 해결은 한 커밋에 여러 종류 파일이 섞일 수밖에 없다.
- 세 부모 이상의 머지(octopus). `--remerge-diff`가 다루지 않고, 이 레포에 없다.
- `ci.yml`, ruleset 변경. 이미 `fetch-depth: 0`이고 `ubuntu-latest`의 git은 `--remerge-diff`(git 2.36+)를 지원한다.

## 설계

### FSD 배치

제품 코드(`src/`)는 바꾸지 않는다.

| 파일                                                  | 바꿀 것                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| `scripts/check-process.mjs`                           | `collectCommits()`에 머지 커밋, `runChecks()`에서 검사별 범위 |
| `scripts/check-process.test.mjs`                      | 머지 커밋 사례                                                |
| `CLAUDE.md`                                           | 검사 6 설명에 "충돌을 푼 머지 포함"                           |
| `docs/guardrails.md`                                  | 검사 6 줄                                                     |
| `docs/reviews/17-review-after-change-check-review.md` | 발견 사항 1 조치, 머지 뒤 기록                                |
| `docs/phases/17-review-after-change-check.md`         | 머지 뒤 기록, 상태 `완료`                                     |

### 커밋 목록

```js
// { sha, subject, files, merge }. 오래된 것부터. 머지 커밋의 files는 충돌을 풀며 손댄 파일만
function collectCommits(base, head) { ... }
```

- 순서는 지금과 같은 `rev-list --reverse base..head` (머지 포함). 브랜치에 머지해 들어온 `main` 쪽 커밋은 `base`에서 닿으니 빠진다 (17 리뷰 1.4절에서 확인).
- `checkReviewAfterChanges()`는 바꾸지 않아도 된다. 머지 커밋도 `files`가 있으면 "계획·리뷰 문서 밖의 변경"으로 잡힌다. 메시지만 `merge`를 본다.

### 지난 PR에 대 보기 (구현 때 실제 커밋으로 확인)

머지된 PR 22개를 머지 커밋의 두 부모와 실제 PR 설명으로, `main`의 검사(17)와 바뀐 검사로 각각 돌려 출력을 비교했다. 달라진 것은 #20 하나이고 표와 같았다. #20의 실패 메시지: "`25317b0`(충돌을 푼 머지) 이후의 변경이 `docs/reviews/09-focus-style-guardrail-review.md`에 기록되지 않았습니다." #5는 두 검사 모두 실패 4건(작업 절차 검사가 생기기 전의 PR)으로 같다.

| PR                   | 모양                                                                 | 검사 6 (지금 → 바뀐 뒤) |
| -------------------- | -------------------------------------------------------------------- | ----------------------- |
| #20                  | 리뷰 결과 `1f09929`·phase 완료 `562d502` 뒤 충돌을 푼 머지 `25317b0` | 통과 → 실패             |
| #18                  | 충돌을 푼 머지 `614a183` 뒤 `fix` `cdf0fcf`, 리뷰 결과 `7f4086c`     | 통과 → 통과             |
| #10, #12, #26, #37   | 충돌 없는 머지                                                       | 통과 → 통과             |
| 그 밖 (#5, #38 포함) | 머지 커밋 없음                                                       | 17과 같음               |

### 새 의존성

없음.

## 작업 단계

- [x] 1. `collectCommits()`와 `runChecks()`를 고치고 테스트를 쓴다. `pnpm test:scripts` 통과.
- [x] 2. 지난 머지 PR 전부를 실제 커밋 범위로 돌려 위 표와 같은지 본다.
- [x] 3. CLAUDE.md, guardrails.md, 17 리뷰 문서를 고친다.
- [x] 4. `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`, `pnpm check:process`를 통과시킨다.
- [x] 5. 이 PR을 draft로 열어 CI가 통과하는지 본다.

## 완료 기준

- [x] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`, `pnpm check:process`가 통과한다.
- [x] 리뷰 결과 뒤에 충돌을 푼 머지가 있으면 검사 6이 실패한다. 테스트와 PR #20 실제 커밋으로 확인한다.
- [x] 충돌 없는 머지, 머지 뒤 리뷰 결과를 적은 PR은 통과한다. PR #18, #10, #12, #26, #37 실제 커밋으로 확인한다.
- [x] 머지 커밋이 검사 1·3·4의 결과를 바꾸지 않는다 (지난 머지 PR 전부에서 검사 1~5 결과가 이 phase 전과 같다).
- [x] CLAUDE.md, guardrails.md의 검사 6 설명이 코드와 같다.
- [ ] 이 PR 자체가 검사 6을 통과하고 머지된다.

## 위험과 열린 질문

1. **CI의 git 버전**: `--remerge-diff`가 없는 git이면 머지 파일을 못 얻는다. 실패하면 그 머지를 "변경 있음"으로 볼지 "없음"으로 볼지 정해야 한다. 조용히 통과시키지 않도록 오류로 멈춘다 (`git()`이 이미 예외를 던진다).
2. **충돌 해결이 문서뿐인 머지**: 계획·리뷰 문서만 충돌을 풀었으면 변경으로 보지 않는다. 검사 6의 기존 규칙과 같다.
3. **같은 파일을 양쪽에서 똑같이 고친 경우**: 자동 머지와 결과가 같아서 `--remerge-diff`에 안 나온다. 손댄 것이 없으니 맞다.
4. **로컬 실행 시간**: 머지 커밋마다 `git show --remerge-diff`를 한 번 더 부른다. 머지는 PR당 0~1개라 영향이 작다.

## 변경 기록

- 2026-11-26: 작성. 17 리뷰 발견 사항 1 (충돌을 푼 `main` 머지를 검사 6이 보지 않음)을 phase로 열기로 함 (사용자 결정)
- 2026-11-26: 사용자 승인. 이슈 #43, 브랜치 `setup/43-merge-resolution-check`
- 2026-11-26: 단계 1~4 완료 (구현 `013d6c5`). 지난 PR 대 보기는 표와 같았다. 범위 6(phase 17 머지 뒤 기록)도 함께 커밋. 계획 변경은 없음
- 2026-11-26: 단계 5 완료. PR #44를 draft로 열어 CI `check`·`fe-pr` 통과. CI의 git은 2.56.1 (ubuntu-26.04)
- 2026-11-26: 리뷰 통과 ([리뷰 문서](../reviews/18-merge-resolution-check-review.md)). 발견 사항 없음. 남은 일: draft 해제 뒤 CI, 머지, 머지 뒤 `fe-main`·`pr-44` 태그
