/** 허용 목록에 적힌 역할 (BE docs/API.md 4.3절) */
export type UserRole = 'user' | 'admin'

/** `GET /api/me`의 응답 (BE docs/API.md 4.3절) */
export type Me = {
  id: string
  email: string
  /** Google 계정의 이름. 비어 있을 수 있다 (BE ARCHITECTURE.md 6절) */
  display_name: string | null
  role: UserRole
}
