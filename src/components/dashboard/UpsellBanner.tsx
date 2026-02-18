import Link from 'next/link';
import type { PlanTier } from '@/types';

interface UpsellBannerProps {
  planTier: PlanTier;
  activeThreats: number;
}

export function UpsellBanner({ planTier, activeThreats }: UpsellBannerProps) {
  // Don't show for business users
  if (planTier === 'business') return null;

  const config = getUpsellConfig(planTier, activeThreats);
  if (!config) return null;

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-purple-500/10 via-pg-accent/10 to-blue-500/10 border border-pg-accent/20">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-pg-text mb-1">{config.title}</p>
          <p className="text-xs text-pg-text-muted">{config.description}</p>
        </div>
        <Link
          href="/dashboard/subscription"
          className="shrink-0 px-4 py-2 text-xs font-semibold rounded-lg bg-pg-accent text-white hover:opacity-90 transition-opacity"
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}

function getUpsellConfig(planTier: PlanTier, activeThreats: number) {
  if (planTier === 'scout') {
    return {
      title: 'Unlock automated monitoring',
      description: 'Upgrade to Starter for weekly scans, one-click DMCA takedowns, and Telegram monitoring.',
    };
  }
  if (planTier === 'starter' && activeThreats > 5) {
    return {
      title: 'You have multiple active threats',
      description: 'Upgrade to Pro for daily scans, torrent & Discord monitoring, and priority support.',
    };
  }
  if (planTier === 'pro' && activeThreats > 20) {
    return {
      title: 'Scale your protection',
      description: 'Upgrade to Business for unlimited scans, forum monitoring, API access, and white-label reports.',
    };
  }
  return null;
}
