'use client';

import { Badge } from '@/components/ui/Badge';
import { RISK_BORDER_COLORS } from '@/lib/constants/platform-colors';
import type { PlatformType, RiskLevel } from '@/types';

interface ActionItemProps {
  id: string;
  sourceUrl: string;
  platform: PlatformType;
  riskLevel: RiskLevel;
  severityScore: number;
  productName: string;
  estRevenueLoss: number;
  detectedAt: string;
  onReview: (id: string) => void;
}

export function ActionItem({
  id,
  sourceUrl,
  platform,
  riskLevel,
  severityScore,
  productName,
  estRevenueLoss,
  detectedAt,
  onReview,
}: ActionItemProps) {
  const borderClass = RISK_BORDER_COLORS[riskLevel] || 'border-pg-border';
  let domain = '';
  try {
    domain = new URL(sourceUrl).hostname.replace('www.', '');
  } catch {}

  return (
    <div
      className={`p-3 rounded-lg bg-pg-bg border-l-2 ${borderClass} border border-pg-border hover:border-pg-accent/30 transition-all cursor-pointer`}
      onClick={() => onReview(id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-xs font-medium text-pg-text-muted">{productName}</span>
            <Badge variant={riskLevel} className="capitalize text-[10px] px-1.5 py-0">
              {riskLevel}
            </Badge>
            <span className="text-[10px] text-pg-text-muted">{severityScore}/100</span>
          </div>
          <p className="text-xs text-pg-accent truncate">{domain || sourceUrl}</p>
        </div>
        <div className="text-right shrink-0">
          {estRevenueLoss > 0 && (
            <p className="text-xs font-semibold text-pg-danger">${estRevenueLoss.toLocaleString()}</p>
          )}
          <p className="text-[10px] text-pg-text-muted">{formatTimeAgo(detectedAt)}</p>
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
