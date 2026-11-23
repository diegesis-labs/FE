import { useEffect, useEffectEvent } from 'react'

/**
 * 창 전체의 keydown을 듣는다. `enabled`가 false면 듣지 않는다.
 * handler는 매 렌더의 최신 값이 쓰이므로 useCallback으로 감쌀 필요가 없다.
 */
export function useWindowKeydown(handler: (event: KeyboardEvent) => void, enabled = true) {
  const onKeydown = useEffectEvent(handler)

  useEffect(() => {
    if (!enabled) return
    const listener = (event: KeyboardEvent) => onKeydown(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [enabled])
}
