import { Link } from 'react-router'

import { LogoutButton } from '@/features/logout'
import { ThemeToggle } from '@/features/theme-toggle'

export function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-300 items-center justify-between px-4 md:px-10">
        {/* 로고가 없으므로 서비스명을 제목 서체로 쓴 워드마크를 쓴다. */}
        <Link to="/" className="font-display text-xl no-underline">
          Diegesis
        </Link>
        <div className="flex items-center gap-1">
          <LogoutButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
