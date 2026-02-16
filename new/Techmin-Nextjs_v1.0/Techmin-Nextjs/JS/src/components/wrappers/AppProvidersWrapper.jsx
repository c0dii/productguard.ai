'use client';

import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TitleProvider } from '@/context/useTitleContext';
import { NotificationProvider } from '@/context/useNotificationContext';
const LayoutProvider = dynamic(() => import('@/context/useLayoutContext').then(mod => mod.LayoutProvider), {
  ssr: false
});
const AppProvidersWrapper = ({
  children
}) => {
  useEffect(() => {
    const splashElement = document.querySelector('#__next_splash');
    const splashScreen = document.querySelector('#splash-screen');
    if (!splashElement || !splashScreen) return;
    const handleMutations = mutationsList => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && splashElement.hasChildNodes()) {
          splashScreen.classList.add('remove');
        }
      }
    };
    const observer = new MutationObserver(handleMutations);
    observer.observe(splashElement, {
      childList: true,
      subtree: true
    });
    if (splashElement.hasChildNodes()) {
      splashScreen.classList.add('remove');
    }
    return () => observer.disconnect();
  }, []);
  return <SessionProvider>
      <LayoutProvider>
        <TitleProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </TitleProvider>
      </LayoutProvider>
    </SessionProvider>;
};
export default AppProvidersWrapper;