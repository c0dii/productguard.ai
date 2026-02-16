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
    const { grantedTier, reason } = body;

    if (!grantedTier || !['scout', 'starter', 'pro', 'business'].includes(grantedTier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    // Use admin client to grant access (bypasses RLS)
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('profiles')
      .update({
        granted_tier: grantedTier,
        granted_by: user.id,
        granted_at: new Date().toISOString(),
        granted_reason: reason.trim(),
      })
      .eq('id', id);

    if (error) {
      console.error('Grant access error:', error);
      return NextResponse.json(
        { error: 'Failed to grant access' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin grant access error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Use admin client to revoke granted access
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('profiles')
      .update({
        granted_tier: null,
        granted_by: null,
        granted_at: null,
        granted_reason: null,
      })
      .eq('id', id);

    if (error) {
      console.error('Revoke access error:', error);
      return NextResponse.json(
        { error: 'Failed to revoke access' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin revoke access error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
