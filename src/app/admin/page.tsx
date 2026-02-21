import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  // Fetch all statistics from the views
  const [
    { data: userStats },
    { data: revenueStats },
    { data: scanStats },
    { data: infringementStats },
    { data: takedownStats },
    { data: subscriptionStats },
  ] = await Promise.all([
    supabase.from('admin_user_stats').select('*').single(),
    supabase.from('admin_revenue_stats').select('*').single(),
    supabase.from('admin_scan_stats').select('*').single(),
    supabase.from('admin_infringement_stats').select('*').single(),
    supabase.from('admin_takedown_stats').select('*').single(),
    supabase.from('admin_subscription_stats').select('*').single(),
  ]);

  // Get recent users
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, email, full_name, plan_tier, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  // Get recent scans
  const { data: recentScans } = await supabase
    .from('scans')
    .select('*, profiles(email)')
    .order('created_at', { ascending: false })
    .limit(10);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Admin Overview</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          Business intelligence and system health monitoring
        </p>
      </div>

      {/* Revenue Metrics */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">💰 Revenue</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Monthly Recurring Revenue</p>
            <p className="text-2xl sm:text-3xl font-bold text-pg-accent">
              {formatCurrency(revenueStats?.mrr_usd || 0)}
            </p>
            <p className="text-xs text-pg-text-muted mt-1">/month</p>
          </Card>

          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Annual Recurring Revenue</p>
            <p className="text-2xl sm:text-3xl font-bold text-pg-accent">
              {formatCurrency(revenueStats?.arr_usd || 0)}
            </p>
            <p className="text-xs text-pg-text-muted mt-1">/year</p>
          </Card>

          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Active Subscriptions</p>
            <p className="text-2xl sm:text-3xl font-bold">
              {subscriptionStats?.active_subscriptions || 0}
            </p>
            <p className="text-xs text-pg-text-muted mt-1">
              {subscriptionStats?.past_due_subscriptions || 0} past due
            </p>
          </Card>
        </div>
      </div>

      {/* User Metrics */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">👥 Users</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Total Users</p>
            <p className="text-2xl sm:text-3xl font-bold">{userStats?.total_users || 0}</p>
            <p className="text-xs text-pg-text-muted mt-1">
              +{userStats?.new_users_7d || 0} this week
            </p>
          </Card>

          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Free Plan</p>
            <p className="text-3xl font-bold text-gray-400">
              {userStats?.free_users || 0}
            </p>
          </Card>

          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Paid Users</p>
            <p className="text-2xl sm:text-3xl font-bold text-pg-accent">
              {(userStats?.starter_users || 0) +
                (userStats?.pro_users || 0) +
                (userStats?.business_users || 0)}
            </p>
            <div className="text-xs text-pg-text-muted mt-1">
              <span className="text-blue-400">{userStats?.starter_users || 0}</span> Starter,{' '}
              <span className="text-purple-400">{userStats?.pro_users || 0}</span> Pro,{' '}
              <span className="text-orange-400">{userStats?.business_users || 0}</span> Business
            </div>
          </Card>

          <Card>
            <p className="text-sm text-pg-text-muted mb-1">New This Month</p>
            <p className="text-2xl sm:text-3xl font-bold text-pg-accent">
              {userStats?.new_users_30d || 0}
            </p>
          </Card>
        </div>
      </div>

      {/* Activity Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Scans */}
        <Card>
          <h3 className="text-lg font-bold mb-4">🔍 Scans</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-pg-text-muted">Total Scans</p>
              <p className="text-2xl font-bold">{scanStats?.total_scans || 0}</p>
            </div>
            <div>
              <p className="text-sm text-pg-text-muted">This Week</p>
              <p className="text-xl font-semibold text-pg-accent">
                {scanStats?.scans_7d || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-pg-text-muted">Success Rate</p>
              <p className="text-xl font-semibold">
                {scanStats?.total_scans
                  ? (
                      ((scanStats?.completed_scans || 0) / scanStats.total_scans) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
            <div>
              <p className="text-sm text-pg-text-muted">Avg Infringements/Scan</p>
              <p className="text-xl font-semibold">
                {scanStats?.avg_infringements_per_scan?.toFixed(1) || 0}
              </p>
            </div>
          </div>
        </Card>

        {/* Infringements */}
        <Card>
          <h3 className="text-lg font-bold mb-4">⚠️ Infringements</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-pg-text-muted">Total Detected</p>
              <p className="text-2xl font-bold">{infringementStats?.total_infringements || 0}</p>
            </div>
            <div>
              <p className="text-sm text-pg-text-muted">Active</p>
              <p className="text-xl font-semibold text-pg-danger">
                {infringementStats?.active_infringements || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-pg-text-muted">Removed</p>
              <p className="text-xl font-semibold text-pg-accent">
                {infringementStats?.removed_infringements || 0}
              </p>
            </div>
            {/* Temporarily disabled - revenue loss calculations need refinement */}
            {/* <div>
              <p className="text-sm text-pg-text-muted">Estimated Revenue Loss</p>
              <p className="text-xl font-semibold text-pg-danger">
                {formatCurrency(infringementStats?.total_estimated_loss || 0)}
              </p>
            </div> */}
          </div>
        </Card>

        {/* Takedowns */}
        <Card>
          <h3 className="text-lg font-bold mb-4">📧 DMCA Takedowns</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-pg-text-muted">Total Takedowns</p>
              <p className="text-2xl font-bold">{takedownStats?.total_takedowns || 0}</p>
            </div>
            <div>
              <p className="text-sm text-pg-text-muted">This Week</p>
              <p className="text-xl font-semibold text-pg-accent">
                {takedownStats?.takedowns_7d || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-pg-text-muted">Sent</p>
              <p className="text-xl font-semibold">
                {takedownStats?.sent_takedowns || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-pg-text-muted">Success Rate</p>
              <p className="text-xl font-semibold text-pg-accent">
                {takedownStats?.sent_takedowns
                  ? (
                      ((takedownStats?.successful_takedowns || 0) /
                        takedownStats.sent_takedowns) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Users */}
        <Card>
          <h3 className="text-lg font-bold mb-4">👥 Recent Users</h3>
          <div className="space-y-2">
            {recentUsers?.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-pg-surface-light rounded-lg hover:bg-pg-border transition-colors"
              >
                <div>
                  <p className="font-semibold text-sm">
                    {user.full_name || user.email}
                  </p>
                  <p className="text-xs text-pg-text-muted">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold capitalize text-pg-accent">
                    {user.plan_tier}
                  </p>
                  <p className="text-xs text-pg-text-muted">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Scans */}
        <Card>
          <h3 className="text-lg font-bold mb-4">🔍 Recent Scans</h3>
          <div className="space-y-2">
            {recentScans?.map((scan: any) => (
              <div
                key={scan.id}
                className="flex items-center justify-between p-3 bg-pg-surface-light rounded-lg hover:bg-pg-border transition-colors"
              >
                <div>
                  <p className="font-semibold text-sm">{scan.profiles?.email}</p>
                  <p className="text-xs text-pg-text-muted">
                    {scan.infringement_count || 0} infringements found
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-semibold capitalize ${
                      scan.status === 'completed'
                        ? 'text-pg-accent'
                        : scan.status === 'failed'
                        ? 'text-pg-danger'
                        : 'text-pg-warning'
                    }`}
                  >
                    {scan.status}
                  </p>
                  <p className="text-xs text-pg-text-muted">
                    {new Date(scan.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
