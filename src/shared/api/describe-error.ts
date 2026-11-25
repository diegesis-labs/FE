import { ApiError } from './client'

export type ErrorDescription = {
  title: string
  description?: string
  /** 다시 시도하면 나아질 수 있는 에러인지 */
  retryable: boolean
}

/** 403은 `code`로 나눈다 (BE docs/API.md 2.2절, 2.4절). 401과 403 `NOT_ALLOWED`는 보통 로그인 화면으로 먼저 이동한다. */
function describeForbidden(error: ApiError): ErrorDescription {
  switch (error.code) {
    case 'NOT_ALLOWED':
      return {
        title: '테스트 참가자만 쓸 수 있습니다',
        description: '참가 신청한 Google 계정으로 로그인했는지 확인해 주세요.',
        retryable: false,
      }
    case 'ADMIN_ONLY':
      return { title: '관리자만 쓸 수 있습니다', retryable: false }
    case 'ORIGIN_MISMATCH':
      // 같은 출처에서 부르면 생기지 않는다. FE에서 받았다면 결함이다.
      return {
        title: '요청이 거절되었습니다',
        description: '문제가 계속되면 알려 주세요.',
        retryable: false,
      }
    default:
      return { title: '접근할 수 없습니다', description: error.message, retryable: false }
  }
}

/** 쿼리 에러를 화면에 보여 줄 문구로 바꾼다. BE 에러 형식은 BE docs/API.md 2.3절 */
export function describeError(error: unknown): ErrorDescription {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        title: '로그인이 필요합니다',
        description: '로그인한 뒤 다시 시도해 주세요.',
        retryable: false,
      }
    }
    if (error.status === 403) return describeForbidden(error)
    if (error.status === 404) {
      return { title: '찾을 수 없습니다', description: error.message, retryable: false }
    }
    return { title: '불러오지 못했습니다', description: error.message, retryable: true }
  }
  // fetch 자체가 실패하면(서버가 꺼져 있거나 네트워크가 끊김) TypeError가 난다.
  return {
    title: '서버에 연결하지 못했습니다',
    description: '잠시 뒤 다시 시도해 주세요.',
    retryable: true,
  }
}
