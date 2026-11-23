/** 쪽 하나에 조금이라도 걸친 첫 문장과 마지막 문장 번호 */
export type PageRange = { first: number; last: number }

export type PageLayout = {
  /** 이 표를 만든 조건(챕터, 쪽 크기, 글꼴 로딩). 조건이 바뀌면 표를 다시 만든다 */
  key: string
  pageCount: number
  ranges: PageRange[]
  /** 문장 번호 → 그 문장이 시작하는 쪽 */
  startPage: Map<number, number>
}

/** 문장 조각 하나의 위치. 한 문장이 여러 줄·여러 쪽에 걸치면 조각이 여러 개다 */
export type SentenceRect = { idx: number; left: number }

/**
 * 문장 조각들의 가로 위치(본문 띠 왼쪽 끝 기준)로 쪽 표를 만든다.
 * CSS 다단에서 쪽 n은 가로 `n × pageStride`부터 시작한다.
 * rects는 문서 순서여야 한다 (문장의 첫 조각이 시작 쪽).
 */
export function buildPageLayout(
  key: string,
  rects: SentenceRect[],
  pageStride: number,
): PageLayout {
  const ranges: PageRange[] = []
  const startPage = new Map<number, number>()

  for (const { idx, left } of rects) {
    // 반올림 오차로 쪽 경계에 걸리지 않게 1px 여유를 둔다.
    const page = Math.max(0, Math.floor((left + 1) / pageStride))
    if (!startPage.has(idx)) startPage.set(idx, page)
    const range = ranges[page]
    if (range) {
      range.first = Math.min(range.first, idx)
      range.last = Math.max(range.last, idx)
    } else {
      ranges[page] = { first: idx, last: idx }
    }
  }

  // 문장이 하나도 없는 쪽(예: 아주 긴 제목만 있는 쪽)은 앞 쪽의 마지막 문장으로 채운다.
  const pageCount = Math.max(1, ranges.length)
  for (let page = 0; page < pageCount; page++) {
    if (!ranges[page]) {
      const previous = ranges[page - 1]?.last ?? 0
      ranges[page] = { first: previous, last: previous }
    }
  }

  return { key, pageCount, ranges, startPage }
}

/**
 * 기준 문장(화면의 첫 문장)을 보여 줄 쪽. `atEnd`면 마지막 쪽.
 * 1. 첫 문장이 기준 문장인 가장 앞 쪽. 앞 쪽에서 이어지는 문장이 첫 문장인 쪽도 여기서 찾는다
 *    (문장이 시작하는 쪽으로 가면 넘겨 보던 쪽보다 한 쪽 앞이 열린다).
 * 2. 없으면 그 문장이 시작하는 쪽 (크기가 바뀌어 문장이 쪽 중간에서 시작하게 된 경우).
 * 3. 표에 없는 번호면 그보다 앞에서 가장 가까운 문장의 쪽, 그것도 없으면 첫 쪽.
 */
export function pageForAnchor(layout: PageLayout, anchor: number, atEnd: boolean): number {
  if (atEnd) return layout.pageCount - 1
  const leading = layout.ranges.findIndex((range) => range.first === anchor)
  if (leading !== -1) return leading
  const exact = layout.startPage.get(anchor)
  if (exact !== undefined) return exact
  let best = 0
  for (const [idx, page] of layout.startPage) {
    if (idx <= anchor) best = Math.max(best, page)
  }
  return best
}

/** 화면에 보이는 쪽들(firstPage부터 pagesPerView개)의 문장 범위 */
export function visibleRange(
  layout: PageLayout,
  firstPage: number,
  pagesPerView: number,
): PageRange {
  const lastPage = Math.min(firstPage + pagesPerView - 1, layout.pageCount - 1)
  return {
    first: layout.ranges[firstPage]?.first ?? 0,
    last: layout.ranges[lastPage]?.last ?? 0,
  }
}

/** 본문 띠 안의 문장 span들을 재서 쪽 표를 만든다 (DOM을 읽음) */
export function measurePages(track: HTMLElement, key: string, pageStride: number): PageLayout {
  const origin = track.getBoundingClientRect().left
  const rects: SentenceRect[] = []
  for (const span of track.querySelectorAll<HTMLElement>('[data-sentence-idx]')) {
    const idx = Number(span.dataset.sentenceIdx)
    for (const rect of span.getClientRects()) {
      if (rect.width > 0) rects.push({ idx, left: rect.left - origin })
    }
  }
  return buildPageLayout(key, rects, pageStride)
}
