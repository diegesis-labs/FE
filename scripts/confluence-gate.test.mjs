// Claude Code 훅(.claude/hooks/confluence-gate.mjs)의 판정 사례 테스트.
// 훅을 실제로 실행해서 표(docs/phases/11-confluence-gate.md "Claude Code 훅")대로 판정하는지 본다.
// 실행: node --test scripts/confluence-gate.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const gate = join(repo, '.claude', 'hooks', 'confluence-gate.mjs')

// 기록은 OS 임시 폴더에 남으므로, 테스트마다 TMPDIR을 따로 줘서 실제 세션 기록과 섞지 않는다
const projectDir = mkdtempSync(join(tmpdir(), 'confluence-gate-project-'))
const stateTmp = mkdtempSync(join(tmpdir(), 'confluence-gate-state-'))
after(() => [projectDir, stateTmp].forEach((d) => rmSync(d, { recursive: true, force: true })))

function run(args, payload, env = {}) {
  const out = execFileSync('node', [gate, ...args], {
    input: JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir, TMPDIR: stateTmp, ...env },
    encoding: 'utf8',
  })
  return out ? JSON.parse(out) : null
}

const decision = (out) => out?.hookSpecificOutput?.permissionDecision ?? 'pass'
const check = (sessionId, toolName, toolInput, env) =>
  decision(
    run(
      ['check', 'docs/phases/'],
      { session_id: sessionId, tool_name: toolName, tool_input: toolInput },
      env,
    ),
  )
const record = (sessionId) =>
  run(['record'], {
    session_id: sessionId,
    tool_name: 'mcp__claude_ai_Atlassian__getConfluenceContent',
    tool_input: { content_id: '557061' },
    tool_response: [
      { type: 'text', text: '{"data":{"id":"557061","title":"FE, BE API/마일스톤 회의"}}' },
    ],
  })

const file = (rel) => ({ file_path: join(projectDir, rel) })
const phase = file('docs/phases/11-x.md')

describe('읽은 기록이 없을 때', () => {
  const s = 'no-read'
  const cases = [
    ['Edit', phase, 'deny'],
    ['Write', phase, 'deny'],
    ['MultiEdit', phase, 'deny'],
    ['Edit', file('docs/phases/_template.md'), 'pass'],
    ['Edit', file('docs/reviews/11-x-review.md'), 'pass'],
    ['Edit', file('src/app/main.tsx'), 'pass'],
    ['Write', file('docs/architecture.md'), 'pass'],
    ['Bash', { command: "cat > docs/phases/11-x.md <<'EOF'\n# x\nEOF" }, 'deny'],
    ['Bash', { command: 'echo "- 상태: 승인됨" >> docs/phases/11-x.md' }, 'deny'],
    ['Bash', { command: "sed -i '' 's/계획/승인됨/' docs/phases/11-x.md" }, 'deny'],
    ['Bash', { command: 'git mv docs/phases/11-a.md docs/phases/12-a.md' }, 'deny'],
    ['Bash', { command: 'cp docs/phases/_template.md docs/phases/12-y.md' }, 'deny'],
    ['Bash', { command: 'cat docs/phases/07-book-reader.md 2>&1' }, 'pass'],
    ['Bash', { command: 'grep -n "상태" docs/phases/*.md' }, 'pass'],
    ['Bash', { command: 'git diff docs/phases/' }, 'pass'],
    ['Bash', { command: 'pnpm exec prettier --check docs/phases/11-x.md' }, 'pass'],
    ['Bash', { command: 'echo hi > /tmp/x.txt' }, 'pass'],
  ]
  for (const [tool, input, expected] of cases) {
    test(`${tool} ${input.command ?? input.file_path.replace(projectDir, '')} → ${expected}`, () => {
      assert.equal(check(s, tool, input), expected)
    })
  }

  test('막는 메시지에 어디서 무엇을 읽을지 들어 있다', () => {
    const out = run(['check', 'docs/phases/'], {
      session_id: s,
      tool_name: 'Edit',
      tool_input: phase,
    })
    const reason = out.hookSpecificOutput.permissionDecisionReason
    assert.match(reason, /docs\/phases\/11-x\.md/)
    assert.match(reason, /Diegesis/)
    assert.match(reason, /getConfluenceContent/)
    assert.match(reason, /searchConfluence/)
  })
})

describe('읽은 기록이 있을 때', () => {
  const s = 'read'
  record(s)

  test('기록 파일에 문서 ID와 제목이 남는다', () => {
    const state = JSON.parse(
      readFileSync(join(stateTmp, 'claude-confluence-gate', `${s}.json`), 'utf8'),
    )
    assert.equal(state.pages.at(-1).id, '557061')
    assert.equal(state.pages.at(-1).title, 'FE, BE API/마일스톤 회의')
  })
  test('Edit phase 문서 → pass', () => assert.equal(check(s, 'Edit', phase), 'pass'))
  test('Bash로 phase 문서 쓰기 → pass', () =>
    assert.equal(check(s, 'Bash', { command: 'cat > docs/phases/11-x.md <<EOF\nx\nEOF' }), 'pass'))
  test('다른 세션 → deny', () => assert.equal(check('other', 'Edit', phase), 'deny'))
})

describe('기록이 오래됐을 때', () => {
  const s = 'stale'
  record(s)
  const stateFile = join(stateTmp, 'claude-confluence-gate', `${s}.json`)
  const setAge = (hours) => {
    const state = JSON.parse(readFileSync(stateFile, 'utf8'))
    state.lastReadAt = new Date(Date.now() - hours * 36e5).toISOString()
    writeFileSync(stateFile, JSON.stringify(state))
  }

  test('11시간 전 → pass', () => {
    setAge(11)
    assert.equal(check(s, 'Edit', phase), 'pass')
  })
  test('13시간 전 → deny, 이유에 경과 시간', () => {
    setAge(13)
    const out = run(['check', 'docs/phases/'], {
      session_id: s,
      tool_name: 'Edit',
      tool_input: phase,
    })
    assert.equal(decision(out), 'deny')
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /13시간/)
  })
})

describe('그 밖', () => {
  test('CONFLUENCE_GATE=off → pass', () =>
    assert.equal(check('off', 'Edit', phase, { CONFLUENCE_GATE: 'off' }), 'pass'))
  test('경로에 *를 쓰면 worktree 폴더도 대상이다', () => {
    const out = run(['check', 'FE*/docs/phases/'], {
      session_id: 'glob',
      tool_name: 'Edit',
      tool_input: file('FE-27-x/docs/phases/11-x.md'),
    })
    assert.equal(decision(out), 'deny')
  })
  test('입력이 JSON이 아니면 조용히 통과', () => {
    const out = execFileSync('node', [gate, 'check', 'docs/phases/'], {
      input: 'not json',
      env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir, TMPDIR: stateTmp },
      encoding: 'utf8',
    })
    assert.equal(out, '')
  })
  test('session_id의 경로 문자는 파일 이름에서 지운다', () => {
    record('../../evil')
    const names = readdirSync(join(stateTmp, 'claude-confluence-gate'))
    assert.ok(names.every((n) => !n.includes('/')))
    assert.ok(names.includes('______evil.json'))
  })
})
