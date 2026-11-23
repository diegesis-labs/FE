import { useRef, type PointerEvent } from 'react'

import { DRAG_START_DISTANCE, EDGE_RESISTANCE, decideSwipe, decideTap } from '../lib/swipe'

type Gesture = {
  pointerId: number
  startX: number
  startY: number
  dragging: boolean
  /** 속도 계산용: 직전 두 이벤트의 위치와 시각 */
  prevX: number
  prevTime: number
  lastX: number
  lastTime: number
}

type SwipeOptions = {
  /** 끄는 동안 옮길 본문 띠 */
  trackRef: React.RefObject<HTMLDivElement | null>
  viewportWidth: number
  canPrev: boolean
  canNext: boolean
  onTurn: (dir: 1 | -1) => void
}

const setDrag = (track: HTMLDivElement | null, dx: number, dragging: boolean) => {
  if (!track) return
  // React가 관리하지 않는 값만 바꾼다: CSS 변수, 인라인 transition, data 속성.
  // 기본 위치(transform)와 클래스는 React가 그린다.
  const offset = parseFloat(track.style.getPropertyValue('--drag-dx') || '0')
  track.style.setProperty('--drag-dx', `${dx}px`)
  if (dragging) {
    track.style.transition = 'none'
    delete track.dataset.settling
  } else {
    // 놓은 뒤에는 제자리 또는 새 쪽으로 미끄러져 간다 (transitionend에서 settling을 지운다).
    // 끌린 자리가 제자리면 미끄러짐이 없어 transitionend도 오지 않으므로 표시하지 않는다.
    track.style.removeProperty('transition')
    if (offset !== 0) track.dataset.settling = 'true'
  }
}

/**
 * 무대에서 끌어 넘기기와 탭 넘기기. Pointer 이벤트라 터치·마우스·펜이 같은 코드로 동작한다.
 * 끄는 동안에는 띠의 `--drag-dx`만 바꿔서 매 움직임마다 다시 렌더하지 않는다.
 */
export function useSwipe({ trackRef, viewportWidth, canPrev, canNext, onTurn }: SwipeOptions) {
  const gesture = useRef<Gesture | null>(null)

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    // 두 번째 손가락(확대 등)은 무시한다. 첫 손가락의 끌기를 덮어쓰면 띠가 끌린 자리에 남는다.
    if (!event.isPrimary) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      prevX: event.clientX,
      prevTime: event.timeStamp,
      lastX: event.clientX,
      lastTime: event.timeStamp,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId) return
    const dx = event.clientX - g.startX
    const dy = event.clientY - g.startY

    if (!g.dragging) {
      if (Math.abs(dx) < DRAG_START_DISTANCE || Math.abs(dx) < Math.abs(dy)) return
      g.dragging = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    // 더 넘길 쪽이 없는 방향이면 덜 따라오게 해서 끝이라는 것을 보여 준다.
    const blocked = (dx > 0 && !canPrev) || (dx < 0 && !canNext)
    setDrag(trackRef.current, blocked ? dx * EDGE_RESISTANCE : dx, true)
    g.prevX = g.lastX
    g.prevTime = g.lastTime
    g.lastX = event.clientX
    g.lastTime = event.timeStamp
  }

  const finish = (event: PointerEvent<HTMLElement>, cancelled: boolean) => {
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId) return
    gesture.current = null

    if (!g.dragging) {
      if (cancelled) return
      const rect = event.currentTarget.getBoundingClientRect()
      const tap = decideTap(event.clientX - rect.left, rect.width)
      if (tap === 'next' && canNext) onTurn(1)
      if (tap === 'prev' && canPrev) onTurn(-1)
      return
    }

    // 끌기를 풀면 띠가 기본 위치(넘겼다면 새 쪽)로 미끄러져 간다.
    setDrag(trackRef.current, 0, false)
    if (cancelled) return
    const dx = event.clientX - g.startX
    const elapsed = event.timeStamp - g.prevTime
    const velocity = elapsed > 0 ? (event.clientX - g.prevX) / elapsed : 0
    const decision = decideSwipe(dx, velocity, viewportWidth)
    if (decision === 'next' && canNext) onTurn(1)
    if (decision === 'prev' && canPrev) onTurn(-1)
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event, false),
    onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, true),
  }
}
