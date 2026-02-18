import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logCommunication } from '@/lib/communications/log-communication';
import { sendDMCANotice } from '@/lib/dmca/send-email';
import type { BuiltNotice } from '@/lib/dmca/notice-builder';
import type { ProviderInfo } from '@/lib/dmca/provider-database';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientEmail, providerName } = body;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 });
    }

    // Fetch takedown with infringement reference
    const { data: takedown } = await supabase
      .from('takedowns')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!takedown) {
      return NextResponse.json({ error: 'Takedown not found' }, { status: 404 });
    }

    // Fetch user's DMCA reply email preference
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, dmca_reply_email')
      .eq('id', user.id)
      .single();

    const replyToEmail = profile?.dmca_reply_email || profile?.email || user.email;
    const senderName = profile?.full_name || 'ProductGuard User';

    // Build objects for sendDMCANotice
    const builtNotice = {
      subject: 'DMCA Takedown Notice',
      body: takedown.notice_content || '',
      recipient_email: recipientEmail,
      recipient_name: providerName || 'DMCA Agent',
      recipient_form_url: null,
      legal_references: [],
      evidence_links: takedown.infringing_url ? [takedown.infringing_url] : [],
      sworn_statement: '',
      comparison_items: [],
      profile: 'full_reupload',
    } as BuiltNotice;

    const provider: ProviderInfo = {
      name: providerName || 'Unknown Provider',
      dmcaEmail: recipientEmail,
      dmcaFormUrl: null,
      agentName: providerName || 'DMCA Agent',
      requirements: '',
      prefersWebForm: false,
    };

    // Send the DMCA notice via Resend
    const sendResult = await sendDMCANotice(
      builtNotice,
      provider,
      replyToEmail || user.email || '',
      senderName,
    );

    if (!sendResult.success) {
      // Revert status to draft if send failed
      await supabase
        .from('takedowns')
        .update({ status: 'draft' })
        .eq('id', id);

      return NextResponse.json({
        error: `Email send failed: ${sendResult.error}`,
        method: sendResult.method,
        formUrl: sendResult.formUrl || null,
      }, { status: 500 });
    }

    // Update takedown status to sent
    const { error } = await supabase
      .from('takedowns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_email: recipientEmail,
      })
      .eq('id', id);

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update takedown' }, { status: 500 });
    }

    // Log communication
    await logCommunication(supabase, {
      user_id: user.id,
      infringement_id: takedown.infringement_id || undefined,
      takedown_id: takedown.id,
      channel: 'email',
      to_email: recipientEmail,
      reply_to_email: replyToEmail || undefined,
      subject: 'DMCA Takedown Notice',
      body_preview: (takedown.notice_content || '').substring(0, 500),
      status: 'sent',
      external_message_id: sendResult.messageId || undefined,
      provider_name: providerName || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'DMCA notice sent successfully',
      delivery: {
        method: sendResult.method,
        messageId: sendResult.messageId || null,
      },
    });
  } catch (error) {
    console.error('Send DMCA error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
