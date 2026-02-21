'use client';

import { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import type { AdminAlertCounts } from '@/types';

interface MobileAdminLayoutProps {
  profile: {
    email: string;
    full_name: string | null;
  };
  alertCounts?: AdminAlertCounts | null;
  children: React.ReactNode;
}

export function MobileAdminLayout({ profile, alertCounts, children }: MobileAdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-pg-bg relative">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-lg bg-pg-surface backdrop-blur-sm border border-pg-border text-pg-text hover:bg-pg-surface-light transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
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
        <AdminSidebar profile={profile} alertCounts={alertCounts} onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="lg:ml-64 px-3 py-3 sm:p-6 lg:p-8 min-w-0">
        <div className="lg:mt-0 mt-12">
          {children}
        </div>
      </main>
    </div>
  );
}
