import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logCommunication } from '@/lib/communications/log-communication';

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

    // TODO: Implement email sending via Resend or another service
    // For now, we'll just update the database to mark it as sent
    // In production, you'd use Resend API here:
    // await resend.emails.send({
    //   from: 'takedowns@productguard.ai',
    //   to: recipientEmail,
    //   replyTo: replyToEmail,
    //   subject: 'DMCA Takedown Notice',
    //   text: takedown.notice_content,
    // });

    // Update takedown status
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
      body_preview: takedown.notice_content || undefined,
      status: 'sent',
      provider_name: providerName || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'DMCA notice marked as sent',
      note: 'Email integration coming soon. For now, copy the notice and send manually.',
    });
  } catch (error) {
    console.error('Send DMCA error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
