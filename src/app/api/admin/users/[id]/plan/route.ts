import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: admin } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!admin || !admin.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { plan } = body;

    if (!plan || !['free', 'starter', 'pro', 'business'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Use admin client to update plan (bypasses RLS)
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('profiles')
      .update({ plan_tier: plan })
      .eq('id', id);

    if (error) {
      console.error('Plan update error:', error);
      return NextResponse.json(
        { error: 'Failed to update plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin plan update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
