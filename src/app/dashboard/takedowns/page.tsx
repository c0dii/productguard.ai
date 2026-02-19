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

  const [{ data: takedowns }, { data: activeBatches }] = await Promise.all([
    supabase
      .from('takedowns')
      .select('*, infringements(source_url, platform)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('dmca_batch_summary')
      .select('batch_id, total_items, sent_count, pending_count, processing_count')
      .eq('user_id', user.id)
      .gt('pending_count', 0)
      .limit(1),
  ]);

  const activeBatch = activeBatches?.[0] || null;

  return (
    <div>
      {activeBatch && (
        <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-sm text-blue-300">
                Bulk DMCA in progress — {activeBatch.sent_count} of {activeBatch.total_items} sent
              </p>
            </div>
            <a
              href="/dashboard/ready-for-takedown/queue"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              View Status
            </a>
          </div>
        </div>
      )}
      <TakedownsClient takedowns={takedowns || []} />
    </div>
  );
}
