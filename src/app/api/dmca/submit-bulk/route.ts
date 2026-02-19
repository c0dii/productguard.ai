import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import type { DeliveryMethod } from '@/types';

interface QueueItem {
  infringement_id: string;
  recipient_email: string | null;
  recipient_name: string | null;
  provider_name: string;
  target_type: string;
  delivery_method: DeliveryMethod;
  form_url: string | null;
  notice_subject: string;
  notice_body: string;
  cc_emails: string[] | null;
}

/**
 * POST /api/dmca/submit-bulk
 *
 * Accepts reviewed bulk DMCA data and inserts items into the send queue.
 * Email items are staggered 3 minutes apart. Web form items are marked immediately.
 *
 * Body: {
 *   items: QueueItem[];
 *   signature_name: string;
 *   perjury_confirmed: boolean;
 *   liability_confirmed: boolean;
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, signature_name, perjury_confirmed, liability_confirmed } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items is required' }, { status: 400 });
    }

    if (!signature_name) {
      return NextResponse.json({ error: 'signature_name is required' }, { status: 400 });
    }

    if (!perjury_confirmed || !liability_confirmed) {
      return NextResponse.json({ error: 'You must confirm the perjury and liability statements' }, { status: 400 });
    }

    if (items.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 items per batch' }, { status: 400 });
    }

    // Rate limit: check for recent submissions (max 1 per 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentBatches } = await supabase
      .from('dmca_send_queue')
      .select('batch_id')
      .eq('user_id', user.id)
      .gte('created_at', fiveMinutesAgo)
      .limit(1);

    if (recentBatches && recentBatches.length > 0) {
      return NextResponse.json(
        { error: 'Rate limited. Please wait 5 minutes between bulk submissions.' },
        { status: 429 }
      );
    }

    // Generate batch ID
    const batchId = crypto.randomUUID();
    const now = new Date();

    // Build queue records with staggered scheduling
    let emailIndex = 0;
    const queueRecords = items.map((item: QueueItem) => {
      let scheduledFor: Date;
      let status: string;

      if (item.delivery_method === 'email') {
        // Stagger emails 3 minutes apart
        scheduledFor = new Date(now.getTime() + emailIndex * 3 * 60 * 1000);
        status = 'pending';
        emailIndex++;
      } else if (item.delivery_method === 'web_form') {
        scheduledFor = now;
        status = 'web_form';
      } else {
        scheduledFor = now;
        status = 'pending';
      }

      // Append electronic signature to notice body
      const signedBody = `${item.notice_body}\n\n---\nElectronic Signature: /${signature_name}/\nSigned at: ${now.toISOString()}`;

      return {
        user_id: user.id,
        batch_id: batchId,
        infringement_id: item.infringement_id,
        recipient_email: item.recipient_email,
        recipient_name: item.recipient_name,
        provider_name: item.provider_name,
        target_type: item.target_type,
        delivery_method: item.delivery_method,
        form_url: item.form_url,
        notice_subject: item.notice_subject,
        notice_body: signedBody,
        cc_emails: item.cc_emails,
        status,
        priority: 0,
        scheduled_for: scheduledFor.toISOString(),
      };
    });

    // Insert all queue records
    const { error: insertError } = await supabase
      .from('dmca_send_queue')
      .insert(queueRecords);

    if (insertError) {
      console.error('[Submit Bulk] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to queue items' }, { status: 500 });
    }

    // Trigger first processing cycle (fire-and-forget)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    fetch(`${baseUrl}/api/dmca/process-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET || '',
      },
    }).catch((err) => {
      console.error('[Submit Bulk] Failed to trigger queue processing:', err);
    });

    const emailCount = items.filter((i: QueueItem) => i.delivery_method === 'email').length;
    const estimatedMinutes = emailCount > 0 ? (emailCount - 1) * 3 : 0;

    return NextResponse.json({
      batch_id: batchId,
      total_queued: items.length,
      email_count: emailCount,
      web_form_count: items.filter((i: QueueItem) => i.delivery_method === 'web_form').length,
      estimated_completion_minutes: estimatedMinutes,
    });
  } catch (error: any) {
    console.error('[Submit Bulk] Error:', error);
    return NextResponse.json({ error: 'Failed to submit bulk DMCA' }, { status: 500 });
  }
}
