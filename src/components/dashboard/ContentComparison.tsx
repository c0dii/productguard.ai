'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useState } from 'react';

interface ContentMatch {
  type: 'exact_phrase' | 'brand_match' | 'keyword_match' | 'copyrighted_term';
  original: string;
  infringing: string;
  context?: string;
}

interface ExternalLink {
  label: string;
  url: string;
  icon: string;
  description: string;
}

interface ContentComparisonProps {
  productName: string;
  matches: ContentMatch[];
  keywordOverlap?: {
    matched: string[];
    total: number;
  };
  externalLinks?: ExternalLink[];
  contentHash?: string;
  capturedAt?: string;
}

export function ContentComparison({
  productName,
  matches,
  keywordOverlap,
  externalLinks,
  contentHash,
  capturedAt,
}: ContentComparisonProps) {
  const [showAll, setShowAll] = useState(false);

  const displayMatches = showAll ? matches : matches.slice(0, 5);

  const getMatchConfig = (type: ContentMatch['type']) => {
    switch (type) {
      case 'exact_phrase':
        return {
          label: 'Exact Phrase Match',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-300 dark:border-red-700',
          badge: 'bg-red-600 text-white',
          icon: '📝',
        };
      case 'brand_match':
        return {
          label: 'Brand / Trademark Match',
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-300 dark:border-orange-700',
          badge: 'bg-orange-600 text-white',
          icon: '🏷️',
        };
      case 'copyrighted_term':
        return {
          label: 'Copyrighted Content',
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          border: 'border-purple-300 dark:border-purple-700',
          badge: 'bg-purple-600 text-white',
          icon: '©️',
        };
      case 'keyword_match':
        return {
          label: 'Keyword Match',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-300 dark:border-yellow-700',
          badge: 'bg-yellow-600 text-white',
          icon: '🔑',
        };
    }
  };

  if (matches.length === 0 && !keywordOverlap?.matched.length) {
    return null;
  }

  const overlapPercent = keywordOverlap
    ? Math.round((keywordOverlap.matched.length / keywordOverlap.total) * 100)
    : 0;

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-pg-text">Content Analysis</h2>
            <p className="text-xs text-pg-text-muted">
              Your original content vs. infringing page
            </p>
          </div>
        </div>
        {matches.length > 0 && (
          <Badge variant="critical" className="text-sm">
            {matches.length} Match{matches.length !== 1 ? 'es' : ''}
          </Badge>
        )}
      </div>

      {/* Summary Bar */}
      {(matches.length > 0 || overlapPercent > 0) && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-800 dark:text-red-300 font-medium">
              {matches.length} piece{matches.length !== 1 ? 's' : ''} of your original content
              {matches.length !== 1 ? ' were' : ' was'} found reproduced on this infringing page
              {keywordOverlap && keywordOverlap.matched.length > 0 && (
                <>, plus {keywordOverlap.matched.length} of {keywordOverlap.total} product keywords detected</>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Content Comparisons */}
      {displayMatches.length > 0 && (
        <div className="space-y-4 mb-5">
          {displayMatches.map((match, index) => {
            const config = getMatchConfig(match.type);
            return (
              <div
                key={index}
                className={`rounded-lg border ${config.border} overflow-hidden`}
              >
                {/* Match Type Header */}
                <div className={`px-4 py-2 ${config.bg} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                      {config.label}
                    </span>
                  </div>
                  <Badge variant="default" className={config.badge}>
                    #{index + 1}
                  </Badge>
                </div>

                {/* Side-by-side comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-pg-border">
                  {/* Original */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">
                        Your Original Content
                      </span>
                    </div>
                    <p className="text-sm text-pg-text bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 rounded px-3 py-2 font-medium">
                      &ldquo;{match.original}&rdquo;
                    </p>
                    <p className="text-xs text-pg-text-muted mt-1.5 italic">
                      Source: {productName} product page
                    </p>
                  </div>

                  {/* Infringing */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                        Found on Infringing Page
                      </span>
                    </div>
                    <p className="text-sm text-pg-text bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800 rounded px-3 py-2 font-medium">
                      &ldquo;{match.infringing}&rdquo;
                    </p>
                    {match.context && (
                      <p className="text-xs text-pg-text-muted mt-1.5 italic">
                        {match.context}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Show More */}
          {matches.length > 5 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-sm text-pg-accent hover:underline py-2 font-medium"
            >
              Show {matches.length - 5} more matches
            </button>
          )}
          {showAll && matches.length > 5 && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full text-sm text-pg-accent hover:underline py-2 font-medium"
            >
              Show less
            </button>
          )}
        </div>
      )}

      {/* Keyword Overlap Section */}
      {keywordOverlap && keywordOverlap.matched.length > 0 && (
        <div className="mb-5 p-4 rounded-lg bg-pg-bg border border-pg-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-pg-text">Keyword Detection</h3>
            <span className="text-sm font-bold text-pg-accent">
              {keywordOverlap.matched.length}/{keywordOverlap.total} keywords found
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overlapPercent >= 60
                  ? 'bg-red-500'
                  : overlapPercent >= 30
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${overlapPercent}%` }}
            />
          </div>

          {/* Matched Keywords */}
          <div className="flex flex-wrap gap-1.5">
            {keywordOverlap.matched.map((keyword, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-medium"
              >
                {keyword}
              </span>
            ))}
          </div>

          <p className="text-xs text-pg-text-muted mt-2">
            {overlapPercent}% of your product&apos;s keywords were detected on the infringing page,
            indicating this content is derived from your original work.
          </p>
        </div>
      )}

      {/* External Verification Links */}
      {externalLinks && externalLinks.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-pg-text mb-3">Independent Verification</h3>
          <div className="space-y-2">
            {externalLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-pg-bg border border-pg-border hover:border-pg-accent hover:bg-pg-surface-light transition-all group"
              >
                <span className="text-xl">{link.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-pg-text group-hover:text-pg-accent transition-colors">
                    {link.label}
                  </span>
                  <p className="text-xs text-pg-text-muted">{link.description}</p>
                </div>
                <svg className="w-4 h-4 text-pg-text-muted group-hover:text-pg-accent transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Fingerprint */}
      {contentHash && (
        <div className="p-3 rounded-lg bg-pg-bg border border-pg-border mb-4">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-pg-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs font-bold text-pg-text uppercase tracking-wide">
              Evidence Fingerprint (SHA-256)
            </span>
          </div>
          <code className="text-xs text-pg-text-muted font-mono break-all block mt-1">
            {contentHash}
          </code>
          {capturedAt && (
            <p className="text-xs text-pg-text-muted mt-1.5">
              Captured: {new Date(capturedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </div>
      )}

      {/* Legal Footer */}
      <div className="pt-3 border-t border-pg-border">
        <p className="text-xs text-pg-text-muted">
          <span className="font-semibold">Legal Strength:</span> Each content match above demonstrates
          that copyrighted material from &ldquo;{productName}&rdquo; has been reproduced without authorization.
          This evidence is cryptographically sealed, independently verifiable, and suitable for DMCA
          takedown notices and legal proceedings.
        </p>
      </div>
    </Card>
  );
}
