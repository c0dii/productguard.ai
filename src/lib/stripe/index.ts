import Stripe from 'stripe';
import type { PlanTier } from '@/types';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
  timeout: 15000, // 15s timeout for Stripe API calls
  maxNetworkRetries: 2, // Retry transient network failures (idempotent)
});

/**
 * Map plan tier to Stripe Price ID
 */
export function getPriceIdForPlan(planTier: PlanTier): string {
  const priceMap: Record<PlanTier, string> = {
    scout: '', // Free plan - no price
    starter: process.env.STRIPE_PRICE_STARTER || '',
    pro: process.env.STRIPE_PRICE_PRO || '',
    business: process.env.STRIPE_PRICE_BUSINESS || '',
  };

  return priceMap[planTier];
}

/**
 * Create a Stripe Checkout session for plan upgrades
 */
export async function createCheckoutSession({
  userId,
  userEmail,
  planTier,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  userEmail: string;
  planTier: PlanTier;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const priceId = getPriceIdForPlan(planTier);

  if (!priceId) {
    throw new Error(`No Stripe Price ID configured for plan: ${planTier}`);
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    client_reference_id: userId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        user_id: userId,
        plan_tier: planTier,
      },
    },
  });

  return session;
}

/**
 * Create a billing portal session for subscription management
 */
export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Get subscription by Stripe subscription ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel a subscription immediately (used for account deletion)
 */
export async function cancelSubscriptionImmediately(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Cancel a subscription at the end of the current billing period.
 * User retains full access until period ends, then Stripe fires customer.subscription.deleted.
 */
export async function cancelAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Pause subscription billing for a specified duration.
 * Uses Stripe's pause_collection to void invoices until the resume date.
 */
export async function pauseSubscription(
  subscriptionId: string,
  resumeDate: Date
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    pause_collection: {
      behavior: 'void',
      resumes_at: Math.floor(resumeDate.getTime() / 1000),
    },
  });
}

/**
 * Resume a paused subscription immediately
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    pause_collection: '',
  });
}

/**
 * Apply a retention discount coupon to an existing subscription
 */
export async function applyRetentionDiscount(
  subscriptionId: string,
  couponId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    coupon: couponId,
  });
}

/**
 * Update subscription to new plan
 */
export async function updateSubscription({
  subscriptionId,
  newPlanTier,
}: {
  subscriptionId: string;
  newPlanTier: PlanTier;
}): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const newPriceId = getPriceIdForPlan(newPlanTier);

  if (!newPriceId) {
    throw new Error(`No Stripe Price ID configured for plan: ${newPlanTier}`);
  }

  const firstItem = subscription.items.data[0];
  if (!firstItem) {
    throw new Error('Subscription has no items');
  }

  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: firstItem.id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  });
}
