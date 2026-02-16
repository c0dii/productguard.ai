import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe';
import type { PlanTier } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planTier } = await req.json();

    if (!planTier || !['starter', 'pro', 'business'].includes(planTier)) {
      return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 });
    }

    // Create checkout session
    const session = await createCheckoutSession({
      userId: user.id,
      userEmail: user.email!,
      planTier: planTier as PlanTier,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgrade=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
