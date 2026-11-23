import { queryOptions } from '@tanstack/react-query'

import { apiClient } from '@/shared/api'

import type { BookDetail, BookListResponse, Chapter } from '../model/types'

export const bookKeys = {
  all: ['books'] as const,
  detail: (bookId: string) => ['books', bookId] as const,
  chapter: (bookId: string, chapterNo: number) => ['books', bookId, 'chapters', chapterNo] as const,
}

export const bookListQuery = () =>
  queryOptions({
    queryKey: bookKeys.all,
    queryFn: () => apiClient.get<BookListResponse>('/books'),
    select: (data) => data.books,
  })

export const bookDetailQuery = (bookId: string) =>
  queryOptions({
    queryKey: bookKeys.detail(bookId),
    queryFn: () => apiClient.get<BookDetail>(`/books/${encodeURIComponent(bookId)}`),
  })

export const chapterQuery = (bookId: string, chapterNo: number) =>
  queryOptions({
    queryKey: bookKeys.chapter(bookId, chapterNo),
    queryFn: () =>
      apiClient.get<Chapter>(`/books/${encodeURIComponent(bookId)}/chapters/${chapterNo}`),
    // 챕터 본문은 바뀌지 않는다.
    staleTime: Infinity,
  })
