import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QueueStatusClient } from '@/components/dashboard/QueueStatusClient';

export const dynamic = 'force-dynamic';

export default async function QueueStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { batch: batchId } = await searchParams;

  // Fetch all batch summaries for this user
  const { data: batches } = await supabase
    .from('dmca_batch_summary')
    .select('*')
    .eq('user_id', user.id)
    .order('batch_created_at', { ascending: false })
    .limit(20);

  // If a specific batch is requested, fetch its items
  let batchItems: any[] = [];
  let activeBatch = null;

  if (batchId) {
    const { data: items } = await supabase
      .from('dmca_send_queue')
      .select(`
        id, infringement_id, recipient_email, recipient_name, provider_name,
        target_type, delivery_method, form_url, notice_subject, notice_body,
        status, attempt_count, error_message, scheduled_for, completed_at, created_at
      `)
      .eq('batch_id', batchId)
      .eq('user_id', user.id)
      .order('scheduled_for', { ascending: true });

    batchItems = items || [];
    activeBatch = (batches || []).find((b) => b.batch_id === batchId) || null;
  } else if (batches && batches.length > 0) {
    // Default to most recent batch
    const latestBatch = batches[0];
    const { data: items } = await supabase
      .from('dmca_send_queue')
      .select(`
        id, infringement_id, recipient_email, recipient_name, provider_name,
        target_type, delivery_method, form_url, notice_subject, notice_body,
        status, attempt_count, error_message, scheduled_for, completed_at, created_at
      `)
      .eq('batch_id', latestBatch.batch_id)
      .eq('user_id', user.id)
      .order('scheduled_for', { ascending: true });

    batchItems = items || [];
    activeBatch = latestBatch;
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-2">
          <a href="/dashboard/ready-for-takedown" className="text-pg-text-muted hover:text-pg-text text-sm">
            Ready for Takedown
          </a>
          <span className="text-pg-text-muted text-sm">/</span>
          <span className="text-sm text-pg-text font-medium">Queue Status</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-pg-text">DMCA Send Queue</h1>
        <p className="text-sm sm:text-base text-pg-text-muted mt-1">
          Track the progress of your bulk DMCA submissions.
        </p>
      </div>

      <QueueStatusClient
        batches={batches || []}
        activeBatch={activeBatch}
        initialItems={batchItems}
      />
    </div>
  );
}
