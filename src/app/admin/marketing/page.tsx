import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'text-[#8293AA]' },
  qualified: { label: 'Qualified', color: 'text-blue-400' },
  pushed_to_ghl: { label: 'Pushed to GHL', color: 'text-indigo-400' },
  email_sent: { label: 'Email Sent', color: 'text-yellow-400' },
  engaged: { label: 'Engaged', color: 'text-orange-400' },
  account_created: { label: 'Signed Up', color: 'text-pg-accent' },
  converted: { label: 'Converted', color: 'text-green-400' },
  suppressed: { label: 'Suppressed', color: 'text-red-400' },
};

const FUNNEL_STAGES = [
  'new', 'qualified', 'pushed_to_ghl', 'email_sent', 'engaged', 'account_created', 'converted',
] as const;

export default async function AdminMarketingPage() {
  const supabase = await createClient();

  // Fetch all stats in parallel
  const [
    { count: totalProspects },
    { count: newCount },
    { count: qualifiedCount },
    { count: pushedCount },
    { count: emailSentCount },
    { count: engagedCount },
    { count: accountCreatedCount },
    { count: convertedCount },
    { count: suppressedCount },
    { data: recentProspects },
    { data: recentOutreach },
    { count: exclusionCount },
    { count: suppressionCount },
  ] = await Promise.all([
    supabase.from('marketing_prospects').select('*', { count: 'exact', head: true }),
    supabase.from('marketing_prospects').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('marketing_prospects').select('*', { count: 'exact', head: true }).eq('status', 'qualified'),
    supabase.from('marketing_prospects').select('*', { count: 'exact', head: true }).eq('status', 'pushed_to_ghl'),
    supabase.from('marketing_prospects').select('*', { count: 'exact', head: true }).eq('status', 'email_sent'),
    supabase.from('marketing_prospects').select('*', { count: 'exact', head: true }).eq('status', 'engaged'),
    supabase.from('marketing_prospects').select('*', { count: 'exact', head: true }).eq('status', 'account_created'),
    supabase.from('marketing_prospects').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
    supabase.from('marketing_prospects').select('*', { count: 'exact', head: true }).eq('status', 'suppressed'),
    supabase
      .from('marketing_prospects')
      .select('id, product_name, owner_email, infringing_platform, confidence_score, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('marketing_outreach')
      .select('id, prospect_id, email_sent_to, opened_at, clicked_at, signed_up_at, converted_at, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('marketing_exclusions').select('*', { count: 'exact', head: true }),
    supabase.from('marketing_suppression').select('*', { count: 'exact', head: true }),
  ]);

  const total = totalProspects || 0;
  const funnelData: Record<string, number> = {
    new: newCount || 0,
    qualified: qualifiedCount || 0,
    pushed_to_ghl: pushedCount || 0,
    email_sent: emailSentCount || 0,
    engaged: engagedCount || 0,
    account_created: accountCreatedCount || 0,
    converted: convertedCount || 0,
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Marketing Pipeline</h1>
        <p className="text-pg-text-muted">
          Prospect discovery, outreach tracking, and conversion funnel
        </p>
      </div>

      {/* Pipeline Overview Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Pipeline Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card>
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-xs text-pg-text-muted">Total</div>
          </Card>
          {Object.entries(STATUS_LABELS).map(([status, { label, color }]) => (
            <Card key={status}>
              <div className={`text-2xl font-bold ${color}`}>
                {status === 'suppressed' ? (suppressedCount || 0) : (funnelData[status] || 0)}
              </div>
              <div className="text-xs text-pg-text-muted">{label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Conversion Funnel</h2>
        <Card>
          <div className="space-y-3">
            {FUNNEL_STAGES.map((stage) => {
              const count = funnelData[stage] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              const meta = STATUS_LABELS[stage];
              return (
                <div key={stage} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-pg-text-muted shrink-0">{meta?.label ?? stage}</div>
                  <div className="flex-1 bg-pg-surface-light rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-pg-accent rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    >
                      {pct >= 8 && (
                        <span className="text-xs font-bold text-pg-bg">{count}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-mono">
                    {pct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Safety Nets */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="text-lg font-bold mb-1">Exclusions</div>
            <div className="text-3xl font-bold text-pg-accent">{exclusionCount || 0}</div>
            <div className="text-xs text-pg-text-muted">Products/brands/domains excluded from outreach</div>
          </Card>
          <Card>
            <div className="text-lg font-bold mb-1">Suppressions</div>
            <div className="text-3xl font-bold text-yellow-400">{suppressionCount || 0}</div>
            <div className="text-xs text-pg-text-muted">Emails suppressed (bounced, unsubscribed, complained)</div>
          </Card>
        </div>
      </div>

      {/* Recent Prospects */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Recent Prospects</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pg-border text-pg-text-muted text-left">
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4">Owner Email</th>
                  <th className="pb-3 pr-4">Platform</th>
                  <th className="pb-3 pr-4">Confidence</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentProspects && recentProspects.length > 0 ? (
                  recentProspects.map((p: any) => {
                    const statusMeta = STATUS_LABELS[p.status] ?? { label: p.status, color: 'text-pg-text-muted' };
                    return (
                      <tr key={p.id} className="border-b border-pg-border/50">
                        <td className="py-3 pr-4 font-medium max-w-[200px] truncate">{p.product_name}</td>
                        <td className="py-3 pr-4 text-pg-text-muted max-w-[200px] truncate">{p.owner_email || '—'}</td>
                        <td className="py-3 pr-4 capitalize">{p.infringing_platform?.replace('_', ' ') || '—'}</td>
                        <td className="py-3 pr-4">
                          <span className={p.confidence_score >= 95 ? 'text-green-400' : p.confidence_score >= 80 ? 'text-yellow-400' : 'text-red-400'}>
                            {p.confidence_score}%
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-pg-surface-light ${statusMeta.color}`}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="py-3 text-pg-text-muted text-xs">{formatDate(p.created_at)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-pg-text-muted">
                      No prospects yet. The pipeline will populate once the discovery engine runs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Recent Outreach */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Recent Outreach</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pg-border text-pg-text-muted text-left">
                  <th className="pb-3 pr-4">Sent To</th>
                  <th className="pb-3 pr-4">Opened</th>
                  <th className="pb-3 pr-4">Clicked</th>
                  <th className="pb-3 pr-4">Signed Up</th>
                  <th className="pb-3 pr-4">Converted</th>
                  <th className="pb-3">Sent</th>
                </tr>
              </thead>
              <tbody>
                {recentOutreach && recentOutreach.length > 0 ? (
                  recentOutreach.map((o: any) => (
                    <tr key={o.id} className="border-b border-pg-border/50">
                      <td className="py-3 pr-4 text-pg-text-muted max-w-[200px] truncate">{o.email_sent_to}</td>
                      <td className="py-3 pr-4">{o.opened_at ? '✅' : '—'}</td>
                      <td className="py-3 pr-4">{o.clicked_at ? '✅' : '—'}</td>
                      <td className="py-3 pr-4">{o.signed_up_at ? '✅' : '—'}</td>
                      <td className="py-3 pr-4">{o.converted_at ? '💰' : '—'}</td>
                      <td className="py-3 text-pg-text-muted text-xs">{formatDate(o.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-pg-text-muted">
                      No outreach campaigns yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
