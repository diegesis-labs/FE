/** 이 거리(px)보다 적게 움직이고 놓으면 끌기가 아니라 탭으로 본다 */
export const DRAG_START_DISTANCE = 10
/** 보이는 영역 너비 대비 이만큼 넘게 끌면 넘긴다 */
const TURN_DISTANCE_RATIO = 0.2
/** 이 속도(px/ms)보다 빠르게 튕기면 거리가 짧아도 넘긴다 */
const TURN_VELOCITY = 0.5
/** 더 넘길 쪽이 없는 방향으로 끌 때 따라오는 비율 */
export const EDGE_RESISTANCE = 1 / 3

export type SwipeDecision = 'next' | 'prev' | 'stay'

/** 끌기를 놓았을 때 넘길지 정한다. 왼쪽으로 끌면(dx < 0) 다음 쪽 */
export function decideSwipe(dx: number, velocity: number, viewportWidth: number): SwipeDecision {
  if (dx === 0) return 'stay'
  const far = Math.abs(dx) > viewportWidth * TURN_DISTANCE_RATIO
  const fast = Math.abs(velocity) > TURN_VELOCITY && Math.sign(velocity) === Math.sign(dx)
  if (!far && !fast) return 'stay'
  return dx < 0 ? 'next' : 'prev'
}

/** 화면 탭 위치로 넘길 방향을 정한다. 왼쪽 1/3은 이전, 오른쪽 1/3은 다음, 가운데는 아무것도 하지 않음 */
export function decideTap(x: number, width: number): SwipeDecision {
  if (x < width / 3) return 'prev'
  if (x > (width * 2) / 3) return 'next'
  return 'stay'
}
