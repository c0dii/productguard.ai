import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch scan with progress data
    const { data: scan, error } = await supabase
      .from('scans')
      .select('id, status, scan_progress, last_updated_at')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    return NextResponse.json(scan);
  } catch (error) {
    console.error('Error fetching scan progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scan progress' },
      { status: 500 }
    );
  }
}
