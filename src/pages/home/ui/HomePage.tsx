import { useQuery } from '@tanstack/react-query'

import { Button } from '@/shared/ui/button'

import { healthQuery } from '../api/health'

export function HomePage() {
  const health = useQuery(healthQuery)

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium text-brand-ink">MVP</p>
        <h1 className="font-display text-3xl leading-tight md:text-4xl">Diegesis</h1>
        <p className="text-muted-foreground">FE 초기 세팅이 완료되었습니다.</p>
        {/* 타자기 포인트 서체 예시 (docs/design-system.md 3.1) */}
        <p className="font-typewriter text-sm text-muted-foreground">2026. 11. 19 — 첫 페이지</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {/* 브랜드 버튼 예시. 홈 화면은 임시이며 실제 동작은 #3 화면 설계 후 연결한다. */}
        <Button variant="brand">시작하기</Button>
        <Button onClick={() => health.refetch()} disabled={health.isFetching}>
          {health.isFetching ? '확인 중…' : 'BE 연결 확인'}
        </Button>
        {health.isSuccess && <span className="text-sm">연결됨: {health.data.status}</span>}
        {health.isError && (
          <span className="text-sm text-destructive">연결 실패: {health.error.message}</span>
        )}
      </div>
    </section>
  )
}
