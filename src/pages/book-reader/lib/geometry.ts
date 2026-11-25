/** 한 쪽 글줄의 최대 너비 (design-system 2.2 "긴 글은 최대 660px") */
export const MAX_PAGE_WIDTH = 660
/** 두 쪽 모드의 가운데 여백(제본선 자리) */
const SPREAD_GAP = 80
/** 리더 본문 줄 높이 (16px × 1.8). 쪽 높이를 줄 높이의 배수로 맞춰 쪽 아래에 반쯤 남는 공간을 줄인다 */
const LINE_HEIGHT = 28.8

export type PageGeometry = {
  /** 쪽 하나의 너비(px). 0이면 아직 무대 크기를 모름 */
  pageWidth: number
  pageHeight: number
  /** 단(쪽) 사이 간격. 두 쪽 모드에서는 가운데 여백 */
  gap: number
  /** 한 쪽에서 다음 쪽까지의 거리 = 쪽 너비 + 간격 */
  pageStride: number
  /** 한 화면에 보이는 쪽 수 (한 쪽 1, 두 쪽 2) */
  pagesPerView: number
  /** 화면에 보이는 영역의 너비 */
  viewportWidth: number
}

/** 무대(상단·하단 막대 사이 영역) 크기와 두 쪽 여부로 쪽 크기를 정한다 */
export function pageGeometry(
  stageWidth: number,
  stageHeight: number,
  spread: boolean,
): PageGeometry {
  const desktop = stageWidth >= 768
  const padX = desktop ? 40 : 16
  const padY = desktop ? 40 : 24
  const gap = spread ? SPREAD_GAP : padX * 2
  const available = Math.max(0, stageWidth - padX * 2)
  const pageWidth = Math.floor(
    spread ? Math.min(MAX_PAGE_WIDTH, (available - gap) / 2) : Math.min(MAX_PAGE_WIDTH, available),
  )
  const rawHeight = Math.max(0, stageHeight - padY * 2)
  const pageHeight = Math.floor(Math.floor(rawHeight / LINE_HEIGHT) * LINE_HEIGHT)
  const pagesPerView = spread ? 2 : 1

  return {
    pageWidth: Math.max(0, pageWidth),
    pageHeight,
    gap,
    pageStride: pageWidth + gap,
    pagesPerView,
    viewportWidth: spread ? pageWidth * 2 + gap : pageWidth,
  }
}

/** 본문 띠(CSS 다단)의 크기와 단 설정. 쪽 너비만큼씩 단이 오른쪽으로 이어진다 */
export function columnTrackStyle(geometry: PageGeometry) {
  return {
    width: geometry.pageWidth,
    height: geometry.pageHeight,
    columnWidth: geometry.pageWidth,
    columnGap: geometry.gap,
    columnFill: 'auto',
  } as const
}
