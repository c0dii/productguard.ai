import { createClient } from '@/lib/supabase/server';
import { CustomerIntelligence } from '@/components/admin/CustomerIntelligence';
import { PLAN_LIMITS } from '@/types';
import type { CustomerProfile, IntelligenceOverview, CostBreakdown, PlanTier } from '@/types';

const PLAN_PRICES: Record<string, number> = {
  scout: 0,
  free: 0,
  starter: 29,
  pro: 99,
  business: 299,
};

function computeHealthScore(customer: {
  last_scan_at: string | null;
  subscription_status: string | null;
  takedown_count: number;
  product_count: number;
  infringement_count: number;
  created_at: string;
}): { score: number; status: 'healthy' | 'at_risk' | 'inactive' } {
  let score = 0;

  // Activity (40pts): recency of last scan
  if (customer.last_scan_at) {
    const daysSince = (Date.now() - new Date(customer.last_scan_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) score += 40;
    else if (daysSince < 14) score += 30;
    else if (daysSince < 30) score += 20;
    else if (daysSince < 60) score += 10;
  }

  // Depth (30pts): feature adoption
  if (customer.takedown_count > 0) score += 15;
  if (customer.product_count > 1) score += 10;
  if (customer.infringement_count > 0) score += 5;

  // Subscription (20pts): status
  if (customer.subscription_status === 'active') score += 20;
  else if (customer.subscription_status === 'past_due') score += 10;

  // Tenure (10pts): how long they've been a customer
  const monthsSince = (Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsSince > 6) score += 10;
  else if (monthsSince > 3) score += 7;
  else if (monthsSince > 1) score += 4;
  else score += 2;

  const status = score >= 70 ? 'healthy' : score >= 40 ? 'at_risk' : 'inactive';
  return { score, status };
}

export default async function IntelligencePage() {
  const supabase = await createClient();

  // Parallel data fetching
  const [
    { data: profiles },
    { data: subscriptions },
    { data: costSummary },
    { data: scanCounts },
    { data: infringementCounts },
    { data: takedownCounts },
    { data: productCounts },
    { data: lastScans },
    { data: costBreakdownData },
  ] = await Promise.all([
    // All profiles
    supabase
      .from('profiles')
      .select('id, email, full_name, company_name, plan_tier, is_admin, created_at')
      .order('created_at', { ascending: false }),

    // Subscriptions
    supabase
      .from('subscriptions')
      .select('user_id, status, plan_tier'),

    // Cost summary per user (30d)
    supabase
      .from('customer_cost_summary')
      .select('*'),

    // Scan counts per user
    supabase
      .from('scans')
      .select('user_id')
      .then(({ data }) => {
        const counts = new Map<string, number>();
        data?.forEach(s => counts.set(s.user_id, (counts.get(s.user_id) || 0) + 1));
        return { data: counts };
      }),

    // Infringement counts per user
    supabase
      .from('infringements')
      .select('user_id')
      .then(({ data }) => {
        const counts = new Map<string, number>();
        data?.forEach(i => counts.set(i.user_id, (counts.get(i.user_id) || 0) + 1));
        return { data: counts };
      }),

    // Takedown counts per user
    supabase
      .from('takedowns')
      .select('user_id')
      .then(({ data }) => {
        const counts = new Map<string, number>();
        data?.forEach(t => counts.set(t.user_id, (counts.get(t.user_id) || 0) + 1));
        return { data: counts };
      }),

    // Product counts per user
    supabase
      .from('products')
      .select('user_id')
      .not('archived_at', 'is', null)
      .then(({ data }) => {
        // Count all products including non-archived
        return { data: null };
      }),

    // Last scan per user
    supabase
      .from('scans')
      .select('user_id, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const lastScan = new Map<string, string>();
        data?.forEach(s => {
          if (!lastScan.has(s.user_id)) lastScan.set(s.user_id, s.created_at);
        });
        return { data: lastScan };
      }),

    // Cost breakdown by event type (30d global)
    supabase
      .from('usage_cost_events')
      .select('event_type, unit_cost, units')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .then(({ data }) => {
        const breakdown: CostBreakdown = {
          scan_serper: 0,
          scan_ai_filter: 0,
          scan_whois: 0,
          email_send: 0,
          total: 0,
        };
        data?.forEach(e => {
          const cost = e.unit_cost * e.units;
          if (e.event_type in breakdown) {
            (breakdown as any)[e.event_type] += cost;
          }
          breakdown.total += cost;
        });
        return { data: breakdown };
      }),
  ]);

  // Also fetch product counts properly
  const { data: allProducts } = await supabase
    .from('products')
    .select('user_id');
  const productCountMap = new Map<string, number>();
  allProducts?.forEach(p => productCountMap.set(p.user_id, (productCountMap.get(p.user_id) || 0) + 1));

  // Build subscription map
  const subMap = new Map<string, { status: string; plan_tier: string }>();
  subscriptions?.forEach(s => subMap.set(s.user_id, { status: s.status, plan_tier: s.plan_tier }));

  // Build cost map
  const costMap = new Map<string, { total_cost_30d: number; scan_cost_30d: number; email_cost_30d: number }>();
  costSummary?.forEach((c: any) => costMap.set(c.user_id, {
    total_cost_30d: parseFloat(c.total_cost_30d) || 0,
    scan_cost_30d: parseFloat(c.scan_cost_30d) || 0,
    email_cost_30d: parseFloat(c.email_cost_30d) || 0,
  }));

  // Build customer profiles
  const customers: CustomerProfile[] = (profiles || [])
    .filter(p => !p.is_admin) // Exclude admin accounts
    .map(profile => {
      const sub = subMap.get(profile.id);
      const costs = costMap.get(profile.id) || { total_cost_30d: 0, scan_cost_30d: 0, email_cost_30d: 0 };
      const mrr = PLAN_PRICES[profile.plan_tier] || 0;
      const scanCount = scanCounts?.get(profile.id) || 0;
      const infCount = infringementCounts?.get(profile.id) || 0;
      const tdCount = takedownCounts?.get(profile.id) || 0;
      const prodCount = productCountMap.get(profile.id) || 0;
      const lastScanAt = lastScans?.get(profile.id) || null;

      const health = computeHealthScore({
        last_scan_at: lastScanAt,
        subscription_status: sub?.status || null,
        takedown_count: tdCount,
        product_count: prodCount,
        infringement_count: infCount,
        created_at: profile.created_at,
      });

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        company_name: profile.company_name,
        plan_tier: profile.plan_tier as PlanTier,
        created_at: profile.created_at,
        product_count: prodCount,
        scan_count: scanCount,
        infringement_count: infCount,
        takedown_count: tdCount,
        last_scan_at: lastScanAt,
        total_cost_30d: costs.total_cost_30d,
        scan_cost_30d: costs.scan_cost_30d,
        email_cost_30d: costs.email_cost_30d,
        mrr,
        margin: mrr - costs.total_cost_30d,
        health_score: health.score,
        health_status: health.status,
        subscription_status: sub?.status || null,
      };
    });

  // Build overview stats
  const paidCustomers = customers.filter(c => c.mrr > 0);
  const totalMrr = customers.reduce((sum, c) => sum + c.mrr, 0);
  const totalCost30d = customers.reduce((sum, c) => sum + c.total_cost_30d, 0);

  const healthDist = { healthy: 0, at_risk: 0, inactive: 0 };
  customers.forEach(c => healthDist[c.health_status]++);

  // Tier breakdown
  const tierMap = new Map<string, { count: number; revenue: number; cost: number }>();
  customers.forEach(c => {
    const existing = tierMap.get(c.plan_tier) || { count: 0, revenue: 0, cost: 0 };
    existing.count++;
    existing.revenue += c.mrr;
    existing.cost += c.total_cost_30d;
    tierMap.set(c.plan_tier, existing);
  });

  const tierBreakdown = Array.from(tierMap.entries()).map(([tier, data]) => ({
    tier: tier as PlanTier,
    count: data.count,
    revenue: data.revenue,
    cost: parseFloat(data.cost.toFixed(2)),
    margin: parseFloat((data.revenue - data.cost).toFixed(2)),
  }));

  const overview: IntelligenceOverview = {
    mrr: totalMrr,
    arr: totalMrr * 12,
    active_customers: paidCustomers.filter(c => c.subscription_status === 'active').length,
    total_customers: customers.length,
    total_cost_30d: parseFloat(totalCost30d.toFixed(2)),
    avg_margin: paidCustomers.length > 0
      ? parseFloat((paidCustomers.reduce((sum, c) => sum + c.margin, 0) / paidCustomers.length).toFixed(2))
      : 0,
    health_distribution: healthDist,
    tier_breakdown: tierBreakdown,
  };

  const costBreakdown: CostBreakdown = costBreakdownData || {
    scan_serper: 0,
    scan_ai_filter: 0,
    scan_whois: 0,
    email_send: 0,
    total: 0,
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Customer Intelligence</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          Per-customer profitability, health scores, and cost attribution
        </p>
      </div>

      <CustomerIntelligence
        overview={overview}
        customers={customers}
        costBreakdown={costBreakdown}
      />
    </div>
  );
}
