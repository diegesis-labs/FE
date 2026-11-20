import { createContext, useContext } from 'react'

export type Theme = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

/** index.html의 깜빡임 방지 스크립트와 같은 키를 써야 한다. */
export const THEME_STORAGE_KEY = 'diegesis-theme'

export type ThemeContextValue = {
  /** 사용자가 고른 값 */
  theme: Theme
  /** 실제로 적용된 값 (system이면 OS 설정을 따름) */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme은 ThemeProvider 안에서만 쓸 수 있어요.')
  return value
}
