import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'

import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
