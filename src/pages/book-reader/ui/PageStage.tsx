import type { CSSProperties, TransitionEvent } from 'react'

import { cn } from '@/shared/lib/utils'
import { ErrorState } from '@/shared/ui/error-state'

import type { Reader } from '../model/use-reader'
import { useSwipe } from '../model/use-swipe'
import { ChapterBody, ChapterBodySkeleton } from './ChapterBody'

// 쪽을 넘길 때의 미끄러짐 (design-system 5장 "이동" 300ms ease-in-out). 움직임 줄이기 설정이면 없음.
const SLIDE_TRANSITION =
  'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out'
// 끌기를 놓은 뒤 제자리·새 쪽으로 돌아갈 때 (use-swipe가 data-settling을 붙임)
const SETTLE_TRANSITION =
  'data-[settling=true]:motion-safe:transition-transform data-[settling=true]:motion-safe:duration-300 data-[settling=true]:motion-safe:ease-in-out'
// Tailwind가 찾을 수 있게 클래스 이름을 통째로 적는다 (조립하면 CSS가 만들어지지 않음).
const ENTER_FROM = {
  1: 'motion-safe:slide-in-from-right',
  [-1]: 'motion-safe:slide-in-from-left',
} as const

/**
 * 본문 무대. 본문 띠는 CSS 다단으로 쪽(단) 너비만큼씩 오른쪽으로 이어지고,
 * 보이는 영역(viewport)이 한 쪽 또는 두 쪽만 잘라 보여 준다. 쪽을 넘기면 띠가 옆으로 미끄러진다.
 */
export function PageStage({ reader }: { reader: Reader }) {
  const {
    stageRef,
    geometry,
    chapter,
    position,
    measureRef,
    trackRef,
    layout,
    range,
    offset,
    animate,
    transition,
    canPrev,
    canNext,
    turn,
    onSlideEnd,
  } = reader
  const swipe = useSwipe({
    trackRef,
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

  const trackStyle = {
    width: geometry.pageWidth,
    height: geometry.pageHeight,
    columnWidth: geometry.pageWidth,
    columnGap: geometry.gap,
    columnFill: 'auto',
    transform: `translateX(calc(${-offset}px + var(--drag-dx, 0px)))`,
  } satisfies CSSProperties

  const entering = transition?.phase === 'entering' ? transition.dir : null

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
            <div
              key={chapter.data.chapter_no}
              className={
                entering
                  ? `h-full motion-safe:animate-in motion-safe:duration-300 motion-safe:ease-in-out ${ENTER_FROM[entering]}`
                  : 'h-full'
              }
            >
              <div
                ref={measureRef}
                style={trackStyle}
                onTransitionEnd={onTransitionEnd}
                className={cn(
                  SETTLE_TRANSITION,
                  animate && SLIDE_TRANSITION,
                  !layout && 'invisible',
                )}
              >
                <h2 className="mb-8 font-display text-2xl leading-snug">{chapter.data.title}</h2>
                <ChapterBody chapter={chapter.data} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
