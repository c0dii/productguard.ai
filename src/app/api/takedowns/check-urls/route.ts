import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * URL Monitoring Endpoint
 * Checks all takedowns that are due for their weekly URL status check
 * Updates url_status, last_checked_at, check_count, and schedules next_check_at
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify request is from authorized source (cron job or admin)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch takedowns that need checking
    const { data: takedowns, error: fetchError } = await supabase
      .from('takedowns')
      .select('*')
      .not('url_status', 'eq', 'removed') // Don't check URLs that are already removed
      .or('next_check_at.is.null,next_check_at.lte.now()') // Due for check
      .limit(100); // Process 100 at a time

    if (fetchError) {
      console.error('Error fetching takedowns:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch takedowns' }, { status: 500 });
    }

    if (!takedowns || takedowns.length === 0) {
      return NextResponse.json({ message: 'No takedowns to check', checked: 0 });
    }

    console.log(`Checking ${takedowns.length} takedown URLs...`);

    const results = await Promise.all(
      takedowns.map(async (takedown) => {
        if (!takedown.infringing_url) {
          return { id: takedown.id, status: 'skipped', reason: 'No URL' };
        }

        try {
          const urlStatus = await checkUrlStatus(takedown.infringing_url);

          // Update takedown record
          const { error: updateError } = await supabase
            .from('takedowns')
            .update({
              url_status: urlStatus,
              last_checked_at: new Date().toISOString(),
              check_count: (takedown.check_count || 0) + 1,
              // next_check_at will be set by trigger (7 days from now)
            })
            .eq('id', takedown.id);

          if (updateError) {
            console.error(`Error updating takedown ${takedown.id}:`, updateError);
            return { id: takedown.id, status: 'error', error: updateError.message };
          }

          // If URL is removed, update infringement status to 'removed'
          if (urlStatus === 'removed' && takedown.infringement_id) {
            await supabase
              .from('infringements')
              .update({ status: 'removed' })
              .eq('id', takedown.infringement_id);
          }

          return { id: takedown.id, status: urlStatus };
        } catch (error) {
          console.error(`Error checking URL for takedown ${takedown.id}:`, error);
          return { id: takedown.id, status: 'error', error: String(error) };
        }
      })
    );

    // Count results
    const summary = results.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      checked: takedowns.length,
      summary,
      results,
    });
  } catch (error) {
    console.error('URL check error:', error);
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
