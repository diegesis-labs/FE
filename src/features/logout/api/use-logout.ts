import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { apiClient } from '@/shared/api'

/**
 * 로그아웃하고 로그인 화면으로 간다. BE 로그아웃은 언제나 204이므로(BE docs/API.md 4.2절),
 * 요청이 실패해도(네트워크 등) 화면은 로그인으로 옮기고 캐시를 비운다.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => apiClient.post<string>('/auth/logout'),
    onSettled: async () => {
      // 화면을 먼저 옮긴 뒤 비운다. 먼저 비우면 아직 그려진 책 목록이 다시 요청할 수 있다.
      await navigate('/login', { replace: true })
      queryClient.clear()
    },
  })
}
