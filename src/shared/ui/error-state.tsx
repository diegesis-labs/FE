import type * as React from 'react'

import { describeError } from '../api'
import { Button } from './button'

type ErrorStateProps = {
  error: unknown
  /** 다시 시도할 수 있는 에러일 때 보여 줄 버튼의 동작 */
  onRetry?: () => void
  /** 다시 시도 대신(또는 함께) 둘 동작. 예: 목록으로 돌아가는 링크 */
  action?: React.ReactNode
}

/** 데이터를 불러오지 못했을 때의 안내 (디자인 시스템 4.5) */
export function ErrorState({ error, onRetry, action }: ErrorStateProps) {
  const { title, description, retryable } = describeError(error)

  return (
    <div role="alert" className="space-y-4 bg-muted p-6">
      <div className="space-y-1">
        <p className="font-medium text-destructive">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {(retryable && onRetry) || action ? (
        <div className="flex flex-wrap gap-3">
          {retryable && onRetry && (
            <Button variant="outline" onClick={onRetry}>
              다시 시도
            </Button>
          )}
          {action}
        </div>
      ) : null}
    </div>
  )
}
