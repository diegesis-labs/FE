import { isRouteErrorResponse, useRouteError } from 'react-router'

export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : '알 수 없는 오류'

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 p-4">
      <h1 className="text-2xl font-bold">문제가 발생했어요</h1>
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}
