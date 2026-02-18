import { OnboardingBanner } from '@/components/dashboard/OnboardingBanner';
import { UpsellBanner } from '@/components/dashboard/UpsellBanner';
import type { DashboardData } from '@/types';

interface ContextualBottomZoneProps {
  data: DashboardData;
}

export function ContextualBottomZone({ data }: ContextualBottomZoneProps) {
  const isNewUser = data.productCount === 0;
  const needsOnboarding = !data.hasScanRun;

  // Priority 1: Onboarding for new users
  if (isNewUser || needsOnboarding) {
    return (
      <OnboardingBanner
        productCount={data.productCount}
        hasScanRun={data.hasScanRun}
      />
    );
  }

  // Priority 2: Upsell for users with active threats
  if (data.planTier !== 'business') {
    return (
      <UpsellBanner
        planTier={data.planTier}
        activeThreats={data.stats.activeThreats}
      />
    );
  }

  // Priority 3: Tips for established users
  return (
    <div className="p-4 rounded-xl bg-pg-surface border border-pg-border">
      <p className="text-xs text-pg-text-muted">
        Tip: Set up automated scan schedules from the Products page to stay ahead of threats.
      </p>
    </div>
  );
}
