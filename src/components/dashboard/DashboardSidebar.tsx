'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import type { Profile } from '@/types';
import type { BadgeCounts } from './MobileDashboardLayout';

interface DashboardSidebarProps {
  profile: Profile;
  onNavigate?: () => void;
  badgeCounts?: BadgeCounts;
}

export function DashboardSidebar({ profile, onNavigate, badgeCounts }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: '📊', badge: 0 },
    { name: 'Products', href: '/dashboard/products', icon: '📦', badge: 0 },
    { name: 'Scans', href: '/dashboard/scans', icon: '🔍', badge: 0 },
    { name: 'Infringements', href: '/dashboard/infringements', icon: '🚨', badge: badgeCounts?.infringements ?? 0 },
    { name: 'Ready to Send', href: '/dashboard/ready-for-takedown', icon: '📋', badge: badgeCounts?.readyForTakedown ?? 0 },
    { name: 'Takedowns', href: '/dashboard/takedowns', icon: '⚡', badge: 0 },
    { name: 'Settings', href: '/dashboard/settings', icon: '⚙️', badge: 0 },
  ];

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="w-64 min-h-screen bg-pg-surface backdrop-blur-xl border-r border-pg-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-pg-border">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
            P
          </div>
          <span className="text-lg font-bold text-pg-text">
            ProductGuard<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">.ai</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-pg-text border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                  : 'text-pg-text-muted hover:text-pg-text hover:bg-pg-surface-light'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium flex-1">{item.name}</span>
              {item.badge > 0 && (
                <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[11px] font-bold rounded-full bg-pg-accent/20 text-pg-accent border border-pg-accent/30">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-pg-border">
        <div className="mb-4 p-3 rounded-lg bg-pg-surface-light backdrop-blur-sm">
          <div className="text-sm font-medium text-pg-text truncate">
            {profile.full_name || profile.email}
          </div>
          <div className="text-xs text-pg-text-muted truncate">{profile.email}</div>
          <div className="mt-2">
            <Badge variant={profile.plan_tier} className="capitalize bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30">
              {profile.plan_tier}
            </Badge>
          </div>
        </div>

        {profile.is_admin && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className="flex items-center gap-2 w-full px-4 py-2 mb-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-all duration-300"
          >
            <span className="text-base">🛡️</span>
            Admin Panel
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-sm font-medium text-pg-text-muted hover:text-pg-text hover:bg-pg-surface-light rounded-lg transition-all duration-300"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
