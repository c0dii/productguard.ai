import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SystemEventViewer } from '@/components/admin/SystemEventViewer';
import type { SystemLogEntry as SystemLog } from '@/types';

// Expected cron jobs from vercel.json
const CRON_JOBS = [
  { name: 'daily-workflows', schedule: 'Daily at midnight', path: '/api/cron/daily-workflows' },
  { name: 'monthly-workflows', schedule: '1st of month at midnight', path: '/api/cron/monthly-workflows' },
  { name: 'check-deadlines', schedule: 'Daily at 9am', path: '/api/cron/check-deadlines' },
  { name: 'check-urls', schedule: 'Sundays at 2am', path: '/api/takedowns/check-urls' },
];

export default async function SystemEventsPage() {
  const supabase = await createClient();

  // Fetch cron logs (last 100)
  const { data: rawCronLogs } = await supabase
    .from('system_logs')
    .select('*')
    .eq('log_source', 'cron')
    .order('created_at', { ascending: false })
    .limit(100);
  const cronLogs = (rawCronLogs || []) as SystemLog[];

  // Fetch webhook logs (last 100)
  const { data: rawWebhookLogs } = await supabase
    .from('system_logs')
    .select('*')
    .eq('log_source', 'webhook')
    .order('created_at', { ascending: false })
    .limit(100);
  const webhookLogs = (rawWebhookLogs || []) as SystemLog[];

  // Fetch email logs (last 100)
  const { data: rawEmailLogs } = await supabase
    .from('system_logs')
    .select('*')
    .eq('log_source', 'email')
    .order('created_at', { ascending: false })
    .limit(100);
  const emailLogs = (rawEmailLogs || []) as SystemLog[];

  // Combine all system events sorted by time
  const allEvents = [...cronLogs, ...webhookLogs, ...emailLogs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Build cron job status grid data
  const cronJobStatus = CRON_JOBS.map(job => {
    const jobLogs = cronLogs.filter(l => l.operation === `cron.${job.name}`);
    const lastRun = jobLogs[0] || null;
    return {
      ...job,
      lastRun,
      lastStatus: lastRun?.status || 'unknown',
      lastDuration: lastRun?.duration_ms || null,
      lastRunTime: lastRun?.created_at || null,
    };
  });

  // 24h stats
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentWebhooks = webhookLogs.filter(l => l.created_at >= twentyFourHoursAgo);
  const recentEmails = emailLogs.filter(l => l.created_at >= twentyFourHoursAgo);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-2xl sm:text-3xl font-bold mb-2">System Events</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">Monitor cron jobs, webhooks, and email sends</p>
      </div>

      {/* Cron Job Status Grid */}
      <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Cron Job Status</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {cronJobStatus.map(job => (
          <Card key={job.name}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{job.name}</span>
              <Badge
                variant="default"
                className={`text-xs border ${
                  job.lastStatus === 'success'
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : job.lastStatus === 'failure'
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-pg-surface-light text-pg-text-muted border-pg-border'
                }`}
              >
                {job.lastStatus === 'unknown' ? 'No runs' : job.lastStatus}
              </Badge>
            </div>
            <p className="text-xs text-pg-text-muted mb-1">{job.schedule}</p>
            {job.lastRunTime ? (
              <>
                <p className="text-xs text-pg-text-muted">
                  Last: {new Date(job.lastRunTime).toLocaleString()}
                </p>
                {job.lastDuration && (
                  <p className="text-xs text-pg-text-muted">Duration: {job.lastDuration}ms</p>
                )}
              </>
            ) : (
              <p className="text-xs text-pg-text-muted italic">Never run (no log data)</p>
            )}
          </Card>
        ))}
      </div>

      {/* 24h Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Webhooks (24h)</p>
          <p className="text-2xl sm:text-3xl font-bold">{recentWebhooks.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Webhook Failures</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-400">
            {recentWebhooks.filter(l => l.status === 'failure').length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Emails Sent (24h)</p>
          <p className="text-2xl sm:text-3xl font-bold">{recentEmails.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Email Failures</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-400">
            {recentEmails.filter(l => l.status === 'failure').length}
          </p>
        </Card>
      </div>

      {/* Event Timeline */}
      <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Event Timeline</h2>
      <SystemEventViewer events={allEvents} />
    </div>
  );
}
