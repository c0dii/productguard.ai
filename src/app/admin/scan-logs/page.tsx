import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { ScanLogFilters } from '@/components/admin/ScanLogFilters';
import type { ScanLogEntry } from '@/types';

export default async function AdminScanLogsPage() {
  const supabase = await createClient();

  // Fetch recent scan logs (last 200)
  const { data: rawLogs } = await supabase
    .from('scan_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

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

  // Calculate 24h stats
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentLogs = logs.filter((l) => l.created_at >= twentyFourHoursAgo);

  const stats = {
    totalLogs: recentLogs.length,
    errorCount: recentLogs.filter((l) => l.log_level === 'error' || l.log_level === 'fatal').length,
    selfHealCount: recentLogs.filter((l) => l.self_healed).length,
    uniqueScans: new Set(recentLogs.map((l) => l.scan_id)).size,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Scan Logs</h1>
        <p className="text-pg-text-muted">Monitor scan engine activity, errors, and self-healing events</p>
      </div>

      {/* 24h Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Total Logs (24h)</p>
          <p className="text-3xl font-bold">{stats.totalLogs}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Errors (24h)</p>
          <p className="text-3xl font-bold text-pg-danger">{stats.errorCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Self-Healed (24h)</p>
          <p className="text-3xl font-bold text-yellow-400">{stats.selfHealCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Unique Scans (24h)</p>
          <p className="text-3xl font-bold text-pg-accent">{stats.uniqueScans}</p>
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
