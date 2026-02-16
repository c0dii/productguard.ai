'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PLAN_LIMITS, type PlanTier } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
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
    }
    setLoading(false);
  };

  const handleUpgrade = async (planTier: PlanTier) => {
    setUpgrading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
        setUpgrading(false);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to start upgrade process');
      setUpgrading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/billing-portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to access billing portal');
      }
    } catch (error) {
      console.error('Billing portal error:', error);
      alert('Failed to access billing portal');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const currentPlan = profile?.plan_tier || 'scout';
  const currentLimits = PLAN_LIMITS[currentPlan as PlanTier];

  // Get available upgrade options based on current plan
  const getUpgradeOptions = (currentTier: PlanTier): PlanTier[] => {
    const tierOrder: PlanTier[] = ['scout', 'starter', 'pro', 'business'];
    const currentIndex = tierOrder.indexOf(currentTier);
    return tierOrder.slice(currentIndex + 1); // Return only higher tiers
  };

  const availableUpgrades = getUpgradeOptions(currentPlan as PlanTier);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
      </div>

      {/* Theme Toggle */}
      <Card className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold mb-1">Appearance</h2>
            <p className="text-sm text-pg-text-muted">
              Switch between light and dark mode
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-pg-text-muted">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-pg-bg ${
                theme === 'dark' ? 'bg-cyan-500' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={theme === 'dark'}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                  theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                }`}
              >
                {theme === 'dark' ? (
                  <svg
                    className="h-6 w-6 p-1 text-cyan-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6 p-1 text-yellow-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
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
      </Card>

      {/* Current Plan */}
      <Card className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Current Plan</h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Badge variant={currentPlan as PlanTier} className="mb-2 capitalize">
              {currentPlan} Plan
            </Badge>
            <p className="text-2xl font-bold text-pg-accent">
              {currentLimits.priceUsd ? `$${currentLimits.priceUsd}` : 'Free'}
              {currentLimits.priceUsd && currentLimits.priceUsd > 0 && <span className="text-base">/month</span>}
            </p>
          </div>
          {currentPlan !== 'scout' && (
            <Button variant="secondary" onClick={handleManageBilling} className="w-full sm:w-auto">
              Manage Billing
            </Button>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-pg-text-muted">Products:</span>
            <span className="font-semibold">
              {currentLimits.products === 999999 ? 'Unlimited' : currentLimits.products}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-pg-text-muted">Scans per month:</span>
            <span className="font-semibold">
              {currentLimits.scansPerMonth === 999999
                ? 'Unlimited'
                : currentLimits.scansPerMonth}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-pg-text-muted">Scan frequency:</span>
            <span className="font-semibold capitalize">
              {currentLimits.scanFrequency}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
            <span className="text-pg-text-muted">Features:</span>
            <span className="font-semibold text-sm sm:text-base">
              {currentLimits.features.length} features included
            </span>
          </div>
        </div>
      </Card>

      {/* Upgrade Options */}
      {availableUpgrades.length > 0 && (
        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-4">Upgrade Your Plan</h2>
          <div className={`grid grid-cols-1 gap-4 sm:gap-6 ${
            availableUpgrades.length === 1 ? 'sm:grid-cols-1 max-w-md' :
            availableUpgrades.length === 2 ? 'sm:grid-cols-2' :
            'sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {availableUpgrades.map((tier) => {
              const limits = PLAN_LIMITS[tier];
              return (
                <Card key={tier}>
                  <Badge variant={tier} className="mb-2 capitalize">
                    {tier}
                  </Badge>
                  <p className="text-2xl font-bold text-pg-accent mb-4">
                    ${limits.priceUsd}
                    <span className="text-base">/month</span>
                  </p>

                  <div className="space-y-2 text-sm mb-6">
                    <div className="flex items-center gap-2">
                      <span className="text-pg-accent">✓</span>
                      <span>
                        {limits.products === 999999 ? 'Unlimited' : limits.products} products
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-pg-accent">✓</span>
                      <span>
                        {limits.scansPerMonth === 999999
                          ? 'Unlimited'
                          : limits.scansPerMonth}{' '}
                        scans/month
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-pg-accent">✓</span>
                      <span className="capitalize">{limits.scanFrequency} scans</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-pg-accent">✓</span>
                      <span>{limits.features.length} features included</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleUpgrade(tier)}
                    disabled={upgrading}
                    className="w-full"
                  >
                    {upgrading ? 'Processing...' : `Upgrade to ${tier}`}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No upgrades available - already on highest tier */}
      {currentPlan === 'business' && (
        <Card className="mt-6 sm:mt-8">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl font-bold mb-2 text-pg-text">You're on the Best Plan!</h2>
            <p className="text-pg-text-muted">
              You have access to all ProductGuard.ai features with unlimited usage.
            </p>
          </div>
        </Card>
      )}

      {/* Account Information */}
      <Card className="mt-6 sm:mt-8">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Account Information</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-pg-text-muted mb-1">
              Full Name
            </label>
            <p className="text-pg-text">{profile?.full_name || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-pg-text-muted mb-1">
              Company
            </label>
            <p className="text-pg-text">{profile?.company || 'Not set'}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-pg-text-muted mb-1">
              Member Since
            </label>
            <p className="text-pg-text">
              {new Date(profile?.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
