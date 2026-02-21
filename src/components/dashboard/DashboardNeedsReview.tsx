'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

interface PendingInfringement {
  id: string;
  source_url: string;
  severity_score: number;
  risk_level: string;
  platform: string;
  products?: { name: string } | null;
}

interface DashboardNeedsReviewProps {
  infringements: PendingInfringement[];
  totalPending: number;
}

export function DashboardNeedsReview({ infringements, totalPending }: DashboardNeedsReviewProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleAction = async (infringementId: string, action: 'verify' | 'reject') => {
    setProcessingId(infringementId);
    try {
      const response = await fetch(`/api/infringements/${infringementId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        setDismissed((prev) => new Set(prev).add(infringementId));
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Couldn't complete that action: ${error.error}`);
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const visible = infringements.filter((inf) => !dismissed.has(inf.id));

  if (visible.length === 0) return null;

  return (
    <div className="mb-6 p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-yellow-500/5 border border-yellow-500/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-lg sm:text-xl">⚠️</span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-pg-text">Needs Your Attention</h2>
            <p className="text-xs text-pg-text-muted">
              {totalPending} infringement{totalPending !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/infringements"
          className="text-xs sm:text-sm text-pg-accent hover:underline shrink-0"
        >
          Review all →
        </Link>
      </div>

      <div className="space-y-2">
        {visible.map((inf) => (
          <div
            key={inf.id}
            className="p-3 rounded-lg bg-pg-surface border border-pg-border hover:border-pg-accent/30 transition-all"
          >
            <div className="flex items-start gap-2 sm:gap-3">
              {/* Risk indicator */}
              <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                inf.risk_level === 'critical' ? 'bg-red-500' :
                inf.risk_level === 'high' ? 'bg-orange-500' :
                inf.risk_level === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
              }`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-medium text-pg-text-muted">
                    {inf.products?.name || 'Unknown'}
                  </span>
                  <Badge variant={inf.risk_level as any} className="capitalize text-[10px] px-1.5 py-0">
                    {inf.risk_level}
                  </Badge>
                  <span className="text-[10px] text-pg-text-muted hidden sm:inline">{inf.severity_score}/100</span>
                </div>
                <a
                  href={inf.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm text-pg-accent hover:underline truncate block"
                  onClick={(e) => e.stopPropagation()}
                >
                  {inf.source_url}
                </a>
              </div>
            </div>

            {/* Quick actions - wrap to new line on mobile */}
            <div className="flex gap-1.5 mt-2 ml-4 sm:ml-5">
              <button
                onClick={() => handleAction(inf.id, 'verify')}
                disabled={processingId === inf.id}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-pg-accent text-white hover:bg-pg-accent/80 disabled:opacity-50 transition-all"
              >
                {processingId === inf.id ? '...' : 'Confirm'}
              </button>
              <button
                onClick={() => handleAction(inf.id, 'reject')}
                disabled={processingId === inf.id}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-pg-surface text-pg-text-muted border border-pg-border hover:text-pg-danger hover:border-pg-danger/50 disabled:opacity-50 transition-all"
              >
                {processingId === inf.id ? '...' : 'Dismiss'}
              </button>
              <Link
                href={`/dashboard/infringements/${inf.id}`}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-pg-surface text-pg-text-muted border border-pg-border hover:text-pg-text hover:border-pg-accent/50 transition-all"
              >
                Details
              </Link>
            </div>
          </div>
        ))}
      </div>

      {totalPending > 5 && (
        <div className="mt-3 text-center">
          <Link
            href="/dashboard/infringements"
            className="text-sm text-pg-accent hover:underline font-medium"
          >
            +{totalPending - 5} more awaiting review
          </Link>
        </div>
      )}
    </div>
  );
}
