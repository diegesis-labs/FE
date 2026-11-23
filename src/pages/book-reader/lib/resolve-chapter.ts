import type { BookDetail } from '@/entities/book'

/**
 * 보여 줄 챕터 번호를 정한다.
 * - URL에 `?chapter`가 없으면: 마지막으로 읽은 챕터, 없으면 첫 챕터
 * - 있는데 숫자가 아니거나 없는 챕터면: 첫 챕터
 */
export function resolveChapterNo(book: BookDetail, chapterParam: string | null): number | null {
  const first = book.chapters[0]?.chapter_no ?? null
  if (chapterParam === null) {
    const last = book.last_position?.chapter_no
    return book.chapters.some((c) => c.chapter_no === last) ? (last ?? first) : first
  }
  const requested = Number(chapterParam)
  return book.chapters.some((c) => c.chapter_no === requested) ? requested : first
}
