import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Manual URL Check Endpoint
 * Allows users to manually trigger a URL status check for a specific takedown
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the takedown
    const { data: takedown, error: fetchError } = await supabase
      .from('takedowns')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !takedown) {
      return NextResponse.json({ error: 'Takedown not found' }, { status: 404 });
    }

    if (!takedown.infringing_url) {
      return NextResponse.json({ error: 'No URL to check' }, { status: 400 });
    }

    // Check URL status
    const urlStatus = await checkUrlStatus(takedown.infringing_url);

    // Update takedown record
    const { error: updateError } = await supabase
      .from('takedowns')
      .update({
        url_status: urlStatus,
        last_checked_at: new Date().toISOString(),
        check_count: (takedown.check_count || 0) + 1,
        // next_check_at will be set by trigger
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating takedown:', updateError);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    // If URL is removed, update infringement status
    if (urlStatus === 'removed' && takedown.infringement_id) {
      const { error: infringementUpdateError } = await supabase
        .from('infringements')
        .update({ status: 'removed' })
        .eq('id', takedown.infringement_id);

      if (infringementUpdateError) {
        console.error('[URL Check] Error updating infringement status:', infringementUpdateError);
      }
    }

    return NextResponse.json({
      success: true,
      url_status: urlStatus,
      message: getStatusMessage(urlStatus),
    });
  } catch (error) {
    console.error('URL check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Check the status of a URL
 */
async function checkUrlStatus(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual',
      headers: {
        'User-Agent': 'ProductGuard-DMCA-Monitor/1.0',
      },
    });

    clearTimeout(timeout);

    if ([404, 410, 403].includes(response.status)) {
      return 'removed';
    }

    if ([301, 302, 307, 308].includes(response.status)) {
      return 'redirected';
    }

    if (response.status >= 200 && response.status < 300) {
      return 'active';
    }

    return 'error';
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return 'timeout';
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return 'removed';
    }
    return 'error';
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'removed':
      return '✓ Success! The infringing content has been removed or is no longer accessible.';
    case 'active':
      return 'The infringing URL is still active. The platform may still be processing your request.';
    case 'redirected':
      return 'The URL redirects to another location. Check if the content has been moved or removed.';
    case 'error':
      return 'There was an error checking the URL. Please try again later.';
    case 'timeout':
      return 'The request timed out. The site may be slow or temporarily unavailable.';
    default:
      return 'URL status check completed.';
  }
}
