import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/shared/ui/button'

import type { Reader } from '../model/use-reader'

/** 쪽수: 한 쪽 "3", 두 쪽 "3–4" (마지막 펼침에 쪽이 하나뿐이면 한 숫자) */
function pageLabel(firstPage: number, perView: number, pageCount: number) {
  const first = firstPage + 1
  const last = Math.min(firstPage + perView, pageCount)
  return last > first ? `${first}–${last}` : `${first}`
}

export function ReaderBottomBar({ reader }: { reader: Reader }) {
  const { layout, page, geometry, canPrev, canNext, atBookEnd, turn } = reader
  const label = layout ? pageLabel(page, geometry.pagesPerView, layout.pageCount) : null

  return (
    <footer className="flex h-14 shrink-0 items-center justify-between gap-2 border-t px-2 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        aria-label="이전 페이지"
        disabled={!canPrev}
        onClick={() => turn(-1)}
      >
        <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden />
      </Button>
      <div className="flex min-w-0 flex-col items-center text-center">
        {label && layout && (
          <p aria-live="polite" className="font-typewriter text-xs text-muted-foreground">
            <span aria-hidden>
              {label} / {layout.pageCount}
            </span>
            <span className="sr-only">
              {layout.pageCount}쪽 중 {label}쪽
            </span>
          </p>
        )}
        {atBookEnd && (
          <p className="text-xs">
            마지막 페이지입니다 ·{' '}
            <Link to="/" className="underline underline-offset-2">
              책 목록으로
            </Link>
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="다음 페이지"
        disabled={!canNext}
        onClick={() => turn(1)}
      >
        <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden />
      </Button>
    </footer>
  )
}
