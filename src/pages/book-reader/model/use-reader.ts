import { useQueries, useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
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
/** 지금 챕터 앞뒤로 미리 받아 둘 챕터 수 (2026-11-24 FE·BE 회의 E4: 2챕터 정도 미리 받기) */
const PRELOAD_CHAPTERS = 2

export type Direction = 1 | -1
type Destination = { chapterNo: number; anchor: number }
/**
 * 챕터 경계를 넘는 슬라이드. 띠가 한 화면 더 밀려 가면 그 자리에 미리 그려 둔 이웃 챕터 화면이 오고,
 * 슬라이드가 끝나면(transitionend) 챕터를 바꾼다. 새 챕터는 같은 자리에 그려지므로 따로 들어오는 움직임이 없다.
 * `at`은 이 슬라이드가 유효한 위치다. 그 사이 뒤로 가기 등으로 위치가 바뀌면 슬라이드는 없던 것으로 본다
 * (밀려 나가던 띠가 사라져 transitionend가 오지 않으면 leaving에 갇히기 때문).
 * 슬라이드가 끝난 뒤에도 URL이 실제로 바뀔 때까지 지우지 않는다. URL 변경은 다른 상태보다 늦게 반영될 수 있어서,
 * 먼저 지우면 바뀌기 직전 한두 프레임 동안 옛 챕터의 원래 화면이 다시 보인다.
 * `fromView`는 넘기기 시작한 화면 번호다. 그동안 지금 화면을 이 번호로 고정해서, 넘긴 쪽(`turned`)을 지워도
 * 틀과 이웃 화면이 움직이지 않는다.
 */
export type ChapterTransition = {
  phase: 'leaving'
  at: string
  dir: Direction
  destination: Destination
  fromView: number
} | null

const positionKey = (chapterNo: number, anchor: number) => `${chapterNo}:${anchor}`

/** 사용자가 넘긴 쪽. 같은 표·같은 기준 문장인 동안만 쓰고, 그 밖에는 기준 문장으로 쪽을 다시 찾는다 */
type TurnedPage = { layoutKey: string; anchor: number; page: number }

/** 리더의 상태와 동작. 위치는 URL(`?chapter&s`)이 기준이다 */
export function useReader(book: BookDetail) {
  const [searchParams, setSearchParams] = useSearchParams()
  const spread = useMediaQuery(SPREAD_QUERY)
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  const fontsReady = useFontsReady()
  const stage = useElementSize<HTMLDivElement>()
  const geometry = pageGeometry(stage.width, stage.height, spread)
  /** 넘길 때 미끄러지는 틀 (지금 챕터 띠 + 이웃 챕터 화면). 끌기는 이 틀을 옮긴다 */
  const slideRef = useRef<HTMLDivElement | null>(null)

  const position = resolvePosition(book, searchParams)
  const chapter = useQuery({
    ...chapterQuery(book.id, position?.chapterNo ?? 0),
    enabled: position !== null,
  })
  const { measureRef, layout } = usePagination(chapter.data, geometry, fontsReady)

  const index = book.chapters.findIndex((c) => c.chapter_no === position?.chapterNo)
  const prevChapter = index > 0 ? book.chapters[index - 1] : undefined
  const nextChapter = index >= 0 ? book.chapters[index + 1] : undefined

  // 앞뒤 챕터를 미리 받는다. 바로 옆 챕터는 경계에서 미리 그릴 화면이기도 하다.
  const nearby =
    index >= 0
      ? book.chapters.filter((_, i) => i !== index && Math.abs(i - index) <= PRELOAD_CHAPTERS)
      : []
  const nearbyChapters = useQueries({
    queries: nearby.map((c) => chapterQuery(book.id, c.chapter_no)),
  })
  const loadedChapter = (chapterNo: number | undefined) =>
    nearbyChapters.find((q) => q.data?.chapter_no === chapterNo)?.data

  const [turned, setTurned] = useState<TurnedPage | null>(null)
  const [savedTransition, setTransition] = useState<ChapterTransition>(null)
  const currentKey = position ? positionKey(position.chapterNo, position.anchor) : null
  const transition = savedTransition?.at === currentKey ? savedTransition : null
  // 위치가 슬라이드를 시작한 자리에서 벗어나면 슬라이드 상태를 버린다 (렌더 중에 고치는 파생 상태).
  // 남겨 두면 나중에 뒤로 가기로 같은 자리에 돌아왔을 때 끝난 슬라이드가 다시 살아난다.
  if (savedTransition && !transition) setTransition(null)

  const perView = geometry.pagesPerView
  let page = 0
  if (layout && position) {
    page =
      turned && turned.layoutKey === layout.key && turned.anchor === position.anchor
        ? turned.page
        : pageForAnchor(layout, position.anchor, position.atEnd)
  }
  const view = transition ? transition.fromView : Math.floor(page / perView)
  const firstPage = view * perView
  const viewCount = layout ? Math.ceil(layout.pageCount / perView) : 0
  const range = layout ? visibleRange(layout, firstPage, perView) : null

  const canPrev = layout !== null && (view > 0 || prevChapter !== undefined)
  const canNext = layout !== null && (view < viewCount - 1 || nextChapter !== undefined)
  const atBookEnd = layout !== null && view === viewCount - 1 && nextChapter === undefined

  // 띠를 옮길 거리. 챕터 경계에서 밀려 나갈 때는 한 화면 더 간다(이웃 챕터 화면이 들어옴).
  const viewStride = perView * geometry.pageStride
  const shownView = transition?.phase === 'leaving' ? view + transition.dir : view
  const offset = shownView * viewStride
  // 미끄러짐은 사용자가 넘길 때만 쓴다. 화면 크기·모드가 바뀌거나 뒤로 가기로 위치가 바뀌면
  // 새 위치로 바로 옮긴다 (그러지 않으면 챕터 처음부터 끝까지 띠가 미끄러져 지나간다).
  const animate =
    transition?.phase === 'leaving' ||
    (layout !== null && turned?.layoutKey === layout.key && turned.anchor === position?.anchor)

  // 경계 화면에서는 이웃 챕터의 맞닿은 화면을 띠 바로 옆에 그린다. 넘기거나 끌면 띠와 함께 움직인다.
  // 본문을 아직 받지 못했으면 그리지 않는다 (그때는 빈 쪽으로 넘어간다).
  const neighbors = {
    prev: layout !== null && view === 0 ? loadedChapter(prevChapter?.chapter_no) : undefined,
    next:
      layout !== null && view === viewCount - 1
        ? loadedChapter(nextChapter?.chapter_no)
        : undefined,
  }

  /** 위치를 다른 챕터로 바꾼다. 넘긴 쪽과 슬라이드 상태는 부르는 쪽에서 정리한다 */
  const enterChapter = (destination: Destination) =>
    setSearchParams(positionParams(destination.chapterNo, destination.anchor))

  /** 한 화면(한 쪽 또는 두 쪽) 넘긴다. 챕터 끝이면 이웃 챕터로 */
  const turn = (dir: Direction) => {
    if (!layout || !position || !currentKey || transition?.phase === 'leaving') return

    const target = view + dir
    if (target >= 0 && target < viewCount) {
      const targetPage = target * perView
      const anchor = layout.ranges[targetPage]?.first ?? position.anchor
      setTurned({ layoutKey: layout.key, anchor, page: targetPage })
      setTransition(null)
      setSearchParams(positionParams(position.chapterNo, anchor), { replace: true })
      return
    }

    const neighbor = dir > 0 ? nextChapter : prevChapter
    if (!neighbor) return
    const destination = {
      chapterNo: neighbor.chapter_no,
      // 이전 챕터로 갈 때는 마지막 문장을 기준으로 삼아 마지막 쪽이 보이게 한다.
      anchor: dir > 0 ? neighbor.first_sentence : neighbor.last_sentence,
    }
    // 넘긴 쪽은 여기서 지운다. 다른 챕터에서 돌아왔을 때(뒤로 가기) 같은 기준 문장이면 남은 값이
    // "사용자가 넘긴 쪽"으로 잘못 쓰여 미끄러짐이 생긴다. 슬라이드 동안 화면은 fromView로 고정된다.
    setTurned(null)
    if (reducedMotion) enterChapter(destination)
    else setTransition({ phase: 'leaving', at: currentKey, dir, destination, fromView: view })
  }

  /**
   * 띠의 슬라이드가 끝났을 때. 챕터 경계를 넘는 중이었다면 이제 챕터를 바꾼다.
   * 슬라이드 상태는 지우지 않는다. URL이 바뀌면 `at`이 맞지 않아 저절로 없어진다.
   */
  const onSlideEnd = () => {
    if (transition?.phase === 'leaving') enterChapter(transition.destination)
  }

  /** 목차에서 챕터로 바로 간다 (첫 쪽) */
  const goToChapter = (chapterNo: number) => {
    const meta = book.chapters.find((c) => c.chapter_no === chapterNo)
    if (!meta) return
    setTurned(null)
    setTransition(null)
    enterChapter({ chapterNo, anchor: meta.first_sentence })
  }

  return {
    book,
    position,
    chapter,
    stageRef: stage.ref,
    geometry,
    fontsReady,
    spread,
    measureRef,
    slideRef,
    layout,
    page: firstPage,
    view,
    viewCount,
    viewStride,
    range,
    offset,
    animate,
    neighbors,
    canPrev,
    canNext,
    atBookEnd,
    turn,
    onSlideEnd,
    goToChapter,
  }
}

export type Reader = ReturnType<typeof useReader>
