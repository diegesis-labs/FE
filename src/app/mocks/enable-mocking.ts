/**
 * 개발 서버에서 VITE_API_MOCK=true 일 때만 MSW 목 API를 켠다.
 * 배포 빌드에서는 import.meta.env.DEV가 false로 바뀌어 아래 동적 import가 번들에서 빠진다.
 */
export async function enableMocking() {
  if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCK !== 'true') return

  const { worker } = await import('./browser')
  // 목 핸들러가 없는 요청(폰트, 다른 API 등)은 실제 네트워크로 보낸다.
  await worker.start({ onUnhandledFrame: 'bypass' })
}
