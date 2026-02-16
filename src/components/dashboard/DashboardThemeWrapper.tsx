'use client';

import { ThemeProvider } from '@/contexts/ThemeContext';
import type { Profile } from '@/types';

interface DashboardThemeWrapperProps {
  profile: Profile;
  children: React.ReactNode;
}

export function DashboardThemeWrapper({ profile, children }: DashboardThemeWrapperProps) {
  const initialTheme = (profile.theme as 'light' | 'dark' | 'system') || 'dark';

  return <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>;
}
