// 가드레일 자체 검사: eslint.config.js의 가드레일 규칙이 실제로 걸리는지 확인한다.
// 설정을 고치다 규칙이 조용히 꺼지면 여기서 실패한다. (docs/phases/04-guardrail-lint.md)
//
// 사례마다 가상 경로(filePath)와 코드를 ESLint에 넘긴다. 파일은 만들지 않는다.
// expect: 걸려야 하는 규칙 이름, 'unused-disable'(쓰이지 않는 disable 주석), 또는 null(통과해야 함)
import { ESLint } from 'eslint'

const CASES = [
  // BE 호출
  { file: 'src/pages/x/ui/X.tsx', code: `fetch('/a')`, expect: 'no-restricted-globals' },
  { file: 'src/shared/lib/x.ts', code: `fetch('/a')`, expect: 'no-restricted-globals' },
  { file: 'src/app/x.ts', code: `window.fetch('/a')`, expect: 'no-restricted-properties' },
  {
    file: 'src/features/x/api/x.ts',
    code: `globalThis.fetch('/a')`,
    expect: 'no-restricted-properties',
  },
  { file: 'src/shared/api/client.ts', code: `fetch('/a')`, expect: null },
  {
    file: 'src/entities/x/api/x.ts',
    code: `import axios from 'axios'\nvoid axios`,
    expect: 'no-restricted-imports',
  },
  {
    file: 'src/shared/api/x.ts',
    code: `import ky from 'ky'\nvoid ky`,
    expect: 'no-restricted-imports',
  },

  // 색: 우리 팔레트, Tailwind 기본 팔레트, hex 임의값
  {
    file: 'src/pages/x/ui/X.tsx',
    code: `export const X = () => <div className="flex bg-pine-700" />`,
    expect: 'no-restricted-syntax',
  },
  {
    file: 'src/shared/ui/x.tsx',
    code: `export const c = 'hover:text-wood-600'`,
    expect: 'no-restricted-syntax',
  },
  {
    file: 'src/app/x.ts',
    code: 'export const c = `p-2 ${1} border-sand-300`',
    expect: 'no-restricted-syntax',
  },
  {
    file: 'src/pages/x/ui/X.tsx',
    code: `export const c = 'bg-(--color-cream-100)'`,
    expect: 'no-restricted-syntax',
  },
  {
    file: 'src/pages/x/ui/X.tsx',
    code: `export const c = 'bg-red-500'`,
    expect: 'no-restricted-syntax',
  },
  {
    file: 'src/widgets/x/ui/X.tsx',
    code: `export const X = () => <p className="text-white" />`,
    expect: 'no-restricted-syntax',
  },
  {
    file: 'src/features/x/ui/X.tsx',
    code: `export const c = 'hover:bg-black/50'`,
    expect: 'no-restricted-syntax',
  },
  {
    file: 'src/pages/x/ui/X.tsx',
    code: `export const c = 'bg-[#333]'`,
    expect: 'no-restricted-syntax',
  },
  {
    file: 'src/pages/x/ui/X.tsx',
    code: `export const c = 'flex whitespace-nowrap bg-background text-muted-foreground text-brand bg-accent-music border-transparent bg-chart-1 text-primary-foreground'`,
    expect: null,
  },

  // Effect: 제품 레이어 금지, shared·app 허용
  {
    file: 'src/features/x/ui/X.tsx',
    code: `import { useEffect } from 'react'\nvoid useEffect`,
    expect: 'no-restricted-imports',
  },
  {
    file: 'src/pages/x/ui/X.tsx',
    code: `import { useLayoutEffect } from 'react'\nvoid useLayoutEffect`,
    expect: 'no-restricted-imports',
  },
  {
    file: 'src/widgets/x/ui/X.tsx',
    code: `import React from 'react'\nvoid React.useEffect`,
    expect: 'no-restricted-syntax',
  },
  {
    file: 'src/entities/x/model/x.ts',
    code: `import { useMemo } from 'react'\nvoid useMemo`,
    expect: null,
  },
  {
    file: 'src/shared/lib/x.ts',
    code: `import { useEffect } from 'react'\nvoid useEffect`,
    expect: null,
  },
  { file: 'src/app/x.ts', code: `import { useEffect } from 'react'\nvoid useEffect`, expect: null },

  // 타이머: 제품 레이어 금지, shared 허용
  {
    file: 'src/pages/x/ui/X.tsx',
    code: `setTimeout(() => {}, 0)`,
    expect: 'no-restricted-globals',
  },
  {
    file: 'src/features/x/ui/X.tsx',
    code: `window.requestAnimationFrame(() => {})`,
    expect: 'no-restricted-properties',
  },
  {
    file: 'src/entities/x/model/x.ts',
    code: `requestIdleCallback(() => {})`,
    expect: 'no-restricted-globals',
  },
  { file: 'src/shared/lib/x.ts', code: `setTimeout(() => {}, 0)`, expect: null },

  // 규칙 끄기: 제품 레이어에서는 disable 주석이 무시되고, 쓰이지 않는 disable 주석은 에러
  {
    file: 'src/pages/x/ui/X.tsx',
    code: `// eslint-disable-next-line no-restricted-globals -- 급해서\nfetch('/a')`,
    expect: 'no-restricted-globals',
  },
  {
    file: 'src/shared/lib/x.ts',
    code: `// eslint-disable-next-line no-restricted-globals -- 쓸 일 없음\nexport const a = 1`,
    expect: 'unused-disable',
  },
]

const eslint = new ESLint()
let failed = 0
for (const c of CASES) {
  const [result] = await eslint.lintText(c.code, { filePath: c.file })
  const errors = result.messages.filter((m) => m.severity === 2)
  const found = errors.map(
    (m) =>
      m.ruleId ?? (/eslint-disable/.test(m.message) ? 'unused-disable' : `fatal: ${m.message}`),
  )
  const ok = c.expect === null ? errors.length === 0 : found.includes(c.expect)
  if (!ok) {
    failed++
    console.error(
      `✘ ${c.file}\n    ${JSON.stringify(c.code)}\n    기대: ${c.expect ?? '통과'}  실제: ${found.join(', ') || '통과'}`,
    )
  }
}

if (failed > 0) {
  console.error(
    `\n가드레일 검사 실패: ${failed}/${CASES.length}개 사례가 기대와 다릅니다. eslint.config.js를 확인하세요.`,
  )
  process.exit(1)
}
console.log(`✔ 가드레일 검사 통과 (${CASES.length}개 사례)`)
