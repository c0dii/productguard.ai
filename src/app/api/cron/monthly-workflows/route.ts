import { NextRequest, NextResponse } from 'next/server';
import { runMonthlyWorkflowChecks } from '@/lib/ghl/workflow-automation';

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
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting monthly workflow checks...');

    await runMonthlyWorkflowChecks();

    return NextResponse.json({
      success: true,
      message: 'Monthly workflow checks completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron] Monthly workflow checks failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Monthly workflow checks failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
