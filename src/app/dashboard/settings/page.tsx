'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PLAN_LIMITS, type PlanTier } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { ProfileEditForm } from '@/components/dashboard/ProfileEditForm';
import { SubscriptionWizard } from '@/components/dashboard/SubscriptionWizard';
import type { WizardView } from '@/components/dashboard/CancelRetentionFlow';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionWizard, setShowSubscriptionWizard] = useState(false);
  const [wizardInitialView, setWizardInitialView] = useState<WizardView | undefined>(undefined);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = useState<string | null>(null);
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(data);

      // Fetch subscription cancel status
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('cancel_at_period_end, current_period_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setCancelAtPeriodEnd(sub?.cancel_at_period_end ?? false);
      setSubscriptionPeriodEnd(sub?.current_period_end ?? null);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const currentPlan = (profile?.plan_tier || 'scout') as PlanTier;
  const currentLimits = PLAN_LIMITS[currentPlan];

  const handleAccountDeleted = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-pg-text-muted hidden sm:inline">
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-pg-bg ${
              theme === 'dark' ? 'bg-cyan-500' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Toggle dark mode"
          >
            <span
              className={`inline-flex items-center justify-center h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                theme === 'dark' ? 'translate-x-5' : 'translate-x-1'
              }`}
            >
              {theme === 'dark' ? (
                <svg className="h-3 w-3 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                <svg className="h-3 w-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Account Information (Editable) - Top of page, side by side */}
      {profile && (
        <div className="mb-6 sm:mb-8">
          <ProfileEditForm
            profile={{
              full_name: profile.full_name || null,
              company_name: profile.company_name || null,
              phone: profile.phone || null,
              address: profile.address || null,
              dmca_reply_email: profile.dmca_reply_email || null,
              is_copyright_owner: profile.is_copyright_owner ?? true,
              created_at: profile.created_at,
            }}
            onSaved={fetchProfile}
          />
        </div>
      )}

      {/* Email Preferences */}
      <Card className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold mb-1">Email Preferences</h2>
            <p className="text-sm text-pg-text-muted">
              Choose which email notifications you receive from ProductGuard.
            </p>
          </div>
          <a href="/email-preferences">
            <Button size="sm">Manage Communications</Button>
          </a>
        </div>
      </Card>

      {/* Current Plan - Compact */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold mb-2">Current Plan</h2>
            <div className="flex items-center gap-3 mb-1">
              <Badge variant={currentPlan} className="capitalize">
                {currentPlan} Plan
              </Badge>
              <span className="text-xl font-bold text-pg-accent">
                {currentLimits.priceUsd ? `$${currentLimits.priceUsd}` : 'Free'}
                {currentLimits.priceUsd && currentLimits.priceUsd > 0 && (
                  <span className="text-sm font-normal text-pg-text-muted">/month</span>
                )}
              </span>
            </div>
            <p className="text-sm text-pg-text-muted">
              {currentLimits.products === 999999 ? 'Unlimited' : currentLimits.products} product{currentLimits.products !== 1 ? 's' : ''}
              {' · '}
              {currentLimits.scansPerMonth === 999999 ? 'Unlimited' : currentLimits.scansPerMonth} scan{currentLimits.scansPerMonth !== 1 ? 's' : ''}/mo
              {' · '}
              {currentLimits.features.length} features
            </p>
          </div>
          <Button
            onClick={() => {
              setWizardInitialView(undefined);
              setShowSubscriptionWizard(true);
            }}
            className="w-full sm:w-auto"
          >
            Manage Subscription
          </Button>
        </div>

        {/* Cancel status banner */}
        {cancelAtPeriodEnd && subscriptionPeriodEnd && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-sm text-yellow-300">
              Your subscription is scheduled to cancel on{' '}
              <strong>
                {new Date(subscriptionPeriodEnd).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </strong>
              . You&apos;ll retain full access until then.
            </p>
          </div>
        )}
      </Card>

      {/* Danger Zone */}
      <Card className="mt-6 sm:mt-8 border-red-500/30">
        <h2 className="text-lg font-bold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-pg-text-muted mb-4">
          {currentPlan === 'scout'
            ? 'Permanently delete your account and all associated data.'
            : 'Delete your account permanently. Your active subscription will be canceled immediately.'}
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            setWizardInitialView('delete_account');
            setShowSubscriptionWizard(true);
          }}
        >
          Delete Account
        </Button>
      </Card>

      {/* Subscription Wizard Modal */}
      <SubscriptionWizard
        isOpen={showSubscriptionWizard}
        onClose={() => {
          setShowSubscriptionWizard(false);
          setWizardInitialView(undefined);
        }}
        currentPlan={currentPlan}
        onPlanChanged={() => {
          fetchProfile();
          setShowSubscriptionWizard(false);
          setWizardInitialView(undefined);
        }}
        hasActiveSubscription={!!profile?.stripe_customer_id}
        initialView={wizardInitialView}
        onAccountDeleted={handleAccountDeleted}
      />
    </div>
  );
}
