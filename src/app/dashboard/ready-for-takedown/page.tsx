import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReadyForTakedownClient } from '@/components/dashboard/ReadyForTakedownClient';

export const dynamic = 'force-dynamic';

export default async function ReadyForTakedownPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch active infringements with product info
  const { data: activeInfringements } = await supabase
    .from('infringements')
    .select('*, products(name, type, price)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('severity_score', { ascending: false });

  // Fetch infringement IDs that already have takedowns
  const infIds = (activeInfringements || []).map((i) => i.id);
  const [{ data: existingTakedowns }, { data: existingQueue }] = await Promise.all([
    infIds.length > 0
      ? supabase.from('takedowns').select('infringement_id').in('infringement_id', infIds)
      : Promise.resolve({ data: [] }),
    infIds.length > 0
      ? supabase.from('dmca_send_queue').select('infringement_id').in('infringement_id', infIds).in('status', ['pending', 'processing'])
      : Promise.resolve({ data: [] }),
  ]);

  const takedownInfIds = new Set((existingTakedowns || []).map((t) => t.infringement_id));
  const queuedInfIds = new Set((existingQueue || []).map((q) => q.infringement_id));

  const readyInfringements = (activeInfringements || []).filter(
    (i) => !takedownInfIds.has(i.id) && !queuedInfIds.has(i.id)
  );

  // Fetch user profile for DMCA contact info
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone, address, dmca_reply_email')
    .eq('id', user.id)
    .single();

  // Fetch active batch info
  const { data: activeBatches } = await supabase
    .from('dmca_batch_summary')
    .select('*')
    .eq('user_id', user.id)
    .gt('pending_count', 0);

  // Get unique products for filter
  const products = Array.from(
    new Map(
      readyInfringements
        .filter((i) => i.products)
        .map((i) => [i.product_id, { id: i.product_id, name: i.products.name }])
    ).values()
  );

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-pg-text">Ready for Takedown</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          Confirmed infringements awaiting DMCA action. Select items and send bulk takedown notices.
        </p>
      </div>

      {/* Active batch banner */}
      {activeBatches && activeBatches.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-sm text-blue-300">
                Bulk DMCA in progress — {activeBatches[0].sent_count} of {activeBatches[0].total_items} sent
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

      <ReadyForTakedownClient
        infringements={readyInfringements}
        products={products}
        profile={profile}
        userId={user.id}
      />
    </div>
  );
}
