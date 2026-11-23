/** 키 입력을 넘길 방향으로. 넘기는 키가 아니면 null */
export function keyToDirection(event: Pick<KeyboardEvent, 'key' | 'shiftKey'>): 1 | -1 | null {
  switch (event.key) {
    case 'ArrowRight':
    case 'PageDown':
      return 1
    case 'ArrowLeft':
    case 'PageUp':
      return -1
    case ' ':
      return event.shiftKey ? -1 : 1
    default:
      return null
  }
}

/**
 * 이 키를 리더가 가로채면 안 되는지.
 * - 글을 입력하는 중(입력창, 편집 영역)이면 모든 키를 양보한다.
 * - 버튼·링크에 포커스가 있을 때의 Space는 그 요소를 누르는 동작이라 양보한다.
 *   화살표·PageUp/PageDown은 버튼을 누른 뒤에도 계속 넘길 수 있게 가로챈다.
 */
export function shouldIgnoreKey(event: Pick<KeyboardEvent, 'key' | 'target'>): boolean {
  const target = event.target
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
    return true
  }
  return event.key === ' ' && ['BUTTON', 'A', 'SUMMARY'].includes(target.tagName)
}
