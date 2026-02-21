import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { ScanLogFilters } from '@/components/admin/ScanLogFilters';
import { ScanVerdictSummary } from '@/components/admin/ScanVerdictSummary';
import type { ScanLogEntry } from '@/types';

export default async function DataScanLogsPage() {
  const supabase = await createClient();

  // Fetch recent scan logs (last 500)
  const { data: rawLogs } = await supabase
    .from('scan_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  const logs: ScanLogEntry[] = (rawLogs || []) as ScanLogEntry[];

  // Fetch product names and user emails for display
  const productIds = [...new Set(logs.map((l) => l.product_id))];
  const userIds = [...new Set(logs.map((l) => l.user_id))];

  const { data: products } = productIds.length > 0
    ? await supabase.from('products').select('id, name').in('id', productIds)
    : { data: [] };

  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, email').in('id', userIds)
    : { data: [] };

  const productMap: Record<string, string> = {};
  (products || []).forEach((p: { id: string; name: string }) => {
    productMap[p.id] = p.name;
  });

  const userMap: Record<string, string> = {};
  (profiles || []).forEach((p: { id: string; email: string }) => {
    userMap[p.id] = p.email;
  });

  // Calculate scan verdict stats (7-day window)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentLogs = logs.filter(l => l.created_at >= sevenDaysAgo);

  // Group by scan_id to determine per-scan verdicts
  const scanGroups = new Map<string, ScanLogEntry[]>();
  for (const log of recentLogs) {
    const existing = scanGroups.get(log.scan_id) || [];
    existing.push(log);
    scanGroups.set(log.scan_id, existing);
  }

  let successCount = 0;
  let partialCount = 0;
  let failureCount = 0;

  for (const [, scanLogs] of scanGroups) {
    const hasFatal = scanLogs.some(l => l.log_level === 'fatal');
    const hasSelfHeal = scanLogs.some(l => l.self_healed);
    const hasErrors = scanLogs.some(l => l.log_level === 'error');

    if (hasFatal) {
      failureCount++;
    } else if (hasSelfHeal || hasErrors) {
      partialCount++;
    } else {
      successCount++;
    }
  }

  // 24h stats
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const last24hLogs = logs.filter((l) => l.created_at >= twentyFourHoursAgo);

  const stats = {
    totalLogs: last24hLogs.length,
    errorCount: last24hLogs.filter((l) => l.log_level === 'error' || l.log_level === 'fatal').length,
    selfHealCount: last24hLogs.filter((l) => l.self_healed).length,
    uniqueScans: new Set(last24hLogs.map((l) => l.scan_id)).size,
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-2xl sm:text-3xl font-bold mb-2">Scan Logs</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">Monitor scan engine activity, errors, and self-healing events</p>
      </div>

      {/* Scan Verdict Summary (7-day) */}
      <ScanVerdictSummary
        successCount={successCount}
        partialCount={partialCount}
        failureCount={failureCount}
        totalScans={scanGroups.size}
      />

      {/* 24h Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Total Logs (24h)</p>
          <p className="text-2xl sm:text-3xl font-bold">{stats.totalLogs}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Errors (24h)</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-danger">{stats.errorCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Self-Healed (24h)</p>
          <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{stats.selfHealCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Unique Scans (24h)</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-accent">{stats.uniqueScans}</p>
        </Card>
      </div>

      {/* Log Viewer */}
      <ScanLogFilters
        logs={logs}
        productMap={productMap}
        userMap={userMap}
      />
    </div>
  );
}
