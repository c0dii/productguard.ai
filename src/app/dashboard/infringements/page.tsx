import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { InfringementList } from '@/components/dashboard/InfringementList';

export default async function InfringementsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch all verified/active infringements for this user
  const { data: infringements } = await supabase
    .from('infringements')
    .select('*, products(name, price)')
    .eq('user_id', user.id)
    .in('status', ['active', 'takedown_sent', 'disputed'])
    .order('severity_score', { ascending: false });

  // Fetch stats
  const activeCount = infringements?.filter((i) => i.status === 'active').length || 0;
  const takedownSentCount = infringements?.filter((i) => i.status === 'takedown_sent').length || 0;
  const disputedCount = infringements?.filter((i) => i.status === 'disputed').length || 0;
  const totalRevenueLoss = infringements?.reduce((sum, inf) => sum + (inf.est_revenue_loss || 0), 0) || 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-pg-text">Active Infringements</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          All verified infringements requiring action
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <p className="text-sm text-pg-text-muted mb-1">Active</p>
          <p className="text-3xl font-bold text-pg-danger">{activeCount}</p>
        </div>
        <div className="p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <p className="text-sm text-pg-text-muted mb-1">Takedown Sent</p>
          <p className="text-3xl font-bold text-pg-warning">{takedownSentCount}</p>
        </div>
        <div className="p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <p className="text-sm text-pg-text-muted mb-1">Disputed</p>
          <p className="text-3xl font-bold text-yellow-500">{disputedCount}</p>
        </div>
        <div className="p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <p className="text-sm text-pg-text-muted mb-1">Est. Revenue Loss</p>
          <p className="text-3xl font-bold text-pg-danger">${totalRevenueLoss.toLocaleString()}</p>
        </div>
      </div>

      {/* Infringements List */}
      {infringements && infringements.length > 0 ? (
        <InfringementList
          infringements={infringements}
          productPrice={0} // Not needed when products are shown with infringements
          title="All Active Infringements"
          emptyMessage="No active infringements found"
          showProductName={true}
        />
      ) : (
        <div className="p-12 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <div className="text-center">
            <p className="text-xl font-semibold mb-2 text-pg-text">No active infringements</p>
            <p className="text-pg-text-muted mb-4">
              All detected infringements have been resolved or are awaiting verification
            </p>
            <Link
              href="/dashboard/scans"
              className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              View Scans
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
