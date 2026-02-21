import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import type { SystemHealthStats, AdminAlert } from '@/types';

export default async function DataOverviewPage() {
  const supabase = await createClient();

  // Fetch system health stats (24h aggregated view)
  const { data: healthRows } = await supabase
    .from('admin_system_health')
    .select('*');
  const healthStats = (healthRows || []) as SystemHealthStats[];

  // Fetch unresolved alerts (most recent 10)
  const { data: alertRows } = await supabase
    .from('admin_alerts')
    .select('*')
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(10);
  const alerts = (alertRows || []) as AdminAlert[];
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  // Fetch total unresolved errors
  const { count: unresolvedErrorCount } = await supabase
    .from('system_logs')
    .select('id', { count: 'exact', head: true })
    .in('log_level', ['error', 'fatal'])
    .is('resolved_at', null);

  // Build per-source stats map
  const statsMap = new Map<string, SystemHealthStats>();
  for (const row of healthStats) {
    statsMap.set(row.log_source, row);
  }

  // Calculate totals
  const totalCost = healthStats.reduce((sum, s) => sum + (s.total_cost_usd || 0), 0);
  const totalFailures = healthStats.reduce((sum, s) => sum + s.failure_count, 0);
  const totalLogs = healthStats.reduce((sum, s) => sum + s.total_count, 0);

  const getStats = (source: string) => statsMap.get(source);
  const getSuccessRate = (stats?: SystemHealthStats) => {
    if (!stats || stats.total_count === 0) return null;
    return Math.round((stats.success_count / stats.total_count) * 100);
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">System Health Overview</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">Real-time monitoring across all ProductGuard services (24h window)</p>
      </div>

      {/* Critical Alert Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-400 font-bold text-sm">CRITICAL ALERTS ({criticalAlerts.length})</span>
          </div>
          <div className="space-y-2">
            {criticalAlerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="flex items-start gap-3 text-sm">
                <span className="text-red-400 shrink-0">&#x25cf;</span>
                <div>
                  <span className="font-medium text-pg-text">{alert.title}</span>
                  <span className="text-pg-text-muted ml-2">{alert.message}</span>
                  <span className="text-xs text-pg-text-muted ml-2">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link href="/admin/data/errors" className="text-sm text-red-400 hover:text-red-300 mt-2 inline-block">
            View all alerts &rarr;
          </Link>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Total Events (24h)</p>
          <p className="text-2xl sm:text-3xl font-bold">{totalLogs}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Failures (24h)</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-400">{totalFailures}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Unresolved Errors</p>
          <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{unresolvedErrorCount || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">API Cost (24h)</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-accent">${totalCost.toFixed(2)}</p>
        </Card>
      </div>

      {/* Service Health Grid */}
      <h2 className="text-xl font-bold mb-4">Service Health</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <ServiceHealthCard
          title="Scan Engine"
          icon="&#128269;"
          stats={getStats('scan')}
          href="/admin/scans/scan-logs"
        />
        <ServiceHealthCard
          title="OpenAI API"
          icon="&#129302;"
          stats={getStats('api_call')}
          href="/admin/data/api-logs"
          showCost
        />
        <ServiceHealthCard
          title="Scrape Engine"
          icon="&#127760;"
          stats={getStats('scrape')}
          href="/admin/data/api-logs"
        />
        <ServiceHealthCard
          title="Email (Resend)"
          icon="&#9993;"
          stats={getStats('email')}
          href="/admin/data/system-events"
        />
        <ServiceHealthCard
          title="Cron Jobs"
          icon="&#9200;"
          stats={getStats('cron')}
          href="/admin/data/system-events"
        />
        <ServiceHealthCard
          title="Webhooks"
          icon="&#128268;"
          stats={getStats('webhook')}
          href="/admin/data/system-events"
        />
      </div>

      {/* Quick Links */}
      <h2 className="text-xl font-bold mb-4">Quick Links</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/admin/scans/scan-logs', label: 'Scan Logs', desc: 'Detailed scan execution logs' },
          { href: '/admin/data/api-logs', label: 'API Logs', desc: 'OpenAI, Serper, WHOIS calls' },
          { href: '/admin/data/system-events', label: 'System Events', desc: 'Cron, webhooks, emails' },
          { href: '/admin/data/errors', label: 'Error Tracking', desc: 'Unresolved errors & resolution' },
          { href: '/admin/data/dmca-logs', label: 'DMCA Logs', desc: 'DMCA generation & submissions' },
          { href: '/admin/data/export', label: 'Export Data', desc: 'Download logs as CSV/JSON' },
        ].map(link => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:border-pg-accent transition-colors cursor-pointer h-full">
              <p className="font-medium text-sm text-pg-text">{link.label}</p>
              <p className="text-xs text-pg-text-muted mt-1">{link.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ServiceHealthCard({
  title,
  icon,
  stats,
  href,
  showCost,
}: {
  title: string;
  icon: string;
  stats?: SystemHealthStats;
  href: string;
  showCost?: boolean;
}) {
  const successRate = stats && stats.total_count > 0
    ? Math.round((stats.success_count / stats.total_count) * 100)
    : null;

  const statusColor = !stats || stats.total_count === 0
    ? 'text-pg-text-muted'
    : successRate !== null && successRate >= 95
      ? 'text-green-400'
      : successRate !== null && successRate >= 80
        ? 'text-yellow-400'
        : 'text-red-400';

  return (
    <Link href={href}>
      <Card className="hover:border-pg-accent transition-colors cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span dangerouslySetInnerHTML={{ __html: icon }} />
            <span className="font-medium text-sm">{title}</span>
          </div>
          {stats && stats.total_count > 0 ? (
            <Badge
              variant="default"
              className={`text-xs border ${
                successRate !== null && successRate >= 95
                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                  : successRate !== null && successRate >= 80
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
              }`}
            >
              {successRate}% OK
            </Badge>
          ) : (
            <Badge variant="default" className="text-xs border bg-pg-surface-light text-pg-text-muted border-pg-border">
              No data
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{stats?.total_count || 0}</p>
            <p className="text-xs text-pg-text-muted">Total</p>
          </div>
          <div>
            <p className={`text-lg font-bold ${stats?.failure_count ? 'text-red-400' : ''}`}>
              {stats?.failure_count || 0}
            </p>
            <p className="text-xs text-pg-text-muted">Failed</p>
          </div>
          <div>
            <p className="text-lg font-bold">
              {stats?.avg_duration_ms ? `${Math.round(stats.avg_duration_ms)}` : '-'}
            </p>
            <p className="text-xs text-pg-text-muted">{showCost ? 'Avg ms' : 'Avg ms'}</p>
          </div>
        </div>

        {showCost && stats?.total_cost_usd !== null && stats?.total_cost_usd !== undefined && (
          <div className="mt-2 pt-2 border-t border-pg-border text-center">
            <p className="text-sm font-bold text-pg-accent">${stats.total_cost_usd.toFixed(2)}</p>
            <p className="text-xs text-pg-text-muted">Cost (24h)</p>
          </div>
        )}
      </Card>
    </Link>
  );
}
