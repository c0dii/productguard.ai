import { PLAN_LIMITS, type PlanTier } from '@/types';

export function canCreateProduct(planTier: PlanTier, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[planTier].products;
}

export function canRunScan(planTier: PlanTier, monthlyScans: number): boolean {
  return monthlyScans < PLAN_LIMITS[planTier].scansPerMonth;
}

export function hasFeature(planTier: PlanTier, feature: string): boolean {
  return PLAN_LIMITS[planTier].features.includes(feature);
}

export function getUpgradeHint(planTier: PlanTier): string {
  const upgradeMap: Record<PlanTier, string> = {
    scout: 'Upgrade to Starter ($29/mo) for more products and scans',
    starter: 'Upgrade to Pro ($99/mo) for more products and scans',
    pro: 'Upgrade to Business ($299/mo) for unlimited products and scans',
    business: 'You are on the highest plan',
  };
  return upgradeMap[planTier];
}

export function getPlanLimits(planTier: PlanTier) {
  return PLAN_LIMITS[planTier];
}
