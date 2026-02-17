import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/infringements/[id]/reassign
 * Reassign an infringement to a different product owned by the same user.
 *
 * Body: { product_id: string }
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
    const { product_id } = body;

    if (!product_id) {
      return NextResponse.json(
        { error: 'Missing product_id' },
        { status: 400 }
      );
    }

    // Fetch the infringement and verify ownership
    const { data: infringement, error: fetchError } = await supabase
      .from('infringements')
      .select('id, product_id, user_id, source_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !infringement) {
      return NextResponse.json(
        { error: 'Infringement not found or access denied' },
        { status: 404 }
      );
    }

    if (infringement.product_id === product_id) {
      return NextResponse.json(
        { error: 'Infringement is already linked to this product' },
        { status: 400 }
      );
    }

    // Verify the target product exists and belongs to the user
    const { data: targetProduct, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', product_id)
      .eq('user_id', user.id)
      .single();

    if (productError || !targetProduct) {
      return NextResponse.json(
        { error: 'Target product not found or access denied' },
        { status: 404 }
      );
    }

    // Get the old product name for the audit log
    const { data: oldProduct } = await supabase
      .from('products')
      .select('name')
      .eq('id', infringement.product_id)
      .single();

    // Update the infringement's product_id
    const { error: updateError } = await supabase
      .from('infringements')
      .update({ product_id })
      .eq('id', id);

    if (updateError) {
      console.error('Error reassigning infringement:', updateError);
      return NextResponse.json(
        { error: 'Failed to reassign infringement' },
        { status: 500 }
      );
    }

    // Log the reassignment in status_transitions for audit trail
    try {
      await supabase.from('status_transitions').insert({
        infringement_id: id,
        from_status: null,
        to_status: infringement.product_id, // Store old product_id for reference
        reason: `Reassigned from "${oldProduct?.name || 'Unknown'}" to "${targetProduct.name}"`,
        triggered_by: 'user',
        metadata: {
          action: 'reassign_product',
          old_product_id: infringement.product_id,
          new_product_id: product_id,
          old_product_name: oldProduct?.name,
          new_product_name: targetProduct.name,
        },
      });
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error('Error logging reassignment:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: `Infringement reassigned to "${targetProduct.name}"`,
      new_product_id: product_id,
      new_product_name: targetProduct.name,
    });
  } catch (error: any) {
    console.error('Error in reassign endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
