'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import type { AdminAlertCounts } from '@/types';

interface AdminSidebarProps {
  profile: {
    email: string;
    full_name: string | null;
  };
  alertCounts?: AdminAlertCounts | null;
  onNavigate?: () => void;
}

const scansSubItems = [
  { href: '/admin/scans', label: 'Scan Activity', exact: true },
  { href: '/admin/scans/scan-learning', label: 'Scan Learning' },
  { href: '/admin/scans/scan-logs', label: 'Scan Logs' },
];

const dataSubItems = [
  { href: '/admin/data', label: 'Health Overview', exact: true },
  { href: '/admin/data/api-logs', label: 'API Logs' },
  { href: '/admin/data/system-events', label: 'System Events' },
  { href: '/admin/data/errors', label: 'Error Tracking' },
  { href: '/admin/data/dmca-logs', label: 'DMCA Logs' },
  { href: '/admin/data/export', label: 'Export' },
];

export function AdminSidebar({ profile, alertCounts, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const isScansActive = pathname.startsWith('/admin/scans');
  const [scansOpen, setScansOpen] = useState(isScansActive);
  const isDataActive = pathname.startsWith('/admin/data');
  const [dataOpen, setDataOpen] = useState(isDataActive);

  const navItems = [
    { href: '/admin', label: 'Overview', icon: '\ud83d\udcca', exact: true },
    { href: '/admin/users', label: 'Users', icon: '\ud83d\udc65' },
    { href: '/admin/subscriptions', label: 'Subscriptions', icon: '\ud83d\udcb3' },
    { href: '/admin/infringements', label: 'Infringements', icon: '\u26a0\ufe0f' },
    { href: '/admin/takedowns', label: 'Takedowns', icon: '\ud83d\udce7' },
    { href: '/admin/marketing', label: 'Marketing', icon: '\ud83d\udce3' },
    { href: '/admin/intelligence', label: 'Intelligence', icon: '\ud83e\udde0' },
  ];

  const isActive = (href: string, exact: boolean = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const totalAlerts = alertCounts?.total_unresolved || 0;
  const criticalAlerts = alertCounts?.critical_count || 0;

  return (
    <aside className="w-64 min-h-screen bg-pg-surface border-r border-pg-border flex flex-col">
      {/* Logo & Badge */}
      <div className="p-6 border-b border-pg-border">
        <Link href="/admin" className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pg-accent to-blue-500 flex items-center justify-center">
            <span className="text-xl font-bold">{'\ud83d\udee1\ufe0f'}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">ProductGuard</h1>
            <p className="text-xs text-pg-text-muted">Admin Dashboard</p>
          </div>
        </Link>
        <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg px-3 py-1.5">
          <p className="text-xs text-red-400 font-semibold">{'\u26a1'} ADMIN MODE</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`
              block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${
                isActive(item.href, item.exact)
                  ? 'bg-pg-accent bg-opacity-10 text-pg-accent border border-pg-accent'
                  : 'text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text'
              }
            `}
          >
            {item.icon} {item.label}
          </Link>
        ))}

        {/* Scans Collapsible Group */}
        <div className="pt-2">
          <button
            onClick={() => setScansOpen(!scansOpen)}
            className={`
              w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${
                isScansActive
                  ? 'bg-pg-accent bg-opacity-10 text-pg-accent border border-pg-accent'
                  : 'text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text'
              }
            `}
          >
            <span>{'\ud83d\udd0d'} Scans</span>
            <svg
              className={`w-4 h-4 transition-transform ${scansOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {scansOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-pg-border pl-3">
              {scansSubItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`
                    block px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${
                      isActive(item.href, item.exact)
                        ? 'text-pg-accent bg-pg-accent bg-opacity-5'
                        : 'text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text'
                    }
                  `}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Data Collapsible Group */}
        <div className="pt-2">
          <button
            onClick={() => setDataOpen(!dataOpen)}
            className={`
              w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${
                isDataActive
                  ? 'bg-pg-accent bg-opacity-10 text-pg-accent border border-pg-accent'
                  : 'text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text'
              }
            `}
          >
            <span className="flex items-center gap-2">
              {'\ud83d\udcc0'} Data
              {totalAlerts > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full ${
                  criticalAlerts > 0
                    ? 'bg-red-500 text-white'
                    : 'bg-yellow-500 text-black'
                }`}>
                  {totalAlerts}
                </span>
              )}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${dataOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dataOpen && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-pg-border pl-3">
              {dataSubItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`
                    block px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${
                      isActive(item.href, item.exact)
                        ? 'text-pg-accent bg-pg-accent bg-opacity-5'
                        : 'text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text'
                    }
                  `}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-pg-border mt-4">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="block px-4 py-2.5 rounded-lg text-sm font-medium text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text transition-colors"
          >
            {'\u2190'} Back to User Dashboard
          </Link>
        </div>
      </nav>

      {/* Admin Profile */}
      <div className="p-4 border-t border-pg-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <span className="text-sm font-bold">
              {profile.email.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {profile.full_name || profile.email}
            </p>
            <p className="text-xs text-pg-text-muted truncate">Administrator</p>
          </div>
        </div>

        <form action="/api/auth/logout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full text-xs"
          >
            {'\ud83d\udeaa'} Logout
          </Button>
        </form>
      </div>
    </aside>
  );
}
