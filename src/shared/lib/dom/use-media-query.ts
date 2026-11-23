import { useCallback, useSyncExternalStore } from 'react'

/** CSS 미디어 쿼리가 맞는지 구독한다. 화면을 돌리거나 창 크기를 바꾸면 다시 렌더한다. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query],
  )
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
