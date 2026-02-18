import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { DmcaLogViewer } from '@/components/admin/DmcaLogViewer';

export default async function DmcaLogsPage() {
  const supabase = await createClient();

  // Fetch DMCA submission logs (existing table)
  const { data: rawDmcaLogs } = await supabase
    .from('dmca_submission_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  const dmcaSubmissionLogs = rawDmcaLogs || [];

  // Fetch DMCA-related system logs
  const { data: rawSystemLogs } = await supabase
    .from('system_logs')
    .select('*')
    .eq('log_source', 'dmca')
    .order('created_at', { ascending: false })
    .limit(200);
  const dmcaSystemLogs = rawSystemLogs || [];

  // 24h stats
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentSubmissions = dmcaSubmissionLogs.filter(
    (l: any) => l.created_at >= twentyFourHoursAgo
  );
  const recentSystemLogs = dmcaSystemLogs.filter(
    (l: any) => l.created_at >= twentyFourHoursAgo
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">DMCA Logs</h1>
        <p className="text-pg-text-muted">Track DMCA notice generation, submission, and status</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Total Submissions</p>
          <p className="text-3xl font-bold">{dmcaSubmissionLogs.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Recent (24h)</p>
          <p className="text-3xl font-bold text-pg-accent">{recentSubmissions.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">System Events</p>
          <p className="text-3xl font-bold">{dmcaSystemLogs.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">System Events (24h)</p>
          <p className="text-3xl font-bold">{recentSystemLogs.length}</p>
        </Card>
      </div>

      {/* DMCA Log Viewer */}
      <DmcaLogViewer
        submissionLogs={dmcaSubmissionLogs}
        systemLogs={dmcaSystemLogs}
      />
    </div>
  );
}
