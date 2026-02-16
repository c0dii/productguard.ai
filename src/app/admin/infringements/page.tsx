import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default async function AdminInfringementsPage() {
  const supabase = await createClient();

  const { data: infringements } = await supabase
    .from('infringements')
    .select('*, profiles(email), products(name)')
    .order('created_at', { ascending: false })
    .limit(100);

  const stats = {
    total: infringements?.length || 0,
    active: infringements?.filter((i) => i.status === 'active').length || 0,
    removed: infringements?.filter((i) => i.status === 'removed').length || 0,
    critical: infringements?.filter((i) => i.risk_level === 'critical').length || 0,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Infringements</h1>
        <p className="text-pg-text-muted">All detected piracy infringements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Total Detected</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Active</p>
          <p className="text-3xl font-bold text-pg-danger">{stats.active}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Removed</p>
          <p className="text-3xl font-bold text-pg-accent">{stats.removed}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Critical</p>
          <p className="text-3xl font-bold text-red-500">{stats.critical}</p>
        </Card>
      </div>

      <div className="space-y-3">
        {infringements?.map((inf: any) => (
          <Card key={inf.id}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="default"
                    className={`text-xs ${
                      inf.risk_level === 'critical'
                        ? 'badge-critical'
                        : inf.risk_level === 'high'
                        ? 'badge-high'
                        : inf.risk_level === 'medium'
                        ? 'badge-medium'
                        : 'badge-low'
                    }`}
                  >
                    {inf.risk_level}
                  </Badge>
                  <Badge
                    variant="default"
                    className={`capitalize text-xs ${
                      inf.status === 'active'
                        ? 'bg-pg-danger bg-opacity-10 text-pg-danger'
                        : 'bg-pg-accent bg-opacity-10 text-pg-accent'
                    }`}
                  >
                    {inf.status}
                  </Badge>
                </div>
                <p className="font-semibold mb-1">{inf.products?.name || 'Unknown Product'}</p>
                <p className="text-sm text-pg-text-muted mb-1">
                  User: {inf.profiles?.email}
                </p>
                <p className="text-xs text-pg-text-muted truncate">
                  {inf.source_url}
                </p>
              </div>
              <div className="text-right text-xs text-pg-text-muted">
                <p>{new Date(inf.created_at).toLocaleDateString()}</p>
                {inf.estimated_revenue_loss && (
                  <p className="text-pg-danger font-semibold">
                    ${inf.estimated_revenue_loss}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
