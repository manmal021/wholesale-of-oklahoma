import { useState, useEffect, useCallback } from 'react';
import { getCurrentTheme, setTheme as setGlobalTheme, toggleTheme as toggleGlobalTheme, type ThemeMode } from './theme';

export function useTheme() {
  const [theme, setLocalTheme] = useState<ThemeMode>(() => getCurrentTheme());

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ theme: ThemeMode }>;
      if (customEvent.detail && customEvent.detail.theme) {
        setLocalTheme(customEvent.detail.theme);
      } else {
        setLocalTheme(getCurrentTheme());
      }
    };

    window.addEventListener('woo-theme-change', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);

    // Also respond to system preferences if not manually overridden
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const saved = localStorage.getItem('woo_theme');
      if (!saved) {
        const next = mediaQuery.matches ? 'dark' : 'light';
        setGlobalTheme(next);
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      window.removeEventListener('woo-theme-change', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = toggleGlobalTheme();
    setLocalTheme(next);
    return next;
  }, []);

  const set = useCallback((newTheme: ThemeMode) => {
    setGlobalTheme(newTheme);
    setLocalTheme(newTheme);
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme: toggle,
    setTheme: set,
  };
}
