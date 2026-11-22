import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App, enableMocking } from '@/app'

// 목 API가 켜져 있으면 워커가 준비된 뒤 렌더해서 첫 요청부터 목이 받게 한다.
// 워커를 켜지 못해도(서비스 워커를 못 쓰는 환경 등) 빈 화면이 되지 않게 렌더는 한다.
void enableMocking()
  .catch((error: unknown) => console.error('목 API를 켜지 못했습니다.', error))
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
