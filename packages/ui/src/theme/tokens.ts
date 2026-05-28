export const tokens = {
  colors: {
    background: {
      primary: '#050505',
      secondary: '#0a0a0a',
      elevated: '#111111',
      hover: '#1a1a1a',
      card: '#111111',
      popover: '#161616',
    },
    foreground: {
      primary: '#f5f5f5',
      muted: '#a1a1aa',
      subtle: '#52525b',
    },
    accent: {
      DEFAULT: '#c3f53b',
      hover: '#b1e32a',
      glow: 'rgba(195,245,59,0.15)',
      glowStrong: 'rgba(195,245,59,0.3)',
    },
    border: {
      DEFAULT: 'rgba(255,255,255,0.08)',
      hover: 'rgba(255,255,255,0.12)',
    },
    status: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    platform: {
      meta: '#1877f2',
      google: '#4285f4',
      tiktok: '#ff0050',
      snap: '#fffc00',
      linkedin: '#0a66c2',
    },
  },
  typography: {
    fontFamily: {
      sans: "'Inter', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
  },
  spacing: {
    sidebar: '280px',
    sidebarCollapsed: '72px',
    navbar: '64px',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.3)',
    md: '0 4px 6px rgba(0,0,0,0.4)',
    lg: '0 10px 15px rgba(0,0,0,0.5)',
    glow: '0 0 20px rgba(195,245,59,0.15)',
  },
  animation: {
    ease: {
      outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
      inOutExpo: 'cubic-bezier(0.87, 0, 0.13, 1)',
    },
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
    },
  },
} as const;

export type Tokens = typeof tokens;
