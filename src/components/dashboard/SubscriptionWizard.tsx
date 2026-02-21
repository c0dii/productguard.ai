'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PLAN_LIMITS, type PlanTier } from '@/types';
import { CancelRetentionFlow, type WizardView } from './CancelRetentionFlow';

const CANCEL_VIEWS: WizardView[] = [
  'cancel_reason',
  'cancel_offer',
  'cancel_confirm',
  'cancel_success',
  'delete_account',
];

const HEADER_TITLES: Record<WizardView, string> = {
  upgrade: 'Upgrade Your Subscription',
  manage: 'Manage Subscription',
  cancel_reason: "We're Sorry to See You Go",
  cancel_offer: 'Before You Go...',
  cancel_confirm: 'Confirm Cancellation',
  cancel_success: 'Subscription Canceled',
  delete_account: 'Delete Your Account',
};

interface SubscriptionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanTier;
  onPlanChanged: () => void;
  hasActiveSubscription: boolean;
  initialView?: WizardView;
  onAccountDeleted?: () => void;
}

const TIER_ORDER: PlanTier[] = ['scout', 'starter', 'pro', 'business'];

function getTierIndex(tier: PlanTier): number {
  return TIER_ORDER.indexOf(tier);
}

function formatLimit(value: number): string {
  return value === 999999 ? 'Unlimited' : String(value);
}

export function SubscriptionWizard({
  isOpen,
  onClose,
  currentPlan,
  onPlanChanged,
  hasActiveSubscription,
  initialView,
  onAccountDeleted,
}: SubscriptionWizardProps) {
  const [view, setView] = useState<WizardView>(initialView || 'upgrade');
  const [loading, setLoading] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'downgrade';
    tier?: PlanTier;
  } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setView(initialView || 'upgrade');
      setLoading(null);
      setError(null);
      setSuccess(null);
      setConfirmAction(null);
    }
  }, [isOpen, initialView]);

  // Escape to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const currentLimits = PLAN_LIMITS[currentPlan];
  const currentIndex = getTierIndex(currentPlan);
  const upgradeTiers = TIER_ORDER.slice(currentIndex + 1);
  const downgradeTiers = TIER_ORDER.slice(0, currentIndex);

  const handleChangePlan = async (tier: PlanTier) => {
    setLoading(tier);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/subscription/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier: tier }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Couldn\'t update your plan. Please try again.');
      }

      if (data.action === 'checkout' && data.url) {
        window.location.href = data.url;
        return;
      }

      setSuccess(
        `Successfully ${getTierIndex(tier) > currentIndex ? 'upgraded' : 'downgraded'} to ${tier} plan!`
      );
      setConfirmAction(null);
      onPlanChanged();
    } catch (err: any) {
      setError(err.message || 'Couldn\'t update your plan. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/billing-portal', { method: 'POST' });
      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Couldn\'t open the billing portal. Please try again.');
      }
    } catch {
      setError('Couldn\'t open the billing portal. Please try again.');
    }
  };

  const isCancelView = CANCEL_VIEWS.includes(view);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[60] sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="max-w-3xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-b-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className={`text-lg sm:text-xl font-bold ${view === 'delete_account' ? 'text-red-400' : ''}`}>
            {HEADER_TITLES[view]}
          </h2>
          <button
            onClick={onClose}
            className="text-pg-text-muted hover:text-pg-text transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Current plan indicator - show on upgrade/manage views */}
        {!isCancelView && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6 p-3 rounded-lg bg-pg-bg border border-pg-border">
            <Badge variant={currentPlan} className="capitalize">
              {currentPlan}
            </Badge>
            <span className="text-xs sm:text-sm text-pg-text-muted">
              {currentLimits.priceUsd ? `$${currentLimits.priceUsd}/mo` : 'Free'}
              {' · '}
              {formatLimit(currentLimits.products)} product{currentLimits.products !== 1 ? 's' : ''}
              {' · '}
              {formatLimit(currentLimits.scansPerMonth)} scan{currentLimits.scansPerMonth !== 1 ? 's' : ''}/mo
            </span>
          </div>
        )}

        {/* Status messages - only on upgrade/manage views */}
        {!isCancelView && (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-400">{success}</p>
              </div>
            )}
          </>
        )}

        {/* Upgrade View */}
        {view === 'upgrade' && (
          <>
            {upgradeTiers.length > 0 ? (
              <div
                className={`grid gap-3 sm:gap-4 mb-4 sm:mb-6 ${
                  upgradeTiers.length === 1
                    ? 'grid-cols-1 max-w-sm'
                    : upgradeTiers.length === 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1 sm:grid-cols-3'
                }`}
              >
                {upgradeTiers.map((tier) => {
                  const limits = PLAN_LIMITS[tier];
                  return (
                    <div
                      key={tier}
                      className="p-3 sm:p-4 rounded-lg border border-pg-border bg-pg-bg hover:border-pg-accent/50 transition-colors"
                    >
                      <Badge variant={tier} className="mb-2 capitalize">
                        {tier}
                      </Badge>
                      <p className="text-xl sm:text-2xl font-bold text-pg-accent mb-2 sm:mb-3">
                        ${limits.priceUsd}
                        <span className="text-xs sm:text-sm font-normal text-pg-text-muted">/mo</span>
                      </p>
                      <div className="space-y-1 sm:space-y-1.5 text-xs sm:text-sm mb-3 sm:mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-pg-accent">&#10003;</span>
                          <span>{formatLimit(limits.products)} products</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-pg-accent">&#10003;</span>
                          <span>{formatLimit(limits.scansPerMonth)} scans/mo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-pg-accent">&#10003;</span>
                          <span className="capitalize">{limits.scanFrequency} scans</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-pg-accent">&#10003;</span>
                          <span>{limits.features.length} features</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleChangePlan(tier)}
                        disabled={loading !== null}
                        className="w-full"
                        size="sm"
                      >
                        {loading === tier ? 'Processing...' : `Upgrade to ${tier}`}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 mb-6">
                <p className="text-pg-text-muted">
                  You&apos;re on the highest plan! All features are unlocked.
                </p>
              </div>
            )}

            {/* Footer links */}
            <div className="border-t border-pg-border pt-4 flex flex-col gap-2">
              {hasActiveSubscription && (
                <button
                  onClick={() => {
                    setView('manage');
                    setError(null);
                    setSuccess(null);
                    setConfirmAction(null);
                  }}
                  className="text-sm text-pg-text-muted hover:text-pg-accent transition-colors text-left"
                >
                  Manage existing subscription &rarr;
                </button>
              )}
              {currentPlan !== 'scout' && (
                <button
                  onClick={() => {
                    setView('cancel_reason');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-sm text-pg-text-muted hover:text-pg-danger transition-colors text-left"
                >
                  Cancel subscription
                </button>
              )}
            </div>
          </>
        )}

        {/* Manage View */}
        {view === 'manage' && (
          <>
            {/* Back to upgrade */}
            <button
              onClick={() => {
                setView('upgrade');
                setError(null);
                setSuccess(null);
                setConfirmAction(null);
              }}
              className="text-sm text-pg-text-muted hover:text-pg-accent transition-colors mb-4"
            >
              &larr; Back to upgrade options
            </button>

            {/* Downgrade options */}
            {downgradeTiers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-pg-text-muted mb-3">Downgrade Plan</h3>
                <div className="space-y-3">
                  {downgradeTiers.map((tier) => {
                    const limits = PLAN_LIMITS[tier];
                    const isConfirming =
                      confirmAction?.type === 'downgrade' && confirmAction.tier === tier;

                    return (
                      <div
                        key={tier}
                        className="p-3 rounded-lg border border-pg-border bg-pg-bg"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Badge variant={tier} className="capitalize">
                              {tier}
                            </Badge>
                            <span className="text-xs sm:text-sm text-pg-text-muted">
                              {limits.priceUsd ? `$${limits.priceUsd}/mo` : 'Free'}
                              {' · '}
                              {formatLimit(limits.products)} products
                              {' · '}
                              {limits.features.length} features
                            </span>
                          </div>
                          {!isConfirming && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setConfirmAction({ type: 'downgrade', tier })
                              }
                              disabled={loading !== null}
                              className="w-full sm:w-auto"
                            >
                              Downgrade
                            </Button>
                          )}
                        </div>

                        {isConfirming && (
                          <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                            <p className="text-sm text-yellow-300 mb-3">
                              {tier === 'scout'
                                ? "You'll be downgraded to the free Scout plan. You'll lose access to all paid features."
                                : `You'll be downgraded to ${tier} at $${limits.priceUsd}/mo. Your available features will be reduced.`}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleChangePlan(tier)}
                                disabled={loading !== null}
                              >
                                {loading ? 'Processing...' : 'Confirm Downgrade'}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setConfirmAction(null)}
                              >
                                Keep Current Plan
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment management + Cancel link */}
            <div className="border-t border-pg-border pt-4 flex flex-col gap-2">
              {hasActiveSubscription && (
                <button
                  onClick={handleManageBilling}
                  className="text-sm text-pg-text-muted hover:text-pg-accent transition-colors text-left"
                >
                  Update payment method &rarr;
                </button>
              )}
              {currentPlan !== 'scout' && (
                <button
                  onClick={() => {
                    setView('cancel_reason');
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-sm text-pg-text-muted hover:text-pg-danger transition-colors text-left"
                >
                  Cancel subscription
                </button>
              )}
            </div>
          </>
        )}

        {/* Cancel/Retention/Delete views */}
        {isCancelView && (
          <CancelRetentionFlow
            view={view as any}
            currentPlan={currentPlan}
            hasActiveSubscription={hasActiveSubscription}
            onViewChange={setView}
            onClose={onClose}
            onPlanChanged={onPlanChanged}
            onAccountDeleted={onAccountDeleted}
          />
        )}
      </Card>
    </div>
  );
}
