'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface InfringementListItemProps {
  infringement: any;
  scanId?: string;
  isResolved?: boolean;
  productPrice?: number;
  showProductName?: boolean;
}

export function InfringementListItem({
  infringement,
  scanId,
  isResolved = false,
  productPrice,
  showProductName = false,
}: InfringementListItemProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Priority badge colors
  const priorityColors = {
    P0: 'bg-pg-danger bg-opacity-20 text-pg-danger border-pg-danger',
    P1: 'bg-pg-warning bg-opacity-20 text-pg-warning border-pg-warning',
    P2: 'bg-blue-500 bg-opacity-20 text-blue-400 border-blue-400',
  };

  const handleNotAThreat = async () => {
    if (!confirm('Mark this as not a threat? This will remove it from active infringements.')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/infringements/${infringement.id}/resolve`, {
        method: 'PUT',
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Failed to mark as not a threat');
      }
    } catch (error) {
      console.error('Error marking as not a threat:', error);
      alert('Error marking as not a threat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReopen = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/infringements/${infringement.id}/reopen`, {
        method: 'PUT',
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Failed to reopen infringement');
      }
    } catch (error) {
      console.error('Error reopening:', error);
      alert('Error reopening infringement');
    } finally {
      setIsLoading(false);
    }
  };

  // Truncate URL for display
  const truncateUrl = (url: string, maxLength: number = 60) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <div
      className={`border border-pg-border rounded-lg overflow-hidden transition-all ${
        isResolved ? 'opacity-60 bg-pg-surface' : 'bg-pg-surface hover:border-pg-accent'
      }`}
    >
      {/* Compact Row - Always Visible */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Left: Priority & Platform */}
        <div className="flex items-center gap-2 min-w-[140px]">
          {infringement.priority && (
            <Badge
              variant="default"
              className={`shrink-0 border text-xs ${priorityColors[infringement.priority as keyof typeof priorityColors]}`}
            >
              {infringement.priority}
            </Badge>
          )}
          <Badge variant="default" className="capitalize text-xs shrink-0">
            {infringement.platform}
          </Badge>
        </div>

        {/* Center: URL & Severity */}
        <div className="flex-1 min-w-0">
          {showProductName && infringement.products?.name && (
            <div className="text-xs text-pg-text-muted mb-1">
              Product: <span className="font-semibold text-pg-text">{infringement.products.name}</span>
            </div>
          )}
          <a
            href={infringement.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pg-accent hover:underline font-medium text-sm truncate block"
            onClick={(e) => e.stopPropagation()}
          >
            {truncateUrl(infringement.source_url, 70)}
          </a>
          <div className="flex items-center gap-4 text-xs text-pg-text-muted mt-1">
            {infringement.severity_score !== undefined && (
              <span>
                Severity: <span className="font-semibold">{infringement.severity_score}/100</span>
              </span>
            )}
            {infringement.match_confidence !== undefined && (
              <span>
                Confidence: <span className="font-semibold">{Math.round(infringement.match_confidence * 100)}%</span>
              </span>
            )}
            <span>
              Loss: <span className="font-semibold text-pg-danger">${(infringement.est_revenue_loss || 0).toLocaleString()}</span>
            </span>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={scanId ? `/dashboard/scans/${scanId}/infringements/${infringement.id}` : `/dashboard/infringements/${infringement.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="sm" variant="secondary" className="text-xs">
              View Details
            </Button>
          </Link>
          <button
            className="text-pg-text-muted hover:text-pg-accent transition-colors p-1"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Expanded Details - Shown on Click */}
      {isExpanded && (
        <div className="border-t border-pg-border bg-pg-bg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <p className="text-pg-text-muted text-xs">Risk Level</p>
              <Badge variant={infringement.risk_level} className="capitalize mt-1">
                {infringement.risk_level}
              </Badge>
            </div>
            <div>
              <p className="text-pg-text-muted text-xs">Type</p>
              <p className="font-semibold capitalize mt-1">{infringement.type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-pg-text-muted text-xs">Audience</p>
              <p className="font-semibold mt-1">
                {infringement.audience_count > 0
                  ? infringement.audience_count.toLocaleString()
                  : infringement.audience_size || 'Unknown'}
              </p>
            </div>
            {infringement.monetization_detected && (
              <div>
                <p className="text-pg-text-muted text-xs">Monetization</p>
                <Badge variant="default" className="bg-pg-danger bg-opacity-20 text-pg-danger mt-1">
                  💰 Detected
                </Badge>
              </div>
            )}
          </div>

          {/* Match Quality & Evidence */}
          {(infringement.match_confidence !== undefined || infringement.evidence) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm p-3 rounded-lg bg-pg-surface border border-pg-border">
              {infringement.match_type && (
                <div>
                  <p className="text-pg-text-muted text-xs">Match Type</p>
                  <p className="font-semibold capitalize">{infringement.match_type.replace('_', ' ')}</p>
                </div>
              )}
              {infringement.evidence && (
                <div>
                  <p className="text-pg-text-muted text-xs">Evidence Collected</p>
                  <p className="font-semibold">
                    {infringement.evidence.screenshots?.length || 0} 📸 • {infringement.evidence.matched_excerpts?.length || 0} 📝
                  </p>
                </div>
              )}
              {infringement.next_check_at && (
                <div>
                  <p className="text-pg-text-muted text-xs">Next Check</p>
                  <p className="font-semibold">{new Date(infringement.next_check_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(infringement.source_url, '_blank')}
              className="text-xs"
            >
              🔗 Visit Site
            </Button>
            {!isResolved ? (
              <>
                <Link href={`/dashboard/takedowns?infringement_id=${infringement.id}`}>
                  <Button size="sm" className="text-xs">
                    ⚡ Send DMCA
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReopen}
                  disabled={isLoading}
                  className="text-xs"
                >
                  ↻ Reactivate
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleReopen}
                disabled={isLoading}
                className="text-xs"
              >
                ↻ Reopen
              </Button>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-4 pt-3 border-t border-pg-border text-xs text-pg-text-muted">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>Found: {new Date(infringement.created_at).toLocaleDateString()}</span>
              <span>Status: <span className="capitalize">{infringement.status}</span></span>
              {infringement.infrastructure?.hosting_provider && (
                <span>Host: {infringement.infrastructure.hosting_provider}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
