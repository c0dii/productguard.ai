import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { ApiLogViewer } from '@/components/admin/ApiLogViewer';
import type { SystemLogEntry as SystemLog } from '@/types';

export default async function ApiLogsPage() {
  const supabase = await createClient();

  // Fetch API call logs (last 500)
  const { data: rawLogs } = await supabase
    .from('system_logs')
    .select('*')
    .eq('log_source', 'api_call')
    .order('created_at', { ascending: false })
    .limit(500);

  const logs = (rawLogs || []) as SystemLog[];

  // Also fetch scrape logs
  const { data: rawScrapeLogs } = await supabase
    .from('system_logs')
    .select('*')
    .eq('log_source', 'scrape')
    .order('created_at', { ascending: false })
    .limit(200);

  const scrapeLogs = (rawScrapeLogs || []) as SystemLog[];
  const allLogs = [...logs, ...scrapeLogs].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // 24h stats
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentLogs = logs.filter(l => l.created_at >= twentyFourHoursAgo);

  const totalCalls = recentLogs.length;
  const failedCalls = recentLogs.filter(l => l.status === 'failure').length;
  const avgLatency = recentLogs.length > 0
    ? Math.round(recentLogs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / recentLogs.length)
    : 0;
  // Cost from periodic snapshots (aggregated by cron, not per-call)
  const { data: costRows } = await supabase
    .from('cost_snapshots')
    .select('total_cost_usd')
    .gte('period_end', twentyFourHoursAgo);
  const totalCost = (costRows || []).reduce((sum, r) => sum + (r.total_cost_usd || 0), 0);
  const failureRate = totalCalls > 0 ? Math.round((failedCalls / totalCalls) * 100) : 0;

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-2xl sm:text-3xl font-bold mb-2">API Logs</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">Monitor external API calls: OpenAI, Serper, WHOIS, Resend</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Total Calls (24h)</p>
          <p className="text-2xl sm:text-3xl font-bold">{totalCalls}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Failed (24h)</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-400">{failedCalls}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Failure Rate</p>
          <p className={`text-2xl sm:text-3xl font-bold ${failureRate > 10 ? 'text-red-400' : failureRate > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
            {failureRate}%
          </p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Avg Latency</p>
          <p className="text-2xl sm:text-3xl font-bold">{avgLatency}<span className="text-sm text-pg-text-muted">ms</span></p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Cost (24h)</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-accent">${totalCost.toFixed(3)}</p>
        </Card>
      </div>

      {/* Log Viewer */}
      <ApiLogViewer logs={allLogs} />
    </div>
  );
}
