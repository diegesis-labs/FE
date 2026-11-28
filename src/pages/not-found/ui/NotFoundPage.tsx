import { Link } from 'react-router'

import { useDocumentTitle } from '@/shared/lib/dom'
import { Button } from '@/shared/ui/button'

export function NotFoundPage() {
  useDocumentTitle('페이지를 찾을 수 없어요')
  return (
    <section className="space-y-4 text-center">
      <h1 className="font-display text-2xl leading-snug">페이지를 찾을 수 없어요</h1>
      <Button asChild variant="outline">
        <Link to="/">홈으로</Link>
      </Button>
    </section>
  )
}
