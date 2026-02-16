import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/infringements/[id]/verify
 * Verify or reject a pending infringement
 *
 * Body: { action: 'verify' | 'reject' }
 *
 * - 'verify' → status becomes 'active', sets verified_by_user_at timestamp
 * - 'reject' → status becomes 'false_positive', excludes from charts
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { action } = body;

    if (!action || !['verify', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "verify" or "reject"' },
        { status: 400 }
      );
    }

    // Fetch infringement and verify ownership
    const { data: infringement, error: fetchError } = await supabase
      .from('infringements')
      .select('*, products!inner(user_id)')
      .eq('id', id)
      .single();

    if (fetchError || !infringement) {
      return NextResponse.json({ error: 'Infringement not found' }, { status: 404 });
    }

    // Check user owns the product associated with this infringement
    if (infringement.products.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update status based on action
    const newStatus = action === 'verify' ? 'active' : 'false_positive';
    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('infringements')
      .update({
        status: newStatus,
        verified_by_user_at: action === 'verify' ? now : null,
        verified_by_user_id: action === 'verify' ? user.id : null,
        status_changed_at: now,
        previous_status: infringement.status,
        updated_at: now,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating infringement:', updateError);
      return NextResponse.json({ error: 'Failed to update infringement' }, { status: 500 });
    }

    // Log status transition in audit table
    await supabase.from('status_transitions').insert({
      infringement_id: id,
      from_status: infringement.status,
      to_status: newStatus,
      reason:
        action === 'verify' ? 'User verified as real infringement' : 'User marked as false positive',
      triggered_by: 'user',
      metadata: { user_id: user.id, action },
    });

    return NextResponse.json({
      success: true,
      action,
      newStatus,
      message:
        action === 'verify'
          ? 'Infringement verified and marked as active'
          : 'Infringement marked as false positive',
    });
  } catch (error) {
    console.error('Verification endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
