import { useSyncExternalStore } from 'react'

// 'loading'도 듣는다. 새 글자가 나와 글꼴 조각(unicode-range)을 더 받기 시작하면 false로 바뀌고,
// 다 받으면 true로 돌아와서 그 사이 바뀐 글자 폭으로 다시 잴 수 있다.
function subscribe(onChange: () => void) {
  document.fonts.addEventListener('loading', onChange)
  document.fonts.addEventListener('loadingdone', onChange)
  document.fonts.addEventListener('loadingerror', onChange)
  return () => {
    document.fonts.removeEventListener('loading', onChange)
    document.fonts.removeEventListener('loadingdone', onChange)
    document.fonts.removeEventListener('loadingerror', onChange)
  }
}

/** 웹 글꼴을 다 받았는지 구독한다. 글꼴이 바뀌면 글자 폭이 달라지므로 다시 재야 하는 계산에 쓴다. */
export function useFontsReady() {
  return useSyncExternalStore(
    subscribe,
    () => document.fonts.status === 'loaded',
    () => false,
  )
}
