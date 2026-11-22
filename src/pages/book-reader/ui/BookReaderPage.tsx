import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'

import { type BookDetail, bookDetailQuery, chapterQuery } from '@/entities/book'
import { Button } from '@/shared/ui/button'
import { ErrorState } from '@/shared/ui/error-state'

import { resolveChapterNo } from '../lib/resolve-chapter'
import { ChapterBody, ChapterBodySkeleton } from './ChapterBody'

const chapterHref = (chapterNo: number) => ({ search: `?chapter=${chapterNo}` })

/**
 * 책 읽기 화면. Phase 06에서는 챕터 본문을 위에서 아래로 보여 주는 임시 화면이고,
 * Phase 07에서 페이지 넘김 리더로 바뀐다.
 */
export function BookReaderPage() {
  const { bookId = '' } = useParams()
  const book = useQuery(bookDetailQuery(bookId))

  return (
    <div className="mx-auto max-w-165 space-y-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground no-underline hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" strokeWidth={1.5} />책 목록
      </Link>

      {book.isPending ? (
        <div aria-busy="true" className="space-y-3">
          <p className="sr-only">책 정보를 불러오는 중입니다.</p>
          <div aria-hidden className="h-9 w-2/3 bg-muted" />
          <div aria-hidden className="h-4 w-1/3 bg-muted" />
        </div>
      ) : book.isError ? (
        <ErrorState
          error={book.error}
          onRetry={() => void book.refetch()}
          action={
            <Button asChild variant="link">
              <Link to="/">책 목록으로</Link>
            </Button>
          }
        />
      ) : (
        <BookContent book={book.data} />
      )}
    </div>
  )
}

function BookContent({ book }: { book: BookDetail }) {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const chapterNo = resolveChapterNo(book, searchParams.get('chapter'))
  const chapter = useQuery({
    ...chapterQuery(book.id, chapterNo ?? 0),
    enabled: chapterNo !== null,
  })

  const index = book.chapters.findIndex((c) => c.chapter_no === chapterNo)
  const prev = book.chapters[index - 1]
  const next = book.chapters[index + 1]
  const current = book.chapters[index]

  // 다음 챕터로 갈 것 같으면(링크에 마우스·포커스) 본문을 미리 받아 둔다.
  const prefetchNext = () => {
    if (next) void queryClient.prefetchQuery(chapterQuery(book.id, next.chapter_no))
  }

  return (
    <>
      <header className="space-y-2">
        <h1 className="font-display text-3xl leading-tight md:text-4xl">{book.title}</h1>
        <p className="text-muted-foreground">{book.author}</p>
      </header>

      <nav aria-label="챕터">
        <ol className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {book.chapters.map((c) => {
            const isCurrent = c.chapter_no === chapterNo
            return (
              <li key={c.chapter_no}>
                <Link
                  to={chapterHref(c.chapter_no)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={
                    isCurrent
                      ? 'font-medium text-brand-ink underline underline-offset-4'
                      : 'text-muted-foreground no-underline hover:underline'
                  }
                >
                  {c.title}
                </Link>
              </li>
            )
          })}
        </ol>
      </nav>

      <article className="space-y-6">
        {current && <h2 className="font-display text-2xl leading-snug">{current.title}</h2>}
        {chapterNo === null ? (
          <p className="text-muted-foreground">이 책에는 아직 본문이 없습니다.</p>
        ) : chapter.isPending ? (
          <ChapterBodySkeleton />
        ) : chapter.isError ? (
          <ErrorState error={chapter.error} onRetry={() => void chapter.refetch()} />
        ) : (
          <ChapterBody chapter={chapter.data} />
        )}
      </article>

      {(prev || next) && (
        <nav aria-label="챕터 이동" className="flex justify-between gap-4 border-t pt-6">
          {prev ? (
            <Button asChild variant="outline">
              <Link to={chapterHref(prev.chapter_no)}>
                <ChevronLeft aria-hidden strokeWidth={1.5} />
                이전 챕터
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button asChild variant="outline">
              <Link
                to={chapterHref(next.chapter_no)}
                onMouseEnter={prefetchNext}
                onFocus={prefetchNext}
              >
                다음 챕터
                <ChevronRight aria-hidden strokeWidth={1.5} />
              </Link>
            </Button>
          )}
        </nav>
      )}
    </>
  )
}
