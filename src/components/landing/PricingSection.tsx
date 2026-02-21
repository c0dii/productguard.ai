'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLAN_LIMITS } from '@/types';

const plans = [
  {
    tier: 'scout' as const,
    name: 'Scout',
    description: 'See what\'s out there — free',
    cta: 'Run Free Scan',
    features: [
      '1 product',
      'One-time scan',
      'Basic dashboard',
      'DMCA template',
    ],
  },
  {
    tier: 'starter' as const,
    name: 'Starter',
    description: 'For solo creators protecting their work',
    cta: 'Start Protecting',
    popular: true,
    features: [
      'Up to 5 products',
      'Weekly automated scans',
      'One-click DMCA takedowns',
      'Google deindex requests',
      'Telegram monitoring',
      'Email alerts',
    ],
  },
  {
    tier: 'pro' as const,
    name: 'Pro',
    description: 'For creators with multiple products',
    cta: 'Go Pro',
    features: [
      'Up to 25 products',
      'Daily automated scans',
      'Everything in Starter, plus:',
      'Cease & desist letters',
      'Torrent & Discord monitoring',
      'Revenue impact reports',
      'Priority support',
    ],
  },
  {
    tier: 'business' as const,
    name: 'Business',
    description: 'For teams and agencies',
    cta: 'Contact Us',
    features: [
      'Unlimited products',
      'Real-time monitoring',
      'Everything in Pro, plus:',
      'Forum & social monitoring',
      'White-label reporting',
      'API access',
      'Multi-brand management',
    ],
  },
];

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  return (
    <section id="pricing" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-pg-text-muted mb-8">
            Start free. Upgrade when you need more protection. No contracts, cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-pg-surface border border-pg-border">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                  : 'text-pg-text-muted hover:text-pg-text'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'annual'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                  : 'text-pg-text-muted hover:text-pg-text'
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs text-green-400 font-bold">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 xl:gap-6">
          {plans.map((plan) => {
            const limits = PLAN_LIMITS[plan.tier];
            const monthlyPrice = limits.priceUsd;
            const displayPrice = billingPeriod === 'annual' && monthlyPrice
              ? Math.round(monthlyPrice * 0.8)
              : monthlyPrice;

            return (
              <div
                key={plan.tier}
                className={`relative rounded-2xl transition-all duration-300 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-cyan-500/10 via-blue-600/5 to-transparent border-2 border-cyan-500/40 lg:scale-105 shadow-xl shadow-cyan-500/10'
                    : 'bg-pg-surface/50 border border-pg-border hover:border-pg-border-light'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                    <span className="px-4 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-bold shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-6 lg:p-8">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-pg-text-muted text-sm">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    {displayPrice ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">${displayPrice}</span>
                        <span className="text-pg-text-muted">/mo</span>
                        {billingPeriod === 'annual' && monthlyPrice && (
                          <span className="ml-2 text-sm text-pg-text-muted line-through">${monthlyPrice}</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">Free</span>
                        <span className="text-pg-text-muted text-sm">forever</span>
                      </div>
                    )}
                    {billingPeriod === 'annual' && displayPrice && (
                      <p className="text-xs text-pg-text-muted mt-1">
                        Billed ${displayPrice * 12}/year
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        {feature.startsWith('Everything') ? (
                          <>
                            <span className="text-blue-400 mt-0.5 flex-shrink-0">—</span>
                            <span className="text-blue-400 font-medium">{feature}</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-pg-text/80">{feature}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/auth/signup"
                    className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                      plan.popular
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20'
                        : 'bg-white/5 border border-pg-border hover:bg-white/10 hover:border-pg-border-light'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reassurance */}
        <div className="mt-10 text-center">
          <div className="inline-flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-pg-text-muted">
            <span>No contracts</span>
            <span className="hidden sm:inline text-pg-border">|</span>
            <span>Cancel anytime</span>
            <span className="hidden sm:inline text-pg-border">|</span>
            <span>Pays for itself after one takedown</span>
          </div>
        </div>
      </div>
    </section>
  );
}
