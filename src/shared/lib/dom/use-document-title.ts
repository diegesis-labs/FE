import { useEffect } from 'react'

const APP_NAME = 'Diegesis'

/**
 * 문서 제목을 `제목 · Diegesis`로 정한다. 제목이 없으면(데이터를 받기 전) `Diegesis`.
 * 화면을 떠날 때 되돌리지 않는다. 모든 화면이 제목을 정하므로 다음 화면이 덮는다 (Phase 20).
 */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
