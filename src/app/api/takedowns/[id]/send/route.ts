import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
    const { recipientEmail } = body;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 });
    }

    // Fetch takedown
    const { data: takedown } = await supabase
      .from('takedowns')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!takedown) {
      return NextResponse.json({ error: 'Takedown not found' }, { status: 404 });
    }

    // TODO: Implement email sending via Resend or another service
    // For now, we'll just update the database to mark it as sent
    // In production, you'd use Resend API here:
    // await resend.emails.send({
    //   from: 'takedowns@productguard.ai',
    //   to: recipientEmail,
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
