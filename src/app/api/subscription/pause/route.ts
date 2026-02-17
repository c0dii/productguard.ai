import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pauseSubscription } from '@/lib/stripe';

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

    const { months = 1 } = await req.json();

    if (![1, 2, 3].includes(months)) {
      return NextResponse.json(
        { error: 'Pause duration must be 1, 2, or 3 months' },
        { status: 400 }
      );
    }

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

    const resumeDate = new Date();
    resumeDate.setMonth(resumeDate.getMonth() + months);

    await pauseSubscription(subscription.stripe_subscription_id, resumeDate);

    // Update local DB with pause info
    await supabase
      .from('subscriptions')
      .update({
        paused_at: new Date().toISOString(),
        resume_at: resumeDate.toISOString(),
      })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id);

    return NextResponse.json({
      success: true,
      resumeDate: resumeDate.toISOString(),
    });
  } catch (error: any) {
    console.error('Subscription pause error:', error);
    return NextResponse.json(
      { error: 'Failed to pause subscription' },
      { status: 500 }
    );
  }
}
