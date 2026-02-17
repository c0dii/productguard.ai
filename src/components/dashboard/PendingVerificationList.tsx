'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';
import type { Infringement } from '@/types';
import { getPlatformDisplayName } from '@/lib/utils/platform-display';

type SortOption = 'severity' | 'newest' | 'traffic' | 'most_seen';
type PageSize = 10 | 20 | 50 | 100;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'severity', label: 'Biggest Threat' },
  { value: 'newest', label: 'Newest Discovered' },
  { value: 'traffic', label: 'Highest Traffic' },
  { value: 'most_seen', label: 'Most Detected' },
];

const PAGE_SIZES: PageSize[] = [10, 20, 50, 100];

interface PendingVerificationListProps {
  initialInfringements: Infringement[];
  initialTotal: number;
  productId: string;
}

export function PendingVerificationList({
  initialInfringements,
  initialTotal,
  productId,
}: PendingVerificationListProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [infringements, setInfringements] = useState<Infringement[]>(initialInfringements);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [sort, setSort] = useState<SortOption>('severity');
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(total / pageSize);

  const fetchInfringements = useCallback(async (p: number, ps: PageSize, s: SortOption) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/products/${productId}/pending?page=${p}&pageSize=${ps}&sort=${s}`
      );
      if (res.ok) {
        const data = await res.json();
        setInfringements(data.infringements);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch pending infringements:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Refetch when page, pageSize, or sort changes (skip initial load)
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      return;
    }
    fetchInfringements(page, pageSize, sort);
  }, [page, pageSize, sort, fetchInfringements, initialized]);

  const handleVerify = async (infringementId: string, action: 'verify' | 'reject') => {
    setProcessingId(infringementId);

    try {
      const response = await fetch(`/api/infringements/${infringementId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        // Remove from local list immediately for snappy UX
        setInfringements((prev) => prev.filter((inf) => inf.id !== infringementId));
        setTotal((prev) => prev - 1);

        // Refresh server data for chart updates
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Failed to ${action}: ${error.error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing infringement:`, error);
      alert(`Failed to ${action} infringement. Please try again.`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    setPage(1); // Reset to first page on sort change
  };

  const handlePageSizeChange = (newSize: PageSize) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page on size change
  };

  if (total === 0 && infringements.length === 0) {
    return null;
  }

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-xl font-bold text-pg-text">Potential Infringements ({total})</h2>
        <Badge variant="warning" className="text-xs uppercase font-bold">
          Action Required
        </Badge>
      </div>

      <p className="text-sm text-pg-text-muted mb-4">
        Review detected threats to your intellectual property. <span className="text-pg-accent font-semibold">Confirm</span> verified infringements or{' '}
        <span className="text-pg-text">dismiss false positives</span>.
      </p>

      {/* Controls: Sort + Page Size */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-pg-border">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-pg-text-muted font-medium">Sort:</span>
          <div className="flex gap-1 flex-wrap">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSortChange(opt.value)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  sort === opt.value
                    ? 'bg-pg-accent text-white'
                    : 'bg-pg-bg text-pg-text-muted hover:text-pg-text border border-pg-border hover:border-pg-accent/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Page Size */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-pg-text-muted font-medium">Show:</span>
          <div className="flex gap-1">
            {PAGE_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => handlePageSizeChange(size)}
                className={`px-2 py-1 text-xs rounded-md font-medium transition-all ${
                  pageSize === size
                    ? 'bg-pg-accent text-white'
                    : 'bg-pg-bg text-pg-text-muted hover:text-pg-text border border-pg-border hover:border-pg-accent/50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className={`space-y-3 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {infringements.map((infringement) => (
          <div
            key={infringement.id}
            onClick={() => router.push(`/dashboard/infringements/${infringement.id}`)}
            className="p-3 sm:p-4 rounded-lg bg-pg-bg border border-pg-border hover:border-pg-accent/50 transition-all cursor-pointer"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
                  <Badge variant="default" className="text-xs">
                    {getPlatformDisplayName(infringement.source_url)}
                  </Badge>
                  <Badge variant={infringement.risk_level as any} className="capitalize text-xs">
                    {infringement.risk_level}
                  </Badge>
                </div>

                {/* URL — only the link text is clickable, not the full row */}
                <div className="mb-2">
                  <a
                    href={infringement.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pg-accent hover:underline font-medium text-sm truncate inline-block max-w-full"
                    title={infringement.source_url}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {infringement.source_url}
                  </a>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-pg-text-muted flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="opacity-70">Severity:</span>
                    <span className="font-semibold text-pg-text">{infringement.severity_score}/100</span>
                  </span>
                  {infringement.audience_size && (
                    <span className="flex items-center gap-1">
                      <span className="opacity-70">Audience:</span>
                      <span className="font-semibold text-pg-text">{infringement.audience_size}</span>
                    </span>
                  )}
                  {infringement.first_seen_at && (
                    <span className="flex items-center gap-1">
                      <span className="opacity-70">Found:</span>
                      <span className="font-semibold text-pg-text">
                        {new Date(infringement.first_seen_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </span>
                  )}
                  {infringement.infrastructure?.country && (
                    <span className="flex items-center gap-1">
                      <span className="opacity-70">Country:</span>
                      <span className="font-semibold text-pg-text">{infringement.infrastructure.country}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVerify(infringement.id, 'verify');
                  }}
                  disabled={processingId === infringement.id}
                  className="text-xs px-3 py-2 flex-1 sm:flex-none"
                >
                  {processingId === infringement.id ? '...' : 'Confirm'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVerify(infringement.id, 'reject');
                  }}
                  disabled={processingId === infringement.id}
                  className="text-xs px-3 py-2 hover:bg-pg-danger/10 hover:text-pg-danger flex-1 sm:flex-none"
                >
                  {processingId === infringement.id ? '...' : 'Dismiss'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/infringements/${infringement.id}`);
                  }}
                  className="text-xs px-3 py-2 flex-1 sm:flex-none"
                >
                  <span className="sm:hidden">View</span>
                  <span className="hidden sm:inline">View Details</span>
                </Button>
              </div>
            </div>
          </div>
        ))}

        {infringements.length === 0 && !loading && (
          <div className="text-center py-8 text-pg-text-muted text-sm">
            No pending infringements on this page.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-pg-border">
          <p className="text-xs text-pg-text-muted">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-pg-bg text-pg-text-muted border border-pg-border hover:border-pg-accent/50 hover:text-pg-text disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              // Show pages around current page
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  disabled={loading}
                  className={`w-7 h-7 text-xs rounded-md font-medium transition-all ${
                    page === pageNum
                      ? 'bg-pg-accent text-white'
                      : 'bg-pg-bg text-pg-text-muted border border-pg-border hover:border-pg-accent/50 hover:text-pg-text'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-pg-bg text-pg-text-muted border border-pg-border hover:border-pg-accent/50 hover:text-pg-text disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
