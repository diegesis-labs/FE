import { useSearchParams } from 'react-router'

import { ThemeToggle } from '@/features/theme-toggle'
import { useDocumentTitle } from '@/shared/lib/dom'
import { Button } from '@/shared/ui/button'

// BE가 로그인 결과로 보내는 `error` 값 (BE docs/API.md 4.2절). 그 밖의 값은 무시한다.
const NOTICES = {
  NOT_ALLOWED: {
    title: '테스트 참가자만 쓸 수 있습니다',
    description: '참가 신청한 Google 계정으로 로그인했는지 확인해 주세요.',
  },
  LOGIN_FAILED: {
    title: '로그인하지 못했습니다',
    description: '잠시 뒤 다시 시도해 주세요.',
  },
} as const

function isNoticeKey(value: string | null): value is keyof typeof NOTICES {
  return value === 'NOT_ALLOWED' || value === 'LOGIN_FAILED'
}

type LoginPageProps = {
  /** "Google로 로그인"이 갈 주소. 실제 BE면 로그인 시작 경로, 목이면 목 로그인 경로 */
  loginHref: string
}

export function LoginPage({ loginHref }: LoginPageProps) {
  useDocumentTitle('로그인')
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')
  const notice = isNoticeKey(error) ? NOTICES[error] : undefined

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <div className="flex justify-end px-4 pt-2 md:px-10">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <section className="w-full max-w-sm space-y-8 text-center">
          <div className="space-y-3">
            <h1 className="font-display text-4xl">Diegesis</h1>
            <p className="text-muted-foreground">장면에 맞는 음악과 함께 읽는 책</p>
          </div>
          {notice && (
            <div role="alert" className="space-y-1 bg-accent p-4 text-left text-foreground">
              <p className="font-medium text-destructive">{notice.title}</p>
              <p className="text-sm text-muted-foreground">{notice.description}</p>
            </div>
          )}
          {/* 로그인은 화면 이동이다. fetch로 부르지 않는다 (BE docs/API.md 4.2절). */}
          <Button asChild variant="brand" size="lg" className="w-full">
            <a href={loginHref}>Google로 로그인</a>
          </Button>
        </section>
      </main>
    </div>
  )
}
