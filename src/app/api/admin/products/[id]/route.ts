import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    const adminClient = createAdminClient();

    // Cascade delete in FK order:
    // 1. intelligence_patterns (references product_id)
    await adminClient.from('intelligence_patterns').delete().eq('product_id', id);

    // 2. Get all scan IDs for this product to clean up scan_history
    const { data: productScans } = await adminClient
      .from('scans')
      .select('id')
      .eq('product_id', id);

    if (productScans && productScans.length > 0) {
      const scanIds = productScans.map((s) => s.id);
      await adminClient.from('scan_history').delete().in('scan_id', scanIds);
    }

    // 3. infringements (references product_id and scan_id)
    await adminClient.from('infringements').delete().eq('product_id', id);

    // 4. scans (references product_id)
    await adminClient.from('scans').delete().eq('product_id', id);

    // 5. The product itself
    const { error } = await adminClient.from('products').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
