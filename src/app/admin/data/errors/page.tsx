import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { ErrorTracker } from '@/components/admin/ErrorTracker';
import type { SystemLogEntry as SystemLog, AdminAlert } from '@/types';

export default async function ErrorTrackingPage() {
  const supabase = await createClient();

  // Fetch unresolved errors from system_logs
  const { data: rawErrors } = await supabase
    .from('system_logs')
    .select('*')
    .in('log_level', ['error', 'fatal'])
    .order('created_at', { ascending: false })
    .limit(200);
  const errors = (rawErrors || []) as SystemLog[];

  // Fetch all alerts (unresolved first, then resolved)
  const { data: rawAlerts } = await supabase
    .from('admin_alerts')
    .select('*')
    .order('resolved_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(100);
  const alerts = (rawAlerts || []) as AdminAlert[];

  const unresolvedCount = errors.filter(e => !e.resolved_at).length;
  const resolvedCount = errors.filter(e => e.resolved_at).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.resolved_at).length;

  // Error breakdown by source
  const sourceBreakdown = new Map<string, number>();
  for (const err of errors.filter(e => !e.resolved_at)) {
    const count = sourceBreakdown.get(err.log_source) || 0;
    sourceBreakdown.set(err.log_source, count + 1);
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-2xl sm:text-3xl font-bold mb-2">Error Tracking</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">Track, investigate, and resolve system errors</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Unresolved Errors</p>
          <p className={`text-2xl sm:text-3xl font-bold ${unresolvedCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {unresolvedCount}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Critical Alerts</p>
          <p className={`text-2xl sm:text-3xl font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {criticalCount}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Resolved</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-400">{resolvedCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Error Sources</p>
          <div className="mt-1 space-y-1">
            {Array.from(sourceBreakdown.entries()).slice(0, 4).map(([source, count]) => (
              <div key={source} className="flex justify-between text-xs">
                <span className="text-pg-text-muted">{source}</span>
                <span className="text-red-400 font-medium">{count}</span>
              </div>
            ))}
            {sourceBreakdown.size === 0 && (
              <p className="text-xs text-pg-text-muted italic">No unresolved errors</p>
            )}
          </div>
        </Card>
      </div>

      {/* Error & Alert Viewer */}
      <ErrorTracker errors={errors} alerts={alerts} />
    </div>
  );
}
