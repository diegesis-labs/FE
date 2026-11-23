import { Outlet, ScrollRestoration } from 'react-router'

import { Header } from '@/widgets/header'

export function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-300 flex-1 px-4 py-15 md:px-10 md:py-24">
        <Outlet />
      </main>
      {/* 새 화면(챕터 이동 포함)으로 가면 맨 위로, 뒤로 가기면 원래 위치로 스크롤한다. */}
      <ScrollRestoration />
    </div>
  )
}
