import { NextRequest, NextResponse } from 'next/server';
import { aggregateCosts } from '@/lib/cost/aggregate-costs';
import { systemLogger } from '@/lib/logging/system-logger';
import { timingSafeEqual } from 'crypto';

/**
 * Cost Aggregation Cron Job
 *
 * Runs every 8 hours (3x/day) to aggregate OpenAI token usage
 * from system_logs into cost_snapshots. Replaces per-call cost tracking
 * for better scalability.
 *
 * Schedule: every 8 hours (0 0,8,16 * * *)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET environment variable is not configured');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expected = `Bearer ${cronSecret}`;
    if (
      !authHeader ||
      authHeader.length !== expected.length ||
      !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting cost aggregation...');
    const startMs = Date.now();

    const result = await aggregateCosts(8);

    const durationMs = Date.now() - startMs;
    await systemLogger.logCron(
      'aggregate-costs',
      'success',
      `Cost aggregation completed: ${result.snapshots_created} snapshots, $${result.total_cost_usd} total, ${result.total_calls} calls`,
      { job_name: 'aggregate-costs', ...result },
      durationMs
    );
    await systemLogger.flush();

    return NextResponse.json({
      success: true,
      ...result,
      duration_ms: durationMs,
    });
  } catch (error: any) {
    console.error('[Cron] Cost aggregation failed:', error);
    await systemLogger.logCron(
      'aggregate-costs',
      'failure',
      `Cost aggregation failed: ${error.message}`,
      { job_name: 'aggregate-costs', error: error.message }
    );
    await systemLogger.flush();

    return NextResponse.json(
      { success: false, error: 'Cost aggregation failed' },
      { status: 500 }
    );
  }
}
