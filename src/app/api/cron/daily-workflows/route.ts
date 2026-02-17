import { NextRequest, NextResponse } from 'next/server';
import { runDailyWorkflowChecks } from '@/lib/ghl/workflow-automation';
import { timingSafeEqual } from 'crypto';

/**
 * Daily Workflow Automation Cron Job
 *
 * Runs daily at midnight to check for:
 * - Trials ending soon
 * - Expired trials
 * - Inactive users
 * - Incomplete onboarding
 * - New power users
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

    console.log('[Cron] Starting daily workflow checks...');

    await runDailyWorkflowChecks();

    return NextResponse.json({
      success: true,
      message: 'Daily workflow checks completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Daily workflow checks failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Daily workflow checks failed',
      },
      { status: 500 }
    );
  }
}
