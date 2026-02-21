'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from 'recharts';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@/lib/constants/platform-colors';
import type { DashboardData } from '@/types';

interface ThreatLandscapeProps {
  platformBreakdown: DashboardData['platformBreakdown'];
  detectionTrend: DashboardData['detectionTrend'];
}

export function ThreatLandscape({ platformBreakdown, detectionTrend }: ThreatLandscapeProps) {
  const sortedPlatforms = useMemo(
    () => [...platformBreakdown].sort((a, b) => b.count - a.count),
    [platformBreakdown]
  );

  const total = sortedPlatforms.reduce((sum, p) => sum + p.count, 0);
  const useBarChart = sortedPlatforms.length < 3;

  const sparklineData = useMemo(() => {
    if (!detectionTrend || detectionTrend.length === 0) return [];
    return detectionTrend.map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: d.count,
    }));
  }, [detectionTrend]);

  return (
    <div className="p-5 rounded-xl bg-pg-surface border border-pg-border h-full flex flex-col">
      <h3 className="text-base font-bold text-pg-text mb-3">Threat Landscape</h3>

      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-pg-text-muted text-center">
            No threats found yet.<br />
            This chart fills in as scans detect piracy across platforms.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4">
          {/* Platform distribution */}
          <div className="flex items-center gap-4">
            {useBarChart ? (
              <BarBreakdown platforms={sortedPlatforms} total={total} />
            ) : (
              <div className="w-[120px] h-[120px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sortedPlatforms}
                      dataKey="count"
                      nameKey="platform"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {sortedPlatforms.map((entry) => (
                        <Cell
                          key={entry.platform}
                          fill={PLATFORM_COLORS[entry.platform] || '#6B7280'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#f3f4f6',
                        fontSize: '12px',
                      }}
                      formatter={(value, name) => [
                        value ?? 0,
                        PLATFORM_LABELS[String(name) as keyof typeof PLATFORM_LABELS] || String(name),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Legend */}
            <div className="flex-1 space-y-1.5">
              {sortedPlatforms.map((p) => (
                <div key={p.platform} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PLATFORM_COLORS[p.platform] || '#6B7280' }}
                    />
                    <span className="text-pg-text-muted">
                      {PLATFORM_LABELS[p.platform] || p.platform}
                    </span>
                  </div>
                  <span className="font-medium text-pg-text">{p.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 30-day sparkline */}
          {sparklineData.length > 1 && (
            <div>
              <p className="text-xs text-pg-text-muted mb-2">30-day detection trend</p>
              <div className="h-[60px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00D4AA" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#00D4AA" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#00D4AA"
                      strokeWidth={1.5}
                      fill="url(#sparkGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BarBreakdown({
  platforms,
  total,
}: {
  platforms: DashboardData['platformBreakdown'];
  total: number;
}) {
  return (
    <div className="w-full space-y-2">
      {platforms.map((p) => {
        const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
        return (
          <div key={p.platform}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-pg-text-muted">
                {PLATFORM_LABELS[p.platform] || p.platform}
              </span>
              <span className="font-medium text-pg-text">{p.count} ({pct}%)</span>
            </div>
            <div className="h-2 bg-pg-bg rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: PLATFORM_COLORS[p.platform] || '#6B7280',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
