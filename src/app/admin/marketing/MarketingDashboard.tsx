'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { MarketingProspect, InfringingPlatform, ProspectStatus } from '@/types/marketing';
import type { DiscoveryCategory } from '@/lib/discovery-engine/types';

// ── Props ─────────────────────────────────────────────────────

interface DashboardProps {
  initialProspects: MarketingProspect[];
  initialTotal: number;
  stats: {
    total: number;
    new: number;
    qualified: number;
    pushed_to_ghl: number;
    email_sent: number;
    engaged: number;
    account_created: number;
    converted: number;
    suppressed: number;
    exclusions: number;
    suppressions: number;
  };
  initialRuns: DiscoveryRun[];
}

interface DiscoveryRun {
  id: string;
  categories_scanned: string[];
  raw_listings_found: number;
  products_extracted: number;
  owners_identified: number;
  prospects_qualified: number;
  prospects_inserted: number;
  serp_calls_used: number;
  ai_calls_used: number;
  estimated_cost_usd: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  errors: string[] | null;
}

// ── Constants ─────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'text-[#8293AA]' },
  qualified: { label: 'Qualified', color: 'text-blue-400' },
  pushed_to_ghl: { label: 'Pushed to GHL', color: 'text-indigo-400' },
  email_sent: { label: 'Email Sent', color: 'text-yellow-400' },
  engaged: { label: 'Engaged', color: 'text-orange-400' },
  account_created: { label: 'Signed Up', color: 'text-pg-accent' },
  converted: { label: 'Converted', color: 'text-green-400' },
  suppressed: { label: 'Suppressed', color: 'text-red-400' },
};

const PLATFORM_LABELS: Record<InfringingPlatform, string> = {
  telegram: 'Telegram',
  cyberlocker: 'Cyberlocker',
  torrent: 'Torrent',
  discord: 'Discord',
  forum: 'Forum',
  social_media: 'Social Media',
  google_indexed: 'Google Indexed',
  other: 'Other',
};

const ALL_CATEGORIES: { value: DiscoveryCategory; label: string }[] = [
  { value: 'course', label: 'Courses' },
  { value: 'wordpress_theme', label: 'WP Themes' },
  { value: 'wordpress_plugin', label: 'WP Plugins' },
  { value: 'software', label: 'Software' },
  { value: 'ebook', label: 'Ebooks' },
  { value: 'trading_indicator', label: 'Trading Indicators' },
  { value: 'membership_content', label: 'Membership Content' },
  { value: 'design_asset', label: 'Design Assets' },
];

const FUNNEL_STAGES: ProspectStatus[] = [
  'new', 'qualified', 'pushed_to_ghl', 'email_sent', 'engaged', 'account_created', 'converted',
];

const columnHelper = createColumnHelper<MarketingProspect>();

// ── Component ─────────────────────────────────────────────────

export default function MarketingDashboard({
  initialProspects,
  initialTotal,
  stats,
  initialRuns,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'prospects' | 'discovery' | 'manual' | 'settings'>('prospects');

  // ── Prospect state ──────────────────────────────────────────
  const [prospects, setProspects] = useState(initialProspects);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterMinConf, setFilterMinConf] = useState('');
  const [filterMaxConf, setFilterMaxConf] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [pageOffset, setPageOffset] = useState(0);

  // ── Discovery state ─────────────────────────────────────────
  const [runs, setRuns] = useState(initialRuns);
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<DiscoveryCategory>>(
    new Set(['course', 'wordpress_plugin'])
  );
  const [serpBudget, setSerpBudget] = useState(30);

  // ── Manual entry state ──────────────────────────────────────
  const [manualForm, setManualForm] = useState({
    product_name: '',
    infringing_url: '',
    infringing_platform: 'other' as InfringingPlatform,
    product_url: '',
    product_price: '',
    owner_name: '',
    owner_email: '',
    company_name: '',
    company_domain: '',
    social_twitter: '',
    social_instagram: '',
    social_linkedin: '',
    social_facebook: '',
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualMessage, setManualMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Push state ──────────────────────────────────────────────
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  // ── Settings state ──────────────────────────────────────────
  const [dailyLimit, setDailyLimit] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('pg_daily_push_limit') || '10');
    }
    return 10;
  });

  // ── Fetch prospects ─────────────────────────────────────────

  const fetchProspects = useCallback(async (offset = 0) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterPlatform) params.set('platform', filterPlatform);
    if (filterMinConf) params.set('min_confidence', filterMinConf);
    if (filterMaxConf) params.set('max_confidence', filterMaxConf);
    if (filterSearch) params.set('search', filterSearch);
    params.set('limit', String(pageSize));
    params.set('offset', String(offset));

    try {
      const res = await fetch(`/api/admin/marketing/prospects?${params}`);
      const data = await res.json();
      if (res.ok) {
        setProspects(data.prospects);
        setTotal(data.total);
        setPageOffset(offset);
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPlatform, filterMinConf, filterMaxConf, filterSearch, pageSize]);

  // ── Bulk actions ────────────────────────────────────────────

  const bulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/marketing/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_ids: Array.from(selectedIds), action }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        await fetchProspects(pageOffset);
      }
    } finally {
      setLoading(false);
    }
  };

  const pushSelected = async () => {
    if (selectedIds.size === 0) return;
    setPushLoading(true);
    setPushMessage(null);
    try {
      const res = await fetch('/api/admin/marketing/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_ids: Array.from(selectedIds),
          daily_limit: dailyLimit,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPushMessage(`Pushed ${data.pushed}, failed ${data.failed}. ${data.daily_remaining} remaining today.`);
        setSelectedIds(new Set());
        await fetchProspects(pageOffset);
      } else {
        setPushMessage(data.error || 'Push failed');
      }
    } finally {
      setPushLoading(false);
    }
  };

  // ── Discovery ───────────────────────────────────────────────

  const runDiscovery = async () => {
    if (selectedCategories.size === 0) return;
    setDiscoveryRunning(true);
    setDiscoveryResult(null);
    try {
      const res = await fetch('/api/marketing/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: Array.from(selectedCategories),
          serp_budget: serpBudget,
          max_candidates: 200,
          min_confidence: 85,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDiscoveryResult(
          `Found ${data.summary.raw_listings} listings, extracted ${data.summary.products_extracted} products, ` +
          `identified ${data.summary.owners_identified} owners, qualified ${data.summary.prospects_qualified} prospects. ` +
          `Cost: $${data.summary.cost_usd?.toFixed(2) || '0'} | Duration: ${data.summary.duration_seconds}s`
        );
        // Refresh runs
        const runsRes = await fetch('/api/admin/marketing/runs');
        const runsData = await runsRes.json();
        if (runsRes.ok) setRuns(runsData.runs);
        // Refresh prospects
        await fetchProspects(0);
      } else {
        setDiscoveryResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setDiscoveryResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDiscoveryRunning(false);
    }
  };

  // ── Manual entry ────────────────────────────────────────────

  const submitManualEntry = async (e: FormEvent) => {
    e.preventDefault();
    setManualSubmitting(true);
    setManualMessage(null);
    try {
      const res = await fetch('/api/admin/marketing/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm),
      });
      const data = await res.json();
      if (res.ok) {
        setManualMessage({ type: 'success', text: `Prospect added: ${data.prospect.product_name}` });
        setManualForm({
          product_name: '', infringing_url: '', infringing_platform: 'other',
          product_url: '', product_price: '', owner_name: '', owner_email: '',
          company_name: '', company_domain: '', social_twitter: '',
          social_instagram: '', social_linkedin: '', social_facebook: '',
        });
        await fetchProspects(0);
      } else {
        setManualMessage({ type: 'error', text: data.error || 'Failed to add prospect' });
      }
    } finally {
      setManualSubmitting(false);
    }
  };

  // ── Toggle select ───────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map(p => p.id)));
    }
  };

  // ── Table columns ───────────────────────────────────────────

  const columns = [
    columnHelper.display({
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={prospects.length > 0 && selectedIds.size === prospects.length}
          onChange={toggleSelectAll}
          className="rounded border-pg-border"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.id)}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelect(row.original.id);
          }}
          className="rounded border-pg-border"
        />
      ),
      enableSorting: false,
    }),
    columnHelper.accessor('product_name', {
      header: 'Product',
      cell: (info) => (
        <span className="font-medium max-w-[180px] truncate block">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('infringing_platform', {
      header: 'Platform',
      cell: (info) => (
        <span className="capitalize text-pg-text-muted">
          {PLATFORM_LABELS[info.getValue()] || info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('confidence_score', {
      header: 'Confidence',
      cell: (info) => {
        const score = info.getValue();
        const color = score >= 95 ? 'text-green-400' : score >= 85 ? 'text-yellow-400' : 'text-red-400';
        return <span className={`font-mono font-bold ${color}`}>{score}%</span>;
      },
    }),
    columnHelper.accessor('owner_email', {
      header: 'Email',
      cell: (info) => (
        <span className="text-pg-text-muted max-w-[180px] truncate block">
          {info.getValue() || '\u2014'}
        </span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const meta = STATUS_LABELS[info.getValue()] || { label: info.getValue(), color: 'text-pg-text-muted' };
        return (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-pg-surface-light ${meta.color}`}>
            {meta.label}
          </span>
        );
      },
    }),
    columnHelper.accessor('discovered_at', {
      header: 'Discovered',
      cell: (info) => (
        <span className="text-pg-text-muted text-xs">
          {new Date(info.getValue()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            {p.status === 'new' && (
              <>
                <button
                  onClick={() => quickAction(p.id, 'approve')}
                  className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                >
                  Approve
                </button>
                <button
                  onClick={() => quickAction(p.id, 'reject')}
                  className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  Reject
                </button>
              </>
            )}
            {p.status === 'qualified' && (
              <button
                onClick={() => quickPush(p.id)}
                className="text-xs px-2 py-1 rounded bg-pg-accent/20 text-pg-accent hover:bg-pg-accent/30"
              >
                Push to GHL
              </button>
            )}
          </div>
        );
      },
      enableSorting: false,
    }),
  ];

  const quickAction = async (id: string, action: 'approve' | 'reject') => {
    await fetch('/api/admin/marketing/prospects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect_ids: [id], action }),
    });
    await fetchProspects(pageOffset);
  };

  const quickPush = async (id: string) => {
    setPushLoading(true);
    const res = await fetch('/api/admin/marketing/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect_ids: [id], daily_limit: dailyLimit }),
    });
    const data = await res.json();
    if (res.ok) {
      setPushMessage(`Pushed successfully. ${data.daily_remaining} remaining today.`);
    } else {
      setPushMessage(data.error || 'Push failed');
    }
    setPushLoading(false);
    await fetchProspects(pageOffset);
  };

  // ── Helpers ─────────────────────────────────────────────────

  const formatDate = (date: string | null) => {
    if (!date) return '\u2014';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const saveDailyLimit = (val: number) => {
    setDailyLimit(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pg_daily_push_limit', String(val));
    }
  };

  // ── Render ──────────────────────────────────────────────────

  const tabs = [
    { key: 'prospects' as const, label: 'Prospects', count: total },
    { key: 'discovery' as const, label: 'Discovery' },
    { key: 'manual' as const, label: 'Manual Entry' },
    { key: 'settings' as const, label: 'Settings' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Marketing Command Center</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          Discover piracy, review prospects, and control outreach pipeline
        </p>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Card>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-pg-text-muted">Total Prospects</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-[#8293AA]">{stats.new}</div>
          <div className="text-xs text-pg-text-muted">New</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-blue-400">{stats.qualified}</div>
          <div className="text-xs text-pg-text-muted">Qualified</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-indigo-400">{stats.pushed_to_ghl}</div>
          <div className="text-xs text-pg-text-muted">Pushed</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-pg-accent">{stats.account_created}</div>
          <div className="text-xs text-pg-text-muted">Signed Up</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-green-400">{stats.converted}</div>
          <div className="text-xs text-pg-text-muted">Converted</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-pg-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'border-pg-accent text-pg-accent'
                : 'border-transparent text-pg-text-muted hover:text-pg-text'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 text-xs bg-pg-surface-light px-2 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: Prospects ──────────────────────────────────── */}
      {activeTab === 'prospects' && (
        <div>
          {/* Filters */}
          <Card className="mb-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-pg-text-muted mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPageOffset(0); }}
                  className="input-field text-sm py-2 min-w-[140px]"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-pg-text-muted mb-1">Platform</label>
                <select
                  value={filterPlatform}
                  onChange={(e) => { setFilterPlatform(e.target.value); setPageOffset(0); }}
                  className="input-field text-sm py-2 min-w-[140px]"
                >
                  <option value="">All Platforms</option>
                  {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-pg-text-muted mb-1">Min Confidence</label>
                <input
                  type="number"
                  value={filterMinConf}
                  onChange={(e) => setFilterMinConf(e.target.value)}
                  placeholder="0"
                  min={0} max={100}
                  className="input-field text-sm py-2 w-20"
                />
              </div>

              <div>
                <label className="block text-xs text-pg-text-muted mb-1">Max Confidence</label>
                <input
                  type="number"
                  value={filterMaxConf}
                  onChange={(e) => setFilterMaxConf(e.target.value)}
                  placeholder="100"
                  min={0} max={100}
                  className="input-field text-sm py-2 w-20"
                />
              </div>

              <div className="flex-1 min-w-0 sm:min-w-[200px]">
                <label className="block text-xs text-pg-text-muted mb-1">Search</label>
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Product, email, or company..."
                  className="input-field text-sm py-2 w-full"
                />
              </div>

              <div>
                <label className="block text-xs text-pg-text-muted mb-1">Per page</label>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPageOffset(0); }}
                  className="input-field text-sm py-2"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <Button size="sm" onClick={() => fetchProspects(0)}>
                {loading ? 'Loading...' : 'Apply Filters'}
              </Button>
            </div>
          </Card>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <Card className="mb-4" glow>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{selectedIds.size} selected</span>
                <Button size="sm" onClick={() => bulkAction('approve')}>
                  Approve All
                </Button>
                <Button size="sm" variant="danger" onClick={() => bulkAction('reject')}>
                  Reject All
                </Button>
                <Button size="sm" variant="secondary" onClick={pushSelected} disabled={pushLoading}>
                  {pushLoading ? 'Pushing...' : 'Push to GHL'}
                </Button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-pg-text-muted hover:text-pg-text ml-auto"
                >
                  Clear selection
                </button>
              </div>
            </Card>
          )}

          {/* Push feedback */}
          {pushMessage && (
            <div className="mb-4 p-3 rounded-lg bg-pg-surface border border-pg-border text-sm">
              {pushMessage}
              <button onClick={() => setPushMessage(null)} className="ml-3 text-pg-text-muted hover:text-pg-text">&times;</button>
            </div>
          )}

          {/* Prospects Table */}
          <DataTable
            columns={columns as ColumnDef<MarketingProspect>[]}
            data={prospects}
            pageSize={pageSize}
            showPagination={false}
            onRowClick={(row) => setExpandedId(expandedId === row.id ? null : row.id)}
          />

          {/* Custom Pagination (server-side) */}
          {total > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-pg-text-muted">
                Showing {pageOffset + 1}–{Math.min(pageOffset + pageSize, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pageOffset === 0}
                  onClick={() => fetchProspects(Math.max(0, pageOffset - pageSize))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pageOffset + pageSize >= total}
                  onClick={() => fetchProspects(pageOffset + pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Expanded Prospect Detail */}
          {expandedId && (() => {
            const p = prospects.find(pr => pr.id === expandedId);
            if (!p) return null;
            return (
              <Card className="mt-4" glow>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold">{p.product_name}</h3>
                  <button onClick={() => setExpandedId(null)} className="text-pg-text-muted hover:text-pg-text">&times;</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-pg-text-muted mb-1">Infringing URL</div>
                    <a href={p.infringing_url} target="_blank" rel="noopener noreferrer" className="text-pg-accent hover:underline break-all">
                      {p.infringing_url}
                    </a>
                  </div>
                  <div>
                    <div className="text-pg-text-muted mb-1">Product URL</div>
                    {p.product_url ? (
                      <a href={p.product_url} target="_blank" rel="noopener noreferrer" className="text-pg-accent hover:underline break-all">
                        {p.product_url}
                      </a>
                    ) : '\u2014'}
                  </div>
                  <div>
                    <div className="text-pg-text-muted mb-1">Price</div>
                    <span>{p.product_price || '\u2014'}</span>
                  </div>
                  <div>
                    <div className="text-pg-text-muted mb-1">Company</div>
                    <span>{p.company_name}</span>
                  </div>
                  <div>
                    <div className="text-pg-text-muted mb-1">Owner</div>
                    <span>{p.owner_name || '\u2014'}</span>
                  </div>
                  <div>
                    <div className="text-pg-text-muted mb-1">Email</div>
                    <span>{p.owner_email || '\u2014'}</span>
                  </div>
                  <div>
                    <div className="text-pg-text-muted mb-1">Domain</div>
                    <span>{p.company_domain || '\u2014'}</span>
                  </div>
                  <div>
                    <div className="text-pg-text-muted mb-1">Est. Revenue Loss</div>
                    <span className="text-red-400">{p.est_revenue_loss || '\u2014'}</span>
                  </div>
                  <div>
                    <div className="text-pg-text-muted mb-1">Confidence</div>
                    <span className={`font-bold ${p.confidence_score >= 95 ? 'text-green-400' : p.confidence_score >= 85 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {p.confidence_score}%
                    </span>
                  </div>
                  <div>
                    <div className="text-pg-text-muted mb-1">Contact Source</div>
                    <span>{p.contact_source || '\u2014'}</span>
                  </div>
                  <div>
                    <div className="text-pg-text-muted mb-1">Social</div>
                    <div className="flex gap-2">
                      {p.social_twitter && <a href={p.social_twitter} target="_blank" rel="noopener noreferrer" className="text-pg-accent text-xs hover:underline">Twitter</a>}
                      {p.social_linkedin && <a href={p.social_linkedin} target="_blank" rel="noopener noreferrer" className="text-pg-accent text-xs hover:underline">LinkedIn</a>}
                      {p.social_instagram && <a href={p.social_instagram} target="_blank" rel="noopener noreferrer" className="text-pg-accent text-xs hover:underline">Instagram</a>}
                      {p.social_facebook && <a href={p.social_facebook} target="_blank" rel="noopener noreferrer" className="text-pg-accent text-xs hover:underline">Facebook</a>}
                      {!p.social_twitter && !p.social_linkedin && !p.social_instagram && !p.social_facebook && '\u2014'}
                    </div>
                  </div>
                  <div>
                    <div className="text-pg-text-muted mb-1">Discovered</div>
                    <span>{formatDate(p.discovered_at)}</span>
                  </div>
                </div>
              </Card>
            );
          })()}
        </div>
      )}

      {/* ── TAB: Discovery ──────────────────────────────────── */}
      {activeTab === 'discovery' && (
        <div className="space-y-6">
          {/* Run Discovery Panel */}
          <Card glow>
            <h2 className="text-lg font-bold mb-4">Run Discovery</h2>
            <div className="mb-4">
              <label className="block text-sm text-pg-text-muted mb-2">Categories</label>
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setSelectedCategories(prev => {
                        const next = new Set(prev);
                        if (next.has(value)) next.delete(value);
                        else next.add(value);
                        return next;
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategories.has(value)
                        ? 'bg-pg-accent text-pg-bg'
                        : 'bg-pg-surface-light text-pg-text-muted hover:text-pg-text border border-pg-border'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-pg-text-muted mb-2">
                SERP Budget: <span className="text-pg-text font-bold">{serpBudget}</span> calls
              </label>
              <input
                type="range"
                min={10}
                max={200}
                step={10}
                value={serpBudget}
                onChange={(e) => setSerpBudget(Number(e.target.value))}
                className="w-full accent-pg-accent"
              />
              <div className="flex justify-between text-xs text-pg-text-muted mt-1">
                <span>10 (quick test)</span>
                <span>200 (full scan)</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={runDiscovery}
                disabled={discoveryRunning || selectedCategories.size === 0}
              >
                {discoveryRunning ? 'Running Discovery...' : 'Run Discovery'}
              </Button>
              {discoveryRunning && (
                <span className="text-sm text-pg-text-muted animate-pulse">
                  This may take a few minutes...
                </span>
              )}
            </div>
            {discoveryResult && (
              <div className="mt-4 p-3 rounded-lg bg-pg-surface-light text-sm border border-pg-border">
                {discoveryResult}
              </div>
            )}
          </Card>

          {/* Run History */}
          <Card>
            <h2 className="text-lg font-bold mb-4">Run History</h2>
            {runs.length === 0 ? (
              <p className="text-pg-text-muted text-sm">No discovery runs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-pg-border text-pg-text-muted text-left">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Categories</th>
                      <th className="pb-3 pr-4">Listings</th>
                      <th className="pb-3 pr-4">Products</th>
                      <th className="pb-3 pr-4">Owners</th>
                      <th className="pb-3 pr-4">Qualified</th>
                      <th className="pb-3 pr-4">Cost</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id} className="border-b border-pg-border/50">
                        <td className="py-3 pr-4 text-xs text-pg-text-muted">{formatDate(run.created_at)}</td>
                        <td className="py-3 pr-4 text-xs">
                          {(run.categories_scanned || []).join(', ')}
                        </td>
                        <td className="py-3 pr-4">{run.raw_listings_found}</td>
                        <td className="py-3 pr-4">{run.products_extracted}</td>
                        <td className="py-3 pr-4">{run.owners_identified}</td>
                        <td className="py-3 pr-4 text-pg-accent font-bold">{run.prospects_qualified}</td>
                        <td className="py-3 pr-4 font-mono">${run.estimated_cost_usd?.toFixed(2) || '0'}</td>
                        <td className="py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            run.status === 'completed' ? 'bg-green-500/20 text-green-400'
                            : run.status === 'running' ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                          }`}>
                            {run.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB: Manual Entry ───────────────────────────────── */}
      {activeTab === 'manual' && (
        <Card>
          <h2 className="text-lg font-bold mb-4">Add Prospect Manually</h2>
          <p className="text-sm text-pg-text-muted mb-6">
            Add infringements you&apos;ve found manually. Confidence is auto-set to 100% for manual entries.
          </p>

          <form onSubmit={submitManualEntry} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Product Name *"
                value={manualForm.product_name}
                onChange={(e) => setManualForm(f => ({ ...f, product_name: e.target.value }))}
                placeholder="e.g. WP Starter Theme"
                required
              />
              <Input
                label="Infringing URL *"
                value={manualForm.infringing_url}
                onChange={(e) => setManualForm(f => ({ ...f, infringing_url: e.target.value }))}
                placeholder="https://nulled.to/..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-pg-text-muted mb-2">Platform *</label>
                <select
                  value={manualForm.infringing_platform}
                  onChange={(e) => setManualForm(f => ({ ...f, infringing_platform: e.target.value as InfringingPlatform }))}
                  className="input-field"
                >
                  {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Owner Email *"
                type="email"
                value={manualForm.owner_email}
                onChange={(e) => setManualForm(f => ({ ...f, owner_email: e.target.value }))}
                placeholder="owner@example.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Product URL"
                value={manualForm.product_url}
                onChange={(e) => setManualForm(f => ({ ...f, product_url: e.target.value }))}
                placeholder="https://example.com/product"
              />
              <Input
                label="Product Price"
                value={manualForm.product_price}
                onChange={(e) => setManualForm(f => ({ ...f, product_price: e.target.value }))}
                placeholder="$49"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Owner Name"
                value={manualForm.owner_name}
                onChange={(e) => setManualForm(f => ({ ...f, owner_name: e.target.value }))}
                placeholder="John Smith"
              />
              <Input
                label="Company Name"
                value={manualForm.company_name}
                onChange={(e) => setManualForm(f => ({ ...f, company_name: e.target.value }))}
                placeholder="Acme Inc."
              />
            </div>

            <Input
              label="Company Domain"
              value={manualForm.company_domain}
              onChange={(e) => setManualForm(f => ({ ...f, company_domain: e.target.value }))}
              placeholder="acme.com"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Twitter"
                value={manualForm.social_twitter}
                onChange={(e) => setManualForm(f => ({ ...f, social_twitter: e.target.value }))}
                placeholder="https://twitter.com/..."
              />
              <Input
                label="LinkedIn"
                value={manualForm.social_linkedin}
                onChange={(e) => setManualForm(f => ({ ...f, social_linkedin: e.target.value }))}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Instagram"
                value={manualForm.social_instagram}
                onChange={(e) => setManualForm(f => ({ ...f, social_instagram: e.target.value }))}
                placeholder="https://instagram.com/..."
              />
              <Input
                label="Facebook"
                value={manualForm.social_facebook}
                onChange={(e) => setManualForm(f => ({ ...f, social_facebook: e.target.value }))}
                placeholder="https://facebook.com/..."
              />
            </div>

            {manualMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                manualMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {manualMessage.text}
              </div>
            )}

            <Button type="submit" disabled={manualSubmitting}>
              {manualSubmitting ? 'Adding...' : 'Add Prospect'}
            </Button>
          </form>
        </Card>
      )}

      {/* ── TAB: Settings ───────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Daily Push Limit */}
          <Card>
            <h2 className="text-lg font-bold mb-2">Domain Warmup Controls</h2>
            <p className="text-sm text-pg-text-muted mb-4">
              Limit daily pushes to GHL for domain warmup. Start low and increase over 4-6 weeks.
            </p>
            <div className="max-w-md">
              <label className="block text-sm text-pg-text-muted mb-2">
                Daily push limit: <span className="text-pg-text font-bold">{dailyLimit}</span>
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={dailyLimit}
                onChange={(e) => saveDailyLimit(Number(e.target.value))}
                className="w-full accent-pg-accent"
              />
              <div className="flex justify-between text-xs text-pg-text-muted mt-1">
                <span>1 (warmup start)</span>
                <span>10 (steady)</span>
                <span>50 (full speed)</span>
              </div>
            </div>
          </Card>

          {/* Auto-Discovery Status */}
          <Card>
            <h2 className="text-lg font-bold mb-2">Auto-Discovery</h2>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                OFF
              </span>
              <span className="text-sm text-pg-text-muted">
                Cron-based auto-discovery is currently disabled. Use the Discovery tab to run manually.
              </span>
            </div>
            <p className="text-xs text-pg-text-muted">
              To enable scheduled discovery, add a cron entry to vercel.json for /api/marketing/discover.
            </p>
          </Card>

          {/* Safety Nets */}
          <Card>
            <h2 className="text-lg font-bold mb-4">Safety Nets</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-pg-accent">{stats.exclusions}</div>
                <div className="text-sm text-pg-text-muted">Exclusions (existing customers, brands, domains)</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{stats.suppressions}</div>
                <div className="text-sm text-pg-text-muted">Suppressions (bounced, unsubscribed, complained)</div>
              </div>
            </div>
          </Card>

          {/* Conversion Funnel */}
          <Card>
            <h2 className="text-lg font-bold mb-4">Conversion Funnel</h2>
            <div className="space-y-3">
              {FUNNEL_STAGES.map((stage) => {
                const count = (stats as Record<string, number>)[stage] || 0;
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                const meta = STATUS_LABELS[stage];
                return (
                  <div key={stage} className="flex items-center gap-2 sm:gap-4">
                    <div className="w-20 sm:w-32 text-xs sm:text-sm text-pg-text-muted shrink-0">{meta?.label ?? stage}</div>
                    <div className="flex-1 bg-pg-surface-light rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-pg-accent rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      >
                        {pct >= 8 && (
                          <span className="text-xs font-bold text-pg-bg">{count}</span>
                        )}
                      </div>
                    </div>
                    <div className="w-16 text-right text-sm font-mono">
                      {pct.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
