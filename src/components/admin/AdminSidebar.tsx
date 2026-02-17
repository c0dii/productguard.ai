'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface AdminSidebarProps {
  profile: {
    email: string;
    full_name: string | null;
  };
}

export function AdminSidebar({ profile }: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: '📊 Overview', exact: true },
    { href: '/admin/users', label: '👥 Users' },
    { href: '/admin/subscriptions', label: '💳 Subscriptions' },
    { href: '/admin/scans', label: '🔍 Scans' },
    { href: '/admin/scan-logs', label: '📝 Scan Logs' },
    { href: '/admin/infringements', label: '⚠️ Infringements' },
    { href: '/admin/takedowns', label: '📧 Takedowns' },
    { href: '/admin/dmca-logs', label: '📋 DMCA Logs' },
    { href: '/admin/system', label: '⚙️ System' },
  ];

  const isActive = (href: string, exact: boolean = false) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-pg-surface border-r border-pg-border flex flex-col">
      {/* Logo & Badge */}
      <div className="p-6 border-b border-pg-border">
        <Link href="/admin" className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pg-accent to-blue-500 flex items-center justify-center">
            <span className="text-xl font-bold">🛡️</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">ProductGuard</h1>
            <p className="text-xs text-pg-text-muted">Admin Dashboard</p>
          </div>
        </Link>
        <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg px-3 py-1.5">
          <p className="text-xs text-red-400 font-semibold">⚡ ADMIN MODE</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${
                isActive(item.href, item.exact)
                  ? 'bg-pg-accent bg-opacity-10 text-pg-accent border border-pg-accent'
                  : 'text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text'
              }
            `}
          >
            {item.label}
          </Link>
        ))}

        <div className="pt-4 border-t border-pg-border mt-4">
          <Link
            href="/dashboard"
            className="block px-4 py-2.5 rounded-lg text-sm font-medium text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text transition-colors"
          >
            ← Back to User Dashboard
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
            🚪 Logout
          </Button>
        </form>
      </div>
    </aside>
  );
}
