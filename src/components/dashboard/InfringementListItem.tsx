'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { getPlatformDisplayName } from '@/lib/utils/platform-display';

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
  const [isExpanded, setIsExpanded] = useState(false);
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
        className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Left: Platform */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Badge variant="default" className="text-[10px] sm:text-xs shrink-0">
            {getPlatformDisplayName(infringement.source_url)}
          </Badge>
        </div>

        {/* Center: URL & Severity */}
        <div className="flex-1 min-w-0">
          {showProductName && infringement.products?.name && (
            <div className="text-[10px] sm:text-xs text-pg-text-muted mb-0.5 sm:mb-1 truncate">
              <span className="font-semibold text-pg-text">{infringement.products.name}</span>
            </div>
          )}
          <div>
            <a
              href={infringement.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pg-accent hover:underline font-medium text-xs sm:text-sm truncate inline-block max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {truncateUrl(infringement.source_url, 45)}
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-pg-text-muted mt-0.5 sm:mt-1">
            {infringement.severity_score !== undefined && (
              <span>
                <span className="font-semibold">{infringement.severity_score}</span><span className="hidden sm:inline">/100</span>
              </span>
            )}
            {infringement.match_confidence !== undefined && (
              <span className="hidden sm:inline">
                Confidence: <span className="font-semibold">{Math.round(infringement.match_confidence * 100)}%</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            href={scanId ? `/dashboard/scans/${scanId}/infringements/${infringement.id}` : `/dashboard/infringements/${infringement.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="sm" variant="secondary" className="text-[10px] sm:text-xs px-2 sm:px-3">
              <span className="hidden sm:inline">View Details</span>
              <span className="sm:hidden">View</span>
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
        <div className="border-t border-pg-border bg-pg-bg p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 text-sm mb-4">
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
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(infringement.source_url, '_blank')}
              className="text-xs"
            >
              🔗 Visit Site
            </Button>
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
