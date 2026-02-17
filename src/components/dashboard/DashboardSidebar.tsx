'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import type { Profile } from '@/types';

interface DashboardSidebarProps {
  profile: Profile;
  onNavigate?: () => void;
}

export function DashboardSidebar({ profile, onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: '📊' },
    { name: 'Products', href: '/dashboard/products', icon: '📦' },
    { name: 'Scans', href: '/dashboard/scans', icon: '🔍' },
    { name: 'Infringements', href: '/dashboard/infringements', icon: '🚨' },
    { name: 'Takedowns', href: '/dashboard/takedowns', icon: '⚡' },
    { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
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
          const isActive = pathname === item.href;
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
              <span className="font-medium">{item.name}</span>
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

        {/* Theme Toggle - Temporarily removed to fix context issue */}

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
