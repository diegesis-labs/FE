import { useCallback, useState, useSyncExternalStore } from 'react'

export type ElementSize = { width: number; height: number }

const ZERO = '0x0'

/**
 * 요소의 안쪽 크기(clientWidth·clientHeight)를 구독한다. 크기가 바뀌면 다시 렌더한다.
 * 돌려준 `ref`를 요소의 ref에 넣는다.
 */
export function useElementSize<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!element) return () => {}
      const observer = new ResizeObserver(onChange)
      observer.observe(element)
      return () => observer.disconnect()
    },
    [element],
  )
  // 스냅샷은 비교가 쉬운 문자열로 돌려준다 (객체면 매번 달라져서 무한 렌더가 난다).
  const getSnapshot = useCallback(
    () => (element ? `${element.clientWidth}x${element.clientHeight}` : ZERO),
    [element],
  )
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => ZERO)
  const [width = 0, height = 0] = snapshot.split('x').map(Number)

  const size: ElementSize = { width, height }
  return { ref: setElement, ...size }
}
