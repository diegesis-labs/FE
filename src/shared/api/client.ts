/**
 * BE API 호출용 fetch 래퍼.
 * axios 대신 브라우저 기본 fetch를 써서 외부 의존성을 줄인다 (docs/architecture.md 참고).
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API 요청 실패 (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
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
