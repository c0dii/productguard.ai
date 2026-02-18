'use client';

import { ScoreRing } from '@/components/dashboard/ScoreRing';
import { getScoreLabel } from '@/lib/utils/protection-score';

interface ProtectionScoreHeroProps {
  score: number;
  revenueAtRisk: number;
  revenueProtected: number;
  activeThreats: number;
  removedCount: number;
}

export function ProtectionScoreHero({
  score,
  revenueAtRisk,
  revenueProtected,
  activeThreats,
  removedCount,
}: ProtectionScoreHeroProps) {
  const label = getScoreLabel(score);

  const summary = buildSummary(score, activeThreats, removedCount);

  return (
    <div className="p-5 sm:p-6 rounded-xl bg-pg-surface border border-pg-border mb-6">
      <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
        {/* Score ring */}
        <ScoreRing score={score} size={130} />

        {/* Details */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-lg font-bold text-pg-text mb-1">Protection Score: {label}</h2>
          <p className="text-sm text-pg-text-muted mb-4">{summary}</p>

          <div className="flex flex-wrap justify-center sm:justify-start gap-6">
            <div>
              <p className="text-xs text-pg-text-muted uppercase tracking-wide mb-0.5">Revenue at Risk</p>
              <p className="text-xl font-bold text-pg-danger">
                {revenueAtRisk > 0 ? `$${revenueAtRisk.toLocaleString()}` : '$0'}
              </p>
            </div>
            <div>
              <p className="text-xs text-pg-text-muted uppercase tracking-wide mb-0.5">Revenue Protected</p>
              <p className="text-xl font-bold text-pg-accent">
                {revenueProtected > 0 ? `$${revenueProtected.toLocaleString()}` : '$0'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildSummary(score: number, activeThreats: number, removedCount: number): string {
  if (activeThreats === 0 && removedCount === 0) {
    return 'No threats detected yet. Run a scan to start monitoring.';
  }
  if (activeThreats === 0) {
    return `All clear! ${removedCount} threat${removedCount !== 1 ? 's' : ''} successfully removed.`;
  }
  if (score >= 80) {
    return `${activeThreats} active threat${activeThreats !== 1 ? 's' : ''} detected. Your protection is strong.`;
  }
  if (score >= 60) {
    return `${activeThreats} active threat${activeThreats !== 1 ? 's' : ''} need${activeThreats === 1 ? 's' : ''} attention. Review and take action.`;
  }
  return `${activeThreats} active threat${activeThreats !== 1 ? 's' : ''} putting your revenue at risk. Immediate action recommended.`;
}
