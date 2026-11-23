import { useCallback, useRef, useState } from 'react'

import type { Chapter } from '@/entities/book'

import type { PageGeometry } from '../lib/geometry'
import { measurePages, type PageLayout } from '../lib/paginate'

/**
 * 본문 띠(CSS 다단)를 재서 쪽 표를 만든다.
 * 재는 시점은 Effect가 아니라 ref 콜백이다: 조건(key)이 바뀌면 콜백이 새로 만들어지고,
 * React가 커밋 직후(화면에 그리기 전) 새 콜백을 불러 준다.
 */
export function usePagination(
  chapter: Chapter | undefined,
  geometry: PageGeometry,
  fontsReady: boolean,
) {
  const [layout, setLayout] = useState<PageLayout | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  const ready = chapter !== undefined && geometry.pageWidth > 0 && geometry.pageHeight > 0
  const key = ready
    ? [
        chapter.book_id,
        chapter.chapter_no,
        geometry.pageWidth,
        geometry.pageHeight,
        geometry.gap,
        fontsReady,
      ].join(':')
    : null
  const { pageStride } = geometry

  const measureRef = useCallback(
    (element: HTMLDivElement | null) => {
      trackRef.current = element
      if (element && key) setLayout(measurePages(element, key, pageStride))
    },
    [key, pageStride],
  )

  return { measureRef, trackRef, layout: layout && layout.key === key ? layout : null }
}
