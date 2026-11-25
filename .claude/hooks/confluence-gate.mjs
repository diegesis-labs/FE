// Claude Code 훅: 계획 문서를 쓰기 전에 Confluence 최신 회의록을 읽었는지 확인한다.
// 사람의 편집에는 걸리지 않는다. Claude가 이 세션에서 Confluence 문서를 한 번도 읽지 않았으면
// 계획 문서 쓰기를 막고, 무엇을 먼저 읽을지 알려준다.
//
//   node confluence-gate.mjs record              PostToolUse(getConfluenceContent)  읽은 기록 남기기
//   node confluence-gate.mjs check <경로>...      PreToolUse(Edit·Write·Bash)        계획 문서 쓰기 전 확인
//
// <경로>는 프로젝트 루트 기준 계획 문서 폴더 (예: docs/phases/). 그 아래 .md를 쓰면 확인한다.
// 끄기: 환경 변수 CONFLUENCE_GATE=off (예: .claude/settings.local.json의 env).
// 설정: .claude/settings.json. 판정 목록과 빈틈: docs/phases/11-confluence-gate.md "Claude Code 훅" 절.

import { mkdirSync, readFileSync, writeFileSync, writeSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'

const MAX_AGE_HOURS = 12
const SPACE_HINT =
  'Confluence Diegesis 스페이스(raewoo0908.atlassian.net)에서 최신 회의록을 찾아 읽으세요. ' +
  '예: searchConfluence로 `space = "Diegesis" AND type = page ORDER BY created DESC`를 검색한 뒤 ' +
  '가장 최근 회의록을 getConfluenceContent(detail: full)로 읽습니다. ' +
  '읽은 결정 사항과 계획이 어긋나면 계획 문서에 반영하고, 그다음 다시 쓰세요.'

const [mode, ...args] = process.argv.slice(2)
let input = {}
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}')
} catch {
  process.exit(0)
}
if (process.env.CONFLUENCE_GATE === 'off') process.exit(0)

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd()
const sessionId = String(input.session_id || 'unknown').replace(/[^\w-]/g, '_')
const stateDir = join(tmpdir(), 'claude-confluence-gate')
const stateFile = join(stateDir, `${sessionId}.json`)

function readState() {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'))
  } catch {
    return null
  }
}

// ── record: Confluence 문서를 읽으면 세션별로 기록 ────────────────────
function record() {
  const toolInput = input.tool_input ?? {}
  const response = JSON.stringify(input.tool_response ?? '')
  const page = {
    id: String(toolInput.content_id ?? toolInput.content_url ?? ''),
    title: response.match(/\\?"title\\?"\s*:\s*\\?"((?:[^"\\]|\\.)*?)\\?"/)?.[1] ?? '',
    at: new Date().toISOString(),
  }
  const state = readState() ?? { pages: [] }
  state.pages = [...state.pages, page].slice(-20)
  state.lastReadAt = page.at
  mkdirSync(stateDir, { recursive: true })
  writeFileSync(stateFile, JSON.stringify(state, null, 2))
}

// ── check: 계획 문서를 쓰려는지 보고, 읽은 기록이 없으면 막음 ─────────
// 경로 마디 안의 *는 아무 글자나 (예: FE*/docs/phases/ → FE-27-x/docs/phases/ 같은 worktree도 포함)
const prefixes = args.map((p) => p.replace(/^\.?\//, '').replace(/\/?$/, '/'))
const prefixRes = prefixes.map(
  (p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}`),
)

function planDocPath(filePath) {
  if (!filePath) return null
  const rel = relative(root, filePath).split(sep).join('/')
  if (!rel.endsWith('.md') || rel.endsWith('/_template.md')) return null
  return prefixRes.some((re) => re.test(rel)) ? rel : null
}

// Bash로 쓰는 경우: 명령에 계획 문서 폴더 이름이 있고 파일을 쓰는 동작이 있으면 본다.
// 셸의 현재 폴더가 루트가 아닐 수 있어서 폴더 이름의 마지막 두 마디(docs/phases/)로 찾는다.
const WRITE_RE =
  /(?:^|[^<>=])>{1,2}(?!&)|\btee\b|\bsed\s+(?:-[a-zA-Z]*\s+)*-[a-zA-Z]*i|\bperl\s+-[a-zA-Z]*i|\b(?:mv|cp|touch)\s/
function bashTouchesPlanDoc(command) {
  const needles = prefixes.map((p) => p.split('/').filter(Boolean).slice(-2).join('/') + '/')
  const hit = needles.find((n) => command.includes(n))
  if (!hit || !WRITE_RE.test(command)) return null
  if (
    /_template\.md/.test(command) &&
    !new RegExp(`${hit}(?!_template)[\\w.-]+\\.md`).test(command)
  ) {
    return null
  }
  return `${hit} (Bash)`
}

function deny(target, why) {
  // process.stdout.write는 macOS 파이프에서 비동기라 바로 exit하면 출력이 잘린다
  writeSync(
    1,
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `계획 문서(${target})를 쓰기 전에 Confluence 최신 회의록을 확인해야 합니다. ${why}\n${SPACE_HINT}`,
      },
    }),
  )
  process.exit(0)
}

function check() {
  const toolInput = input.tool_input ?? {}
  const target =
    input.tool_name === 'Bash'
      ? bashTouchesPlanDoc(String(toolInput.command ?? ''))
      : planDocPath(toolInput.file_path ?? toolInput.notebook_path)
  if (!target) return

  const state = readState()
  if (!state?.lastReadAt) {
    deny(target, '이 세션에서 아직 Confluence 문서를 읽지 않았습니다.')
  }
  const ageHours = (Date.now() - Date.parse(state.lastReadAt)) / 36e5
  if (!(ageHours <= MAX_AGE_HOURS)) {
    deny(
      target,
      `마지막으로 읽은 지 ${Math.floor(ageHours)}시간이 지났습니다 (${MAX_AGE_HOURS}시간 넘으면 다시 읽음).`,
    )
  }
}

if (mode === 'record') record()
else if (mode === 'check') check()
