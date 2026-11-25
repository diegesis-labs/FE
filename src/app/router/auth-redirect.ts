import { ApiError } from '@/shared/api'

export const LOGIN_PATH = '/login'

/**
 * 401과 403 `NOT_ALLOWED`를 받았을 때 보낼 주소 (BE docs/API.md 2.2절의 표). 보내지 않을 에러면 null.
 * 들어가기 전의 확인(router의 loader)과 쓰는 도중의 에러(query-client)가 이 함수 하나를 쓴다.
 */
export function authRedirectPath(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null
  if (error.status === 401) return LOGIN_PATH
  if (error.status === 403 && error.code === 'NOT_ALLOWED') return `${LOGIN_PATH}?error=NOT_ALLOWED`
  return null
}

// router와 query-client가 서로를 import 하지 않도록, 이동하는 방법은 router가 만들어질 때 여기에 넣는다.
let navigateOnAuthError: ((to: string) => void) | undefined

export function setAuthNavigator(navigate: (to: string) => void) {
  navigateOnAuthError = navigate
}

/** 쓰는 도중에 받은 에러가 401·403 `NOT_ALLOWED`면 로그인 화면으로 보낸다. */
export function redirectOnAuthError(error: unknown) {
  const to = authRedirectPath(error)
  if (to) navigateOnAuthError?.(to)
}
