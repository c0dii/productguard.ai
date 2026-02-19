import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch scan with progress data and product_id
    const { data: scan, error } = await supabase
      .from('scans')
      .select('id, status, scan_progress, last_updated_at, product_id, infringement_count')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Auto-recover scans stuck in 'running' state
    if (scan.status === 'running') {
      const adminClient = createAdminClient();
      const scanProgress = scan.scan_progress as { stages?: Array<{ status: string }> } | null;
      const stages = scanProgress?.stages || [];

      // Recovery 1: All stages completed but status never updated
      // This happens when Vercel kills the function after stages finish
      // but before the final status='completed' write
      const allStagesDone = stages.length > 0 && stages.every(
        (s) => s.status === 'completed' || s.status === 'skipped'
      );

      if (allStagesDone) {
        console.warn(`[Progress] Scan ${id} has all stages done but status='running', marking as completed`);
        await adminClient
          .from('scans')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', id);

        return NextResponse.json({
          ...scan,
          status: 'completed',
        });
      }

      // Recovery 2: Scan running past maxDuration (function killed by Vercel)
      // Vercel maxDuration=300s, so anything running >6 min is guaranteed dead
      const { data: fullScan } = await supabase
        .from('scans')
        .select('started_at')
        .eq('id', id)
        .single();

      if (fullScan?.started_at) {
        const elapsedMs = Date.now() - new Date(fullScan.started_at).getTime();
        const STALE_THRESHOLD_MS = 6 * 60 * 1000; // 6 minutes (maxDuration=300s + buffer)

        if (elapsedMs > STALE_THRESHOLD_MS) {
          console.warn(`[Progress] Scan ${id} stale (${Math.round(elapsedMs / 1000)}s), marking as failed`);
          await adminClient
            .from('scans')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', id);

          return NextResponse.json({
            ...scan,
            status: 'failed',
          });
        }
      }
    }

    // Include infringement count for real-time display
    return NextResponse.json({
      ...scan,
      infringement_count: scan.infringement_count || 0,
    });
  } catch (error) {
    console.error('Error fetching scan progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scan progress' },
      { status: 500 }
    );
  }
}
