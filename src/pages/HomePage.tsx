import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { apiClient } from '@/shared/api/client'

export function HomePage() {
  // BE 연결 확인용 예시. BE에 헬스체크 엔드포인트가 정해지면 경로를 맞춘다.
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.get<{ status: string }>('/health'),
    enabled: false,
  })

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
