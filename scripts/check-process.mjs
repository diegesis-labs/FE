// 작업 절차 검사: CLAUDE.md "작업 순서"와 "Git" 규칙 중 PR에서 기계로 확인할 수 있는 것.
// 규칙과 설계: docs/phases/05-process-check.md
//
//   CI:   node scripts/check-process.mjs --event "$GITHUB_EVENT_PATH"
//   로컬: pnpm check:process [--base origin/main] [--body-file pr.md] [--draft]
//
// 검사 함수는 입력(커밋 목록, 문서 내용, PR 정보)만 받는 순수 함수다. git과 이벤트 JSON은 진입점에서만 읽는다.
// 보안: PR 제목·설명·브랜치 이름은 외부 입력이라 셸을 거치지 않는다 (execFileSync + 인자 배열).

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const COMMIT_TYPES = ['feat', 'fix', 'refactor', 'docs', 'chore', 'style', 'ci']
export const BRANCH_TYPES = ['feat', 'fix', 'setup', 'refactor', 'docs', 'design']

const COMMIT_RE = new RegExp(`^(${COMMIT_TYPES.join('|')})(\\([^)]+\\))?: .+`)
const BRANCH_RE = new RegExp(`^(${BRANCH_TYPES.join('|')})/[0-9]+-[a-z0-9-]+$`)
const PLAN_DOC_RE = /^docs\/(phases|reviews)\//
const PHASE_LINK_RE = /docs\/phases\/\d{2}-[^\s)`'"<>]+?\.md/
const REVIEW_LINK_RE = /docs\/reviews\/\d{2}-[^\s)`'"<>]+?-review\.md/
const ISSUE_RE = /\b(Closes|Refs)\s+#\d+/i
const EXEMPT_RE = /^\s*-\s*Phase:\s*없음(.*)$/m

const short = (ref) => (/^[0-9a-f]{40}$/.test(ref) ? ref.slice(0, 7) : ref)

/** 코드 변경: docs/ 아래와 루트의 *.md를 뺀 모든 파일 (설정 파일, .github/ 포함) */
export const isCodeFile = (file) => !file.startsWith('docs/') && !/^[^/]+\.md$/.test(file)

/** 검사 1: 커밋 제목이 `종류(범위): 설명` 형식이다. commits: [{ sha, subject }] */
export function checkCommitMessages(commits) {
  return commits
    .filter((c) => !COMMIT_RE.test(c.subject))
    .map(
      (c) =>
        `\`${short(c.sha)}\` 커밋 제목 "${c.subject}"이(가) 형식에 맞지 않습니다. ` +
        `\`종류(범위): 설명\`으로 고치세요. 종류: ${COMMIT_TYPES.join(', ')}. ` +
        `(git rebase -i 후 force push는 작업 브랜치에서만, 사용자에게 확인 후)`,
    )
}

/** 검사 2: 브랜치 이름이 `<종류>/<이슈번호>-<짧은-설명>`이다. dependabot/ 브랜치는 제외 */
export function checkBranchName(branch) {
  if (branch.startsWith('dependabot/') || BRANCH_RE.test(branch)) return []
  return [
    `브랜치 이름 "${branch}"이(가) 형식에 맞지 않습니다. ` +
      `\`종류/이슈번호-설명\` 형식이어야 합니다 (예: feat/12-story-list). 종류: ${BRANCH_TYPES.join(', ')}`,
  ]
}

/** 검사 3: 계획·리뷰 문서를 바꾼 커밋은 다른 파일을 바꾸지 않는다. commits: [{ sha, files }] */
export function checkPlanDocSeparation(commits) {
  return commits.flatMap((c) => {
    const docs = c.files.filter((f) => PLAN_DOC_RE.test(f))
    const others = c.files.filter((f) => !PLAN_DOC_RE.test(f))
    if (!docs.length || !others.length) return []
    return [
      `\`${short(c.sha)}\`가 계획·리뷰 문서(${docs.join(', ')})와 다른 파일(${others.join(', ')})을 ` +
        `함께 바꿨습니다. 커밋을 나누세요.`,
    ]
  })
}

/** phase 문서의 `- 상태:` 값. 없으면 null */
export function phaseStatus(content) {
  return content?.match(/^- 상태:\s*(.+)$/m)?.[1].trim() ?? null
}

/**
 * 검사 4: 코드를 바꾼 첫 커밋 시점에 phase 문서가 이미 승인되어 있다 (`상태:`가 `계획`이 아님).
 * commits는 오래된 것부터. readAt(sha, path)는 그 커밋 시점의 파일 내용(없으면 null).
 * pastPathsOf(path)는 그 문서의 예전 이름들이다. phase 번호를 옮긴 문서는 그 시점에 예전 이름으로 있다.
 */
export function checkPhaseBeforeCode({ commits, phasePath, readAt, pastPathsOf = () => [] }) {
  const first = commits.find((c) => c.files.some(isCodeFile))
  if (!first) return []
  if (!phasePath) {
    return [
      `코드 변경이 있는데 phase 문서를 찾지 못했습니다. PR 설명에 \`docs/phases/NN-이름.md\`를 적거나, ` +
        `phase가 필요 없는 작은 수정이면 \`- Phase: 없음 — 이유\`를 적으세요.`,
    ]
  }
  const content = [phasePath, ...pastPathsOf(phasePath)]
    .map((path) => readAt(first.sha, path))
    .find((c) => c !== null && c !== undefined)
  const status = phaseStatus(content)
  if (status === null) {
    return [
      `코드 커밋 \`${short(first.sha)}\` 시점에 \`${phasePath}\`가 없거나 \`- 상태:\` 줄이 없습니다. ` +
        `phase 문서를 먼저 승인·커밋하세요.`,
    ]
  }
  if (status.startsWith('계획')) {
    return [
      `코드 커밋 \`${short(first.sha)}\` 시점에 \`${phasePath}\`가 아직 승인되지 않았습니다 (상태: ${status}). ` +
        `phase 문서를 먼저 승인·커밋하세요.`,
    ]
  }
  return []
}

/** PR 설명의 `- Phase: 없음 — 이유` 예외. { exempt, reason } */
export function parseExemption(body) {
  const m = body?.match(EXEMPT_RE)
  if (!m) return { exempt: false, reason: '' }
  return { exempt: true, reason: m[1].replace(/^[\s—–:-]+/, '').trim() }
}

/** PR 설명이 가리키는 phase 문서 경로 */
export const phaseLinkOf = (body) => body?.match(PHASE_LINK_RE)?.[0] ?? null

/** 검사 5: PR 설명에 이슈, phase 문서, (draft가 아니면) 리뷰 문서 링크가 있다. exists(path)는 head에 파일이 있는지 */
export function checkPrBody({ body, draft, exists }) {
  const errors = []
  if (!ISSUE_RE.test(body)) {
    errors.push('PR 설명에 `Refs #N`(또는 `Closes #N`) 줄이 없습니다. 관련 이슈를 적으세요.')
  }
  const { exempt, reason } = parseExemption(body)
  if (exempt) {
    if (!reason)
      errors.push('`- Phase: 없음` 뒤에 이유를 적으세요 (예: `- Phase: 없음 — 오타 수정`).')
    return errors
  }
  const phase = phaseLinkOf(body)
  if (!phase) {
    errors.push(
      'PR 설명에 phase 문서(`docs/phases/NN-이름.md`)가 없습니다. ' +
        'phase가 필요 없는 작은 수정이면 `- Phase: 없음 — 이유`를 적으세요.',
    )
  } else if (!exists(phase)) {
    errors.push(`PR 설명의 \`${phase}\`가 이 브랜치에 없습니다.`)
  }
  if (!draft) {
    const review = body.match(REVIEW_LINK_RE)?.[0]
    if (!review) {
      errors.push(
        'PR 설명에 리뷰 문서(`docs/reviews/NN-이름-review.md`)가 없습니다. 리뷰 전이면 draft PR로 두세요.',
      )
    } else if (!exists(review)) {
      errors.push(`PR 설명의 \`${review}\`가 이 브랜치에 없습니다.`)
    }
  }
  return errors
}

/**
 * 다섯 검사를 묶어 실행한다. pr이 null이면(로컬, PR 설명 없음) 검사 5를 건너뛰고,
 * 검사 4의 phase 문서는 `- 브랜치:` 줄이 현재 브랜치인 문서로 찾는다(findPhaseForBranch).
 */
export function runChecks({
  commits,
  branch,
  pr,
  readAt,
  exists,
  findPhaseForBranch,
  pastPathsOf,
}) {
  const results = []
  const add = (name, errors) => results.push({ name, errors })

  add('1. 커밋 메시지', checkCommitMessages(commits))
  if (pr?.author === 'dependabot[bot]')
    return { results, notes: ['Dependabot PR: 검사 1만 합니다.'] }

  const notes = []
  add('2. 브랜치 이름', checkBranchName(branch))
  add('3. 계획 문서와 코드 분리', checkPlanDocSeparation(commits))

  const { exempt, reason } = parseExemption(pr?.body)
  if (exempt) {
    notes.push(`phase 없이 머지되는 PR입니다: ${reason || '(이유 없음)'}`)
  } else {
    const phasePath = pr ? phaseLinkOf(pr.body) : findPhaseForBranch(branch)
    add(
      '4. phase 승인이 코드보다 먼저',
      checkPhaseBeforeCode({ commits, phasePath, readAt, pastPathsOf }),
    )
  }

  if (pr) add('5. PR 설명', checkPrBody({ body: pr.body ?? '', draft: pr.draft, exists }))
  else notes.push('PR 설명이 없어 검사 5를 건너뜁니다 (--body-file로 넘길 수 있음).')

  return { results, notes }
}

// ── 진입점: git과 이벤트 JSON에서 입력을 모은다 ─────────────────────

function git(args, stderr = 'inherit') {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', stderr],
  }).trim()
}

// 없을 수도 있는 파일을 묻는 호출: 실패는 null, git의 오류 출력은 숨긴다
function tryGit(args) {
  try {
    return git(args, 'ignore')
  } catch {
    return null
  }
}

function collectCommits(base, head) {
  const shas = git(['rev-list', '--no-merges', '--reverse', `${base}..${head}`])
    .split('\n')
    .filter(Boolean)
  return shas.map((sha) => ({
    sha,
    subject: git(['show', '-s', '--format=%s', sha]),
    files: git(['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', sha])
      .split('\n')
      .filter(Boolean),
  }))
}

function parseArgs(argv) {
  const args = { base: 'origin/main', head: 'HEAD' }
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]
    if (key === '--draft') args.draft = true
    else if (key.startsWith('--'))
      args[key.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = argv[++i]
  }
  return args
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  let base, head, branch, pr

  if (args.event) {
    const event = JSON.parse(readFileSync(args.event, 'utf8'))
    const p = event.pull_request
    if (!p) {
      console.log('PR 이벤트가 아니라 작업 절차 검사를 건너뜁니다.')
      return
    }
    base = p.base.sha
    head = p.head.sha
    branch = p.head.ref
    pr = { body: p.body ?? '', draft: Boolean(p.draft), author: p.user?.login }
  } else {
    base = args.base
    head = args.head
    branch = tryGit(['branch', '--show-current']) || ''
    pr = args.bodyFile
      ? { body: readFileSync(args.bodyFile, 'utf8'), draft: Boolean(args.draft), author: null }
      : null
  }

  const readAt = (sha, path) => tryGit(['show', `${sha}:${path}`])
  const exists = (path) => tryGit(['cat-file', '-e', `${head}:${path}`]) !== null
  const findPhaseForBranch = (name) => {
    const files = (tryGit(['ls-tree', '--name-only', head, 'docs/phases/']) ?? '').split('\n')
    return (
      files.find(
        (f) => /\/\d{2}-.*\.md$/.test(f) && readAt(head, f)?.includes(`- 브랜치: \`${name}\``),
      ) ?? null
    )
  }

  // git의 이름 변경 기록에서 이 문서의 예전 이름들 (지금 이름 제외)
  const pastPathsOf = (path) => {
    const names = (tryGit(['log', '--follow', '--name-only', '--format=', head, '--', path]) ?? '')
      .split('\n')
      .filter(Boolean)
    return [...new Set(names)].filter((name) => name !== path)
  }

  const commits = collectCommits(base, head)
  const { results, notes } = runChecks({
    commits,
    branch,
    pr,
    readAt,
    exists,
    findPhaseForBranch,
    pastPathsOf,
  })

  console.log(
    `작업 절차 검사: ${branch} (${commits.length}개 커밋, ${short(base)}..${short(head)})`,
  )
  for (const note of notes) console.log(`ℹ ${note}`)
  let failed = 0
  for (const { name, errors } of results) {
    if (!errors.length) {
      console.log(`✔ ${name}`)
      continue
    }
    failed += errors.length
    console.log(`✖ ${name}`)
    for (const e of errors) console.log(`  - ${e}`)
  }
  if (failed) {
    console.log(`\n작업 절차 검사 실패 (${failed}건). 규칙: CLAUDE.md "작업 순서", "Git"`)
    process.exitCode = 1
  } else {
    console.log('\n작업 절차 검사 통과')
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
