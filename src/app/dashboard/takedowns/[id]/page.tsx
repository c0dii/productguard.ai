import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { TakedownActions } from '@/components/dashboard/TakedownActions';

export default async function TakedownDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch takedown details
  const { data: takedown, error } = await supabase
    .from('takedowns')
    .select('*, infringements(source_url, platform, product_id, products(name))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !takedown) {
    redirect('/dashboard/takedowns');
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link href="/dashboard/takedowns" className="text-sm text-pg-accent hover:underline mb-4 inline-block">
          ← Back to Takedowns
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">DMCA Takedown Notice</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          {takedown.infringements?.products?.name || 'Product'}
        </p>
      </div>

      {/* Status & Monitoring Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status Card */}
        <Card>
          <h2 className="text-lg font-bold mb-4">Status & Timeline</h2>
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="default" className="capitalize">
              {takedown.type.replace('_', ' ')}
            </Badge>
            <Badge
              variant="default"
              className={
                takedown.status === 'sent'
                  ? 'bg-blue-500 bg-opacity-10 text-blue-400'
                  : takedown.status === 'removed'
                  ? 'bg-pg-accent bg-opacity-10 text-pg-accent'
                  : takedown.status === 'failed'
                  ? 'bg-pg-danger bg-opacity-10 text-pg-danger'
                  : 'bg-pg-warning bg-opacity-10 text-pg-warning'
              }
            >
              {takedown.status}
            </Badge>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-pg-border">
              <span className="text-pg-text-muted">Platform</span>
              <span className="text-pg-text capitalize font-semibold">{takedown.infringements?.platform}</span>
            </div>

            {takedown.discovered_at && (
              <div className="flex justify-between items-center py-2 border-b border-pg-border">
                <span className="text-pg-text-muted">First Discovered</span>
                <span className="text-pg-text">{new Date(takedown.discovered_at).toLocaleDateString()}</span>
              </div>
            )}

            {takedown.verified_at && (
              <div className="flex justify-between items-center py-2 border-b border-pg-border">
                <span className="text-pg-text-muted">User Verified</span>
                <span className="text-pg-text">{new Date(takedown.verified_at).toLocaleDateString()}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-2 border-b border-pg-border">
              <span className="text-pg-text-muted">DMCA Submitted</span>
              <span className="text-pg-text font-semibold">
                {takedown.submitted_at ? new Date(takedown.submitted_at).toLocaleDateString() : 'Draft'}
              </span>
            </div>

            {takedown.resolved_at && (
              <div className="flex justify-between items-center py-2 border-b border-pg-border">
                <span className="text-pg-text-muted">Resolved</span>
                <span className="text-pg-accent font-semibold">{new Date(takedown.resolved_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </Card>

        {/* URL Monitoring Card */}
        <Card>
          <h2 className="text-lg font-bold mb-4">URL Monitoring</h2>

          {/* URL Status */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-pg-text-muted">Status:</span>
              <Badge
                variant={
                  takedown.url_status === 'removed'
                    ? 'success'
                    : takedown.url_status === 'active'
                    ? 'danger'
                    : takedown.url_status === 'redirected'
                    ? 'warning'
                    : 'default'
                }
                className="capitalize"
              >
                {takedown.url_status === 'removed' && '✓ '}
                {takedown.url_status?.replace('_', ' ') || 'Pending Check'}
              </Badge>
            </div>

            {takedown.url_status === 'removed' && (
              <p className="text-sm text-green-400 mb-2">
                🎉 Success! The infringing content has been removed or is no longer accessible.
              </p>
            )}

            {takedown.url_status === 'active' && (
              <p className="text-sm text-pg-warning mb-2">
                ⚠️ The infringing URL is still active. Consider escalating if no action after 14 days.
              </p>
            )}
          </div>

          {/* Monitoring Info */}
          <div className="space-y-2 text-sm">
            {takedown.last_checked_at && (
              <div className="flex justify-between items-center py-2 border-b border-pg-border">
                <span className="text-pg-text-muted">Last Checked</span>
                <span className="text-pg-text">{new Date(takedown.last_checked_at).toLocaleDateString()}</span>
              </div>
            )}

            {takedown.next_check_at && takedown.url_status !== 'removed' && (
              <div className="flex justify-between items-center py-2 border-b border-pg-border">
                <span className="text-pg-text-muted">Next Check</span>
                <span className="text-pg-text">{new Date(takedown.next_check_at).toLocaleDateString()}</span>
              </div>
            )}

            {takedown.check_count > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-pg-border">
                <span className="text-pg-text-muted">Total Checks</span>
                <span className="text-pg-text">{takedown.check_count}</span>
              </div>
            )}

            {takedown.submitted_at && (
              <div className="flex justify-between items-center py-2">
                <span className="text-pg-text-muted">Days Since Submission</span>
                <span className="text-pg-text font-semibold">
                  {Math.floor((Date.now() - new Date(takedown.submitted_at).getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
            )}
          </div>

          {/* Effectiveness Note */}
          {takedown.url_status === 'active' &&
            takedown.submitted_at &&
            Math.floor((Date.now() - new Date(takedown.submitted_at).getTime()) / (1000 * 60 * 60 * 24)) > 14 && (
              <div className="mt-4 p-3 rounded-lg bg-pg-warning bg-opacity-10 border border-pg-warning">
                <p className="text-xs text-pg-warning">
                  💡 This takedown has been pending for over 14 days. Consider following up or escalating.
                </p>
              </div>
            )}
        </Card>
      </div>

      {/* Email Recipients Card */}
      <Card className="mb-6">
        <h2 className="text-lg font-bold mb-4">Email Recipients</h2>
        <div className="space-y-3 text-sm">
          {takedown.recipient_email && (
            <div>
              <span className="text-pg-text-muted">To: </span>
              <span className="text-pg-text font-mono">{takedown.recipient_email}</span>
            </div>
          )}
          {takedown.cc_emails && takedown.cc_emails.length > 0 && (
            <div>
              <span className="text-pg-text-muted">CC: </span>
              <span className="text-pg-text font-mono">{takedown.cc_emails.join(', ')}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Infringing URL */}
      <Card className="mb-6">
        <h2 className="text-lg font-bold mb-3">Infringing URL</h2>
        <a
          href={takedown.infringing_url || takedown.infringements?.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-pg-accent hover:underline break-all"
        >
          {takedown.infringing_url || takedown.infringements?.source_url}
        </a>
        <div className="mt-4">
          <TakedownActions
            takedownId={id}
            status={takedown.status}
            infringingUrl={takedown.infringing_url || takedown.infringements?.source_url || ''}
            noticeContent={takedown.notice_content || ''}
            recipientEmail={takedown.recipient_email}
          />
        </div>
      </Card>

      {/* DMCA Notice Content */}
      <Card>
        <h2 className="text-lg font-bold mb-4">DMCA Notice</h2>
        <div className="bg-pg-surface-light p-4 rounded-lg border border-pg-border">
          <pre className="whitespace-pre-wrap text-sm font-mono text-pg-text-muted leading-relaxed">
            {takedown.notice_content}
          </pre>
        </div>
      </Card>
    </div>
  );
}
