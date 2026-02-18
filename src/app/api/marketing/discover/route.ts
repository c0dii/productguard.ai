// ============================================================
// Discovery Engine API Route
// src/app/api/marketing/discover/route.ts
//
// POST — Trigger a piracy discovery run.
// Auth: CRON_SECRET (for cron jobs) OR admin session.
//
// Body (optional — defaults used for cron):
// {
//   "categories": ["course", "wordpress_plugin"],
//   "serp_budget": 60,
//   "max_candidates": 100,
//   "min_confidence": 85
// }
//
// Cron: runs Mon + Thu at 3 AM, rotating categories.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { runDiscovery } from '@/lib/discovery-engine';
import type { DiscoveryCategory, DiscoveryRunConfig } from '@/lib/discovery-engine/types';

// Category rotation: alternate between two sets
const CATEGORY_SET_A: DiscoveryCategory[] = ['course', 'wordpress_theme', 'wordpress_plugin', 'software'];
const CATEGORY_SET_B: DiscoveryCategory[] = ['ebook', 'trading_indicator', 'membership_content', 'design_asset'];

const DEFAULT_CONFIG: Omit<DiscoveryRunConfig, 'categories'> = {
  serp_budget: 120,
  max_candidates: 200,
  min_confidence: 85,
};

export const maxDuration = 300; // 5 minutes (Vercel Pro)

export async function POST(request: NextRequest) {
  try {
    // ── Auth: CRON_SECRET or admin session ───────────────
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    let isCron = false;

    if (cronSecret && authHeader) {
      const expected = `Bearer ${cronSecret}`;
      if (
        authHeader.length === expected.length &&
        timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
      ) {
        isCron = true;
      }
    }

    if (!isCron) {
      // Check admin session
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    // ── Parse config ────────────────────────────────────
    let config: DiscoveryRunConfig;

    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const body = await request.json();
      config = {
        categories: body.categories || getRotatingCategories(),
        serp_budget: body.serp_budget || DEFAULT_CONFIG.serp_budget,
        max_candidates: body.max_candidates || DEFAULT_CONFIG.max_candidates,
        min_confidence: body.min_confidence || DEFAULT_CONFIG.min_confidence,
      };
    } else {
      // Cron invocation — use defaults with rotating categories
      config = {
        categories: getRotatingCategories(),
        ...DEFAULT_CONFIG,
      };
    }

    // Validate categories
    const validCategories: DiscoveryCategory[] = [
      'course', 'wordpress_theme', 'wordpress_plugin', 'software',
      'ebook', 'trading_indicator', 'membership_content', 'design_asset',
    ];
    config.categories = config.categories.filter(c => validCategories.includes(c));

    if (config.categories.length === 0) {
      return NextResponse.json({ error: 'No valid categories provided' }, { status: 400 });
    }

    // ── Run discovery ───────────────────────────────────
    console.log(`[Discovery API] Starting run — categories: ${config.categories.join(', ')}`);

    const result = await runDiscovery(config);

    const durationSeconds = Math.round(
      (new Date(result.completed_at).getTime() - new Date(result.started_at).getTime()) / 1000
    );

    return NextResponse.json({
      success: true,
      run_id: result.run_id,
      summary: {
        raw_listings: result.raw_listings_found,
        products_extracted: result.products_extracted,
        owners_identified: result.owners_identified,
        prospects_qualified: result.prospects_qualified,
        prospects_inserted: result.prospects_inserted,
        serp_calls: result.serp_calls_used,
        ai_calls: result.ai_calls_used,
        whois_calls: result.whois_calls_used,
        cost_usd: result.estimated_cost_usd,
        duration_seconds: durationSeconds,
        errors: result.errors.length,
      },
    });

  } catch (error) {
    console.error('[Discovery API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discovery run failed' },
      { status: 500 }
    );
  }
}

/**
 * Alternate between category sets based on day of week.
 * Monday (1) = Set A, Thursday (4) = Set B, others = Set A
 */
function getRotatingCategories(): DiscoveryCategory[] {
  const dayOfWeek = new Date().getDay();
  return dayOfWeek === 4 ? CATEGORY_SET_B : CATEGORY_SET_A;
}
