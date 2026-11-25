import type { Chapter } from '@/entities/book'

import { columnTrackStyle, type PageGeometry } from '../lib/geometry'
import { usePagination } from '../model/use-pagination'
import { ChapterBody } from './ChapterBody'

type NeighborViewProps = {
  chapter: Chapter
  geometry: PageGeometry
  fontsVersion: number
  /** 보여 줄 화면: 다음 챕터는 첫 화면, 이전 챕터는 마지막 화면 */
  edge: 'first' | 'last'
  /** 미끄러지는 틀 안에서의 가로 위치(px) */
  left: number
}

/**
 * 챕터 경계에서 지금 띠 옆에 미리 그려 두는 이웃 챕터의 한 화면.
 * 넘기거나 끌면 틀과 함께 움직여서, 챕터를 넘는 것이 쪽 넘김처럼 한 번에 이어진다.
 * 마지막 화면은 지금 챕터와 같은 방법(`usePagination`)으로 쪽 수를 재서 찾는다.
 * 그래야 챕터를 바꾼 뒤 그려지는 화면과 같다.
 */
export function NeighborView({ chapter, geometry, fontsVersion, edge, left }: NeighborViewProps) {
  const { measureRef, layout } = usePagination(chapter, geometry, fontsVersion)
  const lastView = layout ? Math.ceil(layout.pageCount / geometry.pagesPerView) - 1 : 0
  const inner = edge === 'last' ? lastView * geometry.pagesPerView * geometry.pageStride : 0

  return (
    <div
      aria-hidden
      inert
      className="absolute top-0 overflow-clip"
      style={{ left, width: geometry.viewportWidth, height: geometry.pageHeight }}
      data-neighbor-chapter={chapter.chapter_no}
    >
      <div
        ref={measureRef}
        className={edge === 'last' && !layout ? 'invisible' : undefined}
        style={{ ...columnTrackStyle(geometry), transform: `translateX(${-inner}px)` }}
      >
        <h2 className="mb-8 font-display text-2xl leading-snug">{chapter.title}</h2>
        <ChapterBody chapter={chapter} />
      </div>
    </div>
  )
}
