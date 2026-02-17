import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { trackInfringementResolved } from '@/lib/ghl/events';

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

    // Update status to 'removed' (resolved)
    const { error } = await supabase
      .from('infringements')
      .update({ status: 'removed' })
      .eq('id', id);

    if (error) {
      console.error('Error resolving infringement:', error);
      return NextResponse.json({ error: 'Failed to resolve' }, { status: 500 });
    }

    // Track in GHL
    if (user.email) {
      try {
        const { data: resolvedCount } = await supabase
          .from('infringements')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'removed');

        await trackInfringementResolved(user.id, user.email, id, resolvedCount?.length || 1);
      } catch (ghlError) {
        console.error('[GHL Events] Error tracking infringement resolved:', ghlError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resolve infringement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
