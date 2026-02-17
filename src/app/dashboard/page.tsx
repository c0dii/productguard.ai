import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { DashboardNeedsReview } from '@/components/dashboard/DashboardNeedsReview';
import { OnboardingCard } from '@/components/dashboard/OnboardingCard';
import { OnboardingBanner } from '@/components/dashboard/OnboardingBanner';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch all data in parallel
  const [
    { data: stats },
    { count: activeInfringementsCount },
    { count: pendingCount },
    { data: pendingInfringements },
    { data: products },
    { data: recentActivity },
    { data: userProfile },
  ] = await Promise.all([
    // Dashboard stats
    supabase
      .from('user_dashboard_stats')
      .select('*')
      .eq('user_id', user.id)
      .single(),
    // Active verified infringements count
    supabase
      .from('infringements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['active', 'takedown_sent', 'disputed']),
    // Pending review count
    supabase
      .from('infringements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending_verification'),
    // Top 5 pending infringements for quick review
    supabase
      .from('infringements')
      .select('*, products(name)')
      .eq('user_id', user.id)
      .eq('status', 'pending_verification')
      .order('severity_score', { ascending: false })
      .limit(5),
    // All products with infringement counts
    supabase
      .from('products')
      .select('id, name, type, product_image_url, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    // Recent activity from status transitions
    supabase
      .from('status_transitions')
      .select('*, infringements!inner(source_url, products!inner(name))')
      .order('created_at', { ascending: false })
      .limit(8),
    // Profile for onboarding completeness check
    supabase
      .from('profiles')
      .select('full_name, phone, address, dmca_reply_email')
      .eq('id', user.id)
      .single(),
  ]);

  // Get per-product infringement counts
  const { data: productInfringementCounts } = await supabase
    .from('infringements')
    .select('product_id, status')
    .eq('user_id', user.id);

  // Build product stats map
  const productStats = new Map<string, { pending: number; active: number; total: number; lastScan: string | null }>();
  if (productInfringementCounts) {
    for (const inf of productInfringementCounts) {
      const existing = productStats.get(inf.product_id) || { pending: 0, active: 0, total: 0, lastScan: null };
      existing.total++;
      if (inf.status === 'pending_verification') existing.pending++;
      if (['active', 'takedown_sent', 'disputed'].includes(inf.status)) existing.active++;
      productStats.set(inf.product_id, existing);
    }
  }

  // Get last scan dates per product
  const { data: productScans } = await supabase
    .from('scans')
    .select('product_id, last_run_at')
    .eq('user_id', user.id)
    .order('last_run_at', { ascending: false });

  if (productScans) {
    for (const scan of productScans) {
      const existing = productStats.get(scan.product_id);
      if (existing && !existing.lastScan) {
        existing.lastScan = scan.last_run_at;
      }
    }
  }

  const statCards = [
    {
      label: 'Total Products',
      value: stats?.total_products || 0,
      icon: '📦',
      color: 'text-pg-accent',
      href: '/dashboard/products',
    },
    {
      label: 'Needs Review',
      value: pendingCount || 0,
      icon: '⚠️',
      color: 'text-pg-warning',
      href: '/dashboard/infringements',
    },
    {
      label: 'Active Threats',
      value: activeInfringementsCount || 0,
      icon: '🚨',
      color: 'text-pg-danger',
      href: '/dashboard/infringements',
    },
    {
      label: 'Takedowns Sent',
      value: stats?.total_takedowns || 0,
      icon: '⚡',
      color: 'text-green-400',
      href: '/dashboard/takedowns',
    },
  ];

  const getActivityIcon = (toStatus: string) => {
    switch (toStatus) {
      case 'active': return '✓';
      case 'false_positive': return '✗';
      case 'takedown_sent': return '📧';
      case 'removed': return '🎉';
      case 'disputed': return '⚖️';
      case 'pending_verification': return '🔍';
      default: return '→';
    }
  };

  const getActivityLabel = (fromStatus: string | null, toStatus: string) => {
    switch (toStatus) {
      case 'active': return 'Verified as threat';
      case 'false_positive': return 'Dismissed';
      case 'takedown_sent': return 'Takedown sent';
      case 'removed': return 'Successfully removed';
      case 'disputed': return 'Under dispute';
      case 'pending_verification': return 'New threat detected';
      default: return `Status changed to ${toStatus}`;
    }
  };

  const getActivityColor = (toStatus: string) => {
    switch (toStatus) {
      case 'active': return 'text-pg-accent';
      case 'false_positive': return 'text-gray-400';
      case 'takedown_sent': return 'text-blue-400';
      case 'removed': return 'text-green-400';
      case 'disputed': return 'text-orange-400';
      case 'pending_verification': return 'text-pg-warning';
      default: return 'text-pg-text-muted';
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-pg-text">Dashboard Overview</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          Monitor your digital products and protect them from piracy
        </p>
      </div>

      {/* Onboarding Banner for new users */}
      <OnboardingBanner
        productCount={products?.length || 0}
        hasScanRun={(productScans?.length || 0) > 0}
      />

      {/* Onboarding Card */}
      {userProfile && (
        <OnboardingCard
          fullName={userProfile.full_name}
          phone={userProfile.phone}
          address={userProfile.address}
          dmcaReplyEmail={userProfile.dmca_reply_email}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="group relative p-3 sm:p-6 rounded-xl sm:rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border hover:bg-pg-surface-light hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className={`text-xl sm:text-4xl ${stat.color}`}>{stat.icon}</div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-sm text-pg-text-muted uppercase tracking-wide mb-0.5 sm:mb-1 truncate">
                    {stat.label}
                  </p>
                  <p className={`text-xl sm:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Needs Review Section */}
      {(pendingCount || 0) > 0 && pendingInfringements && pendingInfringements.length > 0 && (
        <DashboardNeedsReview
          infringements={pendingInfringements}
          totalPending={pendingCount || 0}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Your Products - 2 columns */}
        <div className="lg:col-span-2">
          <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-pg-text">Your Products</h2>
              <Link
                href="/dashboard/products"
                className="text-sm text-pg-accent hover:underline"
              >
                Manage →
              </Link>
            </div>

            {!products || products.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-pg-text-muted mb-3">No products yet</p>
                <p className="text-sm text-pg-text-muted mb-4">
                  Add your first product to start monitoring for piracy
                </p>
                <Link href="/dashboard/products">
                  <Button size="sm">Add Product</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => {
                  const pStats = productStats.get(product.id) || { pending: 0, active: 0, total: 0, lastScan: null };
                  return (
                    <Link
                      key={product.id}
                      href={`/dashboard/products/${product.id}`}
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-pg-bg border border-pg-border hover:border-pg-accent/50 transition-all group"
                    >
                      {/* Product image or placeholder */}
                      {product.product_image_url ? (
                        <img
                          src={product.product_image_url}
                          alt={product.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-pg-border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-pg-surface border border-pg-border flex items-center justify-center shrink-0">
                          <span className="text-base sm:text-lg">📦</span>
                        </div>
                      )}

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm sm:text-base text-pg-text group-hover:text-pg-accent transition-colors truncate">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1">
                          <span className="text-xs text-pg-text-muted capitalize">{product.type}</span>
                          {pStats.lastScan && (
                            <span className="text-xs text-pg-text-muted hidden sm:inline">
                              Scanned {formatTimeAgo(pStats.lastScan)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Threat badges */}
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {pStats.pending > 0 && (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-400 whitespace-nowrap">
                            {pStats.pending}<span className="hidden sm:inline"> pending</span>
                          </span>
                        )}
                        {pStats.active > 0 && (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-red-500/20 text-red-400 whitespace-nowrap">
                            {pStats.active}<span className="hidden sm:inline"> active</span>
                          </span>
                        )}
                        {pStats.total === 0 && (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-green-500/20 text-green-400">
                            Clean
                          </span>
                        )}
                        <svg className="w-4 h-4 text-pg-text-muted group-hover:text-pg-accent transition-colors hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Protection Timeline - 1 column */}
        <div className="lg:col-span-1">
          <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-pg-text">Activity</h2>
              <Link
                href="/dashboard/infringements"
                className="text-sm text-pg-accent hover:underline"
              >
                View all →
              </Link>
            </div>

            {!recentActivity || recentActivity.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-pg-text-muted mb-2">No activity yet</p>
                <p className="text-xs text-pg-text-muted">
                  Activity will appear here as you verify infringements and send takedowns
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-pg-border" />

                <div className="space-y-4">
                  {recentActivity.map((event: any) => {
                    const infringement = event.infringements;
                    const productName = infringement?.products?.name || 'Unknown';
                    const sourceUrl = infringement?.source_url || '';
                    let domain = '';
                    try { domain = sourceUrl ? new URL(sourceUrl).hostname.replace('www.', '') : ''; } catch {}

                    return (
                      <div key={event.id} className="relative flex gap-3 pl-0">
                        {/* Timeline dot */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 z-10 ${
                          event.to_status === 'removed'
                            ? 'bg-green-500/20 border border-green-500/50'
                            : event.to_status === 'active'
                            ? 'bg-pg-accent/20 border border-pg-accent/50'
                            : event.to_status === 'takedown_sent'
                            ? 'bg-blue-500/20 border border-blue-500/50'
                            : event.to_status === 'false_positive'
                            ? 'bg-gray-500/20 border border-gray-500/50'
                            : 'bg-yellow-500/20 border border-yellow-500/50'
                        }`}>
                          {getActivityIcon(event.to_status)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-1">
                          <p className={`text-sm font-medium ${getActivityColor(event.to_status)}`}>
                            {getActivityLabel(event.from_status, event.to_status)}
                          </p>
                          <p className="text-xs text-pg-text-muted truncate mt-0.5">
                            {productName}{domain ? ` · ${domain}` : ''}
                          </p>
                          <p className="text-xs text-pg-text-muted mt-0.5 opacity-60">
                            {formatTimeAgo(event.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
