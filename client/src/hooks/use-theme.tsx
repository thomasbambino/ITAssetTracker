import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Get theme from localStorage or default to 'light'
    return (localStorage.getItem('theme') as Theme) || 'light';
  });
  
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  
  // Determine the current active theme (actual theme applied)
  const activeTheme = theme === 'system' ? systemTheme : theme;
  
  // Update the current theme in DOM and localStorage
  useEffect(() => {
    // Update localStorage
    localStorage.setItem('theme', theme);
    
    // Update data-theme attribute on document
    const root = document.documentElement;
    
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
      if (isDark) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.setAttribute('data-theme', 'light');
      }
    } else {
      root.classList.toggle('dark', theme === 'dark');
      root.setAttribute('data-theme', theme);
    }
  }, [theme, systemTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Set the theme
  const setMode = (mode: Theme) => {
    setTheme(mode);
  };
  
  return {
    theme,
    systemTheme,
    activeTheme,
    setTheme: setMode
  };
}