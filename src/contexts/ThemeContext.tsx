'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

type ThemePreference = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  initialTheme
}: {
  children: ReactNode;
  initialTheme?: ThemePreference;
}) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme || 'dark');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  // Get the actual theme to apply (resolve 'system' to 'dark' or 'light')
  const getResolvedTheme = (themePreference: ThemePreference): ResolvedTheme => {
    if (themePreference === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'dark'; // fallback for SSR
    }
    return themePreference;
  };

  useEffect(() => {
    setMounted(true);

    // Check localStorage first, then initialTheme, then default to 'dark'
    const savedTheme = (typeof window !== 'undefined' ? localStorage.getItem('theme') : null) as ThemePreference | null;
    const currentTheme = savedTheme || initialTheme || 'dark'; // Changed default from 'system' to 'dark'
    setThemeState(currentTheme);
    const resolved = getResolvedTheme(currentTheme);
    setResolvedTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setThemeState((currentTheme) => {
        if (currentTheme === 'system') {
          const newResolved = e.matches ? 'dark' : 'light';
          setResolvedTheme(newResolved);
          document.documentElement.setAttribute('data-theme', newResolved);
        }
        return currentTheme;
      });
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [initialTheme]);

  const setTheme = async (newTheme: ThemePreference) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    const resolved = getResolvedTheme(newTheme);
    setResolvedTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);

    // Save to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ theme: newTheme })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Failed to save theme to database:', error);
    }
  };

  // Prevent flash of incorrect theme
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
