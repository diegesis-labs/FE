import { List } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet'

import type { Reader } from '../model/use-reader'

/** 목차 서랍. 챕터를 누르면 그 챕터 첫 쪽으로 가고 닫힌다. 지금 챕터는 색 말고 시작 쪽 막대로도 보인다 (Phase 20) */
export function ChapterToc({ reader }: { reader: Reader }) {
  const [open, setOpen] = useState(false)
  const { book, position, goToChapter } = reader

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="목차">
          <List className="size-5" strokeWidth={1.5} aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" data-reader-toc>
        <SheetHeader className="pr-14">
          <SheetTitle>목차</SheetTitle>
          <SheetDescription>
            {book.title} · {book.author}
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="챕터" className="overflow-y-auto px-6 pt-1 pb-6">
          <ol className="divide-y border-y">
            {book.chapters.map((c) => {
              const current = c.chapter_no === position?.chapterNo
              return (
                <li key={c.chapter_no}>
                  <button
                    type="button"
                    aria-current={current ? 'page' : undefined}
                    onClick={() => {
                      goToChapter(c.chapter_no)
                      setOpen(false)
                    }}
                    className={`flex w-full cursor-pointer items-center border-s-2 py-3 ps-3 text-start text-sm transition-colors duration-250 ease-out hover:bg-accent ${
                      current ? 'border-brand-ink font-medium text-brand-ink' : 'border-transparent'
                    }`}
                  >
                    {c.title}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
