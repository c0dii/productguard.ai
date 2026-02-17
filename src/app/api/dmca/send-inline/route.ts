import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logCommunication } from '@/lib/communications/log-communication';

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

    // Build full notice with signature appended
    const signedNotice = `${notice_content}\n\n---\nElectronic Signature: /${signature_name}/\nSigned at: ${new Date().toISOString()}\nProvider: ${provider_name}\nInfringement Types: ${(infringement_types || []).join(', ')}`;

    const now = new Date().toISOString();

    // Create takedown record (status = sent immediately)
    const { data: takedown, error: takedownError } = await supabase
      .from('takedowns')
      .insert({
        infringement_id,
        user_id: user.id,
        type: 'dmca',
        status: 'sent',
        notice_content: signedNotice,
        recipient_email,
        cc_emails: [],
        infringing_url: infringement.source_url,
        submitted_at: now,
        sent_at: now,
      })
      .select()
      .single();

    if (takedownError) {
      console.error('Error creating takedown:', takedownError);
      return NextResponse.json({ error: 'Failed to create takedown record' }, { status: 500 });
    }

    // Update infringement status to takedown_sent (only if currently active)
    if (infringement.status === 'active') {
      await supabase
        .from('infringements')
        .update({ status: 'takedown_sent' })
        .eq('id', infringement_id);
    }

    // Log communication
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, dmca_reply_email')
      .eq('id', user.id)
      .single();

    const replyToEmail = profile?.dmca_reply_email || profile?.email || user.email;

    await logCommunication(supabase, {
      user_id: user.id,
      infringement_id,
      takedown_id: takedown.id,
      channel: 'email',
      to_email: recipient_email,
      reply_to_email: replyToEmail || undefined,
      subject: notice_subject || 'DMCA Takedown Notice',
      body_preview: notice_content.substring(0, 500),
      status: 'sent',
      provider_name: provider_name || undefined,
    });

    return NextResponse.json({
      success: true,
      takedown,
    });
  } catch (error) {
    console.error('Inline DMCA send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
