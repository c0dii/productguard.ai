'use client';

import { ProtectionScoreHero } from '@/components/dashboard/ProtectionScoreHero';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActionCenter } from '@/components/dashboard/ActionCenter';
import { ThreatLandscape } from '@/components/dashboard/ThreatLandscape';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { QuickActionsBar } from '@/components/dashboard/QuickActionsBar';
import { ContextualBottomZone } from '@/components/dashboard/ContextualBottomZone';
import { OnboardingCard } from '@/components/dashboard/OnboardingCard';
import type { DashboardData } from '@/types';

interface DashboardOverviewProps {
  data: DashboardData;
}

export function DashboardOverview({ data }: DashboardOverviewProps) {
  const removedCount =
    data.stats.takedownsSent > 0
      ? Math.max(0, data.stats.takedownsSent - data.stats.activeThreats)
      : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-pg-text">Dashboard</h1>
        <p className="text-sm text-pg-text-muted mt-1">
          Monitor and protect your digital products
        </p>
      </div>

      {/* Onboarding card for incomplete profile */}
      {!data.profileComplete && (
        <div className="mb-6">
          <OnboardingCard
            fullName={data.userProfile.fullName}
            phone={data.userProfile.phone}
            address={data.userProfile.address}
            dmcaReplyEmail={data.userProfile.dmcaReplyEmail}
          />
        </div>
      )}

      {/* Protection Score Hero */}
      <ProtectionScoreHero
        score={data.protectionScore}
        revenueAtRisk={data.revenueAtRisk}
        revenueProtected={data.revenueProtected}
        activeThreats={data.stats.activeThreats}
        removedCount={removedCount}
      />

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Products"
          value={data.stats.totalProducts}
          icon={<span>&#x1F4E6;</span>}
          color="text-pg-accent"
          href="/dashboard/products"
        />
        <StatCard
          label="Needs Review"
          value={data.stats.needsReview}
          icon={<span>&#x26A0;&#xFE0F;</span>}
          color="text-yellow-400"
          href="/dashboard/infringements"
          trend={data.stats.needsReviewTrend}
          trendLabel="vs last 30d"
        />
        <StatCard
          label="Active Threats"
          value={data.stats.activeThreats}
          icon={<span>&#x1F6A8;</span>}
          color="text-pg-danger"
          href="/dashboard/infringements"
          trend={data.stats.activeThreatsTrend}
          trendLabel="vs last 30d"
        />
        <StatCard
          label="Takedowns Sent"
          value={data.stats.takedownsSent}
          icon={<span>&#x26A1;</span>}
          color="text-green-400"
          href="/dashboard/takedowns"
          trend={data.stats.takedownsTrend}
          trendLabel="vs last 30d"
        />
      </div>

      {/* Two-column split: Action Center + Threat Landscape */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ActionCenter
          items={data.actionItems}
          totalPending={data.stats.needsReview}
        />
        <ThreatLandscape
          platformBreakdown={data.platformBreakdown}
          detectionTrend={data.detectionTrend}
        />
      </div>

      {/* Activity Timeline */}
      <div className="mb-6">
        <ActivityTimeline events={data.timeline} />
      </div>

      {/* Quick Actions Bar */}
      <div className="mb-6">
        <QuickActionsBar />
      </div>

      {/* Contextual Bottom Zone */}
      <ContextualBottomZone data={data} />
    </div>
  );
}
