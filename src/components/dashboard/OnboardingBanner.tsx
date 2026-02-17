'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OnboardingBannerProps {
  productCount: number;
  hasScanRun: boolean;
}

const STORAGE_KEY = 'pg_onboarding_dismissed';

export function OnboardingBanner({ productCount, hasScanRun }: OnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  // Don't show if dismissed or if user has completed the workflow
  if (dismissed || (productCount > 0 && hasScanRun)) return null;

  // Determine which message to show
  const hasProducts = productCount > 0;

  return (
    <div className="mb-6 p-4 sm:p-6 rounded-xl bg-gradient-to-r from-pg-accent/10 via-blue-500/10 to-purple-500/10 border border-pg-accent/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {!hasProducts ? (
            <>
              <h3 className="text-base sm:text-lg font-semibold text-pg-text mb-2">
                Welcome to ProductGuard!
              </h3>
              <p className="text-sm text-pg-text-muted mb-4">
                Protect your digital products in 4 simple steps:
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-pg-text-muted mb-4">
                <span><span className="font-semibold text-pg-accent">1.</span> Add your product</span>
                <span><span className="font-semibold text-pg-accent">2.</span> Run a scan</span>
                <span><span className="font-semibold text-pg-accent">3.</span> Review threats</span>
                <span><span className="font-semibold text-pg-accent">4.</span> Send takedown notices</span>
              </div>
              <Link
                href="/dashboard/products"
                className="inline-flex items-center gap-2 px-4 py-2 bg-pg-accent text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Add Your First Product
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-base sm:text-lg font-semibold text-pg-text mb-2">
                You're almost there!
              </h3>
              <p className="text-sm text-pg-text-muted mb-4">
                Run your first scan to start detecting infringements of your products.
              </p>
              <Link
                href="/dashboard/products"
                className="inline-flex items-center gap-2 px-4 py-2 bg-pg-accent text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Go to Products
              </Link>
            </>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="text-pg-text-muted hover:text-pg-text transition-colors p-1 shrink-0"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
