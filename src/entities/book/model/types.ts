// BE docs/API.md 4.5, 4.6절 응답 형식. BE가 OpenAPI 문서를 제공하면 자동 생성 타입으로 바꾼다.
// 그래서 필드 이름은 BE 형식(snake_case) 그대로 둔다.

export type BookSummary = {
  id: string
  title: string
  author: string
  language: string
  chapter_count: number
}

export type BookListResponse = {
  books: BookSummary[]
}

export type ChapterMeta = {
  chapter_no: number
  title: string
  /** 이 챕터의 첫 문장 번호. 문장 번호는 책 전체에서 0부터 이어진다 */
  first_sentence: number
  last_sentence: number
}

export type ReadingPosition = {
  chapter_no: number
  first_sentence: number
}

export type BookDetail = {
  id: string
  title: string
  author: string
  language: string
  chapters: ChapterMeta[]
  /** 마지막으로 읽은 위치. 처음 읽는 책이면 null */
  last_position: ReadingPosition | null
}

export type Sentence = {
  idx: number
  text: string
}

export type Paragraph = {
  paragraph_no: number
  sentences: Sentence[]
}

export type Chapter = {
  book_id: string
  chapter_no: number
  title: string
  paragraphs: Paragraph[]
}
