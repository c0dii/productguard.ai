import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch dashboard stats
  const { data: stats } = await supabase
    .from('user_dashboard_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Fetch recent scans
  const { data: recentScans } = await supabase
    .from('scans')
    .select('*, products(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch active verified infringements count
  const { count: activeInfringementsCount } = await supabase
    .from('infringements')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('status', ['active', 'takedown_sent', 'disputed']);

  const statCards = [
    {
      label: 'Total Products',
      value: stats?.total_products || 0,
      icon: '📦',
      color: 'text-pg-accent',
      href: '/dashboard/products',
    },
    {
      label: 'Total Scans',
      value: stats?.total_scans || 0,
      icon: '🔍',
      color: 'text-blue-400',
      href: '/dashboard/scans',
    },
    {
      label: 'Active (Verified)',
      value: activeInfringementsCount || 0,
      icon: '🚨',
      color: 'text-pg-danger',
      href: '/dashboard/infringements',
    },
    {
      label: 'Takedowns Sent',
      value: stats?.total_takedowns || 0,
      icon: '⚡',
      color: 'text-pg-warning',
      href: '/dashboard/takedowns',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-pg-text">Dashboard Overview</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          Monitor your digital products and protect them from piracy
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="group relative p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border hover:bg-pg-surface-light hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer">
              <div className="flex items-center gap-4">
                <div className={`text-4xl ${stat.color}`}>{stat.icon}</div>
                <div>
                  <p className="text-sm text-pg-text-muted uppercase tracking-wide mb-1">
                    {stat.label}
                  </p>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6 sm:mb-8 p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-pg-text">Quick Actions</h2>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
          <Link href="/dashboard/products" className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto">📦 Add Product</Button>
          </Link>
          <Link href="/dashboard/scans" className="flex-1 sm:flex-none">
            <Button variant="secondary" className="w-full sm:w-auto">🔍 View Scans</Button>
          </Link>
          <Link href="/dashboard/takedowns" className="flex-1 sm:flex-none">
            <Button variant="secondary" className="w-full sm:w-auto">⚡ Manage Takedowns</Button>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-pg-text">Recent Scans</h2>
          <Link href="/dashboard/scans" className="text-sm bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent hover:from-cyan-300 hover:to-blue-400 transition-all">
            View all →
          </Link>
        </div>

        {!recentScans || recentScans.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-pg-text-muted mb-4">No scans yet</p>
            <p className="text-sm text-pg-text-muted mb-4">
              Add a product and run your first piracy scan
            </p>
            <Link href="/dashboard/products">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentScans.map((scan: any) => (
              <div
                key={scan.id}
                className="flex items-center justify-between p-4 rounded-lg bg-pg-surface-light backdrop-blur-sm border border-pg-border hover:bg-pg-surface-light hover:border-cyan-500/30 transition-all duration-300"
              >
                <div>
                  <p className="font-medium text-pg-text">{scan.products?.name || 'Unknown Product'}</p>
                  <p className="text-sm text-pg-text-muted">
                    {new Date(scan.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      scan.status === 'completed'
                        ? 'text-cyan-400'
                        : scan.status === 'failed'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    {scan.status}
                  </p>
                  <p className="text-sm text-pg-text-muted">
                    {scan.infringement_count} infringements
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
