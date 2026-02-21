import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default async function AdminTakedownsPage() {
  const supabase = await createClient();

  const { data: takedowns } = await supabase
    .from('takedowns')
    .select('*, profiles(email), infringements(source_url, platform)')
    .order('created_at', { ascending: false })
    .limit(100);

  const stats = {
    total: takedowns?.length || 0,
    draft: takedowns?.filter((t) => t.status === 'draft').length || 0,
    sent: takedowns?.filter((t) => t.status === 'sent').length || 0,
    removed: takedowns?.filter((t) => t.status === 'removed').length || 0,
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-2xl sm:text-3xl font-bold mb-2">DMCA Takedowns</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">All takedown notices across the platform</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Total Takedowns</p>
          <p className="text-2xl sm:text-3xl font-bold">{stats.total}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Draft</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-warning">{stats.draft}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Sent</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-400">{stats.sent}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Successful</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-accent">{stats.removed}</p>
        </Card>
      </div>

      <div className="space-y-3">
        {takedowns?.map((takedown: any) => (
          <Card key={takedown.id}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="capitalize text-xs">
                    {takedown.type}
                  </Badge>
                  <Badge
                    variant="default"
                    className={`capitalize text-xs ${
                      takedown.status === 'sent'
                        ? 'bg-blue-500 bg-opacity-10 text-blue-400'
                        : takedown.status === 'removed'
                        ? 'bg-pg-accent bg-opacity-10 text-pg-accent'
                        : 'bg-pg-warning bg-opacity-10 text-pg-warning'
                    }`}
                  >
                    {takedown.status}
                  </Badge>
                </div>
                <p className="font-semibold mb-1">{takedown.profiles?.email}</p>
                <p className="text-sm text-pg-text-muted">
                  Platform: {takedown.infringements?.platform || 'Unknown'}
                </p>
                {takedown.recipient_email && (
                  <p className="text-xs text-pg-text-muted">
                    To: {takedown.recipient_email}
                  </p>
                )}
              </div>
              <div className="text-right text-sm">
                <p className="text-pg-text-muted">
                  {new Date(takedown.created_at).toLocaleDateString()}
                </p>
                {takedown.sent_at && (
                  <p className="text-xs text-pg-text-muted">
                    Sent: {new Date(takedown.sent_at).toLocaleDateString()}
                  </p>
                )}
                {takedown.resolved_at && (
                  <p className="text-xs text-pg-accent">
                    Resolved: {new Date(takedown.resolved_at).toLocaleDateString()}
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
