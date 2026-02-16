import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this infringement
    const { data: infringement } = await supabase
      .from('infringements')
      .select('*, products!inner(user_id)')
      .eq('id', id)
      .single();

    if (!infringement || infringement.products.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Update status back to 'active'
    const { error } = await supabase
      .from('infringements')
      .update({ status: 'active' })
      .eq('id', id);

    if (error) {
      console.error('Error reopening infringement:', error);
      return NextResponse.json({ error: 'Failed to reopen' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reopen infringement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
