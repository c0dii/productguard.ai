import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logCommunication } from '@/lib/communications/log-communication';
import { sendDMCANotice } from '@/lib/dmca/send-email';
import type { BuiltNotice } from '@/lib/dmca/notice-builder';
import type { ProviderInfo } from '@/lib/dmca/provider-database';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      infringement_id,
      notice_content,
      notice_subject,
      recipient_email,
      recipient_name,
      provider_name,
      target_type,
      infringement_types,
      signature_name,
      cc_emails: clientCcEmails,
    } = body;

    if (!infringement_id || !notice_content || !recipient_email || !signature_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient_email)) {
      return NextResponse.json({ error: 'Invalid recipient email format' }, { status: 400 });
    }

    // Validate field lengths
    if (notice_content.length > 50000 || signature_name.length > 200) {
      return NextResponse.json({ error: 'Field length exceeds maximum allowed' }, { status: 400 });
    }

    // Verify user owns the infringement
    const { data: infringement } = await supabase
      .from('infringements')
      .select('id, product_id, source_url, status, user_id')
      .eq('id', infringement_id)
      .eq('user_id', user.id)
      .single();

    if (!infringement) {
      return NextResponse.json({ error: 'Infringement not found' }, { status: 404 });
    }

    // Fetch profile for sender info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, dmca_reply_email')
      .eq('id', user.id)
      .single();

    const replyToEmail = profile?.dmca_reply_email || profile?.email || user.email;
    const senderName = profile?.full_name || signature_name;

    // Build full notice with signature appended
    const signedNotice = `${notice_content}\n\n---\nElectronic Signature: /${signature_name}/\nSigned at: ${new Date().toISOString()}\nProvider: ${provider_name}\nInfringement Types: ${(infringement_types || []).join(', ')}`;

    // Build objects for sendDMCANotice
    const builtNotice = {
      subject: notice_subject || 'DMCA Takedown Notice',
      body: signedNotice,
      recipient_email,
      recipient_name: recipient_name || provider_name || 'DMCA Agent',
      recipient_form_url: null,
      legal_references: [],
      evidence_links: [infringement.source_url],
      sworn_statement: '',
      comparison_items: [],
      profile: 'full_reupload',
    } as BuiltNotice;

    const provider: ProviderInfo = {
      name: provider_name || 'Unknown Provider',
      dmcaEmail: recipient_email,
      dmcaFormUrl: null,
      agentName: recipient_name || 'DMCA Agent',
      requirements: '',
      prefersWebForm: false,
      verified: false,
    };

    // Send the DMCA notice via Resend
    const sendResult = await sendDMCANotice(
      builtNotice,
      provider,
      replyToEmail || user.email || '',
      senderName,
    );

    // Send CC copies if primary send succeeded and CC emails provided
    const ccList = Array.isArray(clientCcEmails) ? clientCcEmails.filter((e: string) => e && emailRegex.test(e)) : [];

    if (sendResult.success && sendResult.method === 'email' && ccList.length > 0) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.DMCA_FROM_EMAIL || 'dmca@productguard.ai';

      for (const ccEmail of ccList) {
        try {
          await resend.emails.send({
            from: `${senderName} via ProductGuard <${fromEmail}>`,
            to: ccEmail,
            replyTo: replyToEmail || user.email || '',
            subject: `[CC] ${notice_subject || 'DMCA Takedown Notice'}`,
            text: signedNotice,
            headers: {
              'X-DMCA-Notice': 'true',
              'X-ProductGuard-Version': '1.0',
              'X-CC-Copy': 'true',
            },
          });
        } catch (ccError) {
          console.error(`Failed to send CC to ${ccEmail}:`, ccError);
        }
      }
    }

    const now = new Date().toISOString();
    const emailSent = sendResult.success && sendResult.method === 'email';

    // Create takedown record
    const { data: takedown, error: takedownError } = await supabase
      .from('takedowns')
      .insert({
        infringement_id,
        user_id: user.id,
        type: 'dmca',
        status: emailSent ? 'sent' : 'draft',
        notice_content: signedNotice,
        recipient_email,
        cc_emails: ccList,
        infringing_url: infringement.source_url,
        submitted_at: now,
        sent_at: emailSent ? now : null,
      })
      .select()
      .single();

    if (takedownError) {
      console.error('Error creating takedown:', takedownError);
      return NextResponse.json({ error: 'Failed to create takedown record' }, { status: 500 });
    }

    // Update infringement status to takedown_sent (only if currently active and email was sent)
    if (emailSent && infringement.status === 'active') {
      await supabase
        .from('infringements')
        .update({ status: 'takedown_sent' })
        .eq('id', infringement_id);
    }

    // Log communication
    await logCommunication(supabase, {
      user_id: user.id,
      infringement_id,
      takedown_id: takedown.id,
      channel: sendResult.method === 'web_form' ? 'web_form' : 'email',
      to_email: recipient_email,
      reply_to_email: replyToEmail || undefined,
      subject: notice_subject || 'DMCA Takedown Notice',
      body_preview: notice_content.substring(0, 500),
      status: emailSent ? 'sent' : 'failed',
      external_message_id: sendResult.messageId || undefined,
      provider_name: provider_name || undefined,
    });

    // Return result with delivery info
    return NextResponse.json({
      success: true,
      takedown,
      delivery: {
        method: sendResult.method,
        emailSent,
        messageId: sendResult.messageId || null,
        formUrl: sendResult.formUrl || null,
        error: sendResult.error || null,
      },
    });
  } catch (error) {
    console.error('Inline DMCA send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
