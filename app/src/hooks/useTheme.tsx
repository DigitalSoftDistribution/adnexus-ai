// @ts-nocheck
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'

type Theme = 'dark' | 'light' | 'system'
type ResolvedTheme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: ResolvedTheme
  accentColor: string
  setAccentColor: (color: string) => void
  fontSize: number
  setFontSize: (size: number) => void
  reducedMotion: boolean
  setReducedMotion: (reduced: boolean) => void
  density: 'compact' | 'default' | 'comfortable'
  setDensity: (density: 'compact' | 'default' | 'comfortable') => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  resolvedTheme: 'dark',
  accentColor: '#c3f53b',
  setAccentColor: () => {},
  fontSize: 14,
  setFontSize: () => {},
  reducedMotion: false,
  setReducedMotion: () => {},
  density: 'default',
  setDensity: () => {},
})

const STORAGE_KEY = 'adnexus-theme'
const ACCENT_KEY = 'adnexus-accent-color'
const FONT_SIZE_KEY = 'adnexus-font-size'
const REDUCED_MOTION_KEY = 'adnexus-reduced-motion'
const DENSITY_KEY = 'adnexus-density'

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  } catch {}
  return 'dark'
}

function getInitialAccent(): string {
  try {
    const stored = localStorage.getItem(ACCENT_KEY)
    if (stored) return stored
  } catch {}
  return '#c3f53b'
}

function getInitialFontSize(): number {
  try {
    const stored = localStorage.getItem(FONT_SIZE_KEY)
    if (stored) {
      const n = parseInt(stored, 10)
      if (!isNaN(n)) return Math.min(18, Math.max(12, n))
    }
  } catch {}
  return 14
}

function getInitialReducedMotion(): boolean {
  try {
    const stored = localStorage.getItem(REDUCED_MOTION_KEY)
    return stored === 'true'
  } catch {}
  return false
}

function getInitialDensity(): 'compact' | 'default' | 'comfortable' {
  try {
    const stored = localStorage.getItem(DENSITY_KEY)
    if (stored === 'compact' || stored === 'comfortable') return stored
  } catch {}
  return 'default'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    getInitialTheme() === 'system' ? getSystemTheme() : getInitialTheme() as ResolvedTheme
  )
  const [accentColor, setAccentColorState] = useState<string>(getInitialAccent)
  const [fontSize, setFontSizeState] = useState<number>(getInitialFontSize)
  const [reducedMotion, setReducedMotionState] = useState<boolean>(getInitialReducedMotion)
  const [density, setDensityState] = useState<'compact' | 'default' | 'comfortable'>(getInitialDensity)

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    const resolved = theme === 'system' ? getSystemTheme() : theme
    setResolvedTheme(resolved)

    root.classList.remove('dark', 'light')
    root.classList.add(resolved)
    root.setAttribute('data-theme', resolved)

    // Also set data attribute for Tailwind dark mode
    if (resolved === 'dark') {
      root.style.colorScheme = 'dark'
    } else {
      root.style.colorScheme = 'light'
    }
  }, [theme])

  // Listen to system preference changes
  useEffect(() => {
    if (theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light'
      setResolvedTheme(resolved)
      const root = document.documentElement
      root.classList.remove('dark', 'light')
      root.classList.add(resolved)
      root.setAttribute('data-theme', resolved)
      root.style.colorScheme = resolved
    }

    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  // Apply accent color
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent', accentColor)
    root.style.setProperty('--accent-lime', accentColor)

    // Compute hover and glow variants
    root.style.setProperty('--accent-hover', accentColor)
    root.style.setProperty('--accent-glow', hexToRgba(accentColor, 0.15))
    root.style.setProperty('--accent-glow-strong', hexToRgba(accentColor, 0.3))
    root.style.setProperty('--ring', accentColor)

    // Update selection color
    const style = document.getElementById('theme-selection-style')
    if (style) {
      style.textContent = `
        ::selection {
          background: ${hexToRgba(accentColor, 0.25)} !important;
          color: ${resolvedTheme === 'dark' ? '#fff' : '#000'} !important;
        }
      `
    } else {
      const newStyle = document.createElement('style')
      newStyle.id = 'theme-selection-style'
      newStyle.textContent = `
        ::selection {
          background: ${hexToRgba(accentColor, 0.25)} !important;
          color: ${resolvedTheme === 'dark' ? '#fff' : '#000'} !important;
        }
      `
      document.head.appendChild(newStyle)
    }
  }, [accentColor, resolvedTheme])

  // Apply font size
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--font-size-base', `${fontSize}px`)
    root.style.fontSize = `${fontSize}px`
  }, [fontSize])

  // Apply reduced motion
  useEffect(() => {
    const root = document.documentElement
    if (reducedMotion) {
      root.classList.add('reduced-motion')
      root.style.setProperty('--animation-duration-scale', '0.01')
    } else {
      root.classList.remove('reduced-motion')
      root.style.setProperty('--animation-duration-scale', '1')
    }
  }, [reducedMotion])

  // Apply density
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-density', density)
    const densities = { compact: '0.5', default: '1', comfortable: '1.5' }
    root.style.setProperty('--density-scale', densities[density])
  }, [density])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch {}
  }, [])

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color)
    try {
      localStorage.setItem(ACCENT_KEY, color)
    } catch {}
  }, [])

  const setFontSize = useCallback((size: number) => {
    const clamped = Math.min(18, Math.max(12, size))
    setFontSizeState(clamped)
    try {
      localStorage.setItem(FONT_SIZE_KEY, String(clamped))
    } catch {}
  }, [])

  const setReducedMotion = useCallback((reduced: boolean) => {
    setReducedMotionState(reduced)
    try {
      localStorage.setItem(REDUCED_MOTION_KEY, String(reduced))
    } catch {}
  }, [])

  const setDensity = useCallback((d: 'compact' | 'default' | 'comfortable') => {
    setDensityState(d)
    try {
      localStorage.setItem(DENSITY_KEY, d)
    } catch {}
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      accentColor,
      setAccentColor,
      fontSize,
      setFontSize,
      reducedMotion,
      setReducedMotion,
      density,
      setDensity,
    }),
    [theme, setTheme, resolvedTheme, accentColor, setAccentColor, fontSize, setFontSize, reducedMotion, setReducedMotion, density, setDensity]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

// Helper: hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const sanitized = hex.replace('#', '')
  const bigint = parseInt(sanitized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r},${g},${b},${alpha})`
}

// Accent color presets
export const ACCENT_COLORS = [
  { name: 'Lime', value: '#c3f53b', hue: '75' },
  { name: 'Blue', value: '#3B82F6', hue: '217' },
  { name: 'Purple', value: '#8B5CF6', hue: '258' },
  { name: 'Orange', value: '#F97316', hue: '24' },
  { name: 'Pink', value: '#EC4899', hue: '330' },
  { name: 'Teal', value: '#14B8A6', hue: '168' },
] as const

export const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
  { value: 'dark', label: 'Dark', description: 'Deep blacks, high contrast' },
  { value: 'light', label: 'Light', description: 'Clean whites, subtle grays' },
  { value: 'system', label: 'System', description: 'Follows your OS setting' },
]

export const DENSITY_OPTIONS: { value: 'compact' | 'default' | 'comfortable'; label: string; description: string }[] = [
  { value: 'compact', label: 'Compact', description: 'Tight spacing, more content' },
  { value: 'default', label: 'Default', description: 'Balanced spacing' },
  { value: 'comfortable', label: 'Comfortable', description: 'Relaxed, airy layout' },
]
