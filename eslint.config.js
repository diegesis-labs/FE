import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// ── 가드레일 (docs/phases/04-guardrail-lint.md, 대응표: docs/guardrails.md) ──
// 글로만 있던 CLAUDE.md 코드 규칙을 lint로 강제한다. 메시지는 대신 쓸 것을 알려준다.
// 주의: 같은 규칙을 뒤 블록에서 다시 쓰면 옵션이 합쳐지지 않고 통째로 바뀐다.
// 그래서 규칙 옵션을 아래 상수로 만들고, 레이어별 블록에서 필요한 것을 합쳐 넣는다.
// 규칙이 실제로 걸리는지는 scripts/check-guardrails.mjs가 검사한다.

const SRC = ['src/**/*.{ts,tsx}']
const PRODUCT_LAYERS = ['src/{pages,widgets,features,entities}/**/*.{ts,tsx}']
const API_SEGMENT = ['src/shared/api/**']

const OUR_PALETTE = 'cream|sand|charcoal|pine|wood|oak|brick'
const TAILWIND_PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe'
const OUR_PALETTE_CLASS = String.raw`\b[a-z-]+-(${OUR_PALETTE})-\d+\b`
const TAILWIND_PALETTE_CLASS = String.raw`\b[a-z-]+-((${TAILWIND_PALETTE})-\d+|white|black)\b`
const HEX_ARBITRARY = String.raw`\[#[0-9a-fA-F]`
// 인라인 style 등 클래스 밖의 색 값: '#333', '1px solid #ccc', 'rgb(0 0 0)', 'oklch(…)'
const HEX_VALUE = String.raw`(^|[\s(,])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b`
const COLOR_FUNCTION = String.raw`\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(`
// 포커스 표시를 끄거나 따로 그리는 클래스 (design-system 4.6, docs/phases/09-focus-style-guardrail.md)
// 클래스 하나의 시작: 문자열 처음이나 공백 뒤, 앞에 변형 접두사(`md:`, `data-[state=open]:` 등)가 붙을 수 있다.
const CLASS_START = String.raw`(^|\s)(\S*:)?!?`
const OUTLINE_OFF = String.raw`${CLASS_START}outline-(none|hidden)!?(\s|$)`
// focus, focus-visible, focus-within 변형이 붙은 ring, ring-2, ring-[3px], ring-ring/50, ring-offset-2
const FOCUS_RING = String.raw`${CLASS_START}focus(-visible|-within)?:(\S*:)?!?ring(-|!|\s|$)`

const MSG = {
  palette:
    '팔레트 색을 직접 쓰지 마세요. 의미 토큰(bg-background, text-muted-foreground, text-brand 등)을 쓰세요. docs/design-system.md 1.5',
  tailwindPalette:
    'Tailwind 기본 색은 꺼져 있어서 이 클래스는 아무 스타일도 만들지 않습니다. 의미 토큰(bg-background, text-foreground 등)을 쓰세요. docs/design-system.md 1.5',
  focus:
    '포커스 표시를 끄거나 따로 그리지 마세요. 클래스를 지우면 전역 :focus-visible outline(2px, 2px 띄움)이 붙습니다. 스크롤 영역처럼 바깥 outline이 잘리면 focus-visible:-outline-offset-2로 안쪽에 그리세요. docs/design-system.md 4.6',
  hex: '색 값을 직접 쓰지 마세요. 의미 토큰(bg-background, text-brand 등)을 쓰세요. docs/design-system.md 1.5',
  fetch: 'fetch를 직접 쓰지 마세요. @/shared/api의 apiClient를 쓰세요.',
  httpLib: 'HTTP 라이브러리를 추가하지 않습니다. @/shared/api의 apiClient를 쓰세요.',
  effect:
    '제품 코드(pages/widgets/features/entities)에서 Effect를 쓰지 마세요. 서버 데이터는 TanStack Query, 파생 값은 렌더 중 계산, 외부 구독은 shared/lib에 목적이 드러나는 훅으로 만드세요.',
  timer:
    '타이머로 문제를 덮지 마세요. 원인을 고치고, 정말 필요하면 shared/lib에 목적이 드러나는 훅으로 만드세요.',
}

const colorSyntax = [
  [OUR_PALETTE_CLASS, MSG.palette],
  [TAILWIND_PALETTE_CLASS, MSG.tailwindPalette],
  [HEX_ARBITRARY, MSG.hex],
  [HEX_VALUE, MSG.hex],
  [COLOR_FUNCTION, MSG.hex],
].flatMap(([pattern, message]) => [
  { selector: `Literal[value=/${pattern}/]`, message },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message },
])
const focusSyntax = [OUTLINE_OFF, FOCUS_RING].flatMap((pattern) => [
  { selector: `Literal[value=/${pattern}/]`, message: MSG.focus },
  { selector: `TemplateElement[value.raw=/${pattern}/]`, message: MSG.focus },
])
const effectSyntax = [
  {
    selector:
      "MemberExpression[object.name='React'][property.name=/^use(Layout|Insertion)?Effect$/]",
    message: MSG.effect,
  },
]

const httpLibImports = [
  'axios',
  'ky',
  'ofetch',
  'got',
  'superagent',
  'node-fetch',
  'cross-fetch',
].map((name) => ({ name, message: MSG.httpLib }))
const effectImports = [
  {
    name: 'react',
    importNames: ['useEffect', 'useLayoutEffect', 'useInsertionEffect'],
    message: MSG.effect,
  },
]

const GLOBAL_OBJECTS = ['window', 'globalThis', 'self']
const TIMERS = ['setTimeout', 'setInterval', 'requestAnimationFrame', 'requestIdleCallback']
const fetchGlobals = [{ name: 'fetch', message: MSG.fetch }]
const fetchProperties = GLOBAL_OBJECTS.map((object) => ({
  object,
  property: 'fetch',
  message: MSG.fetch,
}))
const timerGlobals = TIMERS.map((name) => ({ name, message: MSG.timer }))
const timerProperties = GLOBAL_OBJECTS.flatMap((object) =>
  TIMERS.map((property) => ({ object, property, message: MSG.timer })),
)

const guardrails = [
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  {
    // 모든 소스: 색 규칙, 포커스 표시 규칙, HTTP 라이브러리 금지
    files: SRC,
    rules: {
      'no-restricted-syntax': ['error', ...colorSyntax, ...focusSyntax],
      'no-restricted-imports': ['error', { paths: httpLibImports }],
    },
  },
  {
    // shared/api 밖: fetch 직접 호출 금지
    files: SRC,
    ignores: API_SEGMENT,
    rules: {
      'no-restricted-globals': ['error', ...fetchGlobals],
      'no-restricted-properties': ['error', ...fetchProperties],
    },
  },
  {
    // 제품 레이어: 위 규칙 + Effect·타이머 금지, eslint-disable 주석 무효
    files: PRODUCT_LAYERS,
    linterOptions: { noInlineConfig: true },
    rules: {
      'no-restricted-syntax': ['error', ...colorSyntax, ...focusSyntax, ...effectSyntax],
      'no-restricted-imports': ['error', { paths: [...httpLibImports, ...effectImports] }],
      'no-restricted-globals': ['error', ...fetchGlobals, ...timerGlobals],
      'no-restricted-properties': ['error', ...fetchProperties, ...timerProperties],
    },
  },
]

export default defineConfig([
  // mockServiceWorker.js: `msw init`이 만드는 파일. 고치지 않는다 (docs/phases/06-book-list.md).
  // .vercel: `vercel build`가 로컬에 만드는 빌드 결과 (Phase 10)
  globalIgnores(['dist', '.vercel', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      pluginQuery.configs['flat/recommended'],
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // shadcn 컴포넌트는 컴포넌트와 variants를 같이 export 하므로 fast-refresh 규칙을 끈다.
    files: ['src/shared/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  ...guardrails,
  // 포맷 관련 규칙은 Prettier에 맡긴다 (항상 마지막에 둘 것).
  prettier,
])
