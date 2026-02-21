import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from('subscriptions')
    .select('*, profiles(email, full_name, plan_tier)')
    .order('created_at', { ascending: false });

  // Apply filters
  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  const { data: subscriptions } = await query;

  // Calculate metrics
  const activeCount = subscriptions?.filter((s) => s.status === 'active').length || 0;
  const canceledCount = subscriptions?.filter((s) => s.status === 'canceled').length || 0;
  const pastDueCount = subscriptions?.filter((s) => s.status === 'past_due').length || 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-2xl sm:text-3xl font-bold mb-2">Subscription Management</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          Monitor and manage all user subscriptions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Total Subscriptions</p>
          <p className="text-2xl sm:text-3xl font-bold">{subscriptions?.length || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Active</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-accent">{activeCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Canceled</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-400">{canceledCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Past Due</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-warning">{pastDueCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <form method="GET" className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <select
            name="status"
            defaultValue={params.status || 'all'}
            className="input-field flex-1"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="canceled">Canceled</option>
            <option value="past_due">Past Due</option>
            <option value="trialing">Trialing</option>
            <option value="incomplete">Incomplete</option>
          </select>

          <button type="submit" className="btn-glow px-6">
            Filter
          </button>
        </form>
      </Card>

      {/* Subscriptions List */}
      <div className="space-y-3">
        {!subscriptions || subscriptions.length === 0 ? (
          <Card>
            <p className="text-center text-pg-text-muted py-8">No subscriptions found</p>
          </Card>
        ) : (
          subscriptions.map((sub: any) => (
            <Link key={sub.id} href={`/admin/users/${sub.user_id}`}>
              <Card className="hover:border-pg-accent transition-colors cursor-pointer">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold">
                        {sub.profiles?.email?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>

                    <div>
                      <p className="font-semibold mb-1">
                        {sub.profiles?.full_name || sub.profiles?.email || 'Unknown User'}
                      </p>
                      <p className="text-sm text-pg-text-muted mb-1">
                        {sub.profiles?.email}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="default"
                          className={`capitalize text-xs ${
                            sub.status === 'active'
                              ? 'bg-pg-accent bg-opacity-10 text-pg-accent'
                              : sub.status === 'canceled'
                              ? 'bg-red-500 bg-opacity-10 text-red-400'
                              : sub.status === 'past_due'
                              ? 'bg-pg-warning bg-opacity-10 text-pg-warning'
                              : 'bg-gray-500 bg-opacity-10 text-gray-400'
                          }`}
                        >
                          {sub.status}
                        </Badge>
                        <Badge
                          variant="default"
                          className={`capitalize text-xs ${
                            sub.profiles?.plan_tier === 'starter'
                              ? 'bg-blue-500 bg-opacity-10 text-blue-400'
                              : sub.profiles?.plan_tier === 'pro'
                              ? 'bg-purple-500 bg-opacity-10 text-purple-400'
                              : 'bg-orange-500 bg-opacity-10 text-orange-400'
                          }`}
                        >
                          {sub.profiles?.plan_tier}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm font-mono text-pg-text-muted mb-1 truncate">
                      {sub.stripe_subscription_id}
                    </p>
                    <p className="text-xs text-pg-text-muted">
                      Created: {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                    {sub.canceled_at && (
                      <p className="text-xs text-red-400">
                        Canceled: {new Date(sub.canceled_at).toLocaleDateString()}
                      </p>
                    )}
                    {sub.stripe_customer_id && (
                      <p className="text-xs text-pg-text-muted font-mono">
                        {sub.stripe_customer_id}
                      </p>
                    )}
                  </div>
                </div>

                {/* Additional Details */}
                <div className="mt-3 pt-3 border-t border-pg-border flex items-center justify-between text-xs">
                  <div className="flex gap-4">
                    {sub.current_period_start && (
                      <span className="text-pg-text-muted">
                        Period:{' '}
                        {new Date(sub.current_period_start).toLocaleDateString()} -{' '}
                        {sub.current_period_end
                          ? new Date(sub.current_period_end).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    )}
                  </div>
                  <span className="text-pg-accent">Click to view user →</span>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
