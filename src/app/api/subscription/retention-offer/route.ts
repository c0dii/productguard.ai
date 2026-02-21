import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRetentionDiscount } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await req.json();

    if (type !== 'discount') {
      return NextResponse.json({ error: 'Invalid offer type' }, { status: 400 });
    }

    // Fetch active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, retention_offer_used')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // Prevent using retention offer more than once
    if (subscription.retention_offer_used) {
      return NextResponse.json(
        { error: 'Retention offer has already been applied to this subscription' },
        { status: 400 }
      );
    }

    const couponId = process.env.STRIPE_RETENTION_COUPON_ID;
    if (!couponId) {
      return NextResponse.json(
        { error: 'Retention offer not configured' },
        { status: 500 }
      );
    }

    await applyRetentionDiscount(subscription.stripe_subscription_id, couponId);

    // Mark that retention offer has been used
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ retention_offer_used: true })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id);

    if (updateError) {
      console.error('Error marking retention offer as used:', updateError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Retention offer error:', error);
    return NextResponse.json(
      { error: 'Failed to apply retention offer' },
      { status: 500 }
    );
  }
}
