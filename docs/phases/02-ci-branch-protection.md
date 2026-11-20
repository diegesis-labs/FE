# Phase 02: CI와 브랜치 보호

- 상태: 완료 (2026-11-20, PR #5 머지 `17ae620`)
- 선행 phase: [01 디자인 팔레트](01-design-palette.md) (완료)
- 관련 이슈: [#2 FE 아키텍처 설계 및 기술스택 선정](https://github.com/diegesis-labs/FE/issues/2) (레포 초기 세팅의 일부)
- 브랜치: `setup/2-init` ([PR #5](https://github.com/diegesis-labs/FE/pull/5)로 머지됨. 아래 "열린 질문 3" 참고). 완료 기록은 `docs/2-phase02-complete`
- 계획 커밋: `6388ab2`
- 구현 커밋: `2d0e17b`, `984c2da` (ruleset 파일 보정)
- 리뷰 문서: [02-ci-branch-protection-review.md](../reviews/02-ci-branch-protection-review.md)

## 목표

PR마다 GitHub Actions가 포맷·lint·타입 체크·빌드를 자동으로 검사하고, 검사를 통과하지 않은 PR은 `main`에 머지할 수 없게 만든다. `main`은 PR로만 바뀌고, force push와 삭제를 막는다.

## 배경

- 지금은 레포에 CI가 없어서, PR #5도 로컬에서 통과한 것만 확인된 상태다.
- `main`에 아무 보호가 없다 (브랜치 보호 규칙, ruleset 모두 없음). 관리자 권한이 있으면 누구든 직접 푸시나 force push를 할 수 있다.
- 다음 phase(03 FSD 전환)에서 FSD 규칙 검사(steiger)를 `pnpm lint`에 넣는다. CI가 먼저 있어야 그 검사도 PR마다 자동으로 돈다. 그래서 FSD 전환보다 먼저 한다.

### 현재 레포 상태 (2026-11-19 확인)

| 항목                     | 현재 값                                                                      |
| ------------------------ | ---------------------------------------------------------------------------- |
| 공개 여부                | public (조직 플랜 free. public 레포라 ruleset과 필수 상태 검사를 쓸 수 있다) |
| 쓰기 권한                | `def-uk`(admin)만. 나머지 5명(`yy-0401` 등)은 read                           |
| `main` 보호              | 없음 (ruleset 0개, 브랜치 보호 없음)                                         |
| 머지 방식                | merge commit, squash, rebase 모두 허용                                       |
| 머지 후 브랜치 자동 삭제 | 꺼짐                                                                         |
| Actions                  | 켜짐, 모든 액션 허용, SHA 고정 강제 꺼짐                                     |
| 워크플로 기본 토큰 권한  | read, PR 승인 불가 (이미 안전한 값)                                          |

## 범위

### 하는 것

1. **CI 워크플로** (`.github/workflows/ci.yml`): PR과 `main` 푸시 때 포맷 확인, lint, 타입 체크, 빌드를 실행한다.
2. **`main` 보호 ruleset**: PR 필수, CI 통과 필수, 대화(리뷰 댓글) 해결 필수, force push 금지, 삭제 금지, 머지 방식 제한.
3. **레포 설정**: 머지 방식을 merge commit 하나로 제한, 머지 후 브랜치 자동 삭제, Actions의 SHA 고정 강제.
4. **PR 템플릿** (`.github/pull_request_template.md`): 관련 이슈, phase·리뷰 문서 링크, 확인 체크리스트.
5. **Dependabot** (`.github/dependabot.yml`): GitHub Actions 버전 업데이트만 (SHA로 고정한 액션을 최신으로 유지하기 위함).
6. 설정을 코드로 남긴다: ruleset을 JSON(`.github/rulesets/main.json`)으로 저장하고, 적용 방법을 문서에 적는다.
7. 문서 갱신: `CLAUDE.md`(CI·머지 규칙), `docs/architecture.md`(CI와 브랜치 규칙 장 추가), `README.md`(CI 배지는 넣지 않고 규칙 링크만).

### 하지 않는 것

- 배포(Vercel 등) 워크플로. 배포처가 정해지면 별도 phase로 한다.
- 테스트 실행. 아직 테스트 코드와 테스트 도구가 없다. 테스트 도구를 도입하는 phase에서 CI에 추가한다.
- npm 패키지 자동 업데이트(Dependabot npm). 아래 "위험" 참고. 지금은 `minimumReleaseAge`와 수동 업데이트로 충분하다.
- CODEOWNERS. 쓰기 권한이 있는 사람이 `def-uk` 한 명뿐이라 지정해도 의미가 없다. 팀원이 늘면 추가한다.
- FSD 검사(steiger) 추가. Phase 03에서 `pnpm lint`에 넣으면 이 CI가 그대로 돌린다.

## 설계

### CI 워크플로

```yaml
# .github/workflows/ci.yml (요지)
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
permissions:
  contents: read # 최소 권한
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true # 같은 PR에 새 커밋이 오면 이전 실행 취소
jobs:
  check:
    name: check # ruleset의 필수 상태 검사 이름
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - actions/checkout (persist-credentials: false)
      - pnpm/action-setup # package.json의 packageManager(pnpm@12.21.0)를 읽음
      - actions/setup-node # node-version-file: .nvmrc, cache: pnpm
      - pnpm install --frozen-lockfile
      - pnpm format:check
      - pnpm lint
      - pnpm typecheck
      - pnpm build
```

- **액션은 태그가 아니라 커밋 SHA로 고정한다.** 태그는 바꿔치기될 수 있다(공급망 공격). 2026-11-19 기준 최신 릴리스:

  | 액션                 | 버전   | 커밋 SHA                                   |
  | -------------------- | ------ | ------------------------------------------ |
  | `actions/checkout`   | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
  | `actions/setup-node` | v7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
  | `pnpm/action-setup`  | v6.1.1 | `73e46992e05b19abd31f2f3c20e0e7370d762115` |

  구현할 때 SHA를 다시 확인하고, 버전은 주석으로 남긴다 (`uses: actions/checkout@<sha> # v7.0.1`).

- `pull_request_target`은 쓰지 않는다. 포크에서 온 PR이 비밀값에 접근할 수 있게 되는 위험한 트리거다.
- 비밀값(secrets)은 쓰지 않는다.
- `--frozen-lockfile`이라 CI는 lockfile에 적힌 버전만 설치한다. `minimumReleaseAge`와 설치 스크립트 차단 설정(`pnpm-workspace.yaml`)도 CI에서 그대로 적용된다.

### `main` ruleset

| 규칙                                   | 값                               | 이유                                                                                                                    |
| -------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 대상                                   | 기본 브랜치(`main`)              |                                                                                                                         |
| 삭제 금지                              | 켬                               |                                                                                                                         |
| force push 금지                        | 켬                               | phase·리뷰 문서가 커밋 해시를 기록하므로 이력이 바뀌면 안 된다                                                          |
| PR 필수                                | 켬                               | 직접 푸시 금지                                                                                                          |
| 필수 승인 수                           | **0** (열린 질문 1)              | 쓰기 권한자가 1명이라 1로 하면 혼자서는 머지할 수 없다                                                                  |
| 새 커밋이 오면 기존 승인 무효화        | 켬                               | 승인 수를 1 이상으로 올릴 때를 대비                                                                                     |
| 리뷰 대화 해결 필수                    | 켬                               | 리뷰 댓글을 놓치지 않기 위해                                                                                            |
| 필수 상태 검사                         | `check` (CI 워크플로의 job)      |                                                                                                                         |
| 검사 전 최신 `main` 반영 필수 (strict) | 끔                               | 혼자 작업하는 동안은 매번 브랜치를 갱신하는 비용이 크다. 팀원이 늘면 켠다                                               |
| 허용 머지 방식                         | **merge commit만** (열린 질문 2) | squash나 rebase는 커밋 해시를 바꾼다. phase·리뷰 문서에 적힌 계획 커밋·구현 커밋 해시가 `main`에서도 그대로 남아야 한다 |
| 우회(bypass) 허용                      | 없음                             | 관리자도 같은 규칙을 따른다. 정말 필요하면 ruleset을 잠시 끄고, 그 사실을 기록한다                                      |

적용 방법: `.github/rulesets/main.json`을 만들고 `gh api -X POST repos/diegesis-labs/FE/rulesets --input .github/rulesets/main.json`으로 적용한다. 이후 바꿀 때도 이 파일을 고친 뒤 `PUT`으로 적용해서, 레포의 실제 설정과 파일이 항상 같도록 한다.

### 레포 설정 변경

| 설정                     | 현재 | 변경                            |
| ------------------------ | ---- | ------------------------------- |
| squash 머지 허용         | 켬   | 끔                              |
| rebase 머지 허용         | 켬   | 끔                              |
| merge commit 허용        | 켬   | 켬 (유지)                       |
| 머지 후 브랜치 자동 삭제 | 끔   | 켬                              |
| Actions SHA 고정 강제    | 끔   | 켬 (태그로 쓴 액션은 실행 거부) |

ruleset의 머지 방식 제한과 레포 설정을 둘 다 바꾼다. 레포 설정을 바꾸면 GitHub 머지 버튼에 merge commit만 보인다.

### PR 템플릿

```md
## 요약

## 관련 이슈

- Refs #

## Phase / 리뷰

- Phase: docs/phases/NN-*.md
- 리뷰: docs/reviews/NN-*-review.md

## 확인

- [ ] phase 문서가 승인 후 먼저 커밋되었다
- [ ] 리뷰 계획 → 리뷰 결과가 커밋되었다
- [ ] 화면 변경이 있으면 라이트/다크 둘 다 확인했다
```

### Dependabot

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    cooldown:
      default-days: 3 # pnpm minimumReleaseAge와 같은 3일
    groups:
      actions:
        patterns: ['*']
```

`cooldown` 옵션 이름과 지원 여부는 구현할 때 GitHub 문서로 다시 확인한다. 지원되지 않으면 이 옵션만 빼고, 리뷰 때 직접 확인한다.

### 바꾸는 파일

| 파일                               | 내용                                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`         | 새로 만듦                                                                                                   |
| `.github/rulesets/main.json`       | 새로 만듦 (ruleset 정의)                                                                                    |
| `.github/pull_request_template.md` | 새로 만듦                                                                                                   |
| `.github/dependabot.yml`           | 새로 만듦                                                                                                   |
| `CLAUDE.md`                        | Git 장에 "CI 통과 후 merge commit으로 머지", "ruleset은 파일을 고친 뒤 적용" 규칙 추가. 예시 파일 이름 정리 |
| `docs/architecture.md`             | "6. CI와 브랜치 규칙" 장 추가                                                                               |

### 새 의존성

npm 패키지는 없음. GitHub Actions 3개(`actions/checkout`, `actions/setup-node`, `pnpm/action-setup`)를 쓴다. 모두 공식 조직(GitHub, pnpm)이 관리하고, SHA로 고정한다.

## 작업 단계

- [x] 1. 액션 3개의 최신 릴리스와 커밋 SHA를 다시 확인한다.
- [x] 2. `ci.yml`을 만든다.
- [x] 3. PR 템플릿과 `dependabot.yml`을 만든다.
- [x] 4. `.github/rulesets/main.json`을 만든다.
- [x] 5. `CLAUDE.md`, `architecture.md`를 고친다.
- [x] 6. 로컬에서 `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`를 통과시킨다.
- [x] 7. 커밋·푸시하고, PR #5에서 CI가 실행되어 통과하는지 확인한다.
- [x] 8. CI가 통과한 것을 확인한 뒤 레포 설정을 바꾸고 ruleset을 적용한다. (CI 이름 `check`가 한 번 실행된 뒤에 필수 검사로 걸어야 PR #5가 막히지 않는다)
- [x] 9. 보호가 실제로 동작하는지 확인한다 (완료 기준 참고). 확인용으로 만든 브랜치와 PR은 닫고 지운다.

## 완료 기준

- [x] PR #5에서 CI(`check`)가 자동으로 실행되고 통과한다.
- [x] 워크플로의 모든 `uses:`가 40자리 커밋 SHA로 고정되어 있고, 워크플로 권한이 `contents: read`뿐이다.
- [x] `main`에 직접 푸시하면 거부된다 (`git push`가 ruleset 위반으로 실패하는지 확인).
- [x] CI가 실패하는 PR은 머지할 수 없다. 일부러 lint 오류를 넣은 확인용 PR을 열어 `mergeStateStatus`가 `BLOCKED`인지 확인한 뒤 닫고 브랜치를 지운다.
- [x] 머지 버튼에 merge commit 방식만 보인다 (레포 설정 API로 squash·rebase가 꺼졌는지 확인).
- [x] `gh api repos/diegesis-labs/FE/rulesets`로 읽은 실제 ruleset이 `.github/rulesets/main.json`과 같은 내용이다.
- [x] 태그로 지정한 액션은 실행이 거부된다 (Actions 설정 API의 `sha_pinning_required: true` 확인). 설정값만 확인, 실제 거부는 시험하지 않음 (리뷰 3절)
- [x] PR 템플릿이 새 PR 작성 화면에 나온다.
- [x] `CLAUDE.md`와 `architecture.md`에 CI·머지 규칙이 적혀 있다.

## 위험과 열린 질문

1. **필수 승인 수**: 지금 쓰기 권한자는 `def-uk` 한 명이다. 승인 1로 하면 혼자 머지할 수 없어서 0으로 제안한다. 다른 FE 개발자가 생기면 1로 올린다. → 2026-11-19 승인: 0으로 결정
2. **머지 방식을 merge commit 하나로 제한**: phase·리뷰 문서가 커밋 해시를 기록하는 방식이라 해시가 바뀌지 않는 merge commit이 맞다. 대신 `main` 이력에 작은 문서 커밋이 많이 남는다. → 2026-11-19 승인: merge commit만
3. **어느 PR에 올릴지**: PR #5에 이어서 올리면 #5 자체가 CI 검사를 받고 머지된다. 대신 #5가 커진다. 다른 방법은 #5를 먼저 머지하고 새 브랜치에서 하는 것이다. → 2026-11-19 승인: PR #5에 이어서 올림
4. **pnpm 12와 `pnpm/action-setup` 호환**: pnpm 12는 최근 버전이다. CI에서 설치가 실패하면 `corepack enable`로 바꾸는 대안을 쓴다.
5. **Dependabot npm 업데이트를 뺀 이유**: Dependabot이 pnpm 12 lockfile과 `minimumReleaseAge` 설정을 제대로 다루는지 확인되지 않았다. 잘못된 lockfile 변경 PR이 쌓일 수 있어서 이번에는 Actions 업데이트만 켠다.
6. **레포 설정과 ruleset 적용은 되돌리기 쉬운 변경이지만 공개 레포의 동작을 바꾼다.** 이 phase 승인을 레포 설정 변경 승인으로 보고, 적용 후 결과를 리뷰 문서에 남긴다.
7. **public 레포의 Actions 사용량**: public 레포는 GitHub 호스티드 러너 사용이 무료라 비용 문제는 없다.

## 변경 기록

- 2026-11-19: 작성. 기존 Phase 02(FSD 전환)를 03으로 미루고 이 phase를 02로 넣음
- 2026-11-19: 구현 중 달라진 점 (리뷰에서 확인)
  - 캐시: 계획의 `setup-node` `cache: pnpm` 대신 `pnpm/action-setup`의 `cache: true`를 쓰고 `setup-node`의 패키지 매니저 캐시는 끔. `setup-node`의 pnpm 캐시는 pnpm이 먼저 설치되어 있어야 하는데, pnpm 설치를 `pnpm/action-setup`이 맡기 때문
  - ruleset 필수 상태 검사에 `integration_id: 15368`(GitHub Actions)을 붙임. 다른 앱이나 API가 같은 이름(`check`)의 상태를 올려 검사를 통과시키는 것을 막기 위함
  - GitHub이 기본값으로 채운 `pull_request` 파라미터 3개를 ruleset 파일에도 적어서 파일과 실제 설정을 일치시킴
- 2026-11-20: PR #5 머지(`17ae620`) 후 PR 템플릿 인식과 Dependabot 실행을 확인하고 완료로 닫음
