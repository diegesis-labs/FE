import { useQuery } from '@tanstack/react-query'

import { BookCard, BookCardSkeleton, bookListQuery } from '@/entities/book'
import { useDocumentTitle } from '@/shared/lib/dom'
import { ErrorState } from '@/shared/ui/error-state'

const GRID = 'grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4'
const SKELETON_COUNT = 8

export function BookListPage() {
  useDocumentTitle('오늘 읽을 책')
  return (
    <section className="space-y-10 md:space-y-15">
      <header className="space-y-2">
        <p className="text-xs font-medium text-brand-ink">서재</p>
        <h1 className="font-display text-3xl leading-tight md:text-4xl">오늘 읽을 책</h1>
        <p className="text-muted-foreground">읽고 싶은 책을 고르면 바로 펼쳐집니다.</p>
      </header>
      <BookList />
    </section>
  )
}

function BookList() {
  const books = useQuery(bookListQuery())

  if (books.isPending) {
    return (
      <div aria-busy="true">
        <p className="sr-only">책 목록을 불러오는 중입니다.</p>
        <div className={GRID}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (books.isError) {
    return <ErrorState error={books.error} onRetry={() => void books.refetch()} />
  }

  if (books.data.length === 0) {
    return <p className="bg-muted p-6 text-muted-foreground">아직 읽을 수 있는 책이 없습니다.</p>
  }

  return (
    <ul className={GRID}>
      {books.data.map((book) => (
        <li key={book.id}>
          <BookCard book={book} to={`/books/${encodeURIComponent(book.id)}`} />
        </li>
      ))}
    </ul>
  )
}
