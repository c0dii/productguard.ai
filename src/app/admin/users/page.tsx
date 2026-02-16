import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; plan?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from('profiles')
    .select('*, subscriptions(status, stripe_subscription_id)')
    .order('created_at', { ascending: false });

  // Apply filters
  if (params.search) {
    query = query.or(
      `email.ilike.%${params.search}%,full_name.ilike.%${params.search}%,company_name.ilike.%${params.search}%`
    );
  }

  if (params.plan && params.plan !== 'all') {
    query = query.eq('plan_tier', params.plan);
  }

  const { data: users } = await query;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white">User Management</h1>
        <p className="text-gray-400">
          Search, view, and manage user accounts
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
        <form method="GET" className="flex gap-4">
          <input
            type="text"
            name="search"
            placeholder="Search by email, name, or company..."
            defaultValue={params.search}
            className="input-field flex-1"
          />
          <select
            name="plan"
            defaultValue={params.plan || 'all'}
            className="input-field w-48"
          >
            <option value="all">All Plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
          <button type="submit" className="btn-glow px-6">
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10-2">
        {!users || users.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    User
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Plan
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Joined
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: any) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pg-accent to-blue-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-white">
                            {user.full_name || 'No name'}
                          </span>
                          {user.is_admin && (
                            <Badge
                              variant="default"
                              className="bg-red-500 bg-opacity-10 text-red-400 text-xs"
                            >
                              ADMIN
                            </Badge>
                          )}
                          {user.granted_tier && (
                            <Badge
                              variant="default"
                              className="bg-purple-500 bg-opacity-10 text-purple-400 text-xs"
                            >
                              ⭐ {user.granted_tier}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-400 font-mono">
                        {user.email}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="default"
                        className={`capitalize text-xs ${
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
                    </td>
                    <td className="py-3 px-4">
                      {user.subscriptions?.[0] ? (
                        <Badge
                          variant="default"
                          className={`capitalize text-xs ${
                            user.subscriptions[0].status === 'active'
                              ? 'bg-pg-accent bg-opacity-10 text-pg-accent'
                              : user.subscriptions[0].status === 'canceled'
                              ? 'bg-red-500 bg-opacity-10 text-red-400'
                              : 'bg-pg-warning bg-opacity-10 text-pg-warning'
                          }`}
                        >
                          {user.subscriptions[0].status}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">No subscription</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/admin/users/${user.id}`}>
                        <button className="text-sm bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent hover:from-cyan-300 hover:to-blue-400 transition-all">
                          View →
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
