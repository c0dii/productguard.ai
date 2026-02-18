// ============================================================
// Admin Marketing Push API
// src/app/api/admin/marketing/push/route.ts
//
// POST — Push selected/approved prospects to GHL
// Enforces daily push limit for domain warmup.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { pushProspectToGHL } from '@/lib/marketing/push-to-ghl';
import type { MarketingProspect } from '@/types/marketing';

const DEFAULT_DAILY_LIMIT = 10;

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

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { prospect_ids, push_all_approved, daily_limit } = body as {
    prospect_ids?: string[];
    push_all_approved?: boolean;
    daily_limit?: number;
  };

  if (!prospect_ids?.length && !push_all_approved) {
    return NextResponse.json(
      { error: 'Required: prospect_ids (array) or push_all_approved (true)' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const limit = daily_limit || DEFAULT_DAILY_LIMIT;

  // Check today's push count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: todayPushes } = await supabase
    .from('marketing_outreach')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayStart.toISOString());

  const alreadyPushed = todayPushes || 0;
  const remaining = Math.max(0, limit - alreadyPushed);

  if (remaining === 0) {
    return NextResponse.json({
      error: `Daily push limit reached (${limit}). Already pushed ${alreadyPushed} today.`,
      daily_remaining: 0,
    }, { status: 429 });
  }

  // Fetch prospects to push
  let prospects: MarketingProspect[];

  if (push_all_approved) {
    const { data, error } = await supabase
      .from('marketing_prospects')
      .select('*')
      .eq('status', 'qualified')
      .order('confidence_score', { ascending: false })
      .limit(remaining);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    prospects = (data || []) as MarketingProspect[];
  } else {
    const { data, error } = await supabase
      .from('marketing_prospects')
      .select('*')
      .in('id', prospect_ids!)
      .limit(remaining);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    prospects = (data || []) as MarketingProspect[];
  }

  if (prospects.length === 0) {
    return NextResponse.json({
      pushed: 0,
      failed: 0,
      errors: [],
      daily_remaining: remaining,
    });
  }

  // Push each prospect sequentially with delay
  const results = { pushed: 0, failed: 0, errors: [] as string[] };

  for (const prospect of prospects) {
    const result = await pushProspectToGHL(prospect);
    if (result.success) {
      results.pushed++;
    } else {
      results.failed++;
      results.errors.push(`${prospect.company_name}: ${result.error}`);
    }
    // Rate limit between GHL API calls
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return NextResponse.json({
    ...results,
    daily_remaining: remaining - results.pushed,
  });
}
