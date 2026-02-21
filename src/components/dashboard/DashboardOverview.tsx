'use client';

import { ProtectionScoreHero } from '@/components/dashboard/ProtectionScoreHero';
import { StatCard } from '@/components/dashboard/StatCard';
import { ActionCenter } from '@/components/dashboard/ActionCenter';
import { ThreatLandscape } from '@/components/dashboard/ThreatLandscape';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { QuickActionsBar } from '@/components/dashboard/QuickActionsBar';
import { ContextualBottomZone } from '@/components/dashboard/ContextualBottomZone';
import { OnboardingBanner } from '@/components/dashboard/OnboardingBanner';
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

  const isNewUser = data.productCount === 0;

  // Focused welcome layout for brand-new users (no products yet)
  if (isNewUser) {
    return (
      <div>
        {/* Welcome header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-pg-text">Welcome to ProductGuard</h1>
          <p className="text-sm text-pg-text-muted mt-1">
            Let's protect your digital products from piracy
          </p>
        </div>

        {/* Onboarding banner — front and center for new users */}
        <OnboardingBanner productCount={0} hasScanRun={false} />

        {/* Stat cards preview — shows the grid that will fill in */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Products"
            value={0}
            icon={<span>&#x1F4E6;</span>}
            color="text-pg-accent"
            href="/dashboard/products"
          />
          <StatCard
            label="Needs Review"
            value={0}
            icon={<span>&#x26A0;&#xFE0F;</span>}
            color="text-yellow-400"
            href="/dashboard/infringements"
          />
          <StatCard
            label="Active Threats"
            value={0}
            icon={<span>&#x1F6A8;</span>}
            color="text-pg-danger"
            href="/dashboard/infringements"
          />
          <StatCard
            label="Takedowns Sent"
            value={0}
            icon={<span>&#x26A1;</span>}
            color="text-green-400"
            href="/dashboard/takedowns"
          />
        </div>

        {/* Profile completion card */}
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

        {/* Quick actions for navigation */}
        <div className="mb-6">
          <QuickActionsBar />
        </div>
      </div>
    );
  }

  // Full dashboard for returning users with products
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-pg-text">Dashboard</h1>
        <p className="text-sm text-pg-text-muted mt-1">
          Monitor and protect your digital products
        </p>
      </div>

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

      {/* Onboarding card for incomplete profile — shown below stats so dashboard feels alive first */}
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
