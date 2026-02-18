import { NextRequest, NextResponse } from 'next/server';
import { runMonthlyWorkflowChecks } from '@/lib/ghl/workflow-automation';
import { systemLogger } from '@/lib/logging/system-logger';
import { timingSafeEqual } from 'crypto';

/**
 * Monthly Workflow Automation Cron Job
 *
 * Runs monthly on the 1st at midnight to:
 * - Generate monthly activity reports
 * - Send usage summaries
 *
 * Configure in vercel.json or call via external cron service
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret — mandatory, timing-safe comparison
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

    console.log('[Cron] Starting monthly workflow checks...');
    const startMs = Date.now();

    await runMonthlyWorkflowChecks();

    const durationMs = Date.now() - startMs;
    await systemLogger.logCron('monthly-workflows', 'success', `Monthly workflow checks completed in ${durationMs}ms`, { job_name: 'monthly-workflows' }, durationMs);
    await systemLogger.flush();

    return NextResponse.json({
      success: true,
      message: 'Monthly workflow checks completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Monthly workflow checks failed:', error);
    await systemLogger.logCron('monthly-workflows', 'failure', `Monthly workflow checks failed: ${error.message}`, { job_name: 'monthly-workflows', error: error.message });
    await systemLogger.flush();

    return NextResponse.json(
      {
        success: false,
        error: 'Monthly workflow checks failed',
      },
      { status: 500 }
    );
  }
}
