// FSD 규칙 검사 설정. 규칙: CLAUDE.md "아키텍처 (FSD)", docs/phases/03-fsd-migration.md
import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      // 한 곳에서만 쓰는 슬라이스 경고. 초기에는 슬라이스가 적어서 끈다 (phase 03 "위험과 열린 질문").
      'fsd/insignificant-slice': 'off',
      // 슬라이스 안에서는 상대 경로, 밖으로는 별칭을 쓴다 (CLAUDE.md "Public API"). recommended에서 기본으로 꺼져 있어 켠다.
      'fsd/import-locality': 'error',
    },
  },
])
