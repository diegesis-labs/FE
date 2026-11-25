# Review 11: phase 문서 작성 전 Confluence 최신 회의록 확인

- 대상 phase: [11-confluence-gate.md](../phases/11-confluence-gate.md)
- 리뷰 대상: 브랜치 `setup/27-confluence-gate`, 기준 커밋 `6f2ec3d` (phase의 구현 커밋)
- 리뷰 계획 커밋: `1a4f00f`
- 작성일: 2026-11-25
- 결과: 통과 (완료 기준 5는 일부 확인 못 함, 3절)

## 1. 리뷰 계획

### 1.1 변경 요약

`git diff ab15672..6f2ec3d`: 6개 파일, +335 −20. 계획과 다른 점은 없다.

- `.claude/hooks/confluence-gate.mjs` (새 파일, 129줄)
  - `record`: Confluence 문서를 읽은 뒤에 세션별 기록을 남긴다.
  - `check <폴더>`: 계획 문서를 쓰기 전에 기록을 확인한다. 경로 마디 안의 `*`도 받는다.
  - 개인 설정에서 쓰던 스크립트와 같고, 머리말 주석만 한 줄 더했다.
- `.claude/settings.json`: `PreToolUse`(`Edit|Write|MultiEdit|NotebookEdit|Bash` → `check docs/phases/`)와 `PostToolUse`(`mcp__.*getConfluenceContent` → `record`) 항목을 하나씩 추가했다. 삭제된 줄은 0줄이다.
- `scripts/confluence-gate.test.mjs` (새 파일): 판정 사례 28개.
- `.gitignore`: `.claude/settings.local.json`을 추가했다.
- `CLAUDE.md`: "1. 구현 전" 절에 회의록을 먼저 읽는다는 줄과 끄는 법을 넣었다. "가드레일" 절의 훅 설명에 새 훅과 새 테스트 파일을 넣었다.
- `docs/guardrails.md`: "작업 순서와 Git" 표에 한 줄, 훅 테스트 줄에 새 테스트 파일, 머리말에 Phase 11 링크를 넣었다. 나머지 diff는 Prettier가 표 너비를 다시 맞춘 것이다.

### 1.2 완료 기준 확인 방법

| #   | 완료 기준                                                                                                              | 확인 방법                                                                                                                                                                                                                            | 결과 |
| --- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| 1   | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`, `pnpm check:process`가 통과한다 | 브랜치 끝에서 여섯 명령을 실행하고 PR CI `check`를 본다                                                                                                                                                                              |      | 통과. `1a4f00f`에서 여섯 명령 종료 코드 0 (`test:scripts` 125개, 그중 새 테스트 28개). PR CI `check`는 PR을 연 뒤 확인                                                                                                                                                                                                                                                               |
| 2   | 테스트가 phase 완료 기준의 사례를 확인한다                                                                             | `scripts/confluence-gate.test.mjs`의 사례를 phase 완료 기준의 목록과 하나씩 대조한다. 사례별 확인 방법은 아래 표                                                                                                                     |      | 통과. 아래 표의 사례가 모두 테스트에 있다. 계획에 없던 사례도 더 있다: `>>`·`cp`로 쓰기, `git diff`·`prettier --check` 같은 읽기, 11시간 기록 통과, 막는 메시지 내용, `*` 경로, JSON이 아닌 입력, `session_id` 경로 문자 정리                                                                                                                                                        |
| 3   | 막는 메시지에 어디서 무엇을 읽을지(스페이스, 검색 방법)가 들어 있다                                                    | 테스트 "막는 메시지에…"가 확인하는 내용을 보고, 실제 출력도 한 번 읽는다                                                                                                                                                             |      | 통과. 테스트가 대상 파일 경로, `Diegesis`, `searchConfluence`, `getConfluenceContent`가 들어 있는지 확인한다. 이 세션에서 실제로 받은 거부 메시지에도 스페이스, 검색 CQL, 읽는 방법이 있었다 (5)                                                                                                                                                                                     |
| 4   | 기존 `guard.mjs` 훅과 권한 규칙이 그대로다                                                                             | `git diff ab15672..6f2ec3d -- .claude/settings.json`에 삭제 줄이 없는지, `.claude/hooks/guard.mjs` diff가 없는지 본다. `scripts/claude-guard.test.mjs` 통과                                                                          |      | 통과. `settings.json` diff의 삭제 줄 0, `guard.mjs` diff 0줄, `scripts/claude-guard.test.mjs` 통과                                                                                                                                                                                                                                                                                   |
| 5   | 새 세션에서 실제로 막히고 풀리는 것을 확인했다                                                                         | 막힘: 이 worktree에서 새 Claude Code 세션(`claude -p`)을 열고 phase 문서를 써 보게 해서 훅이 막는지 본다. 풀림: Atlassian 커넥터가 있는 세션에서 회의록을 읽은 뒤 기록 파일이 생기고 쓰기가 통과하는지 본다. 못 한 것은 3절에 적는다 |      | 일부 통과. 같은 스크립트를 쓰는 개인 설정(diegesis-labs 폴더, `FE*/docs/phases/`)으로 이 Claude Code 세션에서 확인했다: 읽은 기록을 치운 뒤 Write로 `docs/phases/99-hook-e2e.md`를 쓰자 거부됐고, `searchConfluence`와 `getConfluenceContent`로 회의록을 읽은 뒤 같은 Write가 통과했다 (테스트 파일은 지움). 이 레포의 `.claude/settings.json`으로 연 새 세션에서는 확인 못 함 (3절) |

완료 기준 2의 사례별 확인 방법:

| 사례                                                | 확인 방법                                            |
| --------------------------------------------------- | ---------------------------------------------------- |
| 읽은 기록 없이 Edit·Write로 phase 문서를 쓰면 막힘  | 테스트 "읽은 기록이 없을 때" Edit·Write·MultiEdit    |
| `_template.md`, `docs/reviews/`, `src/` 수정은 통과 | 같은 묶음의 통과 사례                                |
| Bash로 쓰면 막힘 (`cat >`, `sed -i`, `git mv`)      | 같은 묶음의 Bash 쓰기 사례                           |
| Bash로 읽기만 하면 통과 (`cat … 2>&1`, `grep`)      | 같은 묶음의 Bash 읽기 사례                           |
| 기록이 남은 뒤 통과, 다른 세션은 막힘               | "읽은 기록이 있을 때" 묶음                           |
| 12시간이 지난 기록은 막힘                           | "기록이 오래됐을 때" 묶음 (11시간 통과, 13시간 막힘) |
| `CONFLUENCE_GATE=off`면 통과                        | "그 밖" 묶음                                         |

### 1.3 공통 확인 항목

`src/`를 바꾸지 않아서 FSD·디자인·접근성·화면 상태 항목은 해당 없음으로 적는다.

| 영역   | 확인할 것                                                                      | 확인 방법                                                                                                                              | 결과 |
| ------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| FSD    | 레이어·슬라이스 import 규칙                                                    | `git diff --stat`으로 `src/` 변경이 없는지                                                                                             |      | 해당 없음. `src/` 변경 없음                                                                                                                                                                   |
| 디자인 | 의미 토큰, 라이트/다크                                                         | 위와 같음                                                                                                                              |      | 해당 없음                                                                                                                                                                                     |
| 접근성 | 대비, 키보드, `aria-label`                                                     | 위와 같음                                                                                                                              |      | 해당 없음                                                                                                                                                                                     |
| 상태   | 로딩, 빈 상태, 에러                                                            | 위와 같음                                                                                                                              |      | 해당 없음                                                                                                                                                                                     |
| 보안   | 새 의존성이 없다                                                               | `package.json`, `pnpm-lock.yaml` diff                                                                                                  |      | 통과. `package.json`·`pnpm-lock.yaml` diff 없음                                                                                                                                               |
| 보안   | 비밀값, 토큰이 코드나 커밋에 없다                                              | diff에서 `token`, `secret`, `key`, 이메일 검색. 막는 메시지의 사이트 이름(`raewoo0908.atlassian.net`)은 팀 공용 주소라 비밀값이 아니다 |      | 통과. 추가된 줄에서 `token`·`secret`·`password`·`api key`·이메일 검색 0건 (`atlassian.net` 사이트 이름 제외)                                                                                  |
| 보안   | 훅이 레포 밖에 쓰는 것은 OS 임시 폴더의 기록 파일뿐이고 경로를 벗어나지 않는다 | `record`의 쓰기 경로, `session_id` 정리(`[^\w-]` → `_`) 코드와 테스트                                                                  |      | 통과. 쓰는 곳은 `<임시 폴더>/claude-confluence-gate/<session_id>.json` 하나. `session_id`의 `/`, `.` 같은 문자는 `_`로 바꾸며, 테스트가 `../../evil`이 `______evil.json`이 되는 것을 확인한다 |

### 1.4 이번 변경에서 특히 볼 것

- **매처와 실제 도구 이름:** `mcp__.*getConfluenceContent`가 실제 연결 방식의 이름을 모두 잡는지 확인한다. 대상은 claude.ai 커넥터(`mcp__<id>__getConfluenceContent`)와 플러그인(`mcp__plugin_atlassian_atlassian__getConfluenceContent`)이다.
  - 결과: 통과. 정규식으로 claude.ai 커넥터(`mcp__39446369-…__getConfluenceContent`), 플러그인, `mcp__claude_ai_Atlassian__getConfluenceContent`가 모두 맞는다. `searchConfluence`는 맞지 않는다 (의도대로 기록하지 않음). claude.ai 커넥터 이름은 이 세션에서 실제로 기록이 남아 확인했다.
- **두 훅이 같이 걸릴 때:** `Edit|Write|MultiEdit`에는 `guard.mjs edit`와 새 훅이 함께 걸린다. 새 훅이 막으면 `guard.mjs`의 "사용자 확인"과 관계없이 막히는지, 순서에 기대는 데가 없는지 본다.
  - 결과: 통과. `guard.mjs edit`는 `src/` 파일에만 판단을 내고, 새 훅은 `docs/phases/`에만 판단을 낸다. 한 파일에 둘이 함께 판단을 내는 경우가 없어서 순서와 우선순위에 기대지 않는다.
- **Bash 오탐:** `docs/phases/`가 들어 있고 `>`가 있는 읽기 명령도 막힌다 (예: `git log -- docs/phases/ > /tmp/log.txt`). 실제로 자주 쓰는 모양인지, 막히면 알아들을 수 있는 메시지인지 본다.
  - 결과: 실제로 막힌다 (발견 1). 메시지에 대상이 `docs/phases/ (Bash)`로 나와 이유는 알 수 있다.
- **기록 위치:** `record`와 `check`가 같은 임시 폴더를 보는지 본다. 두 훅 프로세스가 같은 `TMPDIR`을 받는지와, 테스트가 `TMPDIR`을 바꿔서 실제 기록과 섞이지 않는지 확인한다.
  - 결과: 통과. 이 세션에서 `record`(PostToolUse)가 남긴 기록을 `check`(PreToolUse)가 읽어 통과시켰다. 테스트는 `TMPDIR`을 `mkdtemp` 폴더로 바꿔 실행하고 끝나면 지운다.
- **입력이 이상할 때:** JSON이 아니거나 `tool_input`이 없으면 조용히 통과하는지 본다. 훅 오류가 편집을 막지 않아야 한다.
  - 결과: 통과. JSON이 아닌 입력과 `tool_input`이 없는 입력 모두 출력 없이 종료 코드 0.

## 2. 발견 사항

| #   | 심각도 | 위치                                                     | 내용                                                                                                     | 조치                                                                                                              |
| --- | ------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | 낮음   | `.claude/hooks/confluence-gate.mjs` `bashTouchesPlanDoc` | `docs/phases/`가 들어 있고 `>`가 있으면 읽기 명령도 막는다. 예: `git log -- docs/phases/ > /tmp/log.txt` | 그대로 둠. 리다이렉트 대상이 계획 문서인지까지 가리려면 셸을 해석해야 한다. 드문 모양이고, 회의록을 읽으면 풀린다 |
| 2   | 낮음   | OS 임시 폴더 `claude-confluence-gate/`                   | 세션마다 기록 파일(200바이트 안팎)이 하나씩 생기고 지우지 않는다                                         | 그대로 둠. OS가 임시 폴더를 정리하고, 크기가 작다                                                                 |

## 3. 확인 못 한 것

- **이 레포의 `.claude/settings.json`으로 연 새 세션에서의 확인 (완료 기준 5의 나머지):** 새 세션을 띄우려던 `claude -p`가 로그인 만료(`OAuth session expired`)로 실행되지 않았다.
  - 대신 확인한 것: 같은 스크립트를 개인 설정으로 걸어 막힘과 풀림을 확인했다. FE 설정은 `jq`로 명령 형태를 확인했다 (`check docs/phases/`, `record`, 매처).
  - 남은 일: 머지한 뒤 FE 폴더에서 새 세션을 열어 확인한다.
- **Atlassian 커넥터가 없는 세션에서의 동작:** 막는 메시지와 `CONFLUENCE_GATE=off`는 테스트로 확인했다. 커넥터 없이 실제로 막힌 뒤 끄는 흐름은 확인하지 않았다.

## 4. 결론

통과. 계획한 판정이 테스트 28개와 이 세션의 실제 막힘·풀림으로 확인됐다. 발견 사항 2건은 낮음이고 그대로 둔다. 남은 일은 머지 후 FE 폴더 새 세션에서 한 번 확인하는 것과, 팀에 끄는 법을 공지하는 것이다.
