'use client';

import { useEffect, useCallback, useRef, type ReactNode } from 'react';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

const WIDTH_CLASSES = {
  md: 'sm:max-w-[480px]',
  lg: 'sm:max-w-[640px]',
  xl: 'sm:max-w-[50vw]',
};

export function SlideOver({ isOpen, onClose, title, children, width = 'lg' }: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
      // Move focus into the panel
      setTimeout(() => panelRef.current?.focus(), 0);
    } else {
      // Return focus to trigger element
      triggerRef.current?.focus();
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEsc]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slideover-title"
        tabIndex={-1}
        className={`fixed inset-y-0 right-0 z-50 w-full ${WIDTH_CLASSES[width]} bg-pg-surface border-l border-pg-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out focus:outline-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-pg-border shrink-0">
          <h2 id="slideover-title" className="text-lg font-bold text-pg-text truncate pr-4">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="p-1.5 rounded-lg text-pg-text-muted hover:text-pg-text hover:bg-pg-surface-light transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}
