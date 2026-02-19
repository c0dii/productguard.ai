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
    // 1. scan_history (references scan_id, has ON DELETE CASCADE but be explicit)
    await adminClient.from('scan_history').delete().eq('scan_id', id);

    // 2. infringements for this scan
    await adminClient.from('infringements').delete().eq('scan_id', id);

    // 3. The scan itself
    const { error } = await adminClient.from('scans').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete scan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
