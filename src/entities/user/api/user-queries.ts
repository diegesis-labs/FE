import { queryOptions } from '@tanstack/react-query'

import { apiClient } from '@/shared/api'

import type { Me } from '../model/types'

export const userKeys = {
  me: ['me'] as const,
}

/** 로그인한 사람의 정보. 401이면 로그인 전, 403 `NOT_ALLOWED`면 허용 목록 밖이다 (BE docs/API.md 2.2절). */
export const meQuery = () =>
  queryOptions({
    queryKey: userKeys.me,
    queryFn: () => apiClient.get<Me>('/me'),
  })
