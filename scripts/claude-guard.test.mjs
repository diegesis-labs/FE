// Claude Code 훅(.claude/hooks/guard.mjs)의 판정 사례 테스트.
// 훅을 실제로 실행해서 표(docs/phases/05-process-check.md "Claude Code 훅")대로 판정하는지 본다.
// 실행: node --test scripts/claude-guard.test.mjs

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const guard = join(repo, '.claude', 'hooks', 'guard.mjs')

function run(mode, toolInput, projectDir) {
  const out = execFileSync('node', [guard, mode], {
    input: JSON.stringify({ tool_input: toolInput }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
    encoding: 'utf8',
  })
  return out ? JSON.parse(out) : null
}
const decision = (out) => out?.hookSpecificOutput?.permissionDecision ?? 'pass'

// 작업 브랜치에 있는 임시 git 레포
function makeRepo(branch, phaseStatus) {
  const dir = mkdtempSync(join(tmpdir(), 'claude-guard-'))
  const sh = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' })
  sh('init', '-q', '-b', branch)
  mkdirSync(join(dir, 'docs', 'phases'), { recursive: true })
  mkdirSync(join(dir, 'docs', 'reviews'), { recursive: true })
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'docs', 'phases', '_template.md'), '- 상태: 계획 | 승인됨\n')
  if (phaseStatus) writeFileSync(join(dir, 'docs', 'phases', '01-x.md'), `- 상태: ${phaseStatus}\n`)
  return { dir, sh }
}

const temps = []
after(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })))

describe('bash', () => {
  const { dir, sh } = makeRepo('feat/1-x')
  temps.push(dir)
  const bash = (command) => decision(run('bash', { command }, dir))

  const cases = [
    ['git status', 'pass'],
    ['git push -u origin feat/1-x', 'pass'],
    ['git push --force origin feat/1-x', 'ask'],
    ['git push --force-with-lease', 'ask'],
    ['git push -f', 'ask'],
    ['git push origin +feat/1-x', 'ask'],
    ['git push origin main', 'ask'],
    ['git push origin HEAD:main', 'ask'],
    ['git push -fu origin feat/1-x', 'ask'],
    ['git -c credential.helper= push --force origin feat/1-x', 'ask'],
    ["git -c 'credential.helper=!gh auth git-credential' push -f", 'ask'],
    ['git --no-pager -C . push --force', 'ask'],
    ['git push -u origin feat/1-main-fix', 'pass'],
    ['git commit --no-verify -m "feat: x"', 'deny'],
    ['git commit -an -m "feat: x"', 'deny'],
    ['git commit -m "docs: -n 옵션과 --no-verify 설명"', 'pass'],
    ['git commit -m "fix: a; git push --force"', 'pass'],
    ['gh pr merge 12 --merge', 'ask'],
    ['pnpm lint && gh pr merge 12 --squash', 'deny'],
    ['gh pr merge 12 --rebase', 'deny'],
    ['gh api -X PUT repos/o/r/rulesets/1 --input f.json', 'ask'],
    ['gh api repos/o/r/rulesets', 'pass'],
  ]
  for (const [command, expected] of cases) {
    test(`${command} → ${expected}`, () => assert.equal(bash(command), expected))
  }

  test('계획 문서와 코드가 함께 스테이징된 커밋 → deny', () => {
    writeFileSync(join(dir, 'docs', 'reviews', '01-x-review.md'), 'x\n')
    writeFileSync(join(dir, 'src', 'a.ts'), 'x\n')
    sh('add', '.')
    const out = run('bash', { command: 'git commit -m "docs: x"' }, dir)
    assert.equal(decision(out), 'deny')
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /src\/a\.ts/)
  })

  test('계획 문서만 스테이징된 커밋 → pass', () => {
    sh('rm', '--cached', '-q', 'src/a.ts') // 커밋이 없는 레포라 restore --staged 대신
    assert.equal(bash('git commit -m "docs(review): 01 리뷰 계획"'), 'pass')
  })
})

describe('bash: main 브랜치', () => {
  const { dir } = makeRepo('main')
  temps.push(dir)
  test('main에서 git commit → deny', () =>
    assert.equal(decision(run('bash', { command: 'git commit -m "feat: x"' }, dir)), 'deny'))
  test('main에서 인자 없는 git push → ask', () =>
    assert.equal(decision(run('bash', { command: 'git push' }, dir)), 'ask'))
})

describe('edit', () => {
  for (const [status, expected] of [
    ['승인됨', 'pass'],
    ['진행 중', 'pass'],
    ['리뷰 중', 'pass'],
    ['완료', 'ask'],
    ['계획', 'ask'],
  ]) {
    test(`phase 상태 "${status}"에서 src/ 수정 → ${expected}`, () => {
      const { dir } = makeRepo('feat/1-x', status)
      temps.push(dir)
      assert.equal(decision(run('edit', { file_path: join(dir, 'src', 'a.ts') }, dir)), expected)
    })
  }

  test('phase가 없어도 src/ 밖은 → pass', () => {
    const { dir } = makeRepo('feat/1-x')
    temps.push(dir)
    assert.equal(decision(run('edit', { file_path: join(dir, 'docs', 'x.md') }, dir)), 'pass')
  })
})

// 표에서 훅 스크립트가 아니라 settings.json 권한 규칙이 맡는 판정. Claude Code가 직접 적용하므로 규칙이 있는지만 본다.
describe('settings.json', () => {
  const settings = JSON.parse(readFileSync(join(repo, '.claude', 'settings.json'), 'utf8'))
  const { deny, ask } = settings.permissions

  for (const rule of [
    'Edit(./pnpm-workspace.yaml)',
    'Edit(./eslint.config.js)',
    'Edit(./steiger.config.ts)',
    'Edit(./scripts/check-guardrails.mjs)',
    'Edit(./.github/**)',
    'Bash(pnpm add *)',
    'Bash(pnpm update *)',
  ]) {
    test(`${rule} → ask`, () => assert.ok(ask.includes(rule)))
  }
  for (const rule of ['Read(./.env)', 'Read(./.env.local)', 'Read(./.env.*.local)']) {
    test(`${rule} → deny`, () => assert.ok(deny.includes(rule)))
  }

  test('훅 3개가 guard.mjs의 bash·edit·lint로 등록돼 있다', () => {
    const commands = (event) =>
      settings.hooks[event].flatMap((h) => h.hooks.map((x) => `${h.matcher} ${x.command}`))
    assert.ok(commands('PreToolUse').some((c) => /^Bash .*guard\.mjs" bash$/.test(c)))
    assert.ok(
      commands('PreToolUse').some((c) => /^Edit\|Write\|MultiEdit .*guard\.mjs" edit$/.test(c)),
    )
    assert.ok(
      commands('PostToolUse').some((c) => /^Edit\|Write\|MultiEdit .*guard\.mjs" lint$/.test(c)),
    )
  })
})

describe('lint', () => {
  test('규칙을 지킨 src/ 파일 → 출력 없음', () => {
    assert.equal(run('lint', { file_path: join(repo, 'src', 'app', 'App.tsx') }, repo), null)
  })

  test('팔레트 클래스를 쓴 src/ 파일 → block과 ESLint 메시지', () => {
    const dir = join(repo, 'src', 'pages', '__claude_guard_test__')
    mkdirSync(dir, { recursive: true })
    try {
      const file = join(dir, 'X.tsx')
      writeFileSync(file, 'export const X = () => <div className="bg-pine-700" />\n')
      const out = run('lint', { file_path: file }, repo)
      assert.equal(out?.decision, 'block')
      assert.match(out.reason, /팔레트 색을 직접 쓰지 마세요/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
