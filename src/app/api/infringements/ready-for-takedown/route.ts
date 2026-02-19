import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/infringements/ready-for-takedown
 *
 * Returns infringements with status 'active' that have no associated
 * takedown record and no pending/processing queue item.
 * These are confirmed infringements ready for bulk DMCA action.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch active infringements with product info
    const { data: activeInfringements, error: infError } = await supabase
      .from('infringements')
      .select('*, products(name, type, price)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('severity_score', { ascending: false });

    if (infError) {
      console.error('[Ready for Takedown] Error fetching infringements:', infError);
      return NextResponse.json({ error: 'Failed to fetch infringements' }, { status: 500 });
    }

    if (!activeInfringements || activeInfringements.length === 0) {
      return NextResponse.json({ infringements: [], count: 0 });
    }

    // 2. Fetch infringement IDs that already have takedowns
    const infIds = activeInfringements.map((i) => i.id);
    const { data: existingTakedowns } = await supabase
      .from('takedowns')
      .select('infringement_id')
      .in('infringement_id', infIds);

    const takedownInfIds = new Set(
      (existingTakedowns || []).map((t) => t.infringement_id)
    );

    // 3. Fetch infringement IDs that have pending/processing queue items
    const { data: existingQueue } = await supabase
      .from('dmca_send_queue')
      .select('infringement_id')
      .in('infringement_id', infIds)
      .in('status', ['pending', 'processing']);

    const queuedInfIds = new Set(
      (existingQueue || []).map((q) => q.infringement_id)
    );

    // 4. Filter out infringements that already have takedowns or are queued
    const readyInfringements = activeInfringements.filter(
      (i) => !takedownInfIds.has(i.id) && !queuedInfIds.has(i.id)
    );

    return NextResponse.json({
      infringements: readyInfringements,
      count: readyInfringements.length,
    });
  } catch (error) {
    console.error('[Ready for Takedown] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ready-for-takedown infringements' },
      { status: 500 }
    );
  }
}
