/**
 * VITE_API_MOCK=true 일 때 MSW 목 API를 켠다. 개발 서버와 배포 빌드(데모 모드, Phase 10) 모두.
 * Vite가 빌드 때 이 값을 문자열로 바꿔 넣으므로, 값이 없으면 아래 동적 import가 번들에서 빠진다.
 */
export async function enableMocking() {
  if (import.meta.env.VITE_API_MOCK !== 'true') return

  const { worker } = await import('./browser')
  // 목 핸들러가 없는 요청(폰트, 다른 API 등)은 실제 네트워크로 보낸다.
  await worker.start({ onUnhandledFrame: 'bypass' })
}
