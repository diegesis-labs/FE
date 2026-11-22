import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  document.fonts.addEventListener('loadingdone', onChange)
  document.fonts.addEventListener('loadingerror', onChange)
  return () => {
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
