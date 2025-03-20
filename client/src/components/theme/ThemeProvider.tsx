import { createContext, useContext, ReactNode } from 'react';
import { useTheme } from '@/hooks/use-theme';

type ThemeProviderProps = {
  children: ReactNode;
};

type ThemeContextType = {
  theme: 'light' | 'dark' | 'system';
  activeTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeHook = useTheme();
  
  return (
    <ThemeContext.Provider
      value={{
        theme: themeHook.theme,
        activeTheme: themeHook.activeTheme,
        setTheme: themeHook.setTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  
  return context;
}