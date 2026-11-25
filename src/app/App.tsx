import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'

import { ThemeProvider } from '@/shared/lib/theme'

import { queryClient } from './api/query-client'
import { getRouter } from './router/router'
import './styles/index.css'

export function App() {
  const router = getRouter()
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
