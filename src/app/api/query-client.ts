import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'

import { redirectOnAuthError } from '../router/auth-redirect'

declare module '@tanstack/react-query' {
  interface Register {
    // false면 401·403을 받아도 로그인 화면으로 보내지 않는다. 로그인 확인처럼 부른 쪽이 직접 처리할 때 쓴다.
    queryMeta: { authRedirect?: boolean }
    mutationMeta: { authRedirect?: boolean }
  }
}

const RETRYABLE_4XX = [408, 429]

function isFinalClientError(error: unknown) {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    !RETRYABLE_4XX.includes(error.status)
  )
}

export const queryClient = new QueryClient({
  // 쓰는 도중에 로그인 상태가 끝나거나 허용 목록에서 빠지면 로그인 화면으로 보낸다 (BE docs/API.md 2.2절).
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.authRedirect !== false) redirectOnAuthError(error)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.authRedirect !== false) redirectOnAuthError(error)
    },
  }),
  defaultOptions: {
    queries: {
      // 같은 데이터를 짧은 시간 안에 다시 요청하지 않도록 30초간 신선한 것으로 본다.
      staleTime: 30_000,
      // 4xx(로그인 필요, 없음 등)는 다시 요청해도 같으므로 바로 보여 준다.
      // 서버 에러, 네트워크 에러, 408(시간 초과)·429(요청 과다)만 한 번 더 시도한다.
      retry: (failureCount, error) => failureCount < 1 && !isFinalClientError(error),
      refetchOnWindowFocus: false,
    },
  },
})
