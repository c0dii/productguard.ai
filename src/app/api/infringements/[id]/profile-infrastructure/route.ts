import { createClient } from '@/lib/supabase/server';
import { infrastructureProfiler } from '@/lib/enforcement/infrastructure-profiler';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/infringements/[id]/profile-infrastructure
 * Manually trigger infrastructure profiling for an existing infringement
 *
 * Useful for:
 * - Re-profiling after WHOIS data changes
 * - Backfilling infrastructure data for old infringements
 * - Updating abuse contacts before sending DMCA
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch infringement
    const { data: infringement, error: fetchError } = await supabase
      .from('infringements')
      .select('id, source_url, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !infringement) {
      return NextResponse.json({ error: 'Infringement not found' }, { status: 404 });
    }

    // Profile the infrastructure
    console.log(`[Infrastructure Profile] Profiling ${infringement.source_url}...`);
    const infrastructure = await infrastructureProfiler.profile(infringement.source_url);

    // Update infringement with infrastructure data
    const { error: updateError } = await supabase
      .from('infringements')
      .update({ infrastructure })
      .eq('id', id);

    if (updateError) {
      console.error('[Infrastructure Profile] Update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update infrastructure data' }, { status: 500 });
    }

    console.log(`[Infrastructure Profile] Successfully profiled ${infringement.source_url}`);

    return NextResponse.json({
      success: true,
      infrastructure,
    });
  } catch (error) {
    console.error('[Infrastructure Profile] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
