import { useCallback, useState } from 'react'

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
  fontsVersion: number,
) {
  const [layout, setLayout] = useState<PageLayout | null>(null)

  const ready = chapter !== undefined && geometry.pageWidth > 0 && geometry.pageHeight > 0
  // 챕터와 쪽 크기. 이것이 바뀌면 옛 쪽 표는 쓸 수 없다.
  const shapeKey = ready
    ? [
        chapter.book_id,
        chapter.chapter_no,
        geometry.pageWidth,
        geometry.pageHeight,
        geometry.gap,
      ].join(':')
    : null
  // 글꼴 조각을 새로 받으면 글자 폭이 바뀔 수 있어 다시 잰다.
  const key = shapeKey === null ? null : `${shapeKey}|${fontsVersion}`
  const { pageStride } = geometry

  const measureRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (element && key) setLayout(measurePages(element, key, pageStride))
    },
    [key, pageStride],
  )

  // 글꼴만 바뀌었으면 다시 잴 때까지(같은 커밋 안) 옛 쪽 표를 그대로 쓴다. 비워 두면 그 사이
  // 띠가 숨겨지고 첫 쪽 위치로 갔다가 돌아와서, 넘기는 중인 미끄러짐이 처음부터 다시 시작된다.
  const usable = layout !== null && shapeKey !== null && layout.key.split('|')[0] === shapeKey
  return { measureRef, layout: usable ? layout : null }
}
