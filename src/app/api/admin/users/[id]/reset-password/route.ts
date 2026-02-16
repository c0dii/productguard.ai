import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
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

    // Get target user's email
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use admin client to send password reset
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.resetPasswordForEmail(
      targetUser.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      }
    );

    if (error) {
      console.error('Password reset error:', error);
      return NextResponse.json(
        { error: 'Failed to send password reset' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
