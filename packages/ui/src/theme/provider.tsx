import React, { createContext, useContext, useState, useCallback } from 'react';

interface ThemeContextValue {
  accentColor: string;
  setAccentColor: (color: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
  density: 'compact' | 'default' | 'comfortable';
  setDensity: (density: 'compact' | 'default' | 'comfortable') => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColor] = useState('#c3f53b');
  const [fontSize, setFontSize] = useState(16);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [density, setDensity] = useState<'compact' | 'default' | 'comfortable'>('default');

  const handleSetAccentColor = useCallback((color: string) => {
    setAccentColor(color);
    document.documentElement.style.setProperty('--accent-color', color);
  }, []);

  const handleSetFontSize = useCallback((size: number) => {
    setFontSize(size);
    document.documentElement.style.setProperty('--base-font-size', `${size}px`);
  }, []);

  const handleSetReducedMotion = useCallback((reduced: boolean) => {
    setReducedMotion(reduced);
    document.documentElement.classList.toggle('reduce-motion', reduced);
  }, []);

  const handleSetDensity = useCallback((d: 'compact' | 'default' | 'comfortable') => {
    setDensity(d);
    document.documentElement.setAttribute('data-density', d);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        accentColor,
        setAccentColor: handleSetAccentColor,
        fontSize,
        setFontSize: handleSetFontSize,
        reducedMotion,
        setReducedMotion: handleSetReducedMotion,
        density,
        setDensity: handleSetDensity,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
