import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const PREFERENCE_FIELDS = [
  'email_threat_alerts',
  'email_scan_notifications',
  'email_takedown_updates',
  'email_account_only',
  'email_unsubscribe_all',
] as const;

/**
 * Resolve user ID from either session auth or token query param.
 */
async function resolveUserId(request: NextRequest): Promise<{ userId: string; method: 'session' | 'token' } | null> {
  // Try session auth first
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return { userId: user.id, method: 'session' };
  } catch {
    // Session auth failed, try token
  }

  // Try token auth
  const token = request.nextUrl.searchParams.get('token');
  if (token && token.length > 0) {
    const admin = createAdminClient();
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('email_preferences_token', token)
      .single();

    if (data) return { userId: data.id, method: 'token' };
  }

  return null;
}

/**
 * Mask email for display: "user@example.com" → "u***@example.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  return `${local[0]}***@${domain}`;
}

/**
 * GET /api/email-preferences
 * Returns current email preferences for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const auth = await resolveUserId(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('email, email_threat_alerts, email_scan_notifications, email_takedown_updates, email_account_only, email_unsubscribe_all')
    .eq('id', auth.userId)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json({
    email: maskEmail(profile.email),
    preferences: {
      email_threat_alerts: profile.email_threat_alerts,
      email_scan_notifications: profile.email_scan_notifications,
      email_takedown_updates: profile.email_takedown_updates,
      email_account_only: profile.email_account_only,
      email_unsubscribe_all: profile.email_unsubscribe_all,
    },
  });
}

/**
 * PATCH /api/email-preferences
 * Update email preferences. Enforces mutual exclusion logic.
 */
export async function PATCH(request: NextRequest) {
  const auth = await resolveUserId(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Whitelist allowed fields
    const updates: Record<string, any> = {};
    for (const field of PREFERENCE_FIELDS) {
      if (field in body && typeof body[field] === 'boolean') {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Enforce mutual exclusion
    if (updates.email_unsubscribe_all === true) {
      updates.email_threat_alerts = false;
      updates.email_scan_notifications = false;
      updates.email_takedown_updates = false;
      updates.email_account_only = false;
    } else if (updates.email_account_only === true) {
      updates.email_threat_alerts = false;
      updates.email_scan_notifications = false;
      updates.email_takedown_updates = false;
    }

    updates.updated_at = new Date().toISOString();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', auth.userId)
      .select('email_threat_alerts, email_scan_notifications, email_takedown_updates, email_account_only, email_unsubscribe_all')
      .single();

    if (error) {
      console.error('[Email Preferences] Update error:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferences: data });
  } catch (error) {
    console.error('[Email Preferences] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/email-preferences
 * RFC 8058 one-click unsubscribe handler.
 * Called by email clients when user clicks native "Unsubscribe" button.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email_preferences_token', token)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  }

  await admin
    .from('profiles')
    .update({
      email_unsubscribe_all: true,
      email_account_only: false,
      email_threat_alerts: false,
      email_scan_notifications: false,
      email_takedown_updates: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
}
