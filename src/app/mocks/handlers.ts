// 개발용 목 API. BE docs/API.md 4.5, 4.6절 형식을 그대로 흉내 낸다.
// 켜는 법과 시나리오 전환: docs/architecture.md 3장 "목 API".
//
// 목 데이터(fixtures/books.json)는 저작권 보호 기간이 끝난 작품을 위키문헌에서 가져와
// 원작에는 장 구분이 없어서 장면이 바뀌는 자리(시간·장소가 넘어가는 곳)에서 3~4장으로 나누고,
// 마침표·물음표·느낌표 기준으로 문장을 나눴다 (곧은·굽은 따옴표 안은 나누지 않음).
// - 현진건 「운수 좋은 날」(1924), 김유정 「봄·봄」(1935), 이효석 「메밀꽃 필 무렵」(1936)
import { delay, http, HttpResponse } from 'msw'

import type { BookDetail, BookListResponse, BookSummary, Chapter } from '@/entities/book'

import fixtures from './fixtures/books.json'

type FixtureBook = {
  id: string
  title: string
  author: string
  language: string
  chapters: { title: string; paragraphs: string[][] }[]
}

/** 목 응답 시나리오. 브라우저 콘솔에서 localStorage.setItem('diegesis-mock', 'empty') 처럼 바꾼다 */
type Scenario = 'normal' | 'empty' | 'unauthorized' | 'error'
const SCENARIO_KEY = 'diegesis-mock'

function scenario(): Scenario {
  const value = localStorage.getItem(SCENARIO_KEY)
  return value === 'empty' || value === 'unauthorized' || value === 'error' ? value : 'normal'
}

const API = import.meta.env.VITE_API_BASE_URL || '/api'
const LATENCY_MS = 400

// 문장 번호(idx)는 책 전체에서 0부터 이어진다 (BE GLOSSARY "문장 번호").
const books = (fixtures as FixtureBook[]).map((book) => {
  let idx = 0
  const chapters: Chapter[] = book.chapters.map((chapter, i) => ({
    book_id: book.id,
    chapter_no: i + 1,
    title: chapter.title,
    paragraphs: chapter.paragraphs.map((sentences, paragraph_no) => ({
      paragraph_no,
      sentences: sentences.map((text) => ({ idx: idx++, text })),
    })),
  }))
  return { ...book, chapters }
})

const firstIdx = (c: Chapter) => c.paragraphs[0]?.sentences[0]?.idx ?? 0
const lastIdx = (c: Chapter) => c.paragraphs.at(-1)?.sentences.at(-1)?.idx ?? 0

function errorResponse(status: number, code: string, message: string) {
  return HttpResponse.json({ code, message }, { status })
}

/** 시나리오가 에러면 에러 응답, 아니면 undefined */
function scenarioError() {
  switch (scenario()) {
    case 'unauthorized':
      return errorResponse(401, 'NOT_AUTHENTICATED', '로그인이 필요합니다.')
    case 'error':
      return errorResponse(500, 'INTERNAL_ERROR', '서버에서 문제가 생겼습니다.')
    default:
      return undefined
  }
}

const notFound = () => errorResponse(404, 'NOT_FOUND', '요청한 책을 찾을 수 없습니다.')

export const handlers = [
  http.get(`${API}/books`, async () => {
    await delay(LATENCY_MS)
    const error = scenarioError()
    if (error) return error

    const list: BookSummary[] =
      scenario() === 'empty'
        ? []
        : books.map(({ id, title, author, language, chapters }) => ({
            id,
            title,
            author,
            language,
            chapter_count: chapters.length,
          }))
    return HttpResponse.json<BookListResponse>({ books: list })
  }),

  http.get(`${API}/books/:bookId`, async ({ params }) => {
    await delay(LATENCY_MS)
    const error = scenarioError()
    if (error) return error

    const book = books.find((b) => b.id === params.bookId)
    if (!book) return notFound()

    // 이어 읽기를 볼 수 있도록 「봄·봄」만 2장을 읽던 중으로 둔다.
    const second = book.chapters[1]
    const detail: BookDetail = {
      id: book.id,
      title: book.title,
      author: book.author,
      language: book.language,
      chapters: book.chapters.map((c) => ({
        chapter_no: c.chapter_no,
        title: c.title,
        first_sentence: firstIdx(c),
        last_sentence: lastIdx(c),
      })),
      last_position:
        book.id === 'bombom' && second
          ? { chapter_no: second.chapter_no, first_sentence: firstIdx(second) + 5 }
          : null,
    }
    return HttpResponse.json(detail)
  }),

  http.get(`${API}/books/:bookId/chapters/:chapterNo`, async ({ params }) => {
    await delay(LATENCY_MS)
    const error = scenarioError()
    if (error) return error

    const book = books.find((b) => b.id === params.bookId)
    const chapter = book?.chapters.find((c) => String(c.chapter_no) === params.chapterNo)
    if (!chapter) return errorResponse(404, 'NOT_FOUND', '요청한 챕터를 찾을 수 없습니다.')
    return HttpResponse.json(chapter)
  }),
]
