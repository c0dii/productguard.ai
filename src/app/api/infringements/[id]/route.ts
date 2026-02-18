import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
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

    const { data: infringement, error } = await supabase
      .from('infringements')
      .select('*, products(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !infringement) {
      return NextResponse.json({ error: 'Infringement not found' }, { status: 404 });
    }

    return NextResponse.json(infringement);
  } catch (error) {
    console.error('Error fetching infringement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
