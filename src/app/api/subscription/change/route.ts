import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession, updateSubscription } from '@/lib/stripe';
import type { PlanTier } from '@/types';

const VALID_TIERS: PlanTier[] = ['scout', 'starter', 'pro', 'business'];

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

    const { planTier } = await req.json();

    if (!planTier || !VALID_TIERS.includes(planTier)) {
      return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 });
    }

    // Fetch profile and active subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_tier, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.plan_tier === planTier) {
      return NextResponse.json({ error: 'Already on this plan' }, { status: 400 });
    }

    // Downgrade to Scout = cancel subscription
    if (planTier === 'scout') {
      return NextResponse.json(
        { error: 'Use the cancel endpoint to downgrade to Scout' },
        { status: 400 }
      );
    }

    // Check for existing active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription?.stripe_subscription_id) {
      // No active subscription — create checkout session (new subscriber)
      const session = await createCheckoutSession({
        userId: user.id,
        userEmail: user.email!,
        planTier: planTier as PlanTier,
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?upgrade=success`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?upgrade=canceled`,
      });

      return NextResponse.json({ action: 'checkout', url: session.url });
    }

    // Active subscription exists — update it via Stripe
    await updateSubscription({
      subscriptionId: subscription.stripe_subscription_id,
      newPlanTier: planTier as PlanTier,
    });

    // Update local DB immediately (webhook will also fire as confirmation)
    await supabase
      .from('profiles')
      .update({ plan_tier: planTier })
      .eq('id', user.id);

    await supabase
      .from('subscriptions')
      .update({ plan_tier: planTier })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id);

    return NextResponse.json({ action: 'updated', planTier });
  } catch (error: any) {
    console.error('Subscription change error:', error);
    return NextResponse.json(
      { error: 'Failed to change subscription' },
      { status: 500 }
    );
  }
}
