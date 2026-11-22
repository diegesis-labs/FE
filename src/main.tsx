import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App, enableMocking } from '@/app'

// 목 API가 켜져 있으면 워커가 준비된 뒤 렌더해서 첫 요청부터 목이 받게 한다.
void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
