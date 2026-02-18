import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { PLAN_LIMITS, type PlanTier } from '@/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get plan tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_tier, is_admin')
      .eq('id', user.id)
      .single();

    const planTier = (profile?.plan_tier || 'scout') as PlanTier;
    const isAdmin = profile?.is_admin || false;

    // Check product count limit (admins bypass)
    if (!isAdmin) {
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const planLimits = PLAN_LIMITS[planTier];
      if ((count || 0) >= planLimits.products) {
        const upgradeMap: Record<string, string> = {
          scout: 'Starter ($29/mo)',
          starter: 'Pro ($99/mo)',
          pro: 'Business ($299/mo)',
          business: 'the highest plan',
        };
        return NextResponse.json({
          error: `Product limit reached (${count}/${planLimits.products}) for your ${planTier} plan`,
          hint: `Upgrade to ${upgradeMap[planTier]} for more products`,
          limit: planLimits.products,
          current: count,
        }, { status: 403 });
      }
    }

    const body = await request.json();

    // Sanitize: convert empty strings to null for timestamp and nullable fields
    const sanitized = { ...body } as Record<string, any>;
    const timestampFields = ['release_date', 'last_analyzed_at', 'created_at', 'updated_at'];
    const nullableStringFields = ['url', 'description', 'copyright_number', 'copyright_owner', 'file_hash', 'internal_notes', 'brand_name', 'language', 'product_image_url'];
    for (const field of [...timestampFields, ...nullableStringFields]) {
      if (field in sanitized && sanitized[field] === '') {
        sanitized[field] = null;
      }
    }

    // Remove any fields that shouldn't be client-settable
    delete sanitized.user_id;
    delete sanitized.id;

    const { data, error } = await supabase
      .from('products')
      .insert({
        ...sanitized,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Product insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Product creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
