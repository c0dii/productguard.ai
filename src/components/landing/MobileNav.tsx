'use client';

import { useState } from 'react';
import Link from 'next/link';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-pg-text-muted hover:text-pg-text transition-colors"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-pg-surface/95 backdrop-blur-xl border-b border-pg-border">
          <div className="px-4 py-6 space-y-4">
            <a href="#problem" onClick={() => setOpen(false)} className="block text-pg-text-muted hover:text-pg-text transition-colors">
              Why ProductGuard
            </a>
            <a href="#features" onClick={() => setOpen(false)} className="block text-pg-text-muted hover:text-pg-text transition-colors">
              Features
            </a>
            <a href="#how-it-works" onClick={() => setOpen(false)} className="block text-pg-text-muted hover:text-pg-text transition-colors">
              How It Works
            </a>
            <a href="#pricing" onClick={() => setOpen(false)} className="block text-pg-text-muted hover:text-pg-text transition-colors">
              Pricing
            </a>
            <a href="#faq" onClick={() => setOpen(false)} className="block text-pg-text-muted hover:text-pg-text transition-colors">
              FAQ
            </a>
            <div className="pt-4 border-t border-pg-border space-y-3">
              <Link href="/auth/login" onClick={() => setOpen(false)} className="block text-pg-text-muted hover:text-pg-text transition-colors">
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setOpen(false)}
                className="block text-center px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold"
              >
                Scan for Piracy — Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
