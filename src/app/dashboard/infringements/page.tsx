import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { InfringementsPageClient } from '@/components/dashboard/InfringementsPageClient';

export default async function InfringementsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch ALL infringements for this user
  const { data: allInfringements } = await supabase
    .from('infringements')
    .select('*, products(name, price)')
    .eq('user_id', user.id)
    .order('severity_score', { ascending: false });

  // Calculate stats
  const needsReviewCount = allInfringements?.filter((i) => i.status === 'pending_verification').length || 0;
  const actionRequiredCount = allInfringements?.filter((i) => i.status === 'active').length || 0;
  const inProgressCount = allInfringements?.filter((i) => ['takedown_sent', 'disputed'].includes(i.status)).length || 0;
  const resolvedCount = allInfringements?.filter((i) => i.status === 'removed').length || 0;
  const dismissedCount = allInfringements?.filter((i) => i.status === 'false_positive').length || 0;
  const totalRevenueLoss = allInfringements?.filter((i) => ['active', 'takedown_sent', 'disputed'].includes(i.status))
    .reduce((sum, inf) => sum + (inf.est_revenue_loss || 0), 0) || 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-pg-text">Infringements</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          Manage and track all detected infringements
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <p className="text-xs sm:text-sm text-pg-text-muted mb-1">⚠️ Needs Review</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-warning">{needsReviewCount}</p>
        </div>
        <div className="p-4 sm:p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <p className="text-xs sm:text-sm text-pg-text-muted mb-1">🔴 Action Required</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-danger">{actionRequiredCount}</p>
        </div>
        <div className="p-4 sm:p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <p className="text-xs sm:text-sm text-pg-text-muted mb-1">📧 In Progress</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-500">{inProgressCount}</p>
        </div>
        <div className="p-4 sm:p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <p className="text-xs sm:text-sm text-pg-text-muted mb-1">✅ Resolved</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-500">{resolvedCount}</p>
        </div>
        <div className="p-4 sm:p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <p className="text-xs sm:text-sm text-pg-text-muted mb-1">Dismissed</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-500">{dismissedCount}</p>
        </div>
      </div>

      {/* Client Component with Filtering */}
      <InfringementsPageClient infringements={allInfringements || []} totalRevenueLoss={totalRevenueLoss} />
    </div>
  );
}
