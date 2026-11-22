import { Fragment } from 'react'

import type { Chapter } from '@/entities/book'

/**
 * 챕터 본문. 문장마다 문장 번호(`data-sentence-idx`)를 단 span으로 감싼다.
 * 리더는 이 span들의 위치로 쪽마다 보이는 문장 범위를 계산한다.
 * 문장 사이 공백은 span 밖에 둔다. 공백이 앞 줄 끝에 남으면 문장이 앞 쪽에서 시작한 것처럼 재지기 때문이다.
 */
export function ChapterBody({ chapter }: { chapter: Chapter }) {
  return (
    <div className="space-y-4 text-base leading-[1.8] break-keep">
      {chapter.paragraphs.map((paragraph) => (
        <p key={paragraph.paragraph_no}>
          {paragraph.sentences.map((sentence, i) => (
            <Fragment key={sentence.idx}>
              {i > 0 && ' '}
              <span data-sentence-idx={sentence.idx}>{sentence.text}</span>
            </Fragment>
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
