// 작업 절차 검사(scripts/check-process.mjs) 테스트. 검사마다 통과·실패 사례를 둔다.
// 검사가 조용히 무력해지는 것을 막는 것이 목적이다 (docs/phases/05-process-check.md).
// 실행: pnpm test:scripts

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  checkBranchName,
  checkCommitMessages,
  checkPhaseBeforeCode,
  checkPlanDocSeparation,
  checkPrBody,
  checkReviewAfterChanges,
  isCodeFile,
  parseExemption,
  runChecks,
} from './check-process.mjs'

const commit = (subject, files = ['src/a.ts'], sha = 'a'.repeat(40)) => ({ sha, subject, files })

// PR #10 설명에서 검사에 쓰이는 줄 (실제 사례)
const PR10_BODY = [
  '## 관련 이슈',
  '',
  '- Closes #8',
  '',
  '## Phase / 리뷰',
  '',
  '- Phase: `docs/phases/04-guardrail-lint.md`',
  '- 리뷰: `docs/reviews/04-guardrail-lint-review.md` (수정 후 통과)',
].join('\n')

describe('검사 1: 커밋 메시지', () => {
  for (const subject of [
    'feat(story): 목록 화면',
    'docs(phase): 05 작업 절차 CI 검사',
    'fix: 05 리뷰 반영',
    'style: 04 리뷰 문서 포맷',
    'chore(claude): 작업 절차를 막는 Claude Code 훅 추가',
    // 이력의 실제 커밋 2d0e17b, 984c2da: 종류에 ci를 더해 통과한다 (열린 질문 1)
    'ci: GitHub Actions CI와 main 보호 규칙 추가',
    'ci: ruleset 파일을 실제 적용된 설정과 맞춤',
  ]) {
    test(`통과: ${subject}`, () => assert.deepEqual(checkCommitMessages([commit(subject)]), []))
  }

  for (const subject of [
    'Update README',
    'feature: 목록',
    'feat 목록',
    'feat():',
    'feat(story):목록',
    'wip',
  ]) {
    test(`실패: ${subject}`, () => {
      const [error] = checkCommitMessages([commit(subject)])
      assert.match(error, /종류\(범위\): 설명/)
      assert.match(error, /`aaaaaaa`/)
    })
  }
})

describe('검사 2: 브랜치 이름', () => {
  for (const branch of [
    'setup/2-init',
    'docs/2-phase02-complete',
    'setup/2-fsd-migration',
    'setup/8-guardrail-lint',
    'setup/11-process-check',
    'dependabot/github_actions/actions/checkout-7.0.1',
  ]) {
    test(`통과: ${branch}`, () => assert.deepEqual(checkBranchName(branch), []))
  }

  for (const branch of [
    'main',
    'feat/story-list',
    'feature/12-x',
    'feat/12_story',
    'feat/12-Story',
    'ci/3-x',
  ]) {
    test(`실패: ${branch}`, () => assert.match(checkBranchName(branch)[0], /종류\/이슈번호-설명/))
  }
})

describe('검사 3: 계획 문서와 코드 분리', () => {
  test('통과: 문서만, 코드만, 문서 두 폴더', () => {
    assert.deepEqual(
      checkPlanDocSeparation([
        commit('docs(phase): x', ['docs/phases/05-x.md']),
        commit('feat: x', ['src/a.ts', 'docs/guardrails.md', 'CLAUDE.md']),
        commit('docs: x', ['docs/phases/05-x.md', 'docs/reviews/05-x-review.md']),
      ]),
      [],
    )
  })

  test('실패: phase 문서와 코드', () => {
    const [error] = checkPlanDocSeparation([
      commit('docs(phase): x', ['docs/phases/05-x.md', 'src/a.ts']),
    ])
    assert.match(error, /docs\/phases\/05-x\.md/)
    assert.match(error, /src\/a\.ts/)
  })

  test('실패: 리뷰 문서와 다른 문서 (Phase 03 사례: 계획 변경 커밋에 파일 이동이 섞임)', () => {
    const errors = checkPlanDocSeparation([
      commit('docs(phase): 03 계획 변경', ['docs/phases/03-x.md', 'src/old.ts', 'src/new/old.ts']),
    ])
    assert.equal(errors.length, 1)
  })
})

describe('검사 4: phase 승인이 코드보다 먼저', () => {
  const phasePath = 'docs/phases/05-x.md'
  const commits = [
    commit('docs(phase): 05', [phasePath], '1'.repeat(40)),
    commit('feat: x', ['src/a.ts'], '2'.repeat(40)),
    commit('docs(phase): 05 완료', [phasePath], '3'.repeat(40)),
  ]
  const readAtWith = (status) => (sha, path) =>
    path === phasePath && sha === '2'.repeat(40) ? `# Phase\n\n- 상태: ${status}\n` : null

  for (const status of ['승인됨', '진행 중', '리뷰 중', '완료 (2026-11-20, PR #10)']) {
    test(`통과: 코드 커밋 시점 상태 "${status}"`, () =>
      assert.deepEqual(
        checkPhaseBeforeCode({ commits, phasePath, readAt: readAtWith(status) }),
        [],
      ))
  }

  test('통과: 코드 변경이 없음 (문서만)', () => {
    const docsOnly = [commit('docs: x', ['docs/architecture.md', 'README.md'])]
    assert.deepEqual(
      checkPhaseBeforeCode({ commits: docsOnly, phasePath: null, readAt: () => null }),
      [],
    )
  })

  test('실패: 코드 커밋 시점에 상태가 계획', () => {
    const [error] = checkPhaseBeforeCode({ commits, phasePath, readAt: readAtWith('계획') })
    assert.match(error, /`2222222`/)
    assert.match(error, /아직 승인되지 않았습니다/)
  })

  test('통과: 코드 커밋 시점에는 예전 이름이었던 문서 (번호를 옮김)', () => {
    const oldPath = 'docs/phases/04-x.md'
    const readAt = (sha, path) =>
      path === oldPath && sha === '2'.repeat(40) ? '# Phase\n\n- 상태: 승인됨\n' : null
    assert.deepEqual(
      checkPhaseBeforeCode({ commits, phasePath, readAt, pastPathsOf: () => [oldPath] }),
      [],
    )
  })

  test('실패: 예전 이름으로도 코드 커밋 시점에 상태가 계획', () => {
    const oldPath = 'docs/phases/04-x.md'
    const readAt = (sha, path) => (path === oldPath ? '# Phase\n\n- 상태: 계획\n' : null)
    const [error] = checkPhaseBeforeCode({
      commits,
      phasePath,
      readAt,
      pastPathsOf: () => [oldPath],
    })
    assert.match(error, /아직 승인되지 않았습니다/)
  })

  test('실패: 코드 커밋 시점에 phase 문서가 없음', () => {
    const [error] = checkPhaseBeforeCode({ commits, phasePath, readAt: () => null })
    assert.match(error, /없거나/)
  })

  test('실패: 코드 변경이 있는데 phase 문서를 모름', () => {
    const [error] = checkPhaseBeforeCode({ commits, phasePath: null, readAt: () => null })
    assert.match(error, /Phase: 없음/)
  })

  test('코드 변경의 정의: docs/와 루트 *.md만 코드가 아니다', () => {
    assert.equal(isCodeFile('docs/phases/05-x.md'), false)
    assert.equal(isCodeFile('CLAUDE.md'), false)
    assert.equal(isCodeFile('README.md'), false)
    assert.equal(isCodeFile('src/a.ts'), true)
    assert.equal(isCodeFile('.github/workflows/ci.yml'), true)
    assert.equal(isCodeFile('package.json'), true)
    assert.equal(isCodeFile('src/README.md'), true)
  })
})

describe('검사 5: PR 설명', () => {
  const exists = () => true

  test('통과: PR #10 설명', () =>
    assert.deepEqual(checkPrBody({ body: PR10_BODY, draft: false, exists }), []))

  test('통과: draft면 리뷰 문서 없이', () => {
    const body = '- Refs #11\n- Phase: `docs/phases/05-process-check.md`'
    assert.deepEqual(checkPrBody({ body, draft: true, exists }), [])
  })

  test('통과: 마크다운 링크로 적어도', () => {
    const body =
      'Refs #11\n[phase](docs/phases/05-process-check.md) [리뷰](docs/reviews/05-process-check-review.md)'
    assert.deepEqual(checkPrBody({ body, draft: false, exists }), [])
  })

  test('통과: 예외 줄에 이유가 있으면 phase·리뷰 없이', () => {
    const body = '- Refs #3\n- Phase: 없음 — README 오타 수정'
    assert.deepEqual(checkPrBody({ body, draft: false, exists }), [])
  })

  test('실패: 이슈 줄이 비어 있음 (템플릿 그대로)', () => {
    const body = PR10_BODY.replace('Closes #8', 'Refs #')
    assert.match(checkPrBody({ body, draft: false, exists })[0], /Refs #N/)
  })

  test('실패: 예외 줄에도 이슈는 필요', () => {
    const errors = checkPrBody({ body: '- Phase: 없음 — 오타', draft: false, exists })
    assert.equal(errors.length, 1)
    assert.match(errors[0], /Refs #N/)
  })

  test('실패: 예외 줄의 이유가 비어 있음', () => {
    for (const line of ['- Phase: 없음', '- Phase: 없음 —', '- Phase: 없음 - ']) {
      assert.match(
        checkPrBody({ body: `Refs #3\n${line}`, draft: false, exists })[0],
        /이유를 적으세요/,
      )
    }
  })

  test('실패: phase 문서 없음 (템플릿의 NN 자리 그대로)', () => {
    const body = '- Refs #11\n- Phase: `docs/phases/NN-이름.md`'
    assert.match(checkPrBody({ body, draft: true, exists })[0], /phase 문서/)
  })

  test('실패: draft가 아닌데 리뷰 문서 없음', () => {
    const body = '- Refs #11\n- Phase: `docs/phases/05-process-check.md`'
    assert.match(checkPrBody({ body, draft: false, exists })[0], /리뷰 문서/)
  })

  test('실패: 가리킨 파일이 브랜치에 없음', () => {
    const errors = checkPrBody({ body: PR10_BODY, draft: false, exists: () => false })
    assert.equal(errors.length, 2)
    assert.match(errors[0], /04-guardrail-lint\.md`가 이 브랜치에 없습니다/)
  })
})

describe('검사 6: 리뷰가 마지막 변경 뒤에', () => {
  const reviewPath = 'docs/reviews/16-x-review.md'
  const sha = (n) => String(n).repeat(40)
  const plan = commit('docs(phase): 16 x', ['docs/phases/16-x.md'], sha(1))
  const code = commit('feat: x', ['src/a.ts', 'docs/architecture.md'], sha(2))
  const reviewPlan = commit('docs(review): 16 리뷰 계획', [reviewPath], sha(3))
  const reviewResult = commit(
    'docs(review): 16 리뷰 결과',
    [reviewPath, 'docs/phases/16-x.md'],
    sha(4),
  )
  const check = (commits) => checkReviewAfterChanges({ commits, reviewPath })

  test('통과: PR #40 모양 (구현 뒤 리뷰 계획·결과)', () =>
    assert.deepEqual(check([plan, code, reviewPlan, reviewResult]), []))

  test('통과: 리뷰 반영 뒤 리뷰 결과 (PR #37 모양)', () => {
    const fix = commit('fix: 16 리뷰 반영', ['src/a.ts'], sha(5))
    assert.deepEqual(check([plan, code, reviewPlan, fix, reviewResult]), [])
  })

  test('통과: 리뷰 뒤에 phase 문서만 고침', () => {
    const phaseOnly = commit('docs(phase): 16 완료', ['docs/phases/16-x.md'], sha(6))
    assert.deepEqual(check([plan, code, reviewPlan, reviewResult, phaseOnly]), [])
  })

  test('실패: 리뷰 문서를 이 PR에서 안 바꿈 (PR #38 모양)', () => {
    const errors = check([code, commit('docs(phase): 15 갱신', ['docs/phases/15-x.md'], sha(7))])
    assert.equal(errors.length, 1)
    assert.match(errors[0], /16-x-review\.md`가 이 PR에서 바뀌지 않았습니다/)
  })

  test('실패: 다른 리뷰 문서만 바꿈', () => {
    const other = commit('docs(review): 15 갱신', ['docs/reviews/15-y-review.md'], sha(8))
    assert.match(check([code, other])[0], /바뀌지 않았습니다/)
  })

  test('실패: 리뷰 결과 뒤에 코드를 고침', () => {
    const late = commit('fix: x', ['src/b.ts'], sha(9))
    const errors = check([plan, code, reviewPlan, reviewResult, late])
    assert.equal(errors.length, 1)
    assert.match(errors[0], /`9999999` 이후의 변경이 `docs\/reviews\/16-x-review\.md`에 기록되지/)
  })

  test('실패: 리뷰 뒤에 계획·리뷰 문서 밖의 문서를 고침', () => {
    const late = commit('docs: x', ['docs/architecture.md'], sha(9))
    assert.equal(check([code, reviewResult, late]).length, 1)
  })

  // 머지 커밋: files는 충돌을 풀며 손댄 파일만 (phase 18)
  const merge = (files, n = 'e') => ({
    sha: n.repeat(40),
    subject: "Merge remote-tracking branch 'origin/main' into feat/1-x",
    files,
    merge: true,
  })

  test('실패: 리뷰 결과 뒤에 충돌을 푼 머지 (PR #20 모양)', () => {
    const errors = check([plan, code, reviewPlan, reviewResult, merge(['src/b.tsx'])])
    assert.equal(errors.length, 1)
    assert.match(errors[0], /`eeeeeee`\(충돌을 푼 머지\) 이후의 변경이/)
  })

  test('통과: 충돌을 푼 머지 뒤에 리뷰 결과 (PR #18 모양)', () =>
    assert.deepEqual(check([plan, code, merge(['src/a.ts']), reviewResult]), []))

  test('통과: 리뷰 결과 뒤 충돌 없는 머지', () =>
    assert.deepEqual(check([plan, code, reviewResult, merge([])]), []))

  test('통과: 리뷰 결과 뒤 계획·리뷰 문서만 충돌을 푼 머지', () =>
    assert.deepEqual(check([plan, code, reviewResult, merge(['docs/phases/16-x.md'])]), []))

  test('통과: 코드 없이 리뷰 문서만 바꾼 PR', () => assert.deepEqual(check([reviewResult]), []))
})

describe('예외 줄 해석', () => {
  test('여러 구분자', () => {
    assert.deepEqual(parseExemption('- Phase: 없음 — 오타'), { exempt: true, reason: '오타' })
    assert.deepEqual(parseExemption('- Phase: 없음 - 오타'), { exempt: true, reason: '오타' })
    assert.deepEqual(parseExemption('- Phase: 없음: 오타'), { exempt: true, reason: '오타' })
    assert.deepEqual(parseExemption('- Phase: `docs/phases/05-x.md`'), {
      exempt: false,
      reason: '',
    })
  })
})

describe('runChecks', () => {
  const base = {
    commits: [commit('feat: x', ['src/a.ts'])],
    branch: 'feat/12-x',
    readAt: () => '- 상태: 승인됨',
    exists: () => true,
    findPhaseForBranch: () => 'docs/phases/05-x.md',
  }
  const failed = ({ results }) => results.filter((r) => r.errors.length).map((r) => r.name)

  test('PR 설명이 없으면(로컬) 검사 5·6을 건너뛰고 브랜치로 phase를 찾는다', () => {
    const out = runChecks({ ...base, pr: null })
    assert.deepEqual(
      out.results.map((r) => r.name[0]),
      ['1', '2', '3', '4'],
    )
    assert.deepEqual(failed(out), [])
  })

  const BODY = '- Refs #3\n- Phase: `docs/phases/05-x.md`\n- 리뷰: `docs/reviews/05-x-review.md`'

  test('draft가 아닌 PR은 검사 6까지 한다', () => {
    const out = runChecks({
      ...base,
      commits: [
        commit('feat: x', ['src/a.ts']),
        commit('docs(review): 05 리뷰 결과', ['docs/reviews/05-x-review.md']),
      ],
      pr: { body: BODY, draft: false, author: 'someone' },
    })
    assert.deepEqual(
      out.results.map((r) => r.name[0]),
      ['1', '2', '3', '4', '5', '6'],
    )
    assert.deepEqual(failed(out), [])
  })

  test('실패: 리뷰 문서를 안 바꾼 PR (PR #38 모양)', () => {
    const out = runChecks({ ...base, pr: { body: BODY, draft: false, author: 'someone' } })
    assert.deepEqual(failed(out), ['6. 리뷰가 마지막 변경 뒤에'])
  })

  test('draft PR은 검사 6을 건너뛴다', () => {
    const out = runChecks({ ...base, pr: { body: BODY, draft: true, author: 'someone' } })
    assert.ok(!out.results.some((r) => r.name.startsWith('6')))
    assert.match(out.notes.join('\n'), /draft PR이라 검사 6을 건너뜁니다/)
  })

  test('리뷰 문서가 브랜치에 없으면 검사 5만 실패한다', () => {
    const out = runChecks({
      ...base,
      exists: (path) => !path.startsWith('docs/reviews/'),
      pr: { body: BODY, draft: false, author: 'someone' },
    })
    assert.deepEqual(failed(out), ['5. PR 설명'])
  })

  test('머지 커밋은 검사 1·3·4에 들어가지 않고 검사 6에만 들어간다', () => {
    const mergeCommit = {
      sha: 'e'.repeat(40),
      subject: "Merge branch 'main' into feat/12-x", // 검사 1 형식이 아님
      files: ['docs/phases/05-x.md', 'src/b.ts'], // 검사 3이면 섞인 커밋
      merge: true,
    }
    const reviewResult = commit('docs(review): 05 리뷰 결과', ['docs/reviews/05-x-review.md'])
    const pr = { body: BODY, draft: false, author: 'someone' }
    // 첫 커밋이 머지라도 검사 4는 머지가 아닌 첫 코드 커밋 시점을 본다
    const readAt = (sha) => (sha === 'e'.repeat(40) ? '- 상태: 계획' : '- 상태: 승인됨')
    const passed = runChecks({
      ...base,
      readAt,
      commits: [mergeCommit, commit('feat: x', ['src/a.ts']), reviewResult],
      pr,
    })
    assert.deepEqual(failed(passed), [])
    const late = runChecks({
      ...base,
      readAt,
      commits: [commit('feat: x', ['src/a.ts']), reviewResult, mergeCommit],
      pr,
    })
    assert.deepEqual(failed(late), ['6. 리뷰가 마지막 변경 뒤에'])
  })

  test('Dependabot PR은 검사 1만 한다', () => {
    const out = runChecks({
      ...base,
      branch: 'whatever',
      commits: [commit('chore(deps): bump x', ['.github/workflows/ci.yml'])],
      pr: { body: '', draft: false, author: 'dependabot[bot]' },
    })
    assert.deepEqual(
      out.results.map((r) => r.name[0]),
      ['1'],
    )
    assert.deepEqual(failed(out), [])
  })

  test('예외 줄이 있으면 검사 4를 건너뛰고 로그에 이유를 남긴다', () => {
    const out = runChecks({
      ...base,
      readAt: () => null,
      pr: { body: '- Refs #3\n- Phase: 없음 — 설정값 한 줄', draft: false, author: 'someone' },
    })
    assert.deepEqual(failed(out), [])
    assert.ok(!out.results.some((r) => r.name.startsWith('4') || r.name.startsWith('6')))
    assert.match(out.notes.join('\n'), /phase 없이 머지되는 PR입니다: 설정값 한 줄/)
  })

  test('실패가 여러 검사에 걸치면 모두 보고한다', () => {
    const out = runChecks({
      ...base,
      branch: 'my-branch',
      commits: [commit('update', ['docs/phases/05-x.md', 'src/a.ts'])],
      pr: { body: '', draft: false, author: 'someone' },
    })
    assert.deepEqual(failed(out), [
      '1. 커밋 메시지',
      '2. 브랜치 이름',
      '3. 계획 문서와 코드 분리',
      '4. phase 승인이 코드보다 먼저',
      '5. PR 설명',
    ])
  })
})
