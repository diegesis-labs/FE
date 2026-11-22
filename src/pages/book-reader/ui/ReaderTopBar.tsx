import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

import { ThemeToggle } from '@/features/theme-toggle'

import type { Reader } from '../model/use-reader'
import { ChapterToc } from './ChapterToc'

const FOCUS_RING = 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring'

export function ReaderTopBar({ reader }: { reader: Reader }) {
  const { book, position } = reader
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-2 md:px-6">
      <Link
        to="/"
        className={`inline-flex size-10 shrink-0 items-center justify-center text-muted-foreground no-underline hover:text-foreground md:w-auto md:gap-1 md:px-2 ${FOCUS_RING}`}
      >
        <ArrowLeft aria-hidden className="size-5" strokeWidth={1.5} />
        <span className="sr-only md:not-sr-only md:text-sm">책 목록</span>
      </Link>
      <p className="min-w-0 flex-1 truncate text-center text-sm">
        <span className="font-display text-base">{book.title}</span>
        {position && <span className="text-muted-foreground"> · {position.meta.title}</span>}
      </p>
      <ChapterToc reader={reader} />
      <ThemeToggle />
    </header>
  )
}
