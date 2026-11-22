/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** BE API 기본 주소. 비우면 같은 도메인의 /api 로 요청한다 (개발 중엔 Vite proxy 사용). */
  readonly VITE_API_BASE_URL?: string
  /** 'true'면 개발 서버에서 MSW 목 API를 켠다 (src/app/mocks). 배포 빌드에서는 무시된다. */
  readonly VITE_API_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
