import { ApiError } from './client'

export type ErrorDescription = {
  title: string
  description?: string
  /** 다시 시도하면 나아질 수 있는 에러인지 */
  retryable: boolean
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
    if (error.status === 403) {
      return { title: '접근할 수 없습니다', description: error.message, retryable: false }
    }
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
