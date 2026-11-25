import { useSyncExternalStore } from 'react'

// 웹 글꼴 받기가 끝난 횟수. 글꼴 조각(unicode-range)을 새로 받아 글자 폭이 바뀔 수 있을 때마다 늘어난다.
// 받기 시작할 때('loading')는 바꾸지 않는다. 시작할 때도 바꾸면 받는 동안 그 값으로 잰 계산이
// 두 번(시작, 끝) 무효가 되어, 쪽을 넘기는 도중 화면이 튄다.
let version = 0
const listeners = new Set<() => void>()

function onFontsDone() {
  version += 1
  for (const listener of listeners) listener()
}

function subscribe(onChange: () => void) {
  // 구독하는 곳이 여럿이어도 횟수는 한 번만 센다.
  if (listeners.size === 0) {
    document.fonts.addEventListener('loadingdone', onFontsDone)
    document.fonts.addEventListener('loadingerror', onFontsDone)
  }
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
    if (listeners.size === 0) {
      document.fonts.removeEventListener('loadingdone', onFontsDone)
      document.fonts.removeEventListener('loadingerror', onFontsDone)
    }
  }
}

/**
 * 웹 글꼴 받기가 끝날 때마다 바뀌는 숫자를 구독한다.
 * 글꼴이 바뀌면 글자 폭이 달라지므로, 다시 재야 하는 계산의 키에 넣는다.
 */
export function useFontsVersion() {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  )
}
