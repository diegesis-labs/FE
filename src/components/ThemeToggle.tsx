import { Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useTheme, type Theme } from '@/shared/theme/theme-context'

const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
const LABEL: Record<Theme, string> = {
  system: '시스템 설정 따름',
  light: '라이트 모드',
  dark: '다크 모드',
}
const ICON = { system: Monitor, light: Sun, dark: Moon }

/** 누를 때마다 시스템 → 라이트 → 다크 순으로 바뀐다. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const Icon = ICON[theme]

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={`테마: ${LABEL[theme]}. 눌러서 ${LABEL[NEXT[theme]]}(으)로 바꾸기`}
      title={LABEL[theme]}
    >
      <Icon strokeWidth={1.5} />
    </Button>
  )
}
