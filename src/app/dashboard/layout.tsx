import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MobileDashboardLayout } from '@/components/dashboard/MobileDashboardLayout';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch profile and sidebar badge counts in parallel
  const [{ data: profile }, { count: needsReviewCount }, { count: readyForTakedownCount }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('infringements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pending_verification', 'active']),
      supabase
        .from('infringements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active'),
    ]);

  if (!profile) {
    redirect('/auth/login');
  }

  const badgeCounts = {
    infringements: needsReviewCount ?? 0,
    readyForTakedown: readyForTakedownCount ?? 0,
  };

  return (
    <MobileDashboardLayout profile={profile} badgeCounts={badgeCounts}>
      {children}
    </MobileDashboardLayout>
  );
}
