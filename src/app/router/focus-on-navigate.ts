import type { DataRouter } from 'react-router'

/** 새 화면의 `h1`을 이 시간 동안 지켜본다. 리더의 제목은 책을 받은 뒤에 생긴다. */
const WAIT_MS = 5000

/** 포커스가 갈 곳이 없어졌는지. 누른 링크가 사라지면 포커스는 `<body>`로 떨어진다. */
function focusIsLost() {
  const active = document.activeElement
  return active === null || active === document.body
}

/**
 * 경로가 바뀌면 새 화면의 `h1`로 포커스를 옮긴다. 낭독기는 제목을 읽고, 키보드는 화면 처음부터 시작한다 (Phase 20).
 * 첫 화면 열기와 `?chapter&s`만 바뀌는 쪽 넘김에서는 옮기지 않는다.
 */
export function focusOnNavigate(router: DataRouter) {
  // 첫 화면은 loader가 끝나야 정해진다(로그인 화면으로 보내기 등). 그때의 경로를 기준으로 삼는다.
  let lastPath = router.state.initialized ? router.state.location.pathname : null
  let stopWatching: (() => void) | undefined

  router.subscribe((state) => {
    if (!state.initialized || state.navigation.state !== 'idle') return
    const { pathname } = state.location
    if (lastPath === null) lastPath = pathname
    if (pathname === lastPath) return
    lastPath = pathname

    stopWatching?.()
    // 구독은 React가 새 화면을 그리기 전에 불린다. 지금 있는 `h1`은 떠나는 화면의 것이다.
    const previous = document.querySelector('h1')
    let focused: HTMLElement | null = null

    const stop = () => {
      observer.disconnect()
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      stopWatching = undefined
    }
    // 새 `h1`이 생기면 포커스한다. 포커스한 `h1`이 사라지면(그린 화면이 곧 라우트 에러 화면으로 바뀜 등) 다음 `h1`으로.
    const tryFocus = () => {
      if (focused?.isConnected) return
      const heading = document.querySelector('h1')
      if (!heading || heading === previous) return
      // 사용자가 이미 다른 곳으로 옮겼으면 건드리지 않고 그만 본다.
      if (!focusIsLost()) return stop()
      heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: true })
      focused = heading
    }

    const observer = new MutationObserver(tryFocus)
    const timer = setTimeout(stop, WAIT_MS)
    const frame = requestAnimationFrame(() => {
      tryFocus()
      observer.observe(document.body, { childList: true, subtree: true })
    })
    stopWatching = stop
  })
}
