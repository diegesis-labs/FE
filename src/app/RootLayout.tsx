import { Link, Outlet } from 'react-router'

import { ThemeToggle } from '@/components/ThemeToggle'

export function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-300 items-center justify-between px-4 md:px-10">
          {/* 로고가 없으므로 서비스명을 제목 서체로 쓴 워드마크를 쓴다. */}
          <Link to="/" className="font-display text-xl no-underline">
            Diegesis
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-300 flex-1 px-4 py-15 md:px-10 md:py-24">
        <Outlet />
      </main>
    </div>
  )
}
