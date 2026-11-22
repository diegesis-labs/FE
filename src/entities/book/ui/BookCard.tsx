import { Link } from 'react-router'

import type { BookSummary } from '../model/types'

type BookCardProps = {
  book: BookSummary
  /** 카드를 눌렀을 때 갈 주소 */
  to: string
}

/**
 * 책 카드 (디자인 시스템 4.3). API에 표지 이미지가 없어서 muted 면에 제목을 얹은 글자 표지를 쓴다.
 * 카드 전체가 링크 하나다.
 */
export function BookCard({ book, to }: BookCardProps) {
  return (
    <Link
      to={to}
      className="group block space-y-3 no-underline outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <div
        aria-hidden
        className="flex aspect-[3/4] flex-col justify-between bg-muted p-4 transition-colors duration-300 ease-out group-hover:bg-accent md:p-5"
      >
        <p className="font-display text-lg leading-snug break-keep md:text-xl">{book.title}</p>
        <p className="font-typewriter text-xs text-muted-foreground">{book.author}</p>
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-medium group-hover:underline">{book.title}</h3>
        <p className="text-sm text-muted-foreground">
          {book.author} · {book.chapter_count}장
        </p>
      </div>
    </Link>
  )
}

/** 책 목록을 불러오는 동안 카드 자리에 두는 스켈레톤 */
export function BookCardSkeleton() {
  return (
    <div aria-hidden className="space-y-3">
      <div className="aspect-[3/4] bg-muted" />
      <div className="space-y-2">
        <div className="h-4 w-3/4 bg-muted" />
        <div className="h-3 w-1/2 bg-muted" />
      </div>
    </div>
  )
}
