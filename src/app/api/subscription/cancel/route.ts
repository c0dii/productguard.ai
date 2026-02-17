import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cancelAtPeriodEnd } from '@/lib/stripe';

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

    const body = await req.json().catch(() => ({}));
    const cancelReason = body.reason || null;
    const cancelReasonDetail = body.reasonDetail || null;

    // Fetch active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // Cancel at period end — user keeps full access until billing period expires
    const stripeSubscription = await cancelAtPeriodEnd(subscription.stripe_subscription_id);

    // DO NOT update profiles.plan_tier — user keeps current plan until period ends
    // The webhook for customer.subscription.deleted will downgrade to scout when period expires

    // Update subscription record with cancel scheduling info
    await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        cancel_reason: cancelReason,
        cancel_reason_detail: cancelReasonDetail,
      })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id);

    const periodEnd = new Date(
      stripeSubscription.current_period_end * 1000
    ).toISOString();

    return NextResponse.json({ success: true, periodEnd });
  } catch (error: any) {
    console.error('Subscription cancel error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
