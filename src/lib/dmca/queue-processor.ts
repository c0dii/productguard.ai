/**
 * DMCA Queue Processor
 *
 * Processes pending email items from the dmca_send_queue table.
 * Called by the /api/dmca/process-queue cron job every 3 minutes.
 *
 * Uses service-role admin client to bypass RLS for cross-user processing.
 * Each cycle processes up to 5 items with 200ms delays between sends.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { sendDMCANotice } from '@/lib/dmca/send-email';
import { logCommunication } from '@/lib/communications/log-communication';
import type { BuiltNotice } from '@/lib/dmca/notice-builder';
import type { ProviderInfo } from '@/lib/dmca/provider-database';

interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
  items: Array<{
    id: string;
    status: 'sent' | 'failed';
    message_id?: string;
    error?: string;
  }>;
}

export async function processQueue(options?: { limit?: number }): Promise<ProcessResult> {
  const limit = options?.limit || 5;
  const supabase = createAdminClient();
  const result: ProcessResult = { processed: 0, sent: 0, failed: 0, items: [] };

  try {
    // Atomic claim: grab pending items where scheduled_for <= now
    const now = new Date().toISOString();
    const { data: items, error: fetchError } = await supabase
      .from('dmca_send_queue')
      .update({
        status: 'processing',
        processing_started_at: now,
      })
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .lt('attempt_count', 3)
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(limit)
      .select('*');

    if (fetchError) {
      console.error('[Queue Processor] Error claiming items:', fetchError);
      return result;
    }

    if (!items || items.length === 0) {
      console.log('[Queue Processor] No pending items to process');
      return result;
    }

    console.log(`[Queue Processor] Processing ${items.length} items`);

    for (const item of items) {
      result.processed++;

      try {
        // Skip items without email (shouldn't happen for 'pending' status, but be safe)
        if (!item.recipient_email) {
          await supabase
            .from('dmca_send_queue')
            .update({
              status: 'failed',
              error_message: 'No recipient email address',
              attempt_count: item.attempt_count + 1,
              completed_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          result.failed++;
          result.items.push({ id: item.id, status: 'failed', error: 'No recipient email' });
          continue;
        }

        // Fetch user profile for sender info
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, dmca_reply_email')
          .eq('id', item.user_id)
          .single();

        const replyToEmail = profile?.dmca_reply_email || profile?.email || '';
        const senderName = profile?.full_name || 'ProductGuard User';

        // Build notice and provider objects for sendDMCANotice
        const builtNotice: BuiltNotice = {
          subject: item.notice_subject,
          body: item.notice_body,
          recipient_email: item.recipient_email,
          recipient_name: item.recipient_name || 'DMCA Agent',
          recipient_form_url: item.form_url,
          legal_references: [],
          evidence_links: [],
          sworn_statement: '',
          comparison_items: [],
          profile: 'full_reupload',
        };

        const provider: ProviderInfo = {
          name: item.provider_name,
          dmcaEmail: item.recipient_email,
          dmcaFormUrl: item.form_url,
          agentName: item.recipient_name || 'DMCA Agent',
          requirements: '',
          prefersWebForm: false,
        };

        // Send the email
        const sendResult = await sendDMCANotice(builtNotice, provider, replyToEmail, senderName);

        if (sendResult.success && sendResult.method === 'email') {
          // Success: create takedown record, update infringement, mark queue item sent
          const takedownNow = new Date().toISOString();

          // Create takedown record
          const { data: takedown } = await supabase
            .from('takedowns')
            .insert({
              infringement_id: item.infringement_id,
              user_id: item.user_id,
              type: 'dmca',
              status: 'sent',
              notice_content: item.notice_body,
              recipient_email: item.recipient_email,
              cc_emails: item.cc_emails || [],
              infringing_url: '', // Will be filled from infringement data below
              submitted_at: takedownNow,
              sent_at: takedownNow,
            })
            .select('id')
            .single();

          // Get infringing URL for the takedown record
          const { data: infringement } = await supabase
            .from('infringements')
            .select('source_url, status')
            .eq('id', item.infringement_id)
            .single();

          if (infringement && takedown) {
            // Update takedown with correct URL
            await supabase
              .from('takedowns')
              .update({ infringing_url: infringement.source_url })
              .eq('id', takedown.id);

            // Update infringement status to takedown_sent (only if currently active)
            if (infringement.status === 'active') {
              await supabase
                .from('infringements')
                .update({ status: 'takedown_sent' })
                .eq('id', item.infringement_id);
            }
          }

          // Mark queue item as sent
          await supabase
            .from('dmca_send_queue')
            .update({
              status: 'sent',
              takedown_id: takedown?.id || null,
              resend_message_id: sendResult.messageId || null,
              completed_at: takedownNow,
              attempt_count: item.attempt_count + 1,
            })
            .eq('id', item.id);

          // Log communication
          await logCommunication(supabase, {
            user_id: item.user_id,
            infringement_id: item.infringement_id,
            takedown_id: takedown?.id,
            channel: 'email',
            to_email: item.recipient_email,
            reply_to_email: replyToEmail,
            subject: item.notice_subject,
            body_preview: item.notice_body.substring(0, 500),
            status: 'sent',
            external_message_id: sendResult.messageId,
            provider_name: item.provider_name,
          });

          result.sent++;
          result.items.push({ id: item.id, status: 'sent', message_id: sendResult.messageId });
        } else {
          // Failed: increment attempts, reschedule or mark failed
          const newAttemptCount = item.attempt_count + 1;
          const isFinalAttempt = newAttemptCount >= item.max_attempts;

          await supabase
            .from('dmca_send_queue')
            .update({
              status: isFinalAttempt ? 'failed' : 'pending',
              attempt_count: newAttemptCount,
              error_message: sendResult.error || 'Email delivery failed',
              processing_started_at: null,
              // Reschedule 5 minutes later if retrying
              ...(isFinalAttempt
                ? { completed_at: new Date().toISOString() }
                : { scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString() }),
            })
            .eq('id', item.id);

          result.failed++;
          result.items.push({ id: item.id, status: 'failed', error: sendResult.error });
        }

        // Rate limit: 200ms between sends
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (itemError: any) {
        console.error(`[Queue Processor] Error processing item ${item.id}:`, itemError);

        // Mark as failed or retry
        const newAttemptCount = item.attempt_count + 1;
        await supabase
          .from('dmca_send_queue')
          .update({
            status: newAttemptCount >= item.max_attempts ? 'failed' : 'pending',
            attempt_count: newAttemptCount,
            error_message: itemError.message || 'Processing error',
            processing_started_at: null,
            ...(newAttemptCount >= item.max_attempts
              ? { completed_at: new Date().toISOString() }
              : { scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString() }),
          })
          .eq('id', item.id);

        result.failed++;
        result.items.push({ id: item.id, status: 'failed', error: itemError.message });
      }
    }

    console.log(`[Queue Processor] Complete: ${result.sent} sent, ${result.failed} failed`);
    return result;
  } catch (error: any) {
    console.error('[Queue Processor] Fatal error:', error);
    return result;
  }
}
