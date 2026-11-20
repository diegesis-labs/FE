import { queryOptions } from '@tanstack/react-query'

import { apiClient } from '@/shared/api'

// BE 연결 확인용 예시. BE에 헬스체크 엔드포인트가 정해지면 경로를 맞춘다.
export const healthQuery = queryOptions({
  queryKey: ['health'],
  queryFn: () => apiClient.get<{ status: string }>('/health'),
  enabled: false,
})
