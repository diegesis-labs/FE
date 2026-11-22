import { createBrowserRouter } from 'react-router'

import { BookListPage } from '@/pages/book-list'
import { BookReaderPage } from '@/pages/book-reader'
import { NotFoundPage } from '@/pages/not-found'
import { RouteErrorPage } from '@/pages/route-error'

import { RootLayout } from '../layouts/RootLayout'

// Data mode 라우터. 나중에 SSR/prerender가 필요해지면
// React Router framework mode로 옮길 수 있도록 라우트 단위로 페이지를 나눠 둔다.
export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteErrorPage,
    children: [
      { index: true, Component: BookListPage },
      { path: 'books/:bookId', Component: BookReaderPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
])
