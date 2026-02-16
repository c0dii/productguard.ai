import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

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

  return (
    <div className="flex min-h-screen bg-pg-bg">
      <AdminSidebar profile={profile} />
      <main className="flex-1 p-8 ml-64">
        {children}
      </main>
    </div>
  );
}
