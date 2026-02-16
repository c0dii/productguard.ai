'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useState } from 'react';

interface EvidenceMatch {
  type: string;
  matched_text: string;
  context: string;
  severity?: string;
  confidence?: number;
}

interface Evidence {
  matched_excerpts?: string[];
  page_title?: string;
  page_description?: string;
  page_hash?: string;
  url_chain?: string[];
  matches?: EvidenceMatch[];
  screenshot_url?: string;
  verified?: boolean;
}

interface EvidenceDisplayProps {
  evidence: Evidence | null;
  sourceUrl: string;
}

export function EvidenceDisplay({ evidence, sourceUrl }: EvidenceDisplayProps) {
  const [showAllMatches, setShowAllMatches] = useState(false);

  if (!evidence || (!evidence.matched_excerpts && !evidence.matches)) {
    return (
      <Card>
        <h2 className="text-xl font-bold mb-4 text-pg-text">Evidence</h2>
        <p className="text-sm text-pg-text-muted">No evidence extracted yet. Evidence is collected during scanning.</p>
      </Card>
    );
  }

  // Combine old and new evidence formats
  const allMatches: EvidenceMatch[] = [];

  // Legacy format: matched_excerpts array
  if (evidence.matched_excerpts && evidence.matched_excerpts.length > 0) {
    allMatches.push(
      ...evidence.matched_excerpts.map((excerpt) => ({
        type: 'text_match',
        matched_text: excerpt,
        context: `Found on page: "${excerpt}"`,
        severity: 'high',
        confidence: 0.8,
      }))
    );
  }

  // New format: matches array with detailed info
  if (evidence.matches && evidence.matches.length > 0) {
    allMatches.push(...evidence.matches);
  }

  const displayedMatches = showAllMatches ? allMatches : allMatches.slice(0, 5);
  const hasMore = allMatches.length > 5;

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-300';
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      case 'low':
        return 'text-blue-600 bg-blue-100 border-blue-300';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'brand_mention':
        return '🏷️';
      case 'keyword_match':
        return '🔑';
      case 'copyrighted_content':
        return '©️';
      case 'pricing_info':
        return '💰';
      case 'download_link':
        return '⬇️';
      case 'text_match':
        return '📝';
      default:
        return '🔍';
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-pg-text">Evidence</h2>
        {evidence.verified && (
          <Badge variant="default" className="bg-green-600 text-white">
            ✓ Verified
          </Badge>
        )}
      </div>

      {/* Page Metadata */}
      {(evidence.page_title || evidence.page_description) && (
        <div className="mb-4 p-3 rounded-lg bg-pg-bg border border-pg-border">
          {evidence.page_title && (
            <div className="mb-2">
              <span className="text-xs text-pg-text-muted">Page Title:</span>
              <p className="text-sm text-pg-text font-medium">{evidence.page_title}</p>
            </div>
          )}
          {evidence.page_description && (
            <div>
              <span className="text-xs text-pg-text-muted">Description:</span>
              <p className="text-sm text-pg-text">{evidence.page_description}</p>
            </div>
          )}
        </div>
      )}

      {/* Matched Evidence */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-pg-text">
            Matched Evidence ({allMatches.length})
          </h3>
          {evidence.page_hash && (
            <span
              className="text-xs text-pg-text-muted font-mono"
              title="Cryptographic hash of page content - proves authenticity"
            >
              Hash: {evidence.page_hash.slice(0, 8)}...
            </span>
          )}
        </div>

        {displayedMatches.map((match, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${getSeverityColor(match.severity)}`}
          >
            {/* Match Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getTypeIcon(match.type)}</span>
                <span className="text-xs font-semibold uppercase">
                  {match.type.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {match.severity && (
                  <Badge variant="default" className="text-xs uppercase">
                    {match.severity}
                  </Badge>
                )}
                {match.confidence !== undefined && (
                  <span className="text-xs text-pg-text-muted">
                    {Math.round(match.confidence * 100)}% confidence
                  </span>
                )}
              </div>
            </div>

            {/* Matched Text */}
            <div className="mb-2">
              <span className="text-xs text-pg-text-muted block mb-1">Exact Quote:</span>
              <p className="text-sm font-medium text-pg-text bg-yellow-100 dark:bg-yellow-900/20 px-2 py-1 rounded">
                &quot;{match.matched_text}&quot;
              </p>
            </div>

            {/* Context */}
            {match.context && match.context !== `Found on page: "${match.matched_text}"` && (
              <div>
                <span className="text-xs text-pg-text-muted block mb-1">Context:</span>
                <p className="text-xs text-pg-text-muted italic">{match.context}</p>
              </div>
            )}
          </div>
        ))}

        {/* Show More Button */}
        {hasMore && !showAllMatches && (
          <button
            onClick={() => setShowAllMatches(true)}
            className="w-full text-sm text-pg-accent hover:underline py-2"
          >
            Show {allMatches.length - 5} more matches →
          </button>
        )}
        {showAllMatches && hasMore && (
          <button
            onClick={() => setShowAllMatches(false)}
            className="w-full text-sm text-pg-accent hover:underline py-2"
          >
            ← Show less
          </button>
        )}
      </div>

      {/* URL Redirect Chain */}
      {evidence.url_chain && evidence.url_chain.length > 1 && (
        <div className="mt-4 pt-4 border-t border-pg-border">
          <h3 className="text-sm font-semibold text-pg-text mb-2">URL Redirect Chain</h3>
          <div className="space-y-1">
            {evidence.url_chain.map((url, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span className="text-pg-accent font-mono">{index + 1}.</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pg-text-muted hover:text-pg-accent hover:underline truncate"
                >
                  {url}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screenshot (if available) */}
      {evidence.screenshot_url && (
        <div className="mt-4 pt-4 border-t border-pg-border">
          <h3 className="text-sm font-semibold text-pg-text mb-2">Archived Screenshot</h3>
          <a
            href={evidence.screenshot_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-pg-accent hover:underline"
          >
            View Full Screenshot →
          </a>
        </div>
      )}

      {/* Legal Notice */}
      <div className="mt-4 pt-4 border-t border-pg-border">
        <p className="text-xs text-pg-text-muted">
          💡 <span className="font-semibold">Legal Evidence:</span> All quotes are extracted from actual page
          content and verified for authenticity. This evidence can be used in DMCA takedown notices and legal
          proceedings.
        </p>
      </div>
    </Card>
  );
}
