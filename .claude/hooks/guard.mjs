// Claude Code 훅: CLAUDE.md의 작업 절차를 Claude가 도구를 쓰는 순간에 막는다.
// 설정: .claude/settings.json. 사람의 터미널 작업에는 걸리지 않는다 (PR 단계는 CI가 본다).
//
//   node guard.mjs bash  PreToolUse(Bash)   git·gh 명령 검사
//   node guard.mjs edit  PreToolUse(Edit)   src/ 수정 전에 진행 중인 phase 문서 확인
//   node guard.mjs lint  PostToolUse(Edit)  고친 src/ 파일을 ESLint로 검사
//
// 판단: deny = 막음, ask = 사용자에게 확인을 받음, 출력 없음 = 평소 권한 흐름대로.

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const mode = process.argv[2]
const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd()

function git(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    }),
  )
  process.exit(0)
}

// ── bash: git·gh 명령 ─────────────────────────────────────────────
function checkBash(command) {
  // &&, ||, ;, |, 줄바꿈으로 나눈 명령 하나하나를 본다
  const parts = command.split(/&&|\|\||[;|\n]/).map((s) => s.trim())
  const branch = git(['branch', '--show-current'])

  for (const part of parts) {
    const gitCmd = part.match(/(?:^|\s)git(?:\s+-C\s+\S+)?\s+(push|commit)\b(.*)$/)
    if (gitCmd) {
      const [, sub, rest] = gitCmd
      const args = ` ${rest} `

      if (/\s--no-verify\s/.test(args) || (sub === 'commit' && /\s-n\s/.test(args))) {
        decide('deny', '--no-verify는 쓰지 않습니다. 검사를 건너뛰지 말고 원인을 고치세요.')
      }

      if (sub === 'push') {
        if (/\s(--force(-with-lease)?(=\S*)?|-f|--mirror)\s|\s\+\S/.test(args)) {
          decide(
            'ask',
            'force push입니다. CLAUDE.md: force push는 사용자가 명시적으로 요청할 때만 합니다.',
          )
        }
        if (/(\s|:)main(\s|$)/.test(args) || (branch === 'main' && !/\s\S+\s+\S+/.test(args))) {
          decide(
            'ask',
            'main으로 푸시합니다. CLAUDE.md: main 직접 푸시는 사용자가 명시적으로 요청할 때만 합니다 (ruleset도 막습니다).',
          )
        }
      }

      if (sub === 'commit') {
        if (branch === 'main') {
          decide(
            'deny',
            'main에서 커밋하지 않습니다. 작업 브랜치(<종류>/<이슈번호>-<설명>)를 만들어서 커밋하세요.',
          )
        }
        const staged = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean)
        const isPlanDoc = (f) => /^docs\/(phases|reviews)\//.test(f)
        const docs = staged.filter(isPlanDoc)
        const others = staged.filter((f) => !isPlanDoc(f))
        if (docs.length && others.length) {
          decide(
            'deny',
            `한 커밋에 계획·리뷰 문서와 다른 파일을 섞지 않습니다.\n문서: ${docs.join(', ')}\n그 밖: ${others.join(', ')}\ngit restore --staged로 나눠서 따로 커밋하세요.`,
          )
        }
      }
    }

    if (/(?:^|\s)gh\s+pr\s+merge\b/.test(part)) {
      if (/\s(--squash|-s|--rebase|-r)(\s|$)/.test(` ${part} `)) {
        decide(
          'deny',
          'squash·rebase 머지는 커밋 해시를 바꿔 phase·리뷰 문서의 해시가 끊깁니다. --merge로 머지하세요.',
        )
      }
      decide('ask', 'PR 머지입니다. CLAUDE.md: PR 머지는 사용자가 명시적으로 요청할 때만 합니다.')
    }

    if (
      /(?:^|\s)gh\s+api\b.*rulesets/.test(part) &&
      /\s(-X|--method)\s*(PUT|PATCH|POST|DELETE)\b/i.test(` ${part}`)
    ) {
      decide(
        'ask',
        'ruleset 변경입니다. CLAUDE.md: ruleset 변경·비활성화는 사용자 승인을 받고, .github/rulesets/main.json을 먼저 고칩니다.',
      )
    }
  }
}

// ── edit: src/ 수정 전 phase 확인 ─────────────────────────────────
function srcPath(filePath) {
  if (!filePath) return null
  const rel = relative(root, filePath).split(sep).join('/')
  return rel.startsWith('src/') ? rel : null
}

function activePhases() {
  const dir = join(root, 'docs', 'phases')
  let files = []
  try {
    files = readdirSync(dir).filter((f) => /^\d+.*\.md$/.test(f))
  } catch {
    return []
  }
  return files.filter((f) => {
    const status = readFileSync(join(dir, f), 'utf8').match(/^- 상태:\s*(\S+)/m)?.[1] ?? ''
    return ['승인됨', '진행', '리뷰'].some((s) => status.startsWith(s))
  })
}

function checkEdit(filePath) {
  const rel = srcPath(filePath)
  if (!rel) return
  if (activePhases().length === 0) {
    decide(
      'ask',
      `${rel} 수정인데 승인됨·진행 중·리뷰 중인 phase 문서가 없습니다. CLAUDE.md: 코드를 고치기 전에 docs/phases/에 phase 문서를 쓰고 승인받습니다 (오타처럼 동작이 안 바뀌는 수정은 예외).`,
    )
  }
}

// ── lint: 고친 src/ 파일 ESLint ───────────────────────────────────
function lintFile(filePath) {
  const rel = srcPath(filePath)
  if (!rel || !/\.(ts|tsx)$/.test(rel)) return
  try {
    execFileSync('pnpm', ['exec', 'eslint', '--no-warn-ignored', rel], {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
    })
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim()
    process.stdout.write(
      JSON.stringify({
        decision: 'block',
        reason: `ESLint가 ${rel}에서 문제를 찾았습니다. 규칙을 끄지 말고 고치세요.\n${output}`,
      }),
    )
  }
}

const toolInput = input.tool_input ?? {}
if (mode === 'bash') checkBash(String(toolInput.command ?? ''))
else if (mode === 'edit') checkEdit(toolInput.file_path)
else if (mode === 'lint') lintFile(toolInput.file_path ?? input.tool_response?.filePath)
