import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/server';
import type { PlanTier, SubscriptionStatus } from '@/types';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const subscriptionId = session.subscription as string;

        if (!userId || !subscriptionId) {
          console.error('Missing user_id or subscription_id in checkout session');
          break;
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const planTier = (subscription.metadata.plan_tier || 'starter') as PlanTier;

        // Update user's plan in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            plan_tier: planTier,
            stripe_customer_id: session.customer as string,
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          break;
        }

        // Create subscription record
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer as string,
            plan_tier: planTier,
            status: 'active' as SubscriptionStatus,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          });

        if (subError) {
          console.error('Error creating subscription:', subError);
        }

        console.log(`✅ Subscription created for user ${userId}: ${planTier}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.user_id;

        if (!userId) {
          console.error('Missing user_id in subscription metadata');
          break;
        }

        const planTier = (subscription.metadata.plan_tier || 'starter') as PlanTier;
        const status = mapStripeStatus(subscription.status);

        // Only update plan_tier if subscription is truly active and not just scheduled to cancel.
        // When cancel_at_period_end is true, user keeps current plan until period ends.
        if (status === 'active' && !subscription.cancel_at_period_end) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ plan_tier: planTier })
            .eq('id', userId);

          if (profileError) {
            console.error('Error updating profile:', profileError);
          }
        } else if (status !== 'active') {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ plan_tier: 'scout' })
            .eq('id', userId);

          if (profileError) {
            console.error('Error updating profile:', profileError);
          }
        }

        // Update subscription record including cancel_at_period_end flag
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            plan_tier: planTier,
            status,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (subError) {
          console.error('Error updating subscription:', subError);
        }

        console.log(`✅ Subscription updated for user ${userId}: ${status}${subscription.cancel_at_period_end ? ' (canceling at period end)' : ''}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.user_id;

        if (!userId) {
          console.error('Missing user_id in subscription metadata');
          break;
        }

        // Downgrade to free plan
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ plan_tier: 'scout' })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }

        // Mark subscription as canceled
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled' as SubscriptionStatus })
          .eq('stripe_subscription_id', subscription.id);

        if (subError) {
          console.error('Error updating subscription:', subError);
        }

        console.log(`✅ Subscription canceled for user ${userId}`);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) {
          break;
        }

        // Update subscription status to active
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'active' as SubscriptionStatus })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('Error updating subscription on invoice paid:', error);
        }

        console.log(`✅ Invoice paid for subscription ${subscriptionId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) {
          break;
        }

        // Update subscription status to past_due
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'past_due' as SubscriptionStatus })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('Error updating subscription on payment failed:', error);
        }

        console.log(`⚠️ Payment failed for subscription ${subscriptionId}`);
        // TODO: Send email notification to user about failed payment
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Error processing webhook:', err);
    return NextResponse.json(
      { error: `Webhook handler failed: ${err.message}` },
      { status: 500 }
    );
  }
}

/**
 * Map Stripe subscription status to our SubscriptionStatus enum
 */
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    incomplete: 'past_due',
    incomplete_expired: 'canceled',
    trialing: 'active',
  };

  return statusMap[stripeStatus] || 'active';
}
