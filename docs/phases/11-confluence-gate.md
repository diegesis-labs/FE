# Phase 11: phase 문서 작성 전 Confluence 최신 회의록 확인

- 상태: 완료
- 선행 phase: 없음 ([05 작업 절차 CI 검사](05-process-check.md)의 Claude Code 훅 위에 하나를 더한다)
- 관련 이슈: [#27 phase 문서 작성 전 Confluence 최신 회의록 확인 훅](https://github.com/diegesis-labs/FE/issues/27)
- 브랜치: `setup/27-confluence-gate` (`main`의 `85726e2`에서 만듦)
- 계획 커밋: `ab15672`
- 구현 커밋: `6f2ec3d`
- 리뷰 문서: [11-confluence-gate-review.md](../reviews/11-confluence-gate-review.md)

## 목표

Claude Code가 `docs/phases/`에 phase 문서를 쓰거나 고치기 전에, 그 세션에서 Confluence 회의록을 읽었는지 확인한다. 읽은 기록이 없으면 쓰기를 막고, Diegesis 스페이스의 최신 회의록부터 읽으라고 알려준다.

## 배경

- 회의록이 Notion에서 Confluence(Diegesis 스페이스)로 옮겨 갔다. 회의마다 API 계약, 일정, 재생 규칙 같은 결정이 바뀐다. 예를 들어 2026-11-24 "FE, BE API/마일스톤 회의"에서 다음이 정해졌다.
  - 일시정지는 싫어요가 아니다.
  - 싫어요를 받으면 후보 K개 중 다른 곡을 재생한다.
  - 구간 끝에서 재생을 멈춘다.
  - 필드 이름을 `_idx`로 바꾼다.
- phase 문서는 이 결정을 화면과 API 설계로 옮기는 곳이다. 그런데 지금은 Claude가 최신 회의록을 읽고 쓴다는 보장이 없다. 지난 결정으로 계획을 세우면 승인·구현·리뷰를 모두 다시 해야 한다.
- Phase 05와 같은 원칙이다. 글로만 있는 규칙("최신 회의록을 보고 계획한다")을 도구를 쓰는 순간의 검사로 만든다.
- 같은 훅을 diegesis-labs 작업 폴더(레포 밖, 개인 설정)에서 2026-11-25부터 쓰고 있다. 거기서 판정 사례를 확인했고, 실제 세션에서 읽은 기록이 남는 것도 확인했다. 이 phase는 그 훅을 FE 레포에 넣어 팀원 세션에도 걸리게 한다.

## 범위

### 하는 것

1. **훅 스크립트** `.claude/hooks/confluence-gate.mjs`. Node 내장 기능만 쓴다.
   - `record`: Confluence 문서를 읽은 뒤에 세션별로 읽은 시각과 문서 ID를 남긴다.
   - `check <폴더>`: 계획 문서를 쓰기 전에 그 기록을 본다.
2. **설정** `.claude/settings.json`에 훅 두 개를 추가한다. 기존 권한 규칙과 `guard.mjs` 훅은 그대로 둔다.
3. **테스트** `scripts/confluence-gate.test.mjs` (`node:test`). 판정 사례마다 훅을 직접 실행해서 확인한다. `pnpm test:scripts`에 자동으로 포함되므로 CI에서도 돈다.
4. **끄는 법:** 환경 변수 `CONFLUENCE_GATE=off`. Atlassian 커넥터가 없는 팀원은 `.claude/settings.local.json`의 `env`에 넣는다. 이 파일은 지금 개인 전역 gitignore로만 빠져 있어서 레포 `.gitignore`에 `.claude/settings.local.json`을 추가한다.
5. **문서**
   - `docs/guardrails.md`: "작업 순서와 Git" 표에 한 줄을 넣고, 머리말의 "Claude Code 훅" 설명에 새 스크립트를 더한다.
   - CLAUDE.md "1. 구현 전: phase 문서 작성": 최신 회의록을 먼저 읽는다는 줄과 끄는 법을 넣는다.

### 하지 않는 것

- 읽은 회의록 내용이 phase 문서에 제대로 반영됐는지 검사하지 않는다. 훅은 "읽었는지"만 본다. 반영은 승인 때 사람이 본다.
- 어느 페이지를 읽었는지 가리지 않는다. 이 세션에서 Confluence 문서를 하나라도 읽었으면 통과한다. 가장 최근 회의록인지는 확인하지 않는다 ("위험과 열린 질문" 2).
- `docs/reviews/`, `_template.md`, `src/`는 대상이 아니다.
- 사람이 직접 하는 편집과 CI는 대상이 아니다. Phase 05 훅과 같이 Claude에게만 걸린다.
- BE 레포에는 넣지 않는다. BE 계획 문서(`docs/backlog/`)는 개인 설정에서만 확인한다.
- Confluence API를 직접 부르지 않는다. 토큰을 레포나 팀원 컴퓨터에 둘 필요가 없게, Claude가 이미 연결한 Atlassian 커넥터로 읽은 기록만 본다.

## 설계

### FSD 배치

해당 없음. `src/`를 바꾸지 않는다.

| 위치                                | 만들거나 바꿀 것                        |
| ----------------------------------- | --------------------------------------- |
| `.claude/hooks/confluence-gate.mjs` | 새 훅 스크립트 (`record`, `check`)      |
| `.claude/settings.json`             | `PreToolUse`·`PostToolUse`에 훅 추가    |
| `scripts/confluence-gate.test.mjs`  | 판정 사례 테스트                        |
| `.gitignore`                        | `.claude/settings.local.json` 추가      |
| `docs/guardrails.md`, `CLAUDE.md`   | 강제 수단 표, phase 작성 절차에 한 줄씩 |

### Claude Code 훅

| 시점                                | 대상                                                                                                              | 판정 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| Confluence 문서 읽은 뒤             | 이름이 `getConfluenceContent`로 끝나는 MCP 도구 (`mcp__.*getConfluenceContent`)                                   | 기록 |
| 파일 수정 전 (Edit·Write·MultiEdit) | `docs/phases/*.md` (`_template.md` 제외)인데 이 세션의 읽은 기록이 없거나 마지막으로 읽은 지 12시간이 넘음        | 막음 |
| Bash 실행 전                        | 명령에 `docs/phases/`가 있고 파일을 쓰는 동작이 있음 (`>`, `>>`, `tee`, `sed -i`, `perl -i`, `mv`, `cp`, `touch`) | 막음 |
| 그 밖                               | 읽기만 하는 명령, 리뷰 문서, `src/`                                                                               | 통과 |

- **기록 위치:** OS 임시 폴더의 `claude-confluence-gate/<session_id>.json`. 세션마다 따로 두어서, 새 세션은 한 번 다시 읽어야 통과한다. 레포에는 아무것도 남지 않는다.
- **"사용자 확인"이 아니라 "막음"인 이유:** Phase 05의 phase 확인 훅은 오타 같은 예외가 있어서 사용자 확인으로 두었다. 이 훅은 예외가 없고, 고치는 방법(회의록 읽기)을 Claude가 바로 할 수 있다. 막는 메시지에 무엇을 검색해서 읽을지 적는다.
  - 검색 CQL: `space = "Diegesis" AND type = page ORDER BY created DESC`
  - 읽기: `getConfluenceContent(detail: full)`
- **매처:** 커넥터를 연결한 방식(플러그인, claude.ai 커넥터)에 따라 도구 이름 앞부분이 다르다. 그래서 이름 끝(`getConfluenceContent`)으로 찾는다.
- **출력:** 막는 판단은 `writeSync`로 쓰고 끝낸다. 출력을 다 쓰기 전에 프로세스가 끝나서 판정이 빠지는 일을 막기 위해서다.

### API

BE API는 쓰지 않는다. Confluence는 Claude의 Atlassian MCP 커넥터로만 읽는다.

### 화면과 상태

화면 변경 없음.

### 새 의존성

없음. Node 내장(`node:fs`, `node:os`, `node:path`, `node:test`, `node:child_process`)만 쓴다.

## 작업 단계

- [x] 1. `.claude/hooks/confluence-gate.mjs` 추가 (개인 설정에서 쓰던 스크립트, 대상 폴더는 `docs/phases/`)
- [x] 2. `.claude/settings.json`에 `PreToolUse`(`Edit|Write|MultiEdit|NotebookEdit|Bash`)와 `PostToolUse`(`mcp__.*getConfluenceContent`) 훅 추가
- [x] 3. `scripts/confluence-gate.test.mjs` 작성, `pnpm test:scripts` 통과
- [x] 4. `.gitignore`에 `.claude/settings.local.json` 추가
- [x] 5. `docs/guardrails.md`, CLAUDE.md 갱신
- [x] 6. (일부, 리뷰 3절) 새 Claude Code 세션에서 실제로 확인: 읽기 전 phase 문서 수정이 막히고, 회의록을 읽은 뒤 통과

## 완료 기준

- [x] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:scripts`, `pnpm check:process`가 통과한다.
- [x] 테스트가 다음 사례를 확인한다.
  - 읽은 기록 없이 `docs/phases/NN-x.md`를 Edit·Write하면 막힘
  - `_template.md`, `docs/reviews/`, `src/` 수정은 통과
  - Bash로 쓰면 막힘: `cat >`, `sed -i`, `git mv`
  - Bash로 읽기만 하면 통과: `cat … 2>&1`, `grep`
  - 기록이 남은 뒤에는 통과
  - 다른 세션이면 막힘
  - 12시간이 지난 기록이면 막힘
  - `CONFLUENCE_GATE=off`면 통과
- [x] 막는 메시지에 어디서 무엇을 읽을지(스페이스, 검색 방법)가 들어 있다.
- [x] 기존 `guard.mjs` 훅과 권한 규칙이 그대로다 (`scripts/claude-guard.test.mjs` 통과).
- [x] 새 세션에서 실제로 막히고 풀리는 것을 확인했다 (작업 단계 6). 일부: 개인 설정으로 이 세션에서 확인, FE 설정의 새 세션은 머지 후 (리뷰 3절)

## 위험과 열린 질문

1. **커넥터가 없는 팀원:** Atlassian 커넥터가 연결되지 않은 세션에서는 phase 문서를 쓸 수 없다. CLAUDE.md에 끄는 법을 적고, 팀에 공지한다.
2. **아무 페이지나 읽어도 통과:** 템플릿 페이지만 읽어도 통과한다. Diegesis 스페이스의 회의록인지 가리려면 응답 모양(`spaceId` 등)에 기대야 해서 MVP에서는 하지 않는다. 실제로 이런 일이 생기면 다시 정한다.
3. **12시간 기준:** 회의가 주 1회라서 하루 안에는 다시 읽지 않아도 된다고 보았다. 너무 길거나 짧으면 숫자만 바꾼다.
4. **빈틈:** `python -c`, `node -e`처럼 다른 방법으로 쓰는 명령은 못 잡는다. Phase 05 훅과 같은 수준의 빈틈이다.

## 변경 기록

- 2026-11-25: 작성, 승인
- 2026-11-25: 구현(`6f2ec3d`), 리뷰 통과. 완료 기준 5의 FE 설정 새 세션 확인은 머지 후로 남김
