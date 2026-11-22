import type { Chapter } from '@/entities/book'

/**
 * 챕터 본문. 문장마다 문장 번호(`data-sentence-idx`)를 단 span으로 감싼다.
 * Phase 07 리더가 이 번호로 화면에 보이는 문장 범위를 계산한다.
 */
export function ChapterBody({ chapter }: { chapter: Chapter }) {
  return (
    <div className="space-y-5 text-base leading-[1.8] break-keep">
      {chapter.paragraphs.map((paragraph) => (
        <p key={paragraph.paragraph_no}>
          {paragraph.sentences.map((sentence, i) => (
            <span key={sentence.idx} data-sentence-idx={sentence.idx}>
              {i > 0 && ' '}
              {sentence.text}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}

export function ChapterBodySkeleton() {
  return (
    <div aria-busy="true" className="space-y-3">
      <p className="sr-only">본문을 불러오는 중입니다.</p>
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} aria-hidden className={i % 4 === 3 ? 'h-4 w-2/3 bg-muted' : 'h-4 bg-muted'} />
      ))}
    </div>
  )
}
