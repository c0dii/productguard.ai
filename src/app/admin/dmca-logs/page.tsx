import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default async function AdminDMCALogsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; days?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from('dmca_submission_logs')
    .select('*, profiles(email, full_name), takedowns(type, status)')
    .order('created_at', { ascending: false });

  // Apply filters
  if (params.user) {
    query = query.eq('user_id', params.user);
  }

  if (params.days) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(params.days));
    query = query.gte('created_at', daysAgo.toISOString());
  }

  const { data: logs } = await query;

  // Get unique users for filter
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .order('email');

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">DMCA Submission Logs</h1>
        <p className="text-pg-text-muted">
          Legal compliance tracking for all DMCA submissions
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <form method="GET" className="flex gap-4">
          <select
            name="user"
            defaultValue={params.user || ''}
            className="input-field flex-1"
          >
            <option value="">All Users</option>
            {users?.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.email}
              </option>
            ))}
          </select>

          <select
            name="days"
            defaultValue={params.days || '30'}
            className="input-field w-48"
          >
            <option value="">All Time</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>

          <button type="submit" className="btn-glow px-6">
            Filter
          </button>
        </form>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Total Submissions</p>
          <p className="text-3xl font-bold">{logs?.length || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Auto Sent</p>
          <p className="text-3xl font-bold text-pg-accent">
            {logs?.filter((log) => log.submission_method === 'auto_send').length || 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Manual</p>
          <p className="text-3xl font-bold text-blue-400">
            {logs?.filter((log) => log.submission_method === 'manual_send').length || 0}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Unique Users</p>
          <p className="text-3xl font-bold">
            {new Set(logs?.map((log) => log.user_id)).size || 0}
          </p>
        </Card>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {!logs || logs.length === 0 ? (
          <Card>
            <p className="text-center text-pg-text-muted py-8">No DMCA submissions found</p>
          </Card>
        ) : (
          logs.map((log: any) => (
            <Card key={log.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pg-accent to-blue-500 flex items-center justify-center">
                      <span className="text-sm font-bold">
                        {log.profiles?.email?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">
                        {log.profiles?.full_name || log.profiles?.email || 'Unknown User'}
                      </p>
                      <p className="text-xs text-pg-text-muted">{log.profiles?.email}</p>
                    </div>
                  </div>

                  {/* Submission Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-pg-text-muted text-xs mb-1">Method</p>
                      <Badge
                        variant="default"
                        className={`capitalize text-xs ${
                          log.submission_method === 'auto_send'
                            ? 'bg-pg-accent bg-opacity-10 text-pg-accent'
                            : 'bg-blue-500 bg-opacity-10 text-blue-400'
                        }`}
                      >
                        {log.submission_method.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-pg-text-muted text-xs mb-1">Recipient</p>
                      <p className="font-mono text-xs truncate">
                        {log.recipient_email}
                      </p>
                    </div>

                    <div>
                      <p className="text-pg-text-muted text-xs mb-1">Takedown Type</p>
                      <p className="capitalize">{log.takedowns?.type || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-pg-text-muted text-xs mb-1">Status</p>
                      <Badge
                        variant="default"
                        className={`capitalize text-xs ${
                          log.takedowns?.status === 'sent'
                            ? 'bg-blue-500 bg-opacity-10 text-blue-400'
                            : log.takedowns?.status === 'removed'
                            ? 'bg-pg-accent bg-opacity-10 text-pg-accent'
                            : 'bg-pg-warning bg-opacity-10 text-pg-warning'
                        }`}
                      >
                        {log.takedowns?.status || 'unknown'}
                      </Badge>
                    </div>
                  </div>

                  {/* Technical Details */}
                  <div className="mt-3 p-3 bg-pg-surface-light rounded-lg text-xs space-y-1">
                    <p>
                      <span className="text-pg-text-muted">IP Address:</span>{' '}
                      <span className="font-mono">{log.ip_address || 'unknown'}</span>
                    </p>
                    <p>
                      <span className="text-pg-text-muted">User Agent:</span>{' '}
                      <span className="font-mono truncate block">
                        {log.user_agent || 'unknown'}
                      </span>
                    </p>
                    {log.location_country && (
                      <p>
                        <span className="text-pg-text-muted">Location:</span>{' '}
                        {log.location_city}, {log.location_region}, {log.location_country}
                      </p>
                    )}
                    <p>
                      <span className="text-pg-text-muted">Disclaimer Version:</span>{' '}
                      {log.disclaimer_version}
                    </p>
                    <p>
                      <span className="text-pg-text-muted">Log ID:</span>{' '}
                      <span className="font-mono">{log.id}</span>
                    </p>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-right ml-4">
                  <p className="text-sm font-semibold">
                    {new Date(log.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-pg-text-muted">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-pg-text-muted mt-2">
                    Acknowledged: {new Date(log.acknowledged_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
