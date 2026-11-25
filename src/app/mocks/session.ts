// 목 API의 로그인 상태. 실제 BE의 쿠키 대신 localStorage에 둔다.
// 값이 없으면 로그인한 상태로 본다. 그래서 데모 모드는 처음부터 책 목록이 보인다.
const SESSION_KEY = 'diegesis-mock-session'

export function isMockLoggedIn() {
  return localStorage.getItem(SESSION_KEY) !== 'out'
}

export function setMockLoggedIn(loggedIn: boolean) {
  if (loggedIn) localStorage.removeItem(SESSION_KEY)
  else localStorage.setItem(SESSION_KEY, 'out')
}
