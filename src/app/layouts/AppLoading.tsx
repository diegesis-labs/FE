/** 첫 화면의 loader(로그인 확인)가 끝나기 전에 보이는 빈 바탕. 테마 바탕색으로 깜빡임을 줄인다. */
export function AppLoading() {
  return <div aria-busy="true" className="min-h-svh bg-background" />
}
