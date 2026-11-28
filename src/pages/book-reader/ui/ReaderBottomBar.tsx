import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/shared/ui/button'

import type { Reader } from '../model/use-reader'

/** 쪽수: 한 쪽 "3", 두 쪽 "3–4" (마지막 펼침에 쪽이 하나뿐이면 한 숫자) */
function pageLabel(firstPage: number, perView: number, pageCount: number) {
  const first = firstPage + 1
  const last = Math.min(firstPage + perView, pageCount)
  return last > first ? `${first}–${last}` : `${first}`
}

/**
 * 쪽 알림에 챕터 제목을 붙일 쪽. 챕터가 바뀐 뒤 처음 보인 쪽에만 붙인다.
 * 렌더 중에 지난 값과 비교해 상태를 고친다 (React의 이전 값 저장 방식).
 */
function useChapterIntro(chapterNo: number | undefined, pageKey: string | null) {
  const [intro, setIntro] = useState<{ chapterNo?: number; pageKey: string | null }>({
    chapterNo,
    pageKey,
  })
  if (pageKey !== null && chapterNo !== intro.chapterNo) {
    setIntro({ chapterNo, pageKey })
  }
  return pageKey !== null && intro.chapterNo === chapterNo && intro.pageKey === pageKey
}

export function ReaderBottomBar({ reader }: { reader: Reader }) {
  const { book, position, layout, page, geometry, canPrev, canNext, atBookEnd, turn } = reader
  const label = layout ? pageLabel(page, geometry.pagesPerView, layout.pageCount) : null
  const chapterNo = position?.chapterNo
  const showTitle = useChapterIntro(chapterNo, label ? `${chapterNo}:${page}` : null)
  const chapterTitle = book.chapters.find((c) => c.chapter_no === chapterNo)?.title

  // 알림 영역은 늘 두고 문장만 바꾼다. 영역이 새로 생기면 낭독기가 첫 문장을 놓친다.
  const announcement =
    label && layout
      ? [
          showTitle ? chapterTitle : undefined,
          `${layout.pageCount}쪽 중 ${label}쪽`,
          atBookEnd ? '마지막 페이지입니다' : undefined,
        ]
          .filter(Boolean)
          .join(', ')
      : ''

  // 끝에 닿은 버튼은 `aria-disabled`로 둔다. `disabled`면 누르던 버튼이 포커스를 잃는다 (Phase 20).
  return (
    <footer className="flex h-14 shrink-0 items-center justify-between gap-2 border-t px-2 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        aria-label="이전 페이지"
        aria-disabled={!canPrev}
        onClick={() => {
          if (canPrev) turn(-1)
        }}
      >
        <ChevronLeft className="size-5" strokeWidth={1.5} aria-hidden />
      </Button>
      <div className="flex min-w-0 flex-col items-center text-center">
        <p aria-live="polite" className="font-typewriter text-xs text-muted-foreground">
          {label && layout && (
            <span aria-hidden>
              {label} / {layout.pageCount}
            </span>
          )}
          <span className="sr-only">{announcement}</span>
        </p>
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
        aria-disabled={!canNext}
        onClick={() => {
          if (canNext) turn(1)
        }}
      >
        <ChevronRight className="size-5" strokeWidth={1.5} aria-hidden />
      </Button>
    </footer>
  )
}
