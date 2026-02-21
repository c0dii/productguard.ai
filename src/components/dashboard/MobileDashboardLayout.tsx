'use client';

import { useState } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import type { Profile } from '@/types';

export interface BadgeCounts {
  infringements: number;
  readyForTakedown: number;
}

interface MobileDashboardLayoutProps {
  profile: Profile;
  children: React.ReactNode;
  badgeCounts?: BadgeCounts;
}

export function MobileDashboardLayout({ profile, children, badgeCounts }: MobileDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-pg-bg relative">
      {/* Gradient Mesh Background - only visible in dark mode */}
      <div className="fixed inset-0 -z-10 dark-only overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/10 via-cyan-500/10 to-teal-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-lg bg-pg-surface backdrop-blur-sm border border-pg-border text-pg-text hover:bg-pg-surface-light transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 dark:bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - fixed on desktop, slide-in on mobile */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 h-screen
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <DashboardSidebar profile={profile} onNavigate={() => setSidebarOpen(false)} badgeCounts={badgeCounts} />
      </div>

      {/* Main Content - offset by sidebar width on desktop */}
      <main className="lg:ml-64 px-3 py-3 sm:p-6 lg:p-8 min-w-0 lg:max-w-[calc(100%-16rem)]">
        {/* Add top padding on mobile to account for menu button */}
        <div className="lg:mt-0 mt-12">
          {children}
        </div>
      </main>
    </div>
  );
}
