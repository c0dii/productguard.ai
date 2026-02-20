import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { notifyTakedownSuccess } from '@/lib/notifications/email';
import { systemLogger } from '@/lib/logging/system-logger';

/**
 * Priority-Based URL Monitoring Endpoint
 *
 * Checks takedown URLs with frequency based on infringement priority:
 *   P0 (Critical): Every 24 hours
 *   P1 (High):     Every 3 days
 *   P2 (Standard): Every 7 days
 *
 * Updates url_status, last_checked_at, check_count, and schedules next_check_at
 */

const PRIORITY_CHECK_INTERVALS: Record<string, number> = {
  P0: 1 * 24 * 60 * 60 * 1000,  // 1 day
  P1: 3 * 24 * 60 * 60 * 1000,  // 3 days
  P2: 7 * 24 * 60 * 60 * 1000,  // 7 days
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify request is from authorized source (cron job or admin)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch takedowns with linked infringement priority data
    const { data: takedowns, error: fetchError } = await supabase
      .from('takedowns')
      .select('*, infringements(priority, platform, products(name, user_id))')
      .not('url_status', 'eq', 'removed')
      .or('next_check_at.is.null,next_check_at.lte.now()')
      .order('created_at', { ascending: true })
      .limit(150);

    if (fetchError) {
      console.error('Error fetching takedowns:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch takedowns' }, { status: 500 });
    }

    if (!takedowns || takedowns.length === 0) {
      return NextResponse.json({ message: 'No takedowns to check', checked: 0 });
    }

    // Sort by priority: P0 first, then P1, then P2
    const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
    takedowns.sort((a, b) => {
      const aPriority = (a.infringements as any)?.priority || 'P2';
      const bPriority = (b.infringements as any)?.priority || 'P2';
      return (priorityOrder[aPriority] ?? 2) - (priorityOrder[bPriority] ?? 2);
    });

    console.log(`Checking ${takedowns.length} takedown URLs (priority-sorted)...`);

    const results = await Promise.all(
      takedowns.map(async (takedown) => {
        if (!takedown.infringing_url) {
          return { id: takedown.id, status: 'skipped', reason: 'No URL' };
        }

        const infringement = takedown.infringements as any;
        const priority: string = infringement?.priority || 'P2';
        const nextInterval = PRIORITY_CHECK_INTERVALS[priority] ?? 7 * 24 * 60 * 60 * 1000;

        try {
          const urlStatus = await checkUrlStatus(takedown.infringing_url);

          // Calculate next check based on priority
          const nextCheckAt = new Date(Date.now() + nextInterval).toISOString();

          // Update takedown record with priority-based next_check_at
          const { error: updateError } = await supabase
            .from('takedowns')
            .update({
              url_status: urlStatus,
              last_checked_at: new Date().toISOString(),
              check_count: (takedown.check_count || 0) + 1,
              next_check_at: nextCheckAt,
            })
            .eq('id', takedown.id);

          if (updateError) {
            console.error(`Error updating takedown ${takedown.id}:`, updateError);
            return { id: takedown.id, status: 'error', priority, error: updateError.message };
          }

          // If URL is removed, update infringement status and send notification
          if (urlStatus === 'removed' && takedown.infringement_id) {
            await supabase
              .from('infringements')
              .update({ status: 'removed' })
              .eq('id', takedown.infringement_id);

            // Send removal notification email
            const product = infringement?.products;
            if (product) {
              try {
                const { data: userData } = await supabase.auth.admin.getUserById(product.user_id);
                const { data: userProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', product.user_id)
                  .single();

                if (userData?.user?.email) {
                  await notifyTakedownSuccess({
                    to: userData.user.email,
                    userName: userProfile?.full_name || 'there',
                    productName: product.name,
                    sourceUrl: takedown.infringing_url,
                    platform: infringement?.platform || 'Unknown',
                  });
                }
              } catch {
                // Notification failures are non-blocking
              }
            }
          }

          return { id: takedown.id, status: urlStatus, priority };
        } catch (error) {
          console.error(`Error checking URL for takedown ${takedown.id}:`, error);
          return { id: takedown.id, status: 'error', priority, error: String(error) };
        }
      })
    );

    // Count results by status
    const summary = results.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count results by priority
    const prioritySummary = results.reduce((acc, result: any) => {
      const p = result.priority || 'unknown';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Log URL check batch to system_logs
    const removedCount = summary['removed'] || 0;
    const errorCount = summary['error'] || 0;
    await systemLogger.log({
      log_source: 'cron',
      log_level: errorCount > takedowns.length / 2 ? 'warn' : 'info',
      operation: 'takedown.url-check',
      status: errorCount > 0 ? 'partial' : 'success',
      message: `Checked ${takedowns.length} takedown URLs: ${removedCount} removed, ${summary['active'] || 0} active, ${errorCount} errors`,
      context: { ...summary, priority_summary: prioritySummary },
    });
    await systemLogger.flush();

    return NextResponse.json({
      success: true,
      checked: takedowns.length,
      summary,
      prioritySummary,
      results,
    });
  } catch (error) {
    console.error('URL check error:', error);
    await systemLogger.log({
      log_source: 'cron',
      log_level: 'error',
      operation: 'takedown.url-check',
      status: 'failure',
      message: `Takedown URL check failed: ${error instanceof Error ? error.message : String(error)}`,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
    });
    await systemLogger.flush();
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Check the status of a URL
 * Returns: 'active', 'removed', 'redirected', 'error', or 'timeout'
 */
async function checkUrlStatus(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'HEAD', // HEAD request is faster
      signal: controller.signal,
      redirect: 'manual', // Don't follow redirects automatically
      headers: {
        'User-Agent': 'ProductGuard-DMCA-Monitor/1.0',
      },
    });

    clearTimeout(timeout);

    // 404, 410 (Gone), or 403 (Forbidden) = likely removed
    if ([404, 410, 403].includes(response.status)) {
      return 'removed';
    }

    // 301, 302, 307, 308 = redirected
    if ([301, 302, 307, 308].includes(response.status)) {
      return 'redirected';
    }

    // 200-299 = still active
    if (response.status >= 200 && response.status < 300) {
      return 'active';
    }

    // Other status codes
    return 'error';
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return 'timeout';
    }
    // Network errors might mean the site is down (potential removal)
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return 'removed';
    }
    return 'error';
  }
}

/**
 * Manual trigger endpoint for admins
 * GET request to check URLs on demand
 */
export async function GET(request: Request) {
  // Check auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Forward to POST handler
  return POST(request);
}
