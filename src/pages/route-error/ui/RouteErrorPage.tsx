import { Button } from '@/shared/ui/button'

/**
 * 라우트가 그려지지 못했을 때의 화면. 레이아웃(헤더)까지 대신하므로 나갈 길을 직접 둔다 (Phase 19).
 * 상태 코드와 예외 메시지는 보여 주지 않는다. 개발 모드에서는 React Router가 콘솔에 남긴다.
 */
export function RouteErrorPage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-165 flex-col justify-center gap-6 px-4 py-15">
      <div className="space-y-2">
        <h1 className="font-display text-2xl leading-tight md:text-3xl">
          화면을 표시하지 못했습니다
        </h1>
        <p className="text-muted-foreground">페이지를 새로고침하거나 책 목록으로 돌아가 주세요.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          새로고침
        </Button>
        {/* 앱 안에서 옮기면 깨진 응답이 쿼리 캐시에 남아 같은 화면이 다시 실패한다. 문서를 새로 불러온다. */}
        <Button asChild variant="link">
          <a href="/">책 목록으로</a>
        </Button>
      </div>
    </main>
  )
}
