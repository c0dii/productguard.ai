import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { UserManagementActions } from '@/components/admin/UserManagementActions';
import { AdminUserProducts } from '@/components/admin/AdminUserProducts';
import { AdminUserScans } from '@/components/admin/AdminUserScans';
import Link from 'next/link';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch user data
  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
        <Link href="/admin/users" className="text-pg-accent hover:underline">
          ← Back to Users
        </Link>
      </div>
    );
  }

  // Fetch user's subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', id)
    .single();

  // Fetch user's products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false });

  // Fetch user's scans
  const { data: scans } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch user's takedowns
  const { data: takedowns } = await supabase
    .from('takedowns')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch DMCA submission logs
  const { data: dmcaLogs } = await supabase
    .from('dmca_submission_logs')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch who granted access (if applicable)
  let grantedByUser = null;
  if (user.granted_by) {
    const { data } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.granted_by)
      .single();
    grantedByUser = data;
  }

  // Determine effective tier
  const effectiveTier = user.granted_tier || user.plan_tier;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link
          href="/admin/users"
          className="text-sm text-pg-accent hover:underline mb-4 inline-block"
        >
          ← Back to Users
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">User Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* User Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Info */}
          <Card>
            <h2 className="text-xl font-bold mb-4">Profile Information</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pg-accent to-blue-500 flex items-center justify-center">
                  <span className="text-2xl font-bold">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold">
                      {user.full_name || user.email}
                    </h3>
                    {user.is_admin && (
                      <Badge
                        variant="default"
                        className="bg-red-500 bg-opacity-10 text-red-400"
                      >
                        ADMIN
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-pg-text-muted">Email:</span>{' '}
                      <span className="font-mono">{user.email}</span>
                    </p>
                    {user.company_name && (
                      <p>
                        <span className="text-pg-text-muted">Company:</span>{' '}
                        {user.company_name}
                      </p>
                    )}
                    <p>
                      <span className="text-pg-text-muted">User ID:</span>{' '}
                      <span className="font-mono text-xs">{user.id}</span>
                    </p>
                    <p>
                      <span className="text-pg-text-muted">Joined:</span>{' '}
                      {new Date(user.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-pg-border space-y-3">
                {/* Subscription Plan */}
                <div>
                  <p className="text-sm text-pg-text-muted mb-2">
                    {user.granted_tier ? 'Subscription Plan (Paid)' : 'Current Plan'}
                  </p>
                  <Badge
                    variant="default"
                    className={`capitalize text-lg px-4 py-2 ${
                      user.plan_tier === 'scout'
                        ? 'bg-gray-500 bg-opacity-10 text-gray-400'
                        : user.plan_tier === 'starter'
                        ? 'bg-blue-500 bg-opacity-10 text-blue-400'
                        : user.plan_tier === 'pro'
                        ? 'bg-purple-500 bg-opacity-10 text-purple-400'
                        : 'bg-orange-500 bg-opacity-10 text-orange-400'
                    }`}
                  >
                    {user.plan_tier}
                  </Badge>
                </div>

                {/* Granted Access */}
                {user.granted_tier && (
                  <div className="bg-purple-500 bg-opacity-10 border-2 border-purple-500 rounded-lg p-4">
                    <p className="text-sm text-pg-text-muted mb-2">Access Level (Granted)</p>
                    <Badge
                      variant="default"
                      className="capitalize text-lg px-4 py-2 bg-purple-500 bg-opacity-20 text-purple-300 border border-purple-400 mb-3"
                    >
                      ⭐ {user.granted_tier}
                    </Badge>
                    <div className="text-xs space-y-1">
                      <p className="text-purple-300">
                        <span className="text-pg-text-muted">Reason:</span>{' '}
                        {user.granted_reason}
                      </p>
                      {grantedByUser && (
                        <p className="text-purple-300">
                          <span className="text-pg-text-muted">Granted by:</span>{' '}
                          {grantedByUser.full_name || grantedByUser.email}
                        </p>
                      )}
                      {user.granted_at && (
                        <p className="text-purple-300">
                          <span className="text-pg-text-muted">Granted on:</span>{' '}
                          {new Date(user.granted_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Subscription Info */}
          {subscription && (
            <Card>
              <h2 className="text-xl font-bold mb-4">Subscription</h2>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-pg-text-muted">Status:</span>{' '}
                  <Badge
                    variant="default"
                    className={`capitalize ${
                      subscription.status === 'active'
                        ? 'bg-pg-accent bg-opacity-10 text-pg-accent'
                        : subscription.status === 'canceled'
                        ? 'bg-red-500 bg-opacity-10 text-red-400'
                        : 'bg-pg-warning bg-opacity-10 text-pg-warning'
                    }`}
                  >
                    {subscription.status}
                  </Badge>
                </p>
                <p>
                  <span className="text-pg-text-muted">Stripe ID:</span>{' '}
                  <span className="font-mono text-xs">
                    {subscription.stripe_subscription_id}
                  </span>
                </p>
                {subscription.stripe_customer_id && (
                  <p>
                    <span className="text-pg-text-muted">Customer ID:</span>{' '}
                    <span className="font-mono text-xs">
                      {subscription.stripe_customer_id}
                    </span>
                  </p>
                )}
                <p>
                  <span className="text-pg-text-muted">Created:</span>{' '}
                  {new Date(subscription.created_at).toLocaleString()}
                </p>
                {subscription.canceled_at && (
                  <p>
                    <span className="text-pg-text-muted">Canceled:</span>{' '}
                    {new Date(subscription.canceled_at).toLocaleString()}
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Products */}
          <Card>
            <AdminUserProducts products={products || []} />
          </Card>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Scans */}
            <Card>
              <AdminUserScans scans={scans || []} />
            </Card>

            {/* Recent Takedowns */}
            <Card>
              <h2 className="text-lg font-bold mb-4">Recent Takedowns</h2>
              {!takedowns || takedowns.length === 0 ? (
                <p className="text-sm text-pg-text-muted">No takedowns yet</p>
              ) : (
                <div className="space-y-2">
                  {takedowns.map((takedown: any) => (
                    <div
                      key={takedown.id}
                      className="text-sm p-2 bg-pg-surface-light rounded"
                    >
                      <div className="flex justify-between">
                        <span className="capitalize">{takedown.type}</span>
                        <span className="capitalize text-pg-accent">
                          {takedown.status}
                        </span>
                      </div>
                      <p className="text-xs text-pg-text-muted">
                        {new Date(takedown.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* DMCA Logs */}
          {dmcaLogs && dmcaLogs.length > 0 && (
            <Card>
              <h2 className="text-xl font-bold mb-4">Recent DMCA Submissions</h2>
              <div className="space-y-2">
                {dmcaLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3 bg-pg-surface-light rounded-lg text-sm"
                  >
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">{log.submission_method}</span>
                      <span className="text-xs text-pg-text-muted">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-pg-text-muted">
                      To: {log.recipient_email}
                    </p>
                    <p className="text-xs text-pg-text-muted">
                      IP: {log.ip_address} • v{log.disclaimer_version}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Admin Actions */}
        <div>
          <UserManagementActions
            userId={id}
            userEmail={user.email}
            currentPlan={user.plan_tier}
            grantedTier={user.granted_tier}
            isAdmin={user.is_admin}
            hasSubscription={!!subscription}
            relistingMonitoringEnabled={user.relisting_monitoring_enabled !== false}
          />
        </div>
      </div>
    </div>
  );
}
