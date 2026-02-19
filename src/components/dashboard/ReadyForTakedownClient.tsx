'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BulkDMCAReviewModal } from '@/components/dmca/BulkDMCAReviewModal';
import type { Infringement } from '@/types';

interface ReadyForTakedownClientProps {
  infringements: (Infringement & { products?: { name: string; type: string; price: number } })[];
  products: { id: string; name: string }[];
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    dmca_reply_email: string | null;
  } | null;
  userId: string;
}

type SortOption = 'severity' | 'newest' | 'platform' | 'product';

export function ReadyForTakedownClient({
  infringements,
  products,
  profile,
  userId,
}: ReadyForTakedownClientProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('severity');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Get unique platforms
  const platforms = useMemo(() => {
    const set = new Set(infringements.map((i) => i.platform).filter(Boolean));
    return Array.from(set).sort();
  }, [infringements]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = [...infringements];

    if (filterProduct !== 'all') {
      result = result.filter((i) => i.product_id === filterProduct);
    }
    if (filterPlatform !== 'all') {
      result = result.filter((i) => i.platform === filterPlatform);
    }

    switch (sortBy) {
      case 'severity':
        result.sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime());
        break;
      case 'platform':
        result.sort((a, b) => (a.platform || '').localeCompare(b.platform || ''));
        break;
      case 'product':
        result.sort((a, b) => (a.products?.name || '').localeCompare(b.products?.name || ''));
        break;
    }

    return result;
  }, [infringements, filterProduct, filterPlatform, sortBy]);

  const allSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i) => i.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const truncateUrl = (url: string, maxLen = 60) => {
    if (url.length <= maxLen) return url;
    return url.slice(0, maxLen) + '...';
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-pg-text-muted bg-pg-surface-light border-pg-border';
    }
  };

  const handleBulkSubmitted = (batchId: string) => {
    setShowBulkModal(false);
    setSelectedIds(new Set());
    // Redirect to queue status
    window.location.href = `/dashboard/ready-for-takedown/queue?batch=${batchId}`;
  };

  if (infringements.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-pg-text mb-2">All caught up</p>
        <p className="text-sm text-pg-text-muted">
          No confirmed infringements pending takedown action. Infringements will appear here
          after you verify them from scan results.
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* Filters & Sort */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="text-xs bg-pg-surface border border-pg-border rounded-lg px-3 py-2 text-pg-text"
        >
          <option value="severity">Sort: Severity</option>
          <option value="newest">Sort: Newest</option>
          <option value="platform">Sort: Platform</option>
          <option value="product">Sort: Product</option>
        </select>

        {products.length > 1 && (
          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="text-xs bg-pg-surface border border-pg-border rounded-lg px-3 py-2 text-pg-text"
          >
            <option value="all">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {platforms.length > 1 && (
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="text-xs bg-pg-surface border border-pg-border rounded-lg px-3 py-2 text-pg-text"
          >
            <option value="all">All Platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}

        <span className="text-xs text-pg-text-muted ml-auto">
          {filtered.length} infringement{filtered.length !== 1 ? 's' : ''} ready
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-pg-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-pg-surface-light text-pg-text-muted text-xs">
              <th className="text-left px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-pg-border"
                />
              </th>
              <th className="text-left px-3 py-3 font-medium">URL</th>
              <th className="text-left px-3 py-3 font-medium hidden sm:table-cell">Platform</th>
              <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Product</th>
              <th className="text-center px-3 py-3 font-medium">Risk</th>
              <th className="text-center px-3 py-3 font-medium hidden sm:table-cell">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pg-border">
            {filtered.map((inf) => (
              <tr
                key={inf.id}
                className={`hover:bg-pg-surface-light/50 transition-colors ${
                  selectedIds.has(inf.id) ? 'bg-pg-accent/5' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(inf.id)}
                    onChange={() => toggleOne(inf.id)}
                    className="rounded border-pg-border"
                  />
                </td>
                <td className="px-3 py-3">
                  <a
                    href={inf.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pg-accent hover:underline text-xs font-mono"
                    title={inf.source_url}
                  >
                    {truncateUrl(inf.source_url)}
                  </a>
                </td>
                <td className="px-3 py-3 hidden sm:table-cell">
                  <span className="text-xs text-pg-text-muted capitalize">
                    {inf.platform || 'Unknown'}
                  </span>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <span className="text-xs text-pg-text-muted">
                    {inf.products?.name || '-'}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRiskColor(inf.risk_level)}`}>
                    {inf.risk_level?.toUpperCase() || 'N/A'}
                  </span>
                </td>
                <td className="px-3 py-3 text-center hidden sm:table-cell">
                  <span className="text-xs font-bold text-pg-text">
                    {inf.severity_score || 0}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating Action Bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-pg-surface border border-pg-accent/30 shadow-2xl shadow-pg-accent/20 backdrop-blur-xl">
            <span className="text-sm font-medium text-pg-text">
              {selectedIds.size} selected
            </span>
            <Button
              onClick={() => setShowBulkModal(true)}
              className="bg-pg-accent hover:bg-pg-accent/90 text-white font-semibold text-sm px-5 py-2"
            >
              Send DMCAs
            </Button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-pg-text-muted hover:text-pg-text"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Bulk DMCA Modal */}
      {showBulkModal && (
        <BulkDMCAReviewModal
          infringementIds={Array.from(selectedIds)}
          userId={userId}
          profile={profile}
          onClose={() => setShowBulkModal(false)}
          onSubmitted={handleBulkSubmitted}
        />
      )}
    </>
  );
}
