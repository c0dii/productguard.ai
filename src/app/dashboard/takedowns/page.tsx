import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TakedownsClient } from '@/components/dashboard/TakedownsClient';

export default async function TakedownsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: takedowns } = await supabase
    .from('takedowns')
    .select('*, infringements(source_url, platform)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return <TakedownsClient takedowns={takedowns || []} />;
}
