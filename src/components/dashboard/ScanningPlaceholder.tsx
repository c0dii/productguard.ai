'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';

interface ScanningPlaceholderProps {
  productName: string;
}

const SCANNING_MESSAGES = [
  'Searching Google for unauthorized copies',
  'Scanning marketplace platforms',
  'Analyzing content signatures',
  'Checking torrent networks',
  'Investigating file sharing sites',
  'Monitoring social media platforms',
  'Cross-referencing known piracy domains',
  'Analyzing search engine results',
];

export function ScanningPlaceholder({ productName }: ScanningPlaceholderProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % SCANNING_MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Active Infringements</h2>
      <Card>
        <div className="text-center py-12 px-6">
          {/* Animated radar/search icon */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-2 rounded-full border-2 border-cyan-400/30 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <p className="text-lg font-semibold text-pg-text mb-2">
            Scanning the internet for unauthorized copies
          </p>
          <p className="text-sm text-pg-text-muted mb-6 max-w-md mx-auto">
            We&apos;re scouring the internet for anyone who may have stolen or redistributed
            <span className="text-pg-accent font-medium"> {productName}</span>.
            This page will update automatically when results are found.
          </p>

          {/* Rotating status message */}
          <div className="flex items-center justify-center gap-2 text-sm text-pg-text-muted">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="transition-opacity duration-500">
              {SCANNING_MESSAGES[messageIndex]}...
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
