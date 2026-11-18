import { useEffect, useState } from 'react';
import type { ThemeMode } from '../types/workspace';

const THEME_STORAGE_KEY = 'sp_npo_theme';

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') {
      return raw;
    }
  } catch {
    // Ignore storage access issues
  }
  return 'system';
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function applyThemeMode(mode: ThemeMode): 'light' | 'dark' {
  const resolved = resolveTheme(mode);
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }
  return resolved;
}

export function useThemeMode(): {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setThemeMode: (next: ThemeMode) => void;
  toggleLightDark: () => void;
} {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    getStoredThemeMode()
  );
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveTheme(getStoredThemeMode())
  );

  useEffect(() => {
    setResolvedTheme(applyThemeMode(themeMode));

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore storage write errors
    }

    if (themeMode !== 'system' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setResolvedTheme(applyThemeMode('system'));
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  function setThemeMode(next: ThemeMode) {
    setThemeModeState(next);
  }

  function toggleLightDark() {
    setThemeModeState((prev) => {
      const current = resolveTheme(prev);
      return current === 'dark' ? 'light' : 'dark';
    });
  }

  return { themeMode, resolvedTheme, setThemeMode, toggleLightDark };
}
