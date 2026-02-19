import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/dmca/batch/[batchId]
 *
 * Returns detailed batch status with all items.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { batchId } = await params;

    // Fetch batch summary
    const { data: batchSummary } = await supabase
      .from('dmca_batch_summary')
      .select('*')
      .eq('batch_id', batchId)
      .eq('user_id', user.id)
      .single();

    if (!batchSummary) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Fetch all items in the batch
    const { data: items } = await supabase
      .from('dmca_send_queue')
      .select(`
        id, infringement_id, recipient_email, recipient_name, provider_name,
        target_type, delivery_method, form_url, notice_subject, notice_body,
        status, priority, attempt_count, max_attempts, takedown_id,
        resend_message_id, error_message, scheduled_for, completed_at, created_at
      `)
      .eq('batch_id', batchId)
      .eq('user_id', user.id)
      .order('scheduled_for', { ascending: true });

    return NextResponse.json({
      batch: batchSummary,
      items: items || [],
    });
  } catch (error: any) {
    console.error('[Batch API] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 });
  }
}

/**
 * DELETE /api/dmca/batch/[batchId]
 *
 * Cancel remaining pending items in a batch (set status='skipped').
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { batchId } = await params;

    // Verify batch belongs to user
    const { data: existingItem } = await supabase
      .from('dmca_send_queue')
      .select('id')
      .eq('batch_id', batchId)
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!existingItem) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Cancel all pending items
    const { data: cancelled, error: cancelError } = await supabase
      .from('dmca_send_queue')
      .update({
        status: 'skipped',
        completed_at: new Date().toISOString(),
      })
      .eq('batch_id', batchId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .select('id');

    if (cancelError) {
      console.error('[Batch API] Cancel error:', cancelError);
      return NextResponse.json({ error: 'Failed to cancel batch' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      cancelled_count: cancelled?.length || 0,
    });
  } catch (error: any) {
    console.error('[Batch API] DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to cancel batch' }, { status: 500 });
  }
}
