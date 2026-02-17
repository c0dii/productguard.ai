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

  // Calculate stats (3 groups matching the tab structure)
  const needsAttentionCount = allInfringements?.filter((i) => ['pending_verification', 'active'].includes(i.status)).length || 0;
  const inProgressCount = allInfringements?.filter((i) => ['takedown_sent', 'disputed'].includes(i.status)).length || 0;
  const resolvedCount = allInfringements?.filter((i) => ['removed', 'false_positive', 'archived'].includes(i.status)).length || 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-pg-text">Infringements</h1>
          <p className="text-sm sm:text-base text-pg-text-muted">
            Manage and track all detected infringements
          </p>
        </div>
        <Link
          href="/dashboard/takedowns/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-pg-accent text-white font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          + Report Infringing URL
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <p className="text-[10px] sm:text-sm text-pg-text-muted mb-0.5 sm:mb-1">Needs Attention</p>
          <p className="text-xl sm:text-3xl font-bold text-pg-accent">{needsAttentionCount}</p>
        </div>
        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <p className="text-[10px] sm:text-sm text-pg-text-muted mb-0.5 sm:mb-1">In Progress</p>
          <p className="text-xl sm:text-3xl font-bold text-blue-500">{inProgressCount}</p>
        </div>
        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <p className="text-[10px] sm:text-sm text-pg-text-muted mb-0.5 sm:mb-1">Resolved</p>
          <p className="text-xl sm:text-3xl font-bold text-green-500">{resolvedCount}</p>
        </div>
      </div>

      {/* Client Component with Filtering */}
      <InfringementsPageClient infringements={allInfringements || []} totalRevenueLoss={0} />
    </div>
  );
}
