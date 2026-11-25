import type { TransitionEvent } from 'react'

import { cn } from '@/shared/lib/utils'
import { ErrorState } from '@/shared/ui/error-state'

import { columnTrackStyle } from '../lib/geometry'
import type { Reader } from '../model/use-reader'
import { useSwipe } from '../model/use-swipe'
import { ChapterBody, ChapterBodySkeleton } from './ChapterBody'
import { NeighborView } from './NeighborView'

// 쪽을 넘길 때의 미끄러짐 (design-system 5장 "이동" 300ms ease-in-out). 움직임 줄이기 설정이면 없음.
const SLIDE_TRANSITION =
  'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out'
// 끌기를 놓은 뒤 제자리·새 쪽으로 돌아갈 때 (use-swipe가 data-settling을 붙임)
const SETTLE_TRANSITION =
  'data-[settling=true]:motion-safe:transition-transform data-[settling=true]:motion-safe:duration-300 data-[settling=true]:motion-safe:ease-in-out'

/**
 * 본문 무대. 본문 띠는 CSS 다단으로 쪽(단) 너비만큼씩 오른쪽으로 이어지고,
 * 보이는 영역(viewport)이 한 쪽 또는 두 쪽만 잘라 보여 준다. 쪽을 넘기면 틀이 옆으로 미끄러진다.
 * 챕터의 첫·마지막 화면에서는 이웃 챕터의 맞닿은 화면이 틀 안 띠 옆에 있어서, 챕터 경계도 같은 미끄러짐으로 넘어간다.
 */
export function PageStage({ reader }: { reader: Reader }) {
  const {
    stageRef,
    geometry,
    fontsReady,
    chapter,
    position,
    measureRef,
    slideRef,
    layout,
    range,
    offset,
    animate,
    neighbors,
    viewCount,
    viewStride,
    canPrev,
    canNext,
    turn,
    onSlideEnd,
  } = reader
  const swipe = useSwipe({
    trackRef: slideRef,
    viewportWidth: geometry.viewportWidth,
    canPrev,
    canNext,
    onTurn: turn,
  })

  const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return
    delete event.currentTarget.dataset.settling
    onSlideEnd()
  }

  return (
    <div
      ref={stageRef}
      {...swipe}
      // 가로 끌기는 리더가 받고, 확대는 브라우저에 남긴다.
      className="relative min-h-0 flex-1 touch-pan-y touch-pinch-zoom overflow-hidden select-none"
      data-chapter={position?.chapterNo}
      data-first-sentence={range?.first}
      data-last-sentence={range?.last}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          role="region"
          aria-label="본문"
          className="overflow-clip"
          style={{ width: geometry.viewportWidth, height: geometry.pageHeight }}
        >
          {chapter.isPending ? (
            <ChapterBodySkeleton />
          ) : chapter.isError ? (
            <ErrorState error={chapter.error} onRetry={() => void chapter.refetch()} />
          ) : (
            // 챕터가 바뀌면 틀을 새로 만든다. 그래야 새 챕터가 미끄러짐 없이 제자리에 놓인다.
            <div
              key={chapter.data.chapter_no}
              ref={slideRef}
              onTransitionEnd={onTransitionEnd}
              className={cn('relative', SETTLE_TRANSITION, animate && SLIDE_TRANSITION)}
              style={{
                width: geometry.viewportWidth,
                height: geometry.pageHeight,
                transform: `translateX(calc(${-offset}px + var(--drag-dx, 0px)))`,
              }}
            >
              {neighbors.prev && (
                <NeighborView
                  chapter={neighbors.prev}
                  geometry={geometry}
                  fontsReady={fontsReady}
                  edge="last"
                  left={-viewStride}
                />
              )}
              <div
                ref={measureRef}
                style={columnTrackStyle(geometry)}
                className={cn(!layout && 'invisible')}
              >
                <h2 className="mb-8 font-display text-2xl leading-snug">{chapter.data.title}</h2>
                <ChapterBody chapter={chapter.data} />
              </div>
              {neighbors.next && (
                <NeighborView
                  chapter={neighbors.next}
                  geometry={geometry}
                  fontsReady={fontsReady}
                  edge="first"
                  left={viewCount * viewStride}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
