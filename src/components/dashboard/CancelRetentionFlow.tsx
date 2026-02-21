'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PLAN_LIMITS, type PlanTier } from '@/types';

type CancelView =
  | 'cancel_reason'
  | 'cancel_offer'
  | 'cancel_confirm'
  | 'cancel_success'
  | 'delete_account';

// Re-export for SubscriptionWizard to use
export type WizardView =
  | 'upgrade'
  | 'manage'
  | CancelView;

interface CancelRetentionFlowProps {
  view: CancelView;
  currentPlan: PlanTier;
  hasActiveSubscription: boolean;
  onViewChange: (view: WizardView) => void;
  onClose: () => void;
  onPlanChanged: () => void;
  onAccountDeleted?: () => void;
}

const CANCEL_REASONS = [
  { id: 'too_expensive', label: 'Too expensive for my needs' },
  { id: 'not_using', label: 'Not using it enough' },
  { id: 'missing_features', label: 'Missing features I need' },
  { id: 'found_alternative', label: 'Found an alternative solution' },
  { id: 'testing', label: 'Just testing / temporary project' },
  { id: 'other', label: 'Other' },
] as const;

type OfferType = 'discount' | 'downgrade' | 'pause';

const OFFER_PRIORITY: Record<string, OfferType[]> = {
  too_expensive: ['discount', 'downgrade', 'pause'],
  not_using: ['pause', 'downgrade', 'discount'],
  missing_features: ['downgrade', 'discount', 'pause'],
  found_alternative: ['discount', 'pause', 'downgrade'],
  testing: ['pause', 'downgrade'],
  other: ['discount', 'downgrade', 'pause'],
};

const TIER_ORDER: PlanTier[] = ['scout', 'starter', 'pro', 'business'];

function formatLimit(value: number): string {
  return value === 999999 ? 'Unlimited' : String(value);
}

export function CancelRetentionFlow({
  view,
  currentPlan,
  hasActiveSubscription,
  onViewChange,
  onClose,
  onPlanChanged,
  onAccountDeleted,
}: CancelRetentionFlowProps) {
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [cancelReasonDetail, setCancelReasonDetail] = useState('');
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pauseMonths, setPauseMonths] = useState(1);

  const currentLimits = PLAN_LIMITS[currentPlan];
  const currentIndex = TIER_ORDER.indexOf(currentPlan);
  const downgradeTier = currentIndex > 1 ? TIER_ORDER[currentIndex - 1] : currentIndex > 0 ? 'scout' : null;

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
          reasonDetail: cancelReasonDetail,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Couldn\'t cancel right now. Please try again in a moment.');

      setPeriodEnd(data.periodEnd);
      onViewChange('cancel_success');
      onPlanChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/subscription/retention-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'discount' }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Couldn\'t apply the discount. Please try again.');

      onPlanChanged();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/subscription/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: pauseMonths }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Couldn\'t pause your account. Please try again.');

      onPlanChanged();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDowngrade = async (tier: PlanTier) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/subscription/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier: tier }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Couldn\'t switch your plan. Please try again.');

      if (data.action === 'checkout' && data.url) {
        window.location.href = data.url;
        return;
      }

      onPlanChanged();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Couldn\'t delete your account. Please contact support.');

      onAccountDeleted?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const orderedOffers = OFFER_PRIORITY[cancelReason || 'other'] ?? OFFER_PRIORITY.other;

  // Filter out downgrade if already on starter (can only go to scout which is cancel)
  const availableOffers = (orderedOffers ?? []).filter((offer) => {
    if (offer === 'downgrade' && currentIndex <= 1) return false;
    return true;
  });

  return (
    <div>
      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Step 1: Cancel Reason */}
      {view === 'cancel_reason' && (
        <>
          <p className="text-sm text-pg-text-muted mb-4 sm:mb-6">
            Before you cancel, help us understand what&apos;s not working so we can improve.
          </p>

          <div className="space-y-2 mb-6">
            {CANCEL_REASONS.map((reason) => (
              <label
                key={reason.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  cancelReason === reason.id
                    ? 'border-pg-accent bg-pg-accent/5'
                    : 'border-pg-border bg-pg-bg hover:border-pg-text-muted'
                }`}
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  value={reason.id}
                  checked={cancelReason === reason.id}
                  onChange={() => setCancelReason(reason.id)}
                  className="accent-cyan-500"
                />
                <span className="text-sm">{reason.label}</span>
              </label>
            ))}
          </div>

          {cancelReason === 'other' && (
            <div className="mb-6">
              <textarea
                value={cancelReasonDetail}
                onChange={(e) => setCancelReasonDetail(e.target.value)}
                placeholder="Tell us more..."
                className="input-field w-full h-20 resize-none"
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => onViewChange('cancel_offer')}
              disabled={!cancelReason}
              className="flex-1"
            >
              Continue
            </Button>
            <Button
              variant="secondary"
              onClick={() => onViewChange('manage')}
              className="flex-1"
            >
              Never mind
            </Button>
          </div>
        </>
      )}

      {/* Step 2: Retention Offers */}
      {view === 'cancel_offer' && (
        <>
          <p className="text-sm text-pg-text-muted mb-4 sm:mb-6">
            We&apos;d love to keep you. Would any of these help?
          </p>

          <div className="space-y-3 mb-6">
            {availableOffers.map((offer) => {
              if (offer === 'discount') {
                const discountPrice = currentLimits.priceUsd
                  ? (currentLimits.priceUsd * 0.5).toFixed(0)
                  : null;
                return (
                  <div
                    key="discount"
                    className="p-4 rounded-lg border border-pg-border bg-pg-bg hover:border-pg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center shrink-0">
                        <span className="text-green-400 text-lg font-bold">%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1">50% off your next 2 months</h4>
                        <p className="text-xs text-pg-text-muted mb-3">
                          Stay on your {currentPlan} plan for just ${discountPrice}/mo instead of ${currentLimits.priceUsd}/mo.
                          Keep all your features and protection.
                        </p>
                        <Button
                          size="sm"
                          onClick={handleApplyDiscount}
                          disabled={loading}
                          className="w-full sm:w-auto"
                        >
                          {loading ? 'Applying...' : 'Apply Discount'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }

              if (offer === 'pause') {
                return (
                  <div
                    key="pause"
                    className="p-4 rounded-lg border border-pg-border bg-pg-bg hover:border-pg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1">Pause your account</h4>
                        <p className="text-xs text-pg-text-muted mb-3">
                          No charges while paused. Your data stays safe and you can resume anytime.
                        </p>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                          <select
                            value={pauseMonths}
                            onChange={(e) => setPauseMonths(Number(e.target.value))}
                            className="input-field text-sm w-full sm:w-auto"
                          >
                            <option value={1}>1 month</option>
                            <option value={2}>2 months</option>
                            <option value={3}>3 months</option>
                          </select>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handlePause}
                            disabled={loading}
                            className="w-full sm:w-auto"
                          >
                            {loading ? 'Pausing...' : 'Pause Account'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (offer === 'downgrade' && downgradeTier && downgradeTier !== 'scout') {
                const downgradeLimits = PLAN_LIMITS[downgradeTier];
                return (
                  <div
                    key="downgrade"
                    className="p-4 rounded-lg border border-pg-border bg-pg-bg hover:border-pg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1">
                          Switch to{' '}
                          <Badge variant={downgradeTier} className="capitalize text-xs">
                            {downgradeTier}
                          </Badge>{' '}
                          at ${downgradeLimits.priceUsd}/mo
                        </h4>
                        <p className="text-xs text-pg-text-muted mb-3">
                          {formatLimit(downgradeLimits.products)} products, {formatLimit(downgradeLimits.scansPerMonth)} scans/mo, {downgradeLimits.features.length} features.
                          Save ${(currentLimits.priceUsd || 0) - (downgradeLimits.priceUsd || 0)}/mo.
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDowngrade(downgradeTier)}
                          disabled={loading}
                          className="w-full sm:w-auto"
                        >
                          {loading ? 'Processing...' : `Downgrade to ${downgradeTier}`}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => onViewChange('cancel_confirm')}
              className="text-sm text-pg-text-muted hover:text-pg-danger transition-colors"
            >
              No thanks, continue canceling
            </button>
            <button
              onClick={() => onViewChange('cancel_reason')}
              className="text-xs text-pg-text-muted hover:text-pg-text transition-colors"
            >
              &larr; Back
            </button>
          </div>
        </>
      )}

      {/* Step 3: Confirm Cancellation */}
      {view === 'cancel_confirm' && (
        <>
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-6">
            <p className="text-sm text-yellow-300 font-semibold mb-3">
              Your <span className="capitalize">{currentPlan}</span> plan will remain active until
              the end of your current billing period.
            </p>
            <p className="text-sm text-yellow-300/80 mb-2">After that date:</p>
            <ul className="text-sm text-yellow-300/80 space-y-1 ml-4 list-disc">
              <li>You&apos;ll be downgraded to the free Scout plan</li>
              <li>Monitoring drops to 1 product and 1 scan per month</li>
              <li>One-click takedowns, automated scanning, and enforcement tools will be disabled</li>
              <li>Your existing data (products, scans, infringements) will be <strong>preserved</strong></li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="danger"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Canceling...' : 'Cancel My Subscription'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onViewChange('cancel_offer')}
              className="flex-1"
            >
              Keep My Subscription
            </Button>
          </div>
        </>
      )}

      {/* Step 4: Cancel Success */}
      {view === 'cancel_success' && (
        <>
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>

            <p className="text-sm text-pg-text mb-2">
              Your <span className="capitalize font-semibold">{currentPlan}</span> plan will remain
              active until{' '}
              <strong>
                {periodEnd
                  ? new Date(periodEnd).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'the end of your billing period'}
              </strong>
              .
            </p>
            <p className="text-xs text-pg-text-muted mb-6">
              Your data will be preserved. You can resubscribe anytime from the settings page.
            </p>

            <Button onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>

            <div className="mt-6 pt-4 border-t border-pg-border">
              <button
                onClick={() => onViewChange('delete_account')}
                className="text-xs text-pg-text-muted hover:text-pg-danger transition-colors"
              >
                Delete my account entirely
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Account */}
      {view === 'delete_account' && (
        <>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-6">
            <p className="text-sm text-red-400 font-semibold mb-3">
              This action is permanent and cannot be undone.
            </p>
            <p className="text-sm text-red-400/80 mb-2">
              Deleting your account will immediately and permanently destroy:
            </p>
            <ul className="text-sm text-red-400/80 space-y-1 ml-4 list-disc">
              <li>All your products and IP registrations</li>
              <li>All scan history and results</li>
              <li>All detected infringements and evidence</li>
              <li>All DMCA takedowns and enforcement history</li>
              <li>All communications and submission logs</li>
              <li>All scan schedules and monitoring data</li>
              <li>Your profile and account settings</li>
            </ul>
            {hasActiveSubscription && (
              <p className="text-sm text-red-400 font-semibold mt-3">
                Your active subscription will be canceled immediately.
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">
              Type <span className="text-red-400 font-mono">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type DELETE"
              className="input-field w-full font-mono"
              autoComplete="off"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              disabled={loading || deleteConfirmation !== 'DELETE'}
              className="flex-1"
            >
              {loading ? 'Deleting...' : 'Permanently Delete My Account'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onViewChange(hasActiveSubscription ? 'cancel_success' : 'manage')}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
