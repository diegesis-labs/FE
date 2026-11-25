import { createBrowserRouter, replace, type LoaderFunctionArgs } from 'react-router'

import { meQuery, userKeys } from '@/entities/user'
import { BookListPage } from '@/pages/book-list'
import { BookReaderPage } from '@/pages/book-reader'
import { LoginPage } from '@/pages/login'
import { NotFoundPage } from '@/pages/not-found'
import { RouteErrorPage } from '@/pages/route-error'
import { GOOGLE_LOGIN_URL } from '@/shared/api'

import { queryClient } from '../api/query-client'
import { AppLoading } from '../layouts/AppLoading'
import { RootLayout } from '../layouts/RootLayout'
import { authRedirectPath, LOGIN_PATH, setAuthNavigator } from './auth-redirect'

const MOCK = import.meta.env.VITE_API_MOCK === 'true'
const MOCK_LOGIN_PATH = '/login/mock'

// 로그인 확인은 loader가 직접 처리하므로, 쿼리 캐시가 화면을 옮기지 않게 한다.
// loader의 이동은 모두 replace다. push면 뒤로 가기가 막 떠난 화면으로 돌아가 같은 이동을 되풀이한다.
const meForLoader = () => ({ ...meQuery(), meta: { authRedirect: false } })

/**
 * 보호된 화면에 들어가기 전에 로그인 상태와 허용 목록을 확인한다 (BE docs/API.md 2.2절).
 * 로그인과 무관한 에러(서버 에러, BE가 꺼짐)는 막지 않고 화면으로 넘긴다. 화면의 쿼리가 같은 에러를
 * 다시 시도 버튼과 함께 보여 주고, 그 쿼리가 401을 받으면 쿼리 캐시가 로그인 화면으로 보낸다.
 */
async function requireLogin() {
  try {
    await queryClient.ensureQueryData(meForLoader())
  } catch (error) {
    const to = authRedirectPath(error)
    if (to) throw replace(to)
  }
  return null
}

/**
 * 이미 로그인했으면 첫 화면으로. 실패는 화면 이동으로 바꾸지 않는다 (`?error=`를 지우지 않기 위해).
 * `?error=`가 있으면 로그인했더라도 보내지 않는다. 로그인한 채로 다른 계정의 로그인이 실패하면
 * BE는 옛 로그인 상태를 두고 이 화면으로 보내므로, 첫 화면으로 보내면 안내가 사라진다.
 */
async function redirectIfLoggedIn({ request }: LoaderFunctionArgs) {
  if (new URL(request.url).searchParams.has('error')) return null
  try {
    await queryClient.fetchQuery({ ...meForLoader(), staleTime: 0 })
  } catch {
    return null
  }
  throw replace('/')
}

/** 목에서만: 목 로그인 상태를 켜고 첫 화면으로 간다. 로그인 버튼의 화면 이동은 MSW가 가로채지 못한다. */
async function mockLogin() {
  const { setMockLoggedIn } = await import('../mocks/session')
  setMockLoggedIn(true)
  queryClient.removeQueries({ queryKey: userKeys.me })
  return replace('/')
}

function createRouter() {
  return createBrowserRouter([
    {
      path: LOGIN_PATH,
      element: <LoginPage loginHref={MOCK ? MOCK_LOGIN_PATH : GOOGLE_LOGIN_URL} />,
      loader: redirectIfLoggedIn,
      HydrateFallback: AppLoading,
      ErrorBoundary: RouteErrorPage,
    },
    ...(MOCK ? [{ path: MOCK_LOGIN_PATH, loader: mockLogin }] : []),
    {
      path: '/',
      Component: RootLayout,
      loader: requireLogin,
      HydrateFallback: AppLoading,
      ErrorBoundary: RouteErrorPage,
      children: [
        { index: true, Component: BookListPage },
        { path: '*', Component: NotFoundPage },
      ],
    },
    {
      // 리더는 일반 헤더·여백 없이 화면 전체를 쓴다 (Phase 07).
      path: '/books/:bookId',
      Component: BookReaderPage,
      loader: requireLogin,
      HydrateFallback: AppLoading,
      ErrorBoundary: RouteErrorPage,
    },
  ])
}

let router: ReturnType<typeof createRouter> | undefined

/**
 * Data mode 라우터. 만드는 순간 첫 화면의 loader가 돌기 때문에, 목 API가 켜진 뒤(App이 그려질 때) 만든다.
 * 나중에 SSR/prerender가 필요해지면 React Router framework mode로 옮길 수 있도록 라우트 단위로 페이지를 나눠 둔다.
 */
export function getRouter() {
  if (router) return router
  const created = createRouter()

  setAuthNavigator((to) => {
    const { pathname, search } = created.state.location
    // 로그인 화면에서 받은 401은 무시한다. `?error=`가 있는 안내를 지우지 않고, 같은 이동을 되풀이하지 않는다.
    if (pathname === LOGIN_PATH && (to === LOGIN_PATH || pathname + search === to)) return
    // 남은 내 정보가 성공으로 캐시돼 있으면 로그인 화면이 첫 화면으로 되돌려 보내므로 지운다.
    queryClient.removeQueries({ queryKey: userKeys.me })
    void created.navigate(to, { replace: true })
  })

  router = created
  return created
}
