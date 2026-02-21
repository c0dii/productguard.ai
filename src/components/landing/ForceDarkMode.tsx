'use client';

import { useEffect } from 'react';

export function ForceDarkMode() {
  useEffect(() => {
    const html = document.documentElement;
    const previousTheme = html.getAttribute('data-theme');
    html.setAttribute('data-theme', 'dark');

    return () => {
      if (previousTheme) {
        html.setAttribute('data-theme', previousTheme);
      }
    };
  }, []);

  return null;
}
