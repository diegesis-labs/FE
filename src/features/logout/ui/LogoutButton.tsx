import { Button } from '@/shared/ui/button'

import { useLogout } from '../api/use-logout'

export function LogoutButton() {
  const logout = useLogout()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        if (!logout.isPending) logout.mutate()
      }}
      // 요청 중에도 포커스를 남긴다 (Phase 20)
      aria-disabled={logout.isPending}
      aria-busy={logout.isPending}
    >
      로그아웃
    </Button>
  )
}
