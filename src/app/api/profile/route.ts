import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_FIELDS = [
  'full_name',
  'company_name',
  'phone',
  'address',
  'dmca_reply_email',
  'is_copyright_owner',
  'email_threat_alerts',
  'email_scan_notifications',
  'email_takedown_updates',
  'email_account_only',
  'email_unsubscribe_all',
] as const;

/**
 * PATCH /api/profile
 *
 * Update the authenticated user's profile fields.
 * Only whitelisted fields are accepted.
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Whitelist allowed fields
    const updates: Record<string, any> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Validate dmca_reply_email format if provided
    if (updates.dmca_reply_email && typeof updates.dmca_reply_email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.dmca_reply_email)) {
        return NextResponse.json({ error: 'Invalid DMCA reply email format' }, { status: 400 });
      }
    }

    // Validate is_copyright_owner is boolean
    if ('is_copyright_owner' in updates && typeof updates.is_copyright_owner !== 'boolean') {
      return NextResponse.json({ error: 'is_copyright_owner must be a boolean' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[Profile Update] Error:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (error: any) {
    console.error('[Profile Update] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
