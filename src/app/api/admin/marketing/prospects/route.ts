// ============================================================
// Admin Marketing Prospects API
// src/app/api/admin/marketing/prospects/route.ts
//
// GET  — Fetch prospects with filters (status, platform, confidence, search)
// PATCH — Bulk approve/reject prospects
// POST — Manual prospect entry
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { InfringingPlatform } from '@/types/marketing';

// ── Admin auth helper ─────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 } as const;

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return { error: 'Admin access required', status: 403 } as const;
  return { user } as const;
}

// ── GET: Fetch prospects with filters ─────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = request.nextUrl;
  const status = url.searchParams.get('status');
  const platform = url.searchParams.get('platform');
  const minConfidence = url.searchParams.get('min_confidence');
  const maxConfidence = url.searchParams.get('max_confidence');
  const search = url.searchParams.get('search');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const supabase = createAdminClient();

  // Build query
  let query = supabase
    .from('marketing_prospects')
    .select('*', { count: 'exact' });

  if (status) query = query.eq('status', status);
  if (platform) query = query.eq('infringing_platform', platform);
  if (minConfidence) query = query.gte('confidence_score', parseFloat(minConfidence));
  if (maxConfidence) query = query.lte('confidence_score', parseFloat(maxConfidence));
  if (search) {
    query = query.or(
      `product_name.ilike.%${search}%,owner_email.ilike.%${search}%,company_name.ilike.%${search}%`
    );
  }

  const { data: prospects, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prospects: prospects || [], total: count || 0 });
}

// ── PATCH: Bulk approve/reject ────────────────────────────────

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { prospect_ids, action } = body as {
    prospect_ids: string[];
    action: 'approve' | 'reject';
  };

  if (!prospect_ids?.length || !['approve', 'reject'].includes(action)) {
    return NextResponse.json(
      { error: 'Required: prospect_ids (array) and action (approve|reject)' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const updateData = action === 'approve'
    ? { status: 'qualified', qualified_at: now }
    : { status: 'suppressed' };

  const { count, error } = await supabase
    .from('marketing_prospects')
    .update(updateData)
    .in('id', prospect_ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: count || prospect_ids.length });
}

// ── POST: Manual prospect entry ───────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();

  // Validate required fields
  if (!body.product_name || !body.infringing_url || !body.owner_email) {
    return NextResponse.json(
      { error: 'Required: product_name, infringing_url, owner_email' },
      { status: 400 }
    );
  }

  const validPlatforms: InfringingPlatform[] = [
    'telegram', 'cyberlocker', 'torrent', 'discord', 'forum', 'social_media', 'google_indexed', 'other',
  ];
  const platform = validPlatforms.includes(body.infringing_platform)
    ? body.infringing_platform
    : 'other';

  const now = new Date().toISOString();
  const supabase = createAdminClient();

  const { data: prospect, error } = await supabase
    .from('marketing_prospects')
    .insert({
      product_name: body.product_name,
      product_url: body.product_url || null,
      product_price: body.product_price || null,
      infringing_url: body.infringing_url,
      infringing_platform: platform,
      confidence_score: 100, // Manual entry = verified
      company_name: body.company_name || body.product_name,
      owner_name: body.owner_name || null,
      owner_email: body.owner_email,
      company_domain: body.company_domain || null,
      social_twitter: body.social_twitter || null,
      social_instagram: body.social_instagram || null,
      social_facebook: body.social_facebook || null,
      social_linkedin: body.social_linkedin || null,
      contact_source: 'manual_entry',
      status: 'new',
      discovered_at: now,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prospect });
}
