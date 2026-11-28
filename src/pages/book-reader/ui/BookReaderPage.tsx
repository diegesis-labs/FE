import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'

import { type BookDetail, bookDetailQuery } from '@/entities/book'
import { useDocumentTitle, useWindowKeydown } from '@/shared/lib/dom'
import { Button } from '@/shared/ui/button'
import { ErrorState } from '@/shared/ui/error-state'

import { keyToDirection, shouldIgnoreKey } from '../lib/keyboard'
import { useReader } from '../model/use-reader'
import { PageStage } from './PageStage'
import { ReaderBottomBar } from './ReaderBottomBar'
import { ReaderTopBar } from './ReaderTopBar'

/**
 * 책 읽기 화면. 화면 전체를 쓰고 세로 스크롤 없이 쪽을 넘긴다 (Phase 07).
 * 화면이 아주 낮으면(400% 확대 등) 최소 높이 19rem = 막대 2개 + 위아래 여백 + 5줄로 그리고 문서가 세로로 스크롤된다 (Phase 19).
 */
export function BookReaderPage() {
  const { bookId = '' } = useParams()
  const book = useQuery(bookDetailQuery(bookId))
  useDocumentTitle(book.data?.title)

  return (
    <div className="flex h-dvh min-h-76 flex-col overflow-hidden bg-background text-foreground">
      {book.isPending ? (
        <div aria-busy="true" className="flex flex-1 flex-col">
          <p className="sr-only">책 정보를 불러오는 중입니다.</p>
          <div aria-hidden className="h-14 border-b" />
          <div aria-hidden className="mx-auto mt-10 w-full max-w-165 space-y-3 px-4">
            <div className="h-6 w-1/2 bg-muted" />
            <div className="h-4 bg-muted" />
            <div className="h-4 bg-muted" />
          </div>
        </div>
      ) : book.isError ? (
        <div className="min-h-0 w-full flex-1 overflow-y-auto px-4 py-15">
          <div className="mx-auto max-w-165">
            <ErrorState
              error={book.error}
              onRetry={() => void book.refetch()}
              action={
                <Button asChild variant="link">
                  <Link to="/">책 목록으로</Link>
                </Button>
              }
            />
          </div>
        </div>
      ) : (
        <Reader book={book.data} />
      )}
    </div>
  )
}

function Reader({ book }: { book: BookDetail }) {
  const reader = useReader(book)

  useWindowKeydown((event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    if (shouldIgnoreKey(event)) return
    // 목차 서랍이 열려 있으면 서랍이 키보드를 쓴다.
    if (document.querySelector('[data-reader-toc][data-state="open"]')) return
    const dir = keyToDirection(event)
    if (!dir) return
    event.preventDefault()
    if (dir > 0 ? reader.canNext : reader.canPrev) reader.turn(dir)
  })

  return (
    <>
      <ReaderTopBar reader={reader} />
      <PageStage reader={reader} />
      <ReaderBottomBar reader={reader} />
    </>
  )
}
