'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CustomerProfile, IntelligenceOverview, CostBreakdown, PlanTier } from '@/types';

interface CustomerIntelligenceProps {
  overview: IntelligenceOverview;
  customers: CustomerProfile[];
  costBreakdown: CostBreakdown;
}

type TabKey = 'overview' | 'customers' | 'profitability';
type SortKey = 'email' | 'plan_tier' | 'mrr' | 'total_cost_30d' | 'margin' | 'health_score' | 'last_scan_at';
type SortDir = 'asc' | 'desc';

const PLAN_COLORS: Record<string, string> = {
  scout: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  free: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  starter: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  pro: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  business: 'bg-pg-accent/10 text-pg-accent border-pg-accent/30',
};

function healthColor(status: string): string {
  if (status === 'healthy') return 'text-green-400';
  if (status === 'at_risk') return 'text-yellow-400';
  return 'text-red-400';
}

function healthBadgeClass(status: string): string {
  if (status === 'healthy') return 'bg-green-500/10 text-green-400 border-green-500/30';
  if (status === 'at_risk') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  return 'bg-red-500/10 text-red-400 border-red-500/30';
}

function formatCost(cost: number): string {
  if (cost < 0.01 && cost > 0) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

function formatDaysAgo(date: string | null): string {
  if (!date) return 'Never';
  const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

export function CustomerIntelligence({ overview, customers, costBreakdown }: CustomerIntelligenceProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [sortKey, setSortKey] = useState<SortKey>('health_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'customers', label: `Customers (${customers.length})` },
    { key: 'profitability', label: 'Profitability' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-pg-border mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-pg-accent text-pg-accent'
                : 'border-transparent text-pg-text-muted hover:text-pg-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab overview={overview} />
      )}

      {activeTab === 'customers' && (
        <CustomersTab
          customers={customers}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={(key) => {
            if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
            else { setSortKey(key); setSortDir('desc'); }
          }}
          planFilter={planFilter}
          setPlanFilter={setPlanFilter}
          healthFilter={healthFilter}
          setHealthFilter={setHealthFilter}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
        />
      )}

      {activeTab === 'profitability' && (
        <ProfitabilityTab
          customers={customers}
          costBreakdown={costBreakdown}
          overview={overview}
        />
      )}
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ overview }: { overview: IntelligenceOverview }) {
  const totalHealth = overview.health_distribution.healthy + overview.health_distribution.at_risk + overview.health_distribution.inactive;

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">MRR</p>
          <p className="text-2xl sm:text-3xl font-bold text-pg-accent">${overview.mrr}</p>
          <p className="text-xs text-pg-text-muted mt-1">ARR: ${overview.arr.toLocaleString()}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Active Customers</p>
          <p className="text-2xl sm:text-3xl font-bold">{overview.active_customers}</p>
          <p className="text-xs text-pg-text-muted mt-1">{overview.total_customers} total</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Total Cost (30d)</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-400">{formatCost(overview.total_cost_30d)}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Avg Margin</p>
          <p className={`text-2xl sm:text-3xl font-bold ${overview.avg_margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCost(overview.avg_margin)}
          </p>
          <p className="text-xs text-pg-text-muted mt-1">per paid customer</p>
        </Card>
      </div>

      {/* Health Distribution */}
      <Card>
        <h3 className="text-sm font-semibold text-pg-text mb-3">Customer Health Distribution</h3>
        {totalHealth > 0 && (
          <>
            <div className="flex h-3 rounded-full overflow-hidden bg-pg-bg mb-3">
              {overview.health_distribution.healthy > 0 && (
                <div
                  className="bg-green-400"
                  style={{ width: `${(overview.health_distribution.healthy / totalHealth) * 100}%` }}
                />
              )}
              {overview.health_distribution.at_risk > 0 && (
                <div
                  className="bg-yellow-400"
                  style={{ width: `${(overview.health_distribution.at_risk / totalHealth) * 100}%` }}
                />
              )}
              {overview.health_distribution.inactive > 0 && (
                <div
                  className="bg-red-400"
                  style={{ width: `${(overview.health_distribution.inactive / totalHealth) * 100}%` }}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="font-medium text-green-400">{overview.health_distribution.healthy}</span>
                <span className="text-pg-text-muted">Healthy</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="font-medium text-yellow-400">{overview.health_distribution.at_risk}</span>
                <span className="text-pg-text-muted">At Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="font-medium text-red-400">{overview.health_distribution.inactive}</span>
                <span className="text-pg-text-muted">Inactive</span>
              </div>
            </div>
          </>
        )}
        {totalHealth === 0 && (
          <p className="text-pg-text-muted text-sm">No customers yet</p>
        )}
      </Card>

      {/* Revenue vs Cost by Tier */}
      <Card>
        <h3 className="text-sm font-semibold text-pg-text mb-3">Revenue vs Cost by Plan</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-pg-text-muted text-xs border-b border-pg-border">
                <th className="text-left py-2 pr-4">Plan</th>
                <th className="text-right py-2 px-2">Customers</th>
                <th className="text-right py-2 px-2">Revenue</th>
                <th className="text-right py-2 px-2">Cost (30d)</th>
                <th className="text-right py-2 pl-2">Margin</th>
              </tr>
            </thead>
            <tbody>
              {overview.tier_breakdown.map(tier => (
                <tr key={tier.tier} className="border-b border-pg-border/50">
                  <td className="py-2 pr-4">
                    <Badge variant="default" className={`text-xs border capitalize ${PLAN_COLORS[tier.tier] || ''}`}>
                      {tier.tier}
                    </Badge>
                  </td>
                  <td className="text-right py-2 px-2 font-medium">{tier.count}</td>
                  <td className="text-right py-2 px-2 text-pg-accent font-medium">${tier.revenue}</td>
                  <td className="text-right py-2 px-2 text-red-400">{formatCost(tier.cost)}</td>
                  <td className={`text-right py-2 pl-2 font-bold ${tier.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCost(tier.margin)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// CUSTOMERS TAB
// ============================================================================

function CustomersTab({
  customers,
  sortKey,
  sortDir,
  onSort,
  planFilter,
  setPlanFilter,
  healthFilter,
  setHealthFilter,
  expandedId,
  setExpandedId,
}: {
  customers: CustomerProfile[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  planFilter: string;
  setPlanFilter: (v: string) => void;
  healthFilter: string;
  setHealthFilter: (v: string) => void;
  expandedId: string | null;
  setExpandedId: (v: string | null) => void;
}) {
  // Filter
  let filtered = customers;
  if (planFilter !== 'all') filtered = filtered.filter(c => c.plan_tier === planFilter);
  if (healthFilter !== 'all') filtered = filtered.filter(c => c.health_status === healthFilter);

  // Sort
  filtered = [...filtered].sort((a, b) => {
    let aVal: any = a[sortKey];
    let bVal: any = b[sortKey];
    if (sortKey === 'last_scan_at') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    }
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="bg-pg-surface border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text"
        >
          <option value="all">All Plans</option>
          <option value="scout">Scout</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
        <select
          value={healthFilter}
          onChange={e => setHealthFilter(e.target.value)}
          className="bg-pg-surface border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text"
        >
          <option value="all">All Health</option>
          <option value="healthy">Healthy</option>
          <option value="at_risk">At Risk</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-sm text-pg-text-muted self-center">
          {filtered.length} customers
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-pg-text-muted text-xs border-b border-pg-border">
              <SortHeader label="Customer" sortKey="email" currentKey={sortKey} indicator={sortIndicator('email')} onSort={onSort} />
              <SortHeader label="Plan" sortKey="plan_tier" currentKey={sortKey} indicator={sortIndicator('plan_tier')} onSort={onSort} className="hidden sm:table-cell" />
              <SortHeader label="MRR" sortKey="mrr" currentKey={sortKey} indicator={sortIndicator('mrr')} onSort={onSort} className="text-right" />
              <SortHeader label="Cost (30d)" sortKey="total_cost_30d" currentKey={sortKey} indicator={sortIndicator('total_cost_30d')} onSort={onSort} className="text-right hidden md:table-cell" />
              <SortHeader label="Margin" sortKey="margin" currentKey={sortKey} indicator={sortIndicator('margin')} onSort={onSort} className="text-right hidden md:table-cell" />
              <SortHeader label="Health" sortKey="health_score" currentKey={sortKey} indicator={sortIndicator('health_score')} onSort={onSort} className="text-right" />
              <SortHeader label="Last Scan" sortKey="last_scan_at" currentKey={sortKey} indicator={sortIndicator('last_scan_at')} onSort={onSort} className="text-right hidden lg:table-cell" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(customer => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                expanded={expandedId === customer.id}
                onToggle={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <Card>
          <p className="text-pg-text-muted text-center py-8">No customers match the current filters.</p>
        </Card>
      )}
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  currentKey,
  indicator,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  indicator: string;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <th className={`py-2 px-2 ${className}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`hover:text-pg-text transition-colors ${currentKey === sortKey ? 'text-pg-accent' : ''}`}
      >
        {label}{indicator}
      </button>
    </th>
  );
}

function CustomerRow({
  customer,
  expanded,
  onToggle,
}: {
  customer: CustomerProfile;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="border-b border-pg-border/50 hover:bg-pg-surface-light cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="py-3 px-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{customer.full_name || customer.email}</p>
            {customer.full_name && (
              <p className="text-xs text-pg-text-muted truncate">{customer.email}</p>
            )}
          </div>
        </td>
        <td className="py-3 px-2 hidden sm:table-cell">
          <Badge variant="default" className={`text-xs border capitalize ${PLAN_COLORS[customer.plan_tier] || ''}`}>
            {customer.plan_tier}
          </Badge>
        </td>
        <td className="py-3 px-2 text-right font-medium text-pg-accent">
          ${customer.mrr}
        </td>
        <td className="py-3 px-2 text-right hidden md:table-cell text-red-400">
          {formatCost(customer.total_cost_30d)}
        </td>
        <td className={`py-3 px-2 text-right hidden md:table-cell font-bold ${customer.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatCost(customer.margin)}
        </td>
        <td className="py-3 px-2 text-right">
          <span className={`font-bold ${healthColor(customer.health_status)}`}>
            {customer.health_score}
          </span>
        </td>
        <td className="py-3 px-2 text-right hidden lg:table-cell text-pg-text-muted text-xs">
          {formatDaysAgo(customer.last_scan_at)}
        </td>
      </tr>

      {/* Expanded Detail */}
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-pg-surface-light border-b border-pg-border">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Usage */}
              <div>
                <h4 className="text-xs font-semibold text-pg-text-muted mb-2 uppercase tracking-wide">Usage</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-pg-text-muted">Products</span>
                    <span className="font-medium">{customer.product_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pg-text-muted">Scans</span>
                    <span className="font-medium">{customer.scan_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pg-text-muted">Infringements</span>
                    <span className="font-medium">{customer.infringement_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pg-text-muted">Takedowns</span>
                    <span className="font-medium">{customer.takedown_count}</span>
                  </div>
                </div>
              </div>

              {/* Costs */}
              <div>
                <h4 className="text-xs font-semibold text-pg-text-muted mb-2 uppercase tracking-wide">Costs (30d)</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-pg-text-muted">Scan costs</span>
                    <span className="font-medium text-red-400">{formatCost(customer.scan_cost_30d)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pg-text-muted">Email costs</span>
                    <span className="font-medium text-red-400">{formatCost(customer.email_cost_30d)}</span>
                  </div>
                  <div className="flex justify-between border-t border-pg-border pt-1 mt-1">
                    <span className="text-pg-text-muted font-semibold">Total</span>
                    <span className="font-bold text-red-400">{formatCost(customer.total_cost_30d)}</span>
                  </div>
                </div>
              </div>

              {/* Profitability */}
              <div>
                <h4 className="text-xs font-semibold text-pg-text-muted mb-2 uppercase tracking-wide">Profitability</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-pg-text-muted">MRR</span>
                    <span className="font-medium text-pg-accent">${customer.mrr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-pg-text-muted">Cost-to-serve</span>
                    <span className="font-medium text-red-400">{formatCost(customer.total_cost_30d)}</span>
                  </div>
                  <div className="flex justify-between border-t border-pg-border pt-1 mt-1">
                    <span className="text-pg-text-muted font-semibold">Net Margin</span>
                    <span className={`font-bold ${customer.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCost(customer.margin)}
                    </span>
                  </div>
                  {customer.mrr > 0 && (
                    <div className="flex justify-between">
                      <span className="text-pg-text-muted">Cost ratio</span>
                      <span className="font-medium">
                        {((customer.total_cost_30d / customer.mrr) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <Badge variant="default" className={`text-xs border ${healthBadgeClass(customer.health_status)}`}>
                    Health: {customer.health_score}/100
                  </Badge>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================================================
// PROFITABILITY TAB
// ============================================================================

function ProfitabilityTab({
  customers,
  costBreakdown,
  overview,
}: {
  customers: CustomerProfile[];
  costBreakdown: CostBreakdown;
  overview: IntelligenceOverview;
}) {
  const paidCustomers = customers.filter(c => c.mrr > 0);
  const sortedByMargin = [...paidCustomers].sort((a, b) => b.margin - a.margin);
  const topProfitable = sortedByMargin.slice(0, 10);
  const leastProfitable = [...sortedByMargin].reverse().slice(0, 10);

  const maxCostCategory = Math.max(
    costBreakdown.scan_serper,
    costBreakdown.scan_ai_filter,
    costBreakdown.scan_whois,
    costBreakdown.email_send,
    0.001 // prevent division by zero
  );

  return (
    <div className="space-y-6">
      {/* Cost Breakdown */}
      <Card>
        <h3 className="text-sm font-semibold text-pg-text mb-4">Cost Breakdown by Category (30d)</h3>
        <div className="space-y-3">
          <CostBar label="SERP API" cost={costBreakdown.scan_serper} max={maxCostCategory} />
          <CostBar label="AI Filtering" cost={costBreakdown.scan_ai_filter} max={maxCostCategory} />
          <CostBar label="WHOIS" cost={costBreakdown.scan_whois} max={maxCostCategory} />
          <CostBar label="Email" cost={costBreakdown.email_send} max={maxCostCategory} />
        </div>
        <div className="mt-4 pt-3 border-t border-pg-border flex justify-between text-sm">
          <span className="text-pg-text-muted font-semibold">Total (30d)</span>
          <span className="font-bold text-red-400">{formatCost(costBreakdown.total)}</span>
        </div>
      </Card>

      {/* Per-Tier Profitability */}
      <Card>
        <h3 className="text-sm font-semibold text-pg-text mb-4">Profitability by Plan Tier</h3>
        <div className="space-y-4">
          {overview.tier_breakdown
            .filter(t => t.revenue > 0)
            .map(tier => {
              const marginPct = tier.revenue > 0 ? ((tier.margin / tier.revenue) * 100) : 0;
              return (
                <div key={tier.tier} className="flex items-center gap-3">
                  <Badge variant="default" className={`text-xs border capitalize w-20 justify-center ${PLAN_COLORS[tier.tier] || ''}`}>
                    {tier.tier}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-pg-text-muted mb-1">
                      <span>${tier.revenue} revenue</span>
                      <span>{formatCost(tier.cost)} cost</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-pg-bg">
                      <div
                        className={marginPct >= 0 ? 'bg-green-400' : 'bg-red-400'}
                        style={{ width: `${Math.min(Math.abs(marginPct), 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className={`text-sm font-bold w-16 text-right ${tier.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {marginPct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
        </div>
      </Card>

      {/* Top/Bottom Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-green-400 mb-3">Top 10 Most Profitable</h3>
          {topProfitable.length === 0 ? (
            <p className="text-sm text-pg-text-muted">No paid customers yet</p>
          ) : (
            <div className="space-y-2">
              {topProfitable.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-pg-text-muted w-4">{i + 1}.</span>
                    <span className="truncate">{c.full_name || c.email}</span>
                    <Badge variant="default" className={`text-xs border capitalize ${PLAN_COLORS[c.plan_tier] || ''}`}>
                      {c.plan_tier}
                    </Badge>
                  </div>
                  <span className="font-bold text-green-400 ml-2 whitespace-nowrap">
                    {formatCost(c.margin)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-red-400 mb-3">Top 10 Least Profitable</h3>
          {leastProfitable.length === 0 ? (
            <p className="text-sm text-pg-text-muted">No paid customers yet</p>
          ) : (
            <div className="space-y-2">
              {leastProfitable.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-pg-text-muted w-4">{i + 1}.</span>
                    <span className="truncate">{c.full_name || c.email}</span>
                    <Badge variant="default" className={`text-xs border capitalize ${PLAN_COLORS[c.plan_tier] || ''}`}>
                      {c.plan_tier}
                    </Badge>
                  </div>
                  <span className={`font-bold ml-2 whitespace-nowrap ${c.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCost(c.margin)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function CostBar({ label, cost, max }: { label: string; cost: number; max: number }) {
  const pct = max > 0 ? (cost / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-pg-text-muted w-24 sm:w-28">{label}</span>
      <div className="flex-1 bg-pg-bg rounded-full h-5 overflow-hidden">
        <div
          className="h-full bg-red-400/60 rounded-full flex items-center px-2"
          style={{ width: `${Math.max(pct, 4)}%` }}
        >
          {pct >= 20 && (
            <span className="text-xs font-medium text-white">{formatCost(cost)}</span>
          )}
        </div>
      </div>
      {pct < 20 && (
        <span className="text-xs text-pg-text-muted w-16 text-right">{formatCost(cost)}</span>
      )}
    </div>
  );
}
