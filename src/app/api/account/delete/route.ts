import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { cancelSubscriptionImmediately, stripe } from '@/lib/stripe';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 attempts per 15 minutes per IP
    const ip = getClientIp(req);
    const limiter = rateLimit(`delete-account:${ip}`, { limit: 3, windowSeconds: 900 });
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limiter.resetIn) } }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { confirmation } = await req.json();

    // Require explicit "DELETE" confirmation
    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: 'Must type DELETE to confirm account deletion' },
        { status: 400 }
      );
    }

    // If user has active Stripe subscription, cancel it immediately
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscription?.stripe_subscription_id) {
      try {
        await cancelSubscriptionImmediately(subscription.stripe_subscription_id);
      } catch (err) {
        console.error('Failed to cancel Stripe subscription during deletion:', err);
        // Continue with deletion even if Stripe cancel fails
      }
    }

    // If user has a Stripe customer, delete the customer record
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profile?.stripe_customer_id) {
      try {
        await stripe.customers.del(profile.stripe_customer_id);
      } catch (err) {
        console.error('Failed to delete Stripe customer during deletion:', err);
        // Non-blocking — continue with account deletion
      }
    }

    // Delete the auth user via admin client
    // ON DELETE CASCADE will remove: profiles, products, scans, infringements,
    // takedowns, subscriptions, scan_schedules, enforcement_actions,
    // status_transitions, evidence_snapshots, communications, dmca_submission_logs
    const adminClient = createAdminClient();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Auth delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
