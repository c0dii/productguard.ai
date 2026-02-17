import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { scanProduct } from '@/lib/scan-engine';
import { PLAN_LIMITS, type PlanTier } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check admin status and plan tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, plan_tier')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.is_admin || false;
    const planTier = (profile?.plan_tier || 'scout') as PlanTier;
    const planLimits = PLAN_LIMITS[planTier];

    // Parse request body
    const body = await request.json();
    const { product_id } = body;

    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    // Verify product belongs to user
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('user_id', user.id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // ── Per-Plan Rate Limiting ─────────────────────────────────────
    if (!isAdmin) {
      // Check monthly scan limit
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: monthlyScans } = await supabase
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      const scansUsed = monthlyScans || 0;

      if (scansUsed >= planLimits.scansPerMonth) {
        return NextResponse.json(
          {
            error: `Monthly scan limit reached (${scansUsed}/${planLimits.scansPerMonth})`,
            hint: `Upgrade to ${planTier === 'scout' ? 'Starter' : planTier === 'starter' ? 'Pro' : 'Business'} for more scans`,
            usage: { used: scansUsed, limit: planLimits.scansPerMonth, plan: planTier },
          },
          { status: 429 }
        );
      }

      // Check product count limit
      const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((productCount || 0) > planLimits.products) {
        return NextResponse.json(
          {
            error: `Product limit exceeded for ${planTier} plan (${productCount}/${planLimits.products})`,
            hint: 'Upgrade your plan or remove unused products',
          },
          { status: 403 }
        );
      }

      // Check for duplicate scans (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentScan } = await supabase
        .from('scans')
        .select('id')
        .eq('product_id', product.id)
        .gte('created_at', oneHourAgo)
        .maybeSingle();

      if (recentScan) {
        return NextResponse.json(
          { error: 'A scan for this product was run recently. Please wait before scanning again.' },
          { status: 429 }
        );
      }
    }

    // Create scan record
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        product_id: product.id,
        user_id: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (scanError || !scan) {
      return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 });
    }

    // Trigger scan in background (don't await)
    scanProduct(scan.id, product).catch((error) => {
      console.error('Scan failed:', error);
    });

    return NextResponse.json(
      {
        scan_id: scan.id,
        message: 'Scan started successfully',
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Scan API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
