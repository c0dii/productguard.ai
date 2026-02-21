import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RelistingToggle } from '@/components/admin/RelistingToggle';
import Link from 'next/link';

export default async function AdminScansPage() {
  const supabase = await createClient();

  const [{ data: scans }, { data: relistingSetting }] = await Promise.all([
    supabase
      .from('scans')
      .select('*, profiles(email, full_name), products(name)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'relisting_monitoring_global')
      .single(),
  ]);

  const relistingEnabled = (relistingSetting?.value as any)?.enabled !== false;

  const stats = {
    total: scans?.length || 0,
    completed: scans?.filter((s) => s.status === 'completed').length || 0,
    pending: scans?.filter((s) => s.status === 'pending').length || 0,
    failed: scans?.filter((s) => s.status === 'failed').length || 0,
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-2xl sm:text-3xl font-bold mb-2">Scan Activity</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">Monitor all piracy scans across the platform</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Total Scans</p>
          <p className="text-2xl sm:text-3xl font-bold">{stats.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Completed</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-accent">{stats.completed}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Pending</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-warning">{stats.pending}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Failed</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-danger">{stats.failed}</p>
        </Card>
      </div>

      <div className="mb-6">
        <RelistingToggle
          initialEnabled={relistingEnabled}
          scope="global"
          label="Re-listing Monitoring (Global)"
        />
      </div>

      <div className="space-y-3">
        {scans?.map((scan: any) => (
          <Card key={scan.id}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="font-semibold truncate">{scan.profiles?.email}</p>
                  <Badge
                    variant="default"
                    className={`capitalize text-xs ${
                      scan.status === 'completed'
                        ? 'bg-pg-accent bg-opacity-10 text-pg-accent'
                        : scan.status === 'failed'
                        ? 'bg-pg-danger bg-opacity-10 text-pg-danger'
                        : 'bg-pg-warning bg-opacity-10 text-pg-warning'
                    }`}
                  >
                    {scan.status}
                  </Badge>
                </div>
                <p className="text-sm text-pg-text-muted">
                  Product: {scan.products?.name || 'Unknown'}
                </p>
                <p className="text-sm text-pg-text-muted">
                  {scan.infringement_count || 0} infringements found
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">{new Date(scan.created_at).toLocaleString()}</p>
                <Link
                  href={`/admin/users/${scan.user_id}`}
                  className="text-xs text-pg-accent hover:underline"
                >
                  View User →
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
