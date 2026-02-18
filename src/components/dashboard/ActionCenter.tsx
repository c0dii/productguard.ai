'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ActionItem } from '@/components/dashboard/ActionItem';
import { InfringementReviewDrawer } from '@/components/dashboard/InfringementReviewDrawer';
import Link from 'next/link';
import type { DashboardData } from '@/types';

interface ActionCenterProps {
  items: DashboardData['actionItems'];
  totalPending: number;
}

export function ActionCenter({ items, totalPending }: ActionCenterProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = items.filter((item) => !dismissed.has(item.id));

  const selectedInfringement = selectedId
    ? buildInfringementForDrawer(items.find((i) => i.id === selectedId))
    : null;

  const handleReview = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleAction = useCallback((id: string, _action: 'verify' | 'reject' | 'whitelist') => {
    setDismissed((prev) => new Set(prev).add(id));
    setSelectedId(null);
    router.refresh();
  }, [router]);

  const handleClose = useCallback(() => {
    setSelectedId(null);
  }, []);

  if (visible.length === 0 && totalPending === 0) {
    return (
      <div className="p-5 rounded-xl bg-pg-surface border border-pg-border h-full">
        <h3 className="text-base font-bold text-pg-text mb-3">Action Center</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-3xl mb-2">&#x2714;&#xFE0F;</div>
          <p className="text-sm text-pg-text-muted">All clear! No items need review.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-5 rounded-xl bg-pg-surface border border-pg-border h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-pg-text">Action Center</h3>
          {totalPending > 0 && (
            <Link href="/dashboard/infringements" className="text-xs text-pg-accent hover:underline">
              {totalPending} total →
            </Link>
          )}
        </div>

        <div className="space-y-2 flex-1">
          {visible.map((item) => (
            <ActionItem
              key={item.id}
              id={item.id}
              sourceUrl={item.sourceUrl}
              platform={item.platform}
              riskLevel={item.riskLevel}
              severityScore={item.severityScore}
              productName={item.productName}
              estRevenueLoss={item.estRevenueLoss}
              detectedAt={item.detectedAt}
              onReview={handleReview}
            />
          ))}
        </div>
      </div>

      <InfringementReviewDrawer
        infringement={selectedInfringement}
        onClose={handleClose}
        onAction={handleAction}
      />
    </>
  );
}

function buildInfringementForDrawer(item: DashboardData['actionItems'][number] | undefined) {
  if (!item) return null;
  // Build a minimal Infringement-shaped object for the drawer
  return {
    id: item.id,
    source_url: item.sourceUrl,
    platform: item.platform,
    risk_level: item.riskLevel,
    severity_score: item.severityScore,
    audience_size: item.audienceSize,
    est_revenue_loss: item.estRevenueLoss,
    status: 'pending_verification' as const,
  } as any;
}
