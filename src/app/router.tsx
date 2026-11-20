import { createBrowserRouter } from 'react-router'

import { RootLayout } from '@/app/RootLayout'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'

// Data mode 라우터. 나중에 SSR/prerender가 필요해지면
// React Router framework mode로 옮길 수 있도록 라우트 단위로 페이지를 나눠 둔다.
export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteErrorPage,
    children: [
      { index: true, Component: HomePage },
      { path: '*', Component: NotFoundPage },
    ],
  },
])
