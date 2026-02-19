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
        <div className="text-center py-10 px-6">
          {/* Simple search icon - no spinning/pinging */}
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <p className="text-lg font-semibold text-pg-text mb-2">
            Scan in progress
          </p>
          <p className="text-sm text-pg-text-muted mb-5 max-w-md mx-auto">
            Searching for unauthorized copies of
            <span className="text-pg-accent font-medium"> {productName}</span>.
            Results will appear here automatically as they are found.
          </p>

          {/* Rotating status message - subtle, single dot */}
          <div className="flex items-center justify-center gap-2 text-sm text-pg-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="transition-opacity duration-500">
              {SCANNING_MESSAGES[messageIndex]}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
