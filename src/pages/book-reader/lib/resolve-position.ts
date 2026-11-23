import type { BookDetail, ChapterMeta } from '@/entities/book'

import { resolveChapterNo } from './resolve-chapter'

export type ReaderPosition = {
  chapterNo: number
  meta: ChapterMeta
  /** 기준 문장 번호. 화면에는 이 문장이 시작하는 쪽이 보인다 */
  anchor: number
  /** 기준 문장이 챕터의 마지막 문장이면 마지막 쪽을 보여 준다 (이전 챕터로 넘어올 때) */
  atEnd: boolean
}

/**
 * URL(`?chapter=N&s=M`)과 마지막 읽은 위치로 보여 줄 위치를 정한다.
 * - `s`가 그 챕터 범위 안이면 `s`
 * - URL에 챕터가 없고 마지막 읽은 위치가 그 챕터면 그 문장
 * - 그 밖에는 챕터 첫 문장
 */
export function resolvePosition(book: BookDetail, params: URLSearchParams): ReaderPosition | null {
  const chapterParam = params.get('chapter')
  const chapterNo = resolveChapterNo(book, chapterParam)
  const meta = book.chapters.find((c) => c.chapter_no === chapterNo)
  if (chapterNo === null || !meta) return null

  const inChapter = (n: number) =>
    Number.isInteger(n) && n >= meta.first_sentence && n <= meta.last_sentence
  const sParam = params.get('s')
  const last = book.last_position

  let anchor = meta.first_sentence
  if (sParam !== null && sParam !== '' && inChapter(Number(sParam))) {
    anchor = Number(sParam)
  } else if (
    chapterParam === null &&
    last?.chapter_no === chapterNo &&
    inChapter(last.first_sentence)
  ) {
    anchor = last.first_sentence
  }

  return {
    chapterNo,
    meta,
    anchor,
    atEnd: anchor === meta.last_sentence && anchor !== meta.first_sentence,
  }
}

/** 위치를 URL 검색 문자열 값으로 */
export function positionParams(chapterNo: number, anchor: number) {
  return { chapter: String(chapterNo), s: String(anchor) }
}
