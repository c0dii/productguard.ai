// ============================================================
// GHL Webhook Handler
// src/app/api/webhooks/ghl/route.ts
//
// Receives webhook events from GoHighLevel and updates
// the marketing pipeline tables accordingly.
//
// Events handled:
//   - email-opened     → marketing_outreach.opened_at
//   - link-clicked     → marketing_outreach.clicked_at
//   - social-dm-sent   → marketing_social_actions
//   - social-post-made → marketing_social_actions
//   - reply-received   → marketing_responses
//   - unsubscribed     → marketing_outreach + marketing_suppression
//   - complained       → marketing_outreach + marketing_suppression
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyGHLWebhook } from '@/lib/marketing/ghl-client';
import { systemLogger } from '@/lib/logging/system-logger';

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const rawBody = await req.text();
    const signature = req.headers.get('x-ghl-signature');

    // Verify webhook authenticity
    if (!verifyGHLWebhook(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { event, contact } = body;

    // Extract our internal prospect ID from GHL custom fields
    const prospectId = contact?.customField?.pg_prospect_id;
    if (!prospectId) {
      // Not a marketing engine contact — ignore
      return NextResponse.json({ ok: true, skipped: 'no pg_prospect_id' });
    }

    const tags: string[] = contact?.tags || [];

    // ── Route by event type ───────────────────────────────

    // Email opened
    if (event === 'contact.tag_added' && tags.includes('email-opened')) {
      await supabase
        .from('marketing_outreach')
        .update({ opened_at: new Date().toISOString() })
        .eq('prospect_id', prospectId)
        .is('opened_at', null); // Only set once

      await supabase
        .from('marketing_prospects')
        .update({ status: 'engaged' })
        .eq('id', prospectId)
        .in('status', ['pushed_to_ghl', 'email_sent']);

      return NextResponse.json({ ok: true, handled: 'email-opened' });
    }

    // Link clicked (CTA to alerts page)
    if (event === 'contact.tag_added' && tags.includes('link-clicked')) {
      await supabase
        .from('marketing_outreach')
        .update({ clicked_at: new Date().toISOString() })
        .eq('prospect_id', prospectId)
        .is('clicked_at', null);

      await supabase
        .from('marketing_prospects')
        .update({ status: 'engaged' })
        .eq('id', prospectId);

      return NextResponse.json({ ok: true, handled: 'link-clicked' });
    }

    // Social DM sent
    if (event === 'contact.tag_added' && tags.includes('social-dm-sent')) {
      // Determine platform from tags (GHL adds platform-specific tags)
      const platform = tags.includes('dm-twitter') ? 'twitter'
        : tags.includes('dm-instagram') ? 'instagram'
        : tags.includes('dm-facebook') ? 'facebook'
        : 'instagram'; // default

      await supabase
        .from('marketing_social_actions')
        .insert({
          prospect_id: prospectId,
          action: 'dm_sent',
          platform,
          content: contact?.note || null,
          sent_at: new Date().toISOString(),
        });

      return NextResponse.json({ ok: true, handled: 'social-dm-sent' });
    }

    // Social post created (escalation tag post)
    if (event === 'contact.tag_added' && tags.includes('social-post-made')) {
      const platform = tags.includes('post-twitter') ? 'twitter'
        : tags.includes('post-instagram') ? 'instagram'
        : tags.includes('post-facebook') ? 'facebook'
        : 'twitter'; // default

      await supabase
        .from('marketing_social_actions')
        .insert({
          prospect_id: prospectId,
          action: 'post_created',
          platform,
          content: contact?.note || null,
          post_url: contact?.customField?.post_url || null,
          sent_at: new Date().toISOString(),
        });

      return NextResponse.json({ ok: true, handled: 'social-post-made' });
    }

    // Reply received (email or social)
    if (event === 'contact.note_added' || event === 'conversation.message_received') {
      const channel = body.channel === 'email' ? 'email'
        : body.channel === 'instagram' ? 'instagram_dm'
        : body.channel === 'facebook' ? 'facebook_dm'
        : body.channel === 'twitter' ? 'twitter_dm'
        : 'email';

      // Get the outreach record
      const { data: outreach } = await supabase
        .from('marketing_outreach')
        .select('id')
        .eq('prospect_id', prospectId)
        .limit(1)
        .single();

      await supabase
        .from('marketing_responses')
        .insert({
          prospect_id: prospectId,
          outreach_id: outreach?.id || null,
          channel,
          from_contact: contact?.email || body.from || null,
          subject: body.subject || null,
          body: body.message || contact?.note || '[No content]',
          received_at: new Date().toISOString(),
          read_by_admin: false,
        });

      // Update prospect status
      await supabase
        .from('marketing_prospects')
        .update({ status: 'engaged' })
        .eq('id', prospectId);

      return NextResponse.json({ ok: true, handled: 'reply-received' });
    }

    // Unsubscribed
    if (event === 'contact.tag_added' && tags.includes('unsubscribed')) {
      await supabase
        .from('marketing_outreach')
        .update({ unsubscribed: true })
        .eq('prospect_id', prospectId);

      // Add to suppression list
      const domain = contact?.customField?.company_domain;
      const email = contact?.email;
      if (domain || email) {
        await supabase.from('marketing_suppression').insert({
          domain: domain || null,
          email: email || null,
          reason: 'unsubscribed',
          source: 'ghl_webhook',
        });
      }

      await supabase
        .from('marketing_prospects')
        .update({ status: 'suppressed' })
        .eq('id', prospectId);

      return NextResponse.json({ ok: true, handled: 'unsubscribed' });
    }

    // Complained (spam report)
    if (event === 'contact.tag_added' && tags.includes('complained')) {
      await supabase
        .from('marketing_outreach')
        .update({ complained: true })
        .eq('prospect_id', prospectId);

      const domain = contact?.customField?.company_domain;
      const email = contact?.email;
      if (domain || email) {
        await supabase.from('marketing_suppression').insert({
          domain: domain || null,
          email: email || null,
          reason: 'complained',
          source: 'ghl_webhook',
        });
      }

      await supabase
        .from('marketing_prospects')
        .update({ status: 'suppressed' })
        .eq('id', prospectId);

      return NextResponse.json({ ok: true, handled: 'complained' });
    }

    // Unknown event — log but don't fail
    console.log(`[ghl-webhook] Unhandled event: ${event}`, { prospectId, tags });
    await systemLogger.logWebhook('ghl', event || 'unknown', 'success', `GHL webhook: ${event}`, { provider: 'ghl', event_type: event, prospect_id: prospectId });
    await systemLogger.flush();
    return NextResponse.json({ ok: true, skipped: 'unhandled event' });

  } catch (err) {
    console.error('[ghl-webhook] Error:', err);
    await systemLogger.logWebhook('ghl', 'unknown', 'failure', `GHL webhook failed: ${err instanceof Error ? err.message : String(err)}`, { provider: 'ghl', error: err instanceof Error ? err.message : String(err) });
    await systemLogger.flush();
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
