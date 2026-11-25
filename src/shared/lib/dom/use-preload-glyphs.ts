import { useEffect } from 'react'

/**
 * 주어진 글자가 쓰는 웹 글꼴 조각을 미리 받는다.
 * 조각(unicode-range)으로 나뉜 글꼴은 브라우저가 화면에 그리는 글자의 조각만 받는다. 그래서 처음 보는 글자가
 * 나올 때 그제서야 받고, 그동안 다른 글꼴로 그려졌다가 바뀐다. 보일 글자를 미리 알면 여기서 받아 둔다.
 *
 * @param fontVariable 글꼴 목록이 든 CSS 변수 이름 (예: `--font-sans`)
 * @param text 미리 받을 글자. 같은 글자가 여러 번 있어도 된다
 */
export function usePreloadGlyphs(fontVariable: string, text: string) {
  // 글자마다 한 번씩만 남겨서, 렌더마다 비교하는 값을 짧게 한다.
  const glyphs = [...new Set(text)].sort().join('')

  useEffect(() => {
    if (!glyphs) return
    const family = getComputedStyle(document.documentElement).getPropertyValue(fontVariable).trim()
    if (!family) return
    // 크기는 고르는 데만 쓰인다. 실패하면 무시한다 (그 글자가 보일 때 브라우저가 다시 받는다).
    document.fonts.load(`16px ${family}`, glyphs).catch(() => {})
  }, [fontVariable, glyphs])
}
