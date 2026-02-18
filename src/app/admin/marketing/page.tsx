import { createAdminClient } from '@/lib/supabase/server';
import MarketingDashboard from './MarketingDashboard';

export default async function AdminMarketingPage() {
  const supabase = createAdminClient();

  // Fetch all data in parallel
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
    { count: exclusionCount },
    { count: suppressionCount },
    { data: runs },
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
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('marketing_exclusions').select('*', { count: 'exact', head: true }),
    supabase.from('marketing_suppression').select('*', { count: 'exact', head: true }),
    supabase
      .from('discovery_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <MarketingDashboard
      initialProspects={recentProspects || []}
      initialTotal={totalProspects || 0}
      stats={{
        total: totalProspects || 0,
        new: newCount || 0,
        qualified: qualifiedCount || 0,
        pushed_to_ghl: pushedCount || 0,
        email_sent: emailSentCount || 0,
        engaged: engagedCount || 0,
        account_created: accountCreatedCount || 0,
        converted: convertedCount || 0,
        suppressed: suppressedCount || 0,
        exclusions: exclusionCount || 0,
        suppressions: suppressionCount || 0,
      }}
      initialRuns={runs || []}
    />
  );
}
