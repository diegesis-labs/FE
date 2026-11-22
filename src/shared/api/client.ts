/**
 * BE API 호출용 fetch 래퍼.
 * axios 대신 브라우저 기본 fetch를 써서 외부 의존성을 줄인다 (docs/architecture.md 참고).
 */

// .env에 빈 값(VITE_API_BASE_URL=)으로 두면 빈 문자열이 들어오므로 ?? 가 아니라 || 로 기본값을 쓴다.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/** BE 에러 응답 본문 (BE docs/API.md 2.3절). `message`는 화면에 그대로 보여 줘도 된다. */
type ApiErrorBody = { code: string; message: string; detail?: unknown }

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== 'object' || body === null) return false
  const { code, message } = body as Record<string, unknown>
  return typeof code === 'string' && typeof message === 'string'
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown
  /** BE 에러 코드 (`NOT_FOUND`, `NOT_AUTHENTICATED` 등). 본문이 BE 형식이 아니면 undefined */
  readonly code: string | undefined

  constructor(status: number, body: unknown, message?: string) {
    const known = isApiErrorBody(body) ? body : undefined
    super(message ?? known?.message ?? `API 요청 실패 (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.code = known?.code
  }
}

type RequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
}

async function request<T>(method: string, path: string, options: RequestOptions = {}) {
  const { body, query, headers, ...init } = options

  const url = new URL(BASE_URL + path, window.location.origin)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }

  const response = await fetch(url, {
    ...init,
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const isJson = response.headers.get('Content-Type')?.includes('application/json')
  const data: unknown = isJson ? await response.json() : await response.text()

  if (!response.ok) throw new ApiError(response.status, data)
  return data as T
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}
