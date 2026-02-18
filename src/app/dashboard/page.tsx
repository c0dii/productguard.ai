import { createClient } from '@/lib/supabase/server';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { computeProtectionScore } from '@/lib/utils/protection-score';
import type { DashboardData, PlanTier, PlatformType, RiskLevel } from '@/types';

export const revalidate = 30;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // ── Parallel data fetching ───────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    { data: stats },
    { data: profile },
    { count: pendingCount },
    { count: activeCount },
    { data: removedInfringements },
    { data: activeInfringementRevenue },
    { data: actionItems },
    { data: platformData },
    { data: recentScans },
    { data: allProducts },
    // 30-day trend data
    { count: pendingCountPrev },
    { count: activeCountPrev },
    { count: takedownsCountPrev },
    // Timeline queries (3 parallel instead of UNION ALL)
    { data: recentTransitions },
    { data: recentTakedowns },
    { data: recentScanActivity },
    // 30-day detection trend
    { data: detectionDays },
  ] = await Promise.all([
    // Dashboard stats view
    supabase
      .from('user_dashboard_stats')
      .select('*')
      .eq('user_id', user.id)
      .single(),
    // Profile
    supabase
      .from('profiles')
      .select('full_name, phone, address, dmca_reply_email, plan_tier')
      .eq('id', user.id)
      .single(),
    // Pending count
    supabase
      .from('infringements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending_verification'),
    // Active count (active + takedown_sent + disputed)
    supabase
      .from('infringements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['active', 'takedown_sent', 'disputed']),
    // Removed infringements (for revenue protected + score)
    supabase
      .from('infringements')
      .select('est_revenue_loss')
      .eq('user_id', user.id)
      .eq('status', 'removed'),
    // Revenue at risk — direct sum from active threats only (NOT from view which has cartesian join bug)
    supabase
      .from('infringements')
      .select('est_revenue_loss')
      .eq('user_id', user.id)
      .in('status', ['active', 'takedown_sent', 'disputed', 'pending_verification']),
    // Top 5 pending by severity for action center
    supabase
      .from('infringements')
      .select('id, source_url, platform, risk_level, severity_score, audience_size, est_revenue_loss, detected_at, products(name)')
      .eq('user_id', user.id)
      .eq('status', 'pending_verification')
      .order('severity_score', { ascending: false })
      .limit(5),
    // Platform breakdown (all non-removed, non-false-positive)
    supabase
      .from('infringements')
      .select('platform')
      .eq('user_id', user.id)
      .not('status', 'in', '("removed","false_positive","archived")'),
    // Recent scans
    supabase
      .from('scans')
      .select('completed_at')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(1),
    // Products
    supabase
      .from('products')
      .select('id')
      .eq('user_id', user.id),
    // ── 30-day trend: counts from 30-60 days ago for comparison ───────
    supabase
      .from('infringements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending_verification')
      .lt('created_at', thirtyDaysAgo),
    supabase
      .from('infringements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['active', 'takedown_sent', 'disputed'])
      .lt('created_at', thirtyDaysAgo),
    supabase
      .from('takedowns')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lt('created_at', thirtyDaysAgo),
    // ── Timeline: 3 parallel queries merged in JS ────────────────────
    supabase
      .from('status_transitions')
      .select('id, to_status, created_at, infringements!inner(source_url, products!inner(name))')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('takedowns')
      .select('id, status, sent_at, created_at, infringements!inner(source_url, products!inner(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('scans')
      .select('id, status, completed_at, created_at, products!inner(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    // 30-day detection sparkline
    supabase
      .from('infringements')
      .select('detected_at')
      .eq('user_id', user.id)
      .gte('detected_at', thirtyDaysAgo)
      .order('detected_at', { ascending: true }),
  ]);

  // ── Compute derived data ─────────────────────────────────────────────

  const removedCount = removedInfringements?.length ?? 0;
  const revenueProtected = removedInfringements?.reduce(
    (sum, inf) => sum + (inf.est_revenue_loss || 0),
    0
  ) ?? 0;
  const revenueAtRisk = activeInfringementRevenue?.reduce(
    (sum, inf) => sum + (inf.est_revenue_loss || 0),
    0
  ) ?? 0;

  const hasRecentScan = !!(
    recentScans?.[0]?.completed_at &&
    new Date(recentScans[0].completed_at) > new Date(sevenDaysAgo)
  );

  const protectionScore = computeProtectionScore({
    activeCount: activeCount ?? 0,
    pendingCount: pendingCount ?? 0,
    removedCount,
    hasRecentScan,
  });

  // Platform breakdown aggregation
  const platformMap = new Map<PlatformType, number>();
  if (platformData) {
    for (const row of platformData) {
      const p = row.platform as PlatformType;
      platformMap.set(p, (platformMap.get(p) ?? 0) + 1);
    }
  }
  const platformBreakdown = Array.from(platformMap.entries()).map(([platform, count]) => ({
    platform,
    count,
  }));

  // 30-day detection trend (group by date)
  const detectionMap = new Map<string, number>();
  if (detectionDays) {
    for (const row of detectionDays) {
      const date = new Date(row.detected_at).toISOString().slice(0, 10);
      detectionMap.set(date, (detectionMap.get(date) ?? 0) + 1);
    }
  }
  const detectionTrend = Array.from(detectionMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Action items
  const mappedActionItems: DashboardData['actionItems'] = (actionItems ?? []).map((item: any) => ({
    id: item.id,
    sourceUrl: item.source_url,
    platform: item.platform as PlatformType,
    riskLevel: item.risk_level as RiskLevel,
    severityScore: item.severity_score,
    audienceSize: item.audience_size,
    estRevenueLoss: item.est_revenue_loss,
    productName: item.products?.name ?? 'Unknown',
    detectedAt: item.detected_at,
  }));

  // Timeline: merge 3 sources, sort by timestamp, take 10
  const timeline: DashboardData['timeline'] = [];

  if (recentTransitions) {
    for (const t of recentTransitions) {
      const inf = (t as any).infringements;
      const productName = inf?.products?.name ?? 'Unknown';
      let domain = '';
      try { domain = inf?.source_url ? new URL(inf.source_url).hostname.replace('www.', '') : ''; } catch {}

      const type = mapTransitionType(t.to_status);
      timeline.push({
        id: `st-${t.id}`,
        type,
        title: getTransitionTitle(t.to_status),
        subtitle: `${productName}${domain ? ` · ${domain}` : ''}`,
        timestamp: t.created_at,
        status: t.to_status,
      });
    }
  }

  if (recentTakedowns) {
    for (const td of recentTakedowns) {
      const inf = (td as any).infringements;
      const productName = inf?.products?.name ?? 'Unknown';
      timeline.push({
        id: `td-${td.id}`,
        type: 'takedown',
        title: `Takedown ${td.status}`,
        subtitle: productName,
        timestamp: td.sent_at ?? td.created_at,
      });
    }
  }

  if (recentScanActivity) {
    for (const s of recentScanActivity) {
      const productName = (s as any).products?.name ?? 'Unknown';
      timeline.push({
        id: `sc-${s.id}`,
        type: 'scan',
        title: `Scan ${s.status}`,
        subtitle: productName,
        timestamp: s.completed_at ?? s.created_at,
      });
    }
  }

  // Sort by most recent, deduplicate by id prefix, take 10
  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const uniqueTimeline = timeline.slice(0, 10);

  // Profile completeness
  const profileComplete = !!(
    profile?.full_name &&
    profile?.phone &&
    profile?.address &&
    profile?.dmca_reply_email
  );

  // ── Build DashboardData ──────────────────────────────────────────────

  const dashboardData: DashboardData = {
    protectionScore,
    revenueAtRisk,
    revenueProtected,

    stats: {
      totalProducts: stats?.total_products ?? 0,
      needsReview: pendingCount ?? 0,
      activeThreats: activeCount ?? 0,
      takedownsSent: stats?.total_takedowns ?? 0,
      needsReviewTrend: (pendingCount ?? 0) - (pendingCountPrev ?? 0),
      activeThreatsTrend: (activeCount ?? 0) - (activeCountPrev ?? 0),
      takedownsTrend: (stats?.total_takedowns ?? 0) - (takedownsCountPrev ?? 0),
    },

    actionItems: mappedActionItems,
    platformBreakdown,
    detectionTrend,
    timeline: uniqueTimeline,

    planTier: (profile?.plan_tier as PlanTier) ?? 'scout',
    productCount: allProducts?.length ?? 0,
    hasScanRun: (recentScans?.length ?? 0) > 0,
    hasRecentScan,
    profileComplete,
    userProfile: {
      fullName: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
      dmcaReplyEmail: profile?.dmca_reply_email ?? null,
    },
  };

  return <DashboardOverview data={dashboardData} />;
}

// ── Helper functions ──────────────────────────────────────────────────

function mapTransitionType(toStatus: string): DashboardData['timeline'][number]['type'] {
  switch (toStatus) {
    case 'removed':
      return 'removal';
    case 'takedown_sent':
      return 'takedown';
    case 'pending_verification':
      return 'detection';
    default:
      return 'detection';
  }
}

function getTransitionTitle(toStatus: string): string {
  switch (toStatus) {
    case 'active':
      return 'Verified as threat';
    case 'false_positive':
      return 'Dismissed as false positive';
    case 'takedown_sent':
      return 'Takedown notice sent';
    case 'removed':
      return 'Successfully removed';
    case 'disputed':
      return 'Under dispute';
    case 'pending_verification':
      return 'New threat detected';
    default:
      return `Status changed to ${toStatus}`;
  }
}
