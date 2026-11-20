import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 같은 데이터를 짧은 시간 안에 다시 요청하지 않도록 30초간 신선한 것으로 본다.
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
