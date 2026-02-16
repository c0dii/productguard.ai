import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Use regular client to verify auth
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { takedownId, recipientEmail, submissionMethod } = body;

    if (!takedownId || !recipientEmail || !submissionMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the takedown belongs to the user
    const { data: takedown } = await supabase
      .from('takedowns')
      .select('id')
      .eq('id', takedownId)
      .eq('user_id', user.id)
      .single();

    if (!takedown) {
      return NextResponse.json(
        { error: 'Takedown not found' },
        { status: 404 }
      );
    }

    // Get IP address and user agent from headers
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') ||
                     headersList.get('x-real-ip') ||
                     'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // For now, we'll skip geolocation as it requires an external API
    // In production, you could use a service like ipapi.co or ipgeolocation.io
    // Example: const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);

    // Use admin client to insert logs (bypasses RLS for security)
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('dmca_submission_logs')
      .insert({
        user_id: user.id,
        takedown_id: takedownId,
        acknowledged_at: new Date().toISOString(),
        disclaimer_version: 'v1.0',
        ip_address: ipAddress,
        user_agent: userAgent,
        location_country: null, // TODO: Add geolocation service
        location_region: null,
        location_city: null,
        recipient_email: recipientEmail,
        submission_method: submissionMethod,
      });

    if (error) {
      console.error('DMCA log insert error:', error);
      return NextResponse.json(
        { error: 'Failed to log submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DMCA log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
