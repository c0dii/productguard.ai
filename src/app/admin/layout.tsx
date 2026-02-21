import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MobileAdminLayout } from '@/components/admin/MobileAdminLayout';
import type { AdminAlertCounts } from '@/types';

export default async function AdminLayout({
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

  // Verify admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_admin) {
    redirect('/dashboard');
  }

  // Fetch alert counts for sidebar badge (graceful fallback if table doesn't exist yet)
  let alertCounts: AdminAlertCounts | null = null;
  try {
    const { data } = await supabase
      .from('admin_alert_counts')
      .select('*')
      .single();
    if (data) {
      alertCounts = data as AdminAlertCounts;
    }
  } catch {
    // Table may not exist yet before migration runs
  }

  return (
    <MobileAdminLayout profile={profile} alertCounts={alertCounts}>
      {children}
    </MobileAdminLayout>
  );
}
