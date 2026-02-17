'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useState, useEffect, useCallback } from 'react';

interface EvidenceItem {
  id: string;
  type: 'exact_phrase' | 'brand_match' | 'keyword_match' | 'copyrighted_term';
  original: string;
  infringing: string;
  context?: string;
  legalSignificance?: 'critical' | 'strong' | 'supporting';
  explanation?: string;
  dmcaLanguage?: string;
  confidence?: number;
}

interface ExternalLink {
  label: string;
  url: string;
  icon: string;
  description: string;
}

interface EvidenceDisplayProps {
  infringementId: string;
  productName: string;
  items: EvidenceItem[];
  keywordOverlap?: {
    matched: string[];
    total: number;
  };
  aiSummary?: string;
  strengthScore?: number;
  dmcaReady?: boolean;
  externalLinks?: ExternalLink[];
  contentHash?: string;
  capturedAt?: string;
  pageTitle?: string;
  pageDescription?: string;
}

// Session storage key for evidence selections
const EVIDENCE_STORAGE_KEY = 'pg_selected_evidence';

function getStoredSelections(infringementId: string): Set<string> | null {
  try {
    const stored = sessionStorage.getItem(`${EVIDENCE_STORAGE_KEY}_${infringementId}`);
    if (stored) return new Set(JSON.parse(stored));
  } catch {
    // Ignore
  }
  return null;
}

function storeSelections(infringementId: string, selected: Set<string>, allItems: EvidenceItem[]) {
  try {
    sessionStorage.setItem(
      `${EVIDENCE_STORAGE_KEY}_${infringementId}`,
      JSON.stringify([...selected]),
    );
    // Also store the selected items as comparison data for DMCA generation
    const selectedItems = allItems
      .filter((item) => selected.has(item.id))
      .map((item) => ({
        original: item.original,
        infringing: item.infringing,
        type: item.type,
        dmcaLanguage: item.dmcaLanguage,
      }));
    sessionStorage.setItem(
      `${EVIDENCE_STORAGE_KEY}_items_${infringementId}`,
      JSON.stringify(selectedItems),
    );
  } catch {
    // Ignore
  }
}

export function EvidenceDisplay({
  infringementId,
  productName,
  items,
  keywordOverlap,
  aiSummary,
  strengthScore,
  dmcaReady,
  externalLinks,
  contentHash,
  capturedAt,
  pageTitle,
  pageDescription,
}: EvidenceDisplayProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Default: all items selected
    return new Set(items.map((item) => item.id));
  });

  // Restore selections from sessionStorage on mount, or store initial selections
  useEffect(() => {
    const stored = getStoredSelections(infringementId);
    if (stored) {
      // Only keep IDs that actually exist in current items
      const valid = new Set([...stored].filter((id) => items.some((item) => item.id === id)));
      if (valid.size > 0) {
        setSelectedIds(valid);
        storeSelections(infringementId, valid, items);
      }
    } else if (items.length > 0) {
      // Store initial "all selected" state so DMCA generation has data
      const allIds = new Set(items.map((item) => item.id));
      storeSelections(infringementId, allIds, items);
    }
  }, [infringementId, items]);

  // Persist selections to sessionStorage
  const updateSelections = useCallback(
    (newSelected: Set<string>) => {
      setSelectedIds(newSelected);
      storeSelections(infringementId, newSelected, items);
    },
    [infringementId, items],
  );

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    updateSelections(next);
  };

  const selectAll = () => updateSelections(new Set(items.map((i) => i.id)));
  const deselectAll = () => updateSelections(new Set());

  if (items.length === 0 && !keywordOverlap?.matched?.length) {
    return (
      <Card>
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-pg-text">Evidence</h2>
        <p className="text-sm text-pg-text-muted">
          No evidence matches found yet. Evidence is collected during scanning and enriched during verification.
        </p>
      </Card>
    );
  }

  const displayItems = showAll ? items : items.slice(0, 5);
  const selectedCount = [...selectedIds].filter((id) => items.some((i) => i.id === id)).length;
  const overlapPercent = keywordOverlap
    ? Math.round((keywordOverlap.matched.length / keywordOverlap.total) * 100)
    : 0;

  return (
    <Card>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-pg-text">Evidence Analysis</h2>
            <p className="text-xs text-pg-text-muted">
              Content from the infringing page matching your product
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {strengthScore !== undefined && (
            <div className="text-left sm:text-right mr-2">
              <span className="text-xs text-pg-text-muted block">Strength</span>
              <span className={`text-base sm:text-lg font-bold ${
                strengthScore >= 70 ? 'text-green-400' :
                strengthScore >= 40 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {strengthScore}/100
              </span>
            </div>
          )}
          {dmcaReady && (
            <Badge variant="default" className="bg-pg-accent/20 text-pg-accent border border-pg-accent/30 text-xs">
              DMCA Ready
            </Badge>
          )}
          {items.length > 0 && (
            <Badge variant="critical" className="text-xs sm:text-sm">
              {items.length} Match{items.length !== 1 ? 'es' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div className="mb-4 p-3 rounded-lg bg-pg-bg border border-pg-border">
          <p className="text-sm text-pg-text">{aiSummary}</p>
        </div>
      )}

      {/* Summary Bar */}
      {items.length > 0 && (
        <div className="mb-5 p-3 rounded-lg bg-pg-bg border border-red-500/30">
          <div className="flex items-start sm:items-center gap-2 text-xs sm:text-sm">
            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-400 font-medium">
              {items.length} piece{items.length !== 1 ? 's' : ''} of evidence found on the infringing page
              {items.length !== 1 ? ' that match' : ' that matches'} your product &ldquo;{productName}&rdquo;
              {keywordOverlap && keywordOverlap.matched.length > 0 && (
                <>, plus {keywordOverlap.matched.length} of {keywordOverlap.total} product keywords detected</>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Page Metadata */}
      {(pageTitle || pageDescription) && (
        <div className="mb-4 p-3 rounded-lg bg-pg-bg border border-pg-border">
          {pageTitle && (
            <div className="mb-2">
              <span className="text-xs text-pg-text-muted">Infringing Page Title:</span>
              <p className="text-sm text-pg-text font-medium">{pageTitle}</p>
            </div>
          )}
          {pageDescription && (
            <div>
              <span className="text-xs text-pg-text-muted">Page Description:</span>
              <p className="text-sm text-pg-text">{pageDescription}</p>
            </div>
          )}
        </div>
      )}

      {/* DMCA Selection Controls */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-semibold text-pg-text">
              Evidence for DMCA Notice
            </h3>
            <span className="text-xs text-pg-text-muted">
              ({selectedCount}/{items.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-pg-accent hover:text-pg-accent/80 font-medium transition-colors"
            >
              Select All
            </button>
            <span className="text-pg-text-muted">|</span>
            <button
              onClick={deselectAll}
              className="text-xs text-pg-text-muted hover:text-pg-text font-medium transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Evidence Items */}
      {displayItems.length > 0 && (
        <div className="space-y-4 mb-5">
          {displayItems.map((item) => {
            const config = getMatchConfig(item.type);
            const isSelected = selectedIds.has(item.id);
            const sigStyle = item.legalSignificance ? getSignificanceStyle(item.legalSignificance) : null;

            return (
              <div
                key={item.id}
                className={`rounded-lg border overflow-hidden transition-all ${
                  isSelected ? config.border : 'border-pg-border opacity-50'
                }`}
              >
                {/* Match Type Header with Checkbox */}
                <div className={`px-3 sm:px-4 py-2 ${isSelected ? config.bg : 'bg-pg-bg'} flex items-center justify-between`}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-pg-accent border-pg-accent'
                          : 'border-pg-text-muted hover:border-pg-accent'
                      }`}
                      title={isSelected ? 'Deselect for DMCA' : 'Select for DMCA'}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-pg-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span>{config.icon}</span>
                    <span className="text-xs font-bold text-pg-text uppercase tracking-wide">
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sigStyle && (
                      <Badge variant="default" className={`text-xs uppercase border ${sigStyle.badge}`}>
                        {sigStyle.label}
                      </Badge>
                    )}
                    {item.confidence !== undefined && (
                      <span className="text-xs text-pg-text-muted">
                        {Math.round(item.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Side-by-side comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-pg-border">
                  {/* Original */}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs font-bold text-green-400 uppercase tracking-wide">
                        Your Original Content
                      </span>
                    </div>
                    <p className="text-sm text-pg-text bg-green-500/10 border border-green-500/20 rounded px-3 py-2 font-medium">
                      &ldquo;{item.original}&rdquo;
                    </p>
                    <p className="text-xs text-pg-text-muted mt-1.5 italic">
                      Source: {productName}
                    </p>
                  </div>

                  {/* Infringing */}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wide">
                        Found on Infringing Page
                      </span>
                    </div>
                    <p className="text-sm text-pg-text bg-red-500/10 border border-red-500/20 rounded px-3 py-2 font-medium">
                      &ldquo;{item.infringing}&rdquo;
                    </p>
                    {item.context && (
                      <p className="text-xs text-pg-text-muted mt-1.5 italic">
                        {item.context}
                      </p>
                    )}
                  </div>
                </div>

                {/* Explanation & DMCA Language (for AI-analyzed items) */}
                {(item.explanation || item.dmcaLanguage) && isSelected && (
                  <div className="px-4 pb-4 space-y-2">
                    {item.explanation && (
                      <div>
                        <span className="text-xs text-pg-text-muted font-medium">Why This Matters:</span>
                        <p className="text-xs text-pg-text mt-0.5">{item.explanation}</p>
                      </div>
                    )}
                    {item.dmcaLanguage && (
                      <div className="pt-2 border-t border-pg-border/50">
                        <span className="text-xs text-pg-text-muted font-medium">DMCA Notice Language:</span>
                        <p className="text-xs text-pg-text italic bg-pg-bg/50 px-2 py-1 rounded mt-0.5">
                          {item.dmcaLanguage}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Show More */}
          {items.length > 5 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-sm text-pg-accent hover:underline py-2 font-medium"
            >
              Show {items.length - 5} more matches
            </button>
          )}
          {showAll && items.length > 5 && (
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
          <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden mb-3">
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
                className="px-2 py-0.5 text-xs rounded bg-red-900/30 text-red-300 border border-red-800 font-medium"
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
          {selectedCount > 0 ? (
            <>
              <span className="font-semibold">{selectedCount} evidence item{selectedCount !== 1 ? 's' : ''} selected for DMCA.</span>{' '}
              Each selected item demonstrates that content from &ldquo;{productName}&rdquo; has been
              reproduced on the infringing page without authorization. Uncheck items you don&apos;t want
              included in the takedown notice.
            </>
          ) : (
            <>
              <span className="font-semibold">No evidence selected.</span>{' '}
              Check the items above that you want to include in your DMCA takedown notice.
            </>
          )}
        </p>
      </div>
    </Card>
  );
}

// ── Helper Functions ──────────────────────────────────────────────────

function getMatchConfig(type: EvidenceItem['type']) {
  switch (type) {
    case 'exact_phrase':
      return {
        label: 'Exact Phrase Match',
        bg: 'bg-red-900/20',
        border: 'border-red-700',
        badge: 'bg-red-600 text-white',
        icon: '©️',
      };
    case 'brand_match':
      return {
        label: 'Brand / Trademark Match',
        bg: 'bg-orange-900/20',
        border: 'border-orange-700',
        badge: 'bg-orange-600 text-white',
        icon: '🏷️',
      };
    case 'copyrighted_term':
      return {
        label: 'Copyrighted Content',
        bg: 'bg-purple-900/20',
        border: 'border-purple-700',
        badge: 'bg-purple-600 text-white',
        icon: '📝',
      };
    case 'keyword_match':
      return {
        label: 'Keyword Match',
        bg: 'bg-yellow-900/20',
        border: 'border-yellow-700',
        badge: 'bg-yellow-600 text-white',
        icon: '🔑',
      };
  }
}

function getSignificanceStyle(sig: string) {
  switch (sig) {
    case 'critical':
      return {
        badge: 'bg-red-500/20 text-red-400 border-red-500/30',
        label: 'Critical',
      };
    case 'strong':
      return {
        badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        label: 'Strong',
      };
    case 'supporting':
      return {
        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        label: 'Supporting',
      };
    default:
      return {
        badge: 'bg-pg-bg text-pg-text-muted border-pg-border',
        label: sig,
      };
  }
}
