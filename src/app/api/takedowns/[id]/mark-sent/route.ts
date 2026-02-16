import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(
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

    // Update takedown status
    const { error } = await supabase
      .from('takedowns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update takedown' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark sent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
