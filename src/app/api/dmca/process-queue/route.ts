import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { processQueue } from '@/lib/dmca/queue-processor';

/**
 * POST /api/dmca/process-queue
 *
 * Triggers queue processing. Auth via CRON_SECRET header (cron) or authenticated user.
 * Processes up to 5 pending email items per cycle.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: accept cron secret OR authenticated user
    const cronSecret = request.headers.get('x-cron-secret');
    const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;

    if (!isCron) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await processQueue({ limit: 5 });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[Process Queue API] Error:', error);
    return NextResponse.json({ error: 'Queue processing failed' }, { status: 500 });
  }
}

/**
 * GET /api/dmca/process-queue
 *
 * Returns queue status for authenticated user (active batches + recent items).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active batch summaries
    const { data: batches } = await supabase
      .from('dmca_batch_summary')
      .select('*')
      .eq('user_id', user.id)
      .order('batch_created_at', { ascending: false })
      .limit(10);

    // Get recent queue items
    const { data: recentItems } = await supabase
      .from('dmca_send_queue')
      .select('id, batch_id, infringement_id, provider_name, delivery_method, status, scheduled_for, completed_at, error_message, attempt_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      batches: batches || [],
      recent_items: recentItems || [],
    });
  } catch (error: any) {
    console.error('[Process Queue API] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch queue status' }, { status: 500 });
  }
}

/**
 * PATCH /api/dmca/process-queue
 *
 * Mark a web_form queue item as manually submitted.
 * Creates a takedown record and marks the item complete.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { queue_item_id, action } = body;

    if (!queue_item_id || action !== 'mark_submitted') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Fetch the queue item
    const { data: item } = await supabase
      .from('dmca_send_queue')
      .select('*')
      .eq('id', queue_item_id)
      .eq('user_id', user.id)
      .single();

    if (!item) {
      return NextResponse.json({ error: 'Queue item not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Get infringement source URL
    const { data: infringement } = await supabase
      .from('infringements')
      .select('source_url, status')
      .eq('id', item.infringement_id)
      .single();

    // Create takedown record
    const { data: takedown } = await supabase
      .from('takedowns')
      .insert({
        infringement_id: item.infringement_id,
        user_id: user.id,
        type: 'dmca',
        status: 'sent',
        notice_content: item.notice_body,
        recipient_email: item.recipient_email || item.form_url || '',
        cc_emails: [],
        infringing_url: infringement?.source_url || '',
        submitted_at: now,
        sent_at: now,
      })
      .select('id')
      .single();

    // Update queue item
    await supabase
      .from('dmca_send_queue')
      .update({
        status: 'sent',
        takedown_id: takedown?.id || null,
        completed_at: now,
      })
      .eq('id', queue_item_id);

    // Update infringement status
    if (infringement?.status === 'active') {
      await supabase
        .from('infringements')
        .update({ status: 'takedown_sent' })
        .eq('id', item.infringement_id);
    }

    return NextResponse.json({ success: true, takedown_id: takedown?.id });
  } catch (error: any) {
    console.error('[Process Queue API] PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to mark as submitted' }, { status: 500 });
  }
}
