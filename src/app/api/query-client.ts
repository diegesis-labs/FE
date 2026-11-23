import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/shared/api'

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
