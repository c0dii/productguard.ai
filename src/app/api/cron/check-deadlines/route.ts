/**
 * Deadline Checking Cron Job
 *
 * This API route should be called daily by a cron service (e.g., Vercel Cron, cron-job.org)
 * to check for overdue enforcement actions and infringements that need review.
 *
 * Vercel Cron setup (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-deadlines",
 *     "schedule": "0 9 * * *"  // Daily at 9am UTC
 *   }]
 * }
 *
 * For security, this endpoint should be protected with a cron secret token.
 */

import { NextResponse } from 'next/server';
import { deadlineTracker } from '@/lib/enforcement/deadline-tracker';

export async function GET(request: Request) {
  try {
    // Verify cron secret (recommended for production)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting deadline check...');
    const startTime = Date.now();

    // Check enforcement action deadlines
    const deadlineResults = await deadlineTracker.checkDeadlines();

    // Check infringement review deadlines
    const reviewResults = await deadlineTracker.checkInfringementReviews();

    const duration = Date.now() - startTime;

    const summary = {
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      enforcement_actions: {
        overdue_count: deadlineResults.updatedCount,
        escalation_suggestions: deadlineResults.escalationSuggestions.length,
      },
      infringements: {
        review_count: reviewResults.reviewedCount,
      },
    };

    console.log('[Cron] Deadline check completed:', summary);

    // Auto-escalate P0 priorities (optional - can be disabled)
    if (process.env.AUTO_ESCALATE_P0 === 'true') {
      for (const suggestion of deadlineResults.escalationSuggestions) {
        // Only auto-escalate if we have a suggested next step
        if (suggestion.suggestedNextStep) {
          await deadlineTracker.autoEscalate(suggestion);
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary,
      escalation_suggestions: deadlineResults.escalationSuggestions,
    });
  } catch (error) {
    console.error('[Cron] Deadline check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Disable static optimization for this route
export const dynamic = 'force-dynamic';
