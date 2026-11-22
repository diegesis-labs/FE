import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { type BookDetail, chapterQuery } from '@/entities/book'
import { useElementSize, useFontsReady, useMediaQuery } from '@/shared/lib/dom'

import { pageGeometry } from '../lib/geometry'
import { pageForAnchor, visibleRange } from '../lib/paginate'
import { positionParams, resolvePosition } from '../lib/resolve-position'
import { usePagination } from './use-pagination'

/** 두 쪽 펼침: 가로 화면이고 폭 1024px 이상 */
const SPREAD_QUERY = '(min-width: 1024px) and (orientation: landscape)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export type Direction = 1 | -1
type Destination = { chapterNo: number; anchor: number }
/** 챕터 경계를 넘을 때의 슬라이드: 밀려 나가는 중(leaving) → 챕터를 바꾸고 들어오는 중(entering) */
export type ChapterTransition =
  | { phase: 'leaving'; dir: Direction; destination: Destination }
  | { phase: 'entering'; dir: Direction }
  | null

/** 사용자가 넘긴 쪽. 같은 표·같은 기준 문장인 동안만 쓰고, 그 밖에는 기준 문장으로 쪽을 다시 찾는다 */
type TurnedPage = { layoutKey: string; anchor: number; page: number }

/** 리더의 상태와 동작. 위치는 URL(`?chapter&s`)이 기준이다 */
export function useReader(book: BookDetail) {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const spread = useMediaQuery(SPREAD_QUERY)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  const fontsReady = useFontsReady()
  const stage = useElementSize<HTMLDivElement>()
  const geometry = pageGeometry(stage.width, stage.height, spread)

  const position = resolvePosition(book, searchParams)
  const chapter = useQuery({
    ...chapterQuery(book.id, position?.chapterNo ?? 0),
    enabled: position !== null,
  })
  const { measureRef, trackRef, layout } = usePagination(chapter.data, geometry, fontsReady)

  const [turned, setTurned] = useState<TurnedPage | null>(null)
  const [transition, setTransition] = useState<ChapterTransition>(null)

  const perView = geometry.pagesPerView
  let page = 0
  if (layout && position) {
    page =
      turned && turned.layoutKey === layout.key && turned.anchor === position.anchor
        ? turned.page
        : pageForAnchor(layout, position.anchor, position.atEnd)
  }
  const view = Math.floor(page / perView)
  const firstPage = view * perView
  const viewCount = layout ? Math.ceil(layout.pageCount / perView) : 0
  const range = layout ? visibleRange(layout, firstPage, perView) : null

  const index = book.chapters.findIndex((c) => c.chapter_no === position?.chapterNo)
  const prevChapter = index > 0 ? book.chapters[index - 1] : undefined
  const nextChapter = index >= 0 ? book.chapters[index + 1] : undefined
  const canPrev = layout !== null && (view > 0 || prevChapter !== undefined)
  const canNext = layout !== null && (view < viewCount - 1 || nextChapter !== undefined)
  const atBookEnd = layout !== null && view === viewCount - 1 && nextChapter === undefined

  // 띠를 옮길 거리. 챕터 경계에서 밀려 나갈 때는 한 화면 더 간다(빈 쪽이 보임).
  const viewStride = perView * geometry.pageStride
  const shownView = transition?.phase === 'leaving' ? view + transition.dir : view
  const offset = shownView * viewStride
  // 미끄러짐은 사용자가 넘길 때만 쓴다. 화면 크기·모드가 바뀌거나 뒤로 가기로 위치가 바뀌면
  // 새 위치로 바로 옮긴다 (그러지 않으면 챕터 처음부터 끝까지 띠가 미끄러져 지나간다).
  const animate =
    transition?.phase === 'leaving' ||
    (layout !== null && turned?.layoutKey === layout.key && turned.anchor === position?.anchor)

  const prefetchChapter = (chapterNo: number) =>
    void queryClient.prefetchQuery(chapterQuery(book.id, chapterNo))

  const enterChapter = (destination: Destination, dir: Direction | null) => {
    setSearchParams(positionParams(destination.chapterNo, destination.anchor))
    setTurned(null)
    setTransition(dir && !reducedMotion ? { phase: 'entering', dir } : null)
  }

  /** 한 화면(한 쪽 또는 두 쪽) 넘긴다. 챕터 끝이면 이웃 챕터로 */
  const turn = (dir: Direction) => {
    if (!layout || !position || transition?.phase === 'leaving') return

    const target = view + dir
    if (target >= 0 && target < viewCount) {
      const targetPage = target * perView
      const anchor = layout.ranges[targetPage]?.first ?? position.anchor
      setTurned({ layoutKey: layout.key, anchor, page: targetPage })
      setTransition(null)
      setSearchParams(positionParams(position.chapterNo, anchor), { replace: true })
      if (nextChapter && target >= viewCount - 2) prefetchChapter(nextChapter.chapter_no)
      if (prevChapter && target <= 1) prefetchChapter(prevChapter.chapter_no)
      return
    }

    const neighbor = dir > 0 ? nextChapter : prevChapter
    if (!neighbor) return
    const destination = {
      chapterNo: neighbor.chapter_no,
      // 이전 챕터로 갈 때는 마지막 문장을 기준으로 삼아 마지막 쪽이 보이게 한다.
      anchor: dir > 0 ? neighbor.first_sentence : neighbor.last_sentence,
    }
    prefetchChapter(neighbor.chapter_no)
    if (reducedMotion) enterChapter(destination, null)
    else setTransition({ phase: 'leaving', dir, destination })
  }

  /** 띠의 슬라이드가 끝났을 때. 밀려 나가는 중이었다면 이제 챕터를 바꾼다 */
  const onSlideEnd = () => {
    if (transition?.phase === 'leaving') enterChapter(transition.destination, transition.dir)
  }

  /** 목차에서 챕터로 바로 간다 (첫 쪽) */
  const goToChapter = (chapterNo: number) => {
    const meta = book.chapters.find((c) => c.chapter_no === chapterNo)
    if (meta) enterChapter({ chapterNo, anchor: meta.first_sentence }, null)
  }

  return {
    book,
    position,
    chapter,
    stageRef: stage.ref,
    geometry,
    spread,
    measureRef,
    trackRef,
    layout,
    page: firstPage,
    view,
    viewCount,
    range,
    offset,
    animate,
    transition,
    canPrev,
    canNext,
    atBookEnd,
    turn,
    onSlideEnd,
    goToChapter,
  }
}

export type Reader = ReturnType<typeof useReader>
