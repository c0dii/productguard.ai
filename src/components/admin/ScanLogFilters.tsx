'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { ScanLogEntry, ScanLogLevel, ScanLogStage } from '@/types';

interface ScanLogFiltersProps {
  logs: ScanLogEntry[];
  productMap: Record<string, string>;
  userMap: Record<string, string>;
}

const LEVEL_OPTIONS: { value: ScanLogLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'All Levels' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'fatal', label: 'Fatal' },
];

const STAGE_OPTIONS: { value: ScanLogStage | 'all'; label: string }[] = [
  { value: 'all', label: 'All Stages' },
  { value: 'initialization', label: 'Initialization' },
  { value: 'keyword_search', label: 'Keyword Search' },
  { value: 'trademark_search', label: 'Trademark Search' },
  { value: 'marketplace_scan', label: 'Marketplace Scan' },
  { value: 'platform_scan', label: 'Platform Scan' },
  { value: 'phrase_matching', label: 'Phrase Matching' },
  { value: 'finalization', label: 'Finalization' },
  { value: 'notification', label: 'Notification' },
  { value: 'cleanup', label: 'Cleanup' },
];

// Stage order for timeline display
const STAGE_ORDER: Record<string, number> = {
  initialization: 0,
  keyword_search: 1,
  trademark_search: 2,
  marketplace_scan: 3,
  platform_scan: 4,
  phrase_matching: 5,
  finalization: 6,
  notification: 7,
  cleanup: 8,
};

function getLevelColor(level: ScanLogLevel): string {
  switch (level) {
    case 'fatal': return 'bg-red-600 bg-opacity-20 text-red-400 border-red-600';
    case 'error': return 'bg-red-500 bg-opacity-10 text-red-400 border-red-500';
    case 'warn': return 'bg-yellow-500 bg-opacity-10 text-yellow-400 border-yellow-500';
    case 'info': return 'bg-blue-500 bg-opacity-10 text-blue-400 border-blue-500';
    default: return 'bg-gray-500 bg-opacity-10 text-gray-400 border-gray-500';
  }
}

function getVerdictFromLogs(logs: ScanLogEntry[]): { label: string; color: string } {
  const hasFatal = logs.some(l => l.log_level === 'fatal');
  const hasError = logs.some(l => l.log_level === 'error');
  const hasSelfHeal = logs.some(l => l.self_healed);

  if (hasFatal) return { label: 'FAILURE', color: 'bg-red-600 bg-opacity-20 text-red-400 border-red-600' };
  if (hasSelfHeal || hasError) return { label: 'PARTIAL', color: 'bg-yellow-500 bg-opacity-10 text-yellow-400 border-yellow-500' };
  return { label: 'SUCCESS', color: 'bg-emerald-500 bg-opacity-10 text-emerald-400 border-emerald-500' };
}

interface ScanGroup {
  scanId: string;
  logs: ScanLogEntry[];
  productName: string;
  userEmail: string;
  startedAt: string;
  endedAt: string;
  verdict: { label: string; color: string };
  errorCount: number;
  warnCount: number;
  selfHealCount: number;
  stages: string[];
  // Key metrics extracted from log messages
  resultsFound: number | null;
  apiCallsUsed: number | null;
  infringementsCreated: number | null;
}

function extractMetricFromLogs(logs: ScanLogEntry[]): Pick<ScanGroup, 'resultsFound' | 'apiCallsUsed' | 'infringementsCreated'> {
  let resultsFound: number | null = null;
  let apiCallsUsed: number | null = null;
  let infringementsCreated: number | null = null;

  for (const log of logs) {
    // "Found X raw results from tiered search"
    const rawMatch = log.message.match(/Found (\d+) raw results/);
    if (rawMatch?.[1]) resultsFound = parseInt(rawMatch[1], 10);

    // "SerpAPI budget: X/50 calls used"
    const apiMatch = log.message.match(/budget: (\d+)\/\d+ calls used/);
    if (apiMatch?.[1]) apiCallsUsed = parseInt(apiMatch[1], 10);

    // "Scan completed (Run #X): Y new infringements"
    const infMatch = log.message.match(/(\d+) new infringements/);
    if (infMatch?.[1]) infringementsCreated = parseInt(infMatch[1], 10);

    // Also check metrics JSONB
    if (log.metrics) {
      const m = log.metrics as Record<string, unknown>;
      if (typeof m.results_count === 'number' && resultsFound === null) resultsFound = m.results_count;
      if (typeof m.api_calls_used === 'number') apiCallsUsed = m.api_calls_used;
      if (typeof m.inserted_count === 'number') infringementsCreated = m.inserted_count;
    }
  }

  return { resultsFound, apiCallsUsed, infringementsCreated };
}

export function ScanLogFilters({ logs, productMap, userMap }: ScanLogFiltersProps) {
  const [levelFilter, setLevelFilter] = useState<ScanLogLevel | 'all'>('all');
  const [stageFilter, setStageFilter] = useState<ScanLogStage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedScanId, setExpandedScanId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filter logs first, then group by scan_id
  const filteredLogs = useMemo(() => logs.filter((log) => {
    if (levelFilter !== 'all' && log.log_level !== levelFilter) return false;
    if (stageFilter !== 'all' && log.stage !== stageFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesMessage = log.message.toLowerCase().includes(q);
      const matchesCode = log.error_code?.toLowerCase().includes(q);
      const matchesEmail = userMap[log.user_id]?.toLowerCase().includes(q);
      const matchesProduct = productMap[log.product_id]?.toLowerCase().includes(q);
      if (!matchesMessage && !matchesCode && !matchesEmail && !matchesProduct) return false;
    }
    return true;
  }), [logs, levelFilter, stageFilter, searchQuery, userMap, productMap]);

  // Group filtered logs by scan_id
  const scanGroups = useMemo((): ScanGroup[] => {
    const groupMap = new Map<string, ScanLogEntry[]>();

    for (const log of filteredLogs) {
      const existing = groupMap.get(log.scan_id) || [];
      existing.push(log);
      groupMap.set(log.scan_id, existing);
    }

    const groups: ScanGroup[] = [];
    for (const [scanId, scanLogs] of groupMap) {
      // Sort logs within group by created_at (chronological)
      scanLogs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const firstLog = scanLogs[0]!;
      const lastLog = scanLogs[scanLogs.length - 1]!;
      const metrics = extractMetricFromLogs(scanLogs);
      const uniqueStages = [...new Set(scanLogs.map(l => l.stage))];
      uniqueStages.sort((a, b) => (STAGE_ORDER[a] ?? 99) - (STAGE_ORDER[b] ?? 99));

      groups.push({
        scanId,
        logs: scanLogs,
        productName: productMap[firstLog.product_id] || 'Unknown product',
        userEmail: userMap[firstLog.user_id] || 'Unknown user',
        startedAt: firstLog.created_at,
        endedAt: lastLog.created_at,
        verdict: getVerdictFromLogs(scanLogs),
        errorCount: scanLogs.filter(l => l.log_level === 'error' || l.log_level === 'fatal').length,
        warnCount: scanLogs.filter(l => l.log_level === 'warn').length,
        selfHealCount: scanLogs.filter(l => l.self_healed).length,
        stages: uniqueStages,
        ...metrics,
      });
    }

    // Sort groups by most recent first
    groups.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return groups;
  }, [filteredLogs, productMap, userMap]);

  const totalLogCount = filteredLogs.length;

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as ScanLogLevel | 'all')}
          className="bg-pg-surface border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text focus:outline-none focus:border-pg-accent"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as ScanLogStage | 'all')}
          className="bg-pg-surface border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text focus:outline-none focus:border-pg-accent"
        >
          {STAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] bg-pg-surface border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text placeholder-pg-text-muted focus:outline-none focus:border-pg-accent"
        />

        <span className="text-sm text-pg-text-muted self-center">
          {scanGroups.length} scans ({totalLogCount} logs)
        </span>
      </div>

      {/* Scan Groups */}
      <div className="space-y-3">
        {scanGroups.length === 0 ? (
          <Card>
            <p className="text-pg-text-muted text-center py-8">No scan logs found matching filters.</p>
          </Card>
        ) : (
          scanGroups.map((group) => {
            const isExpanded = expandedScanId === group.scanId;

            return (
              <Card key={group.scanId} className="overflow-hidden">
                {/* Scan Summary Header */}
                <button
                  onClick={() => setExpandedScanId(isExpanded ? null : group.scanId)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Badge
                        variant="default"
                        className={`text-xs font-bold border ${group.verdict.color}`}
                      >
                        {group.verdict.label}
                      </Badge>

                      <span className="text-sm font-medium text-pg-text">
                        {group.productName}
                      </span>

                      {group.errorCount > 0 && (
                        <span className="text-xs text-red-400">
                          {group.errorCount} error{group.errorCount > 1 ? 's' : ''}
                        </span>
                      )}
                      {group.selfHealCount > 0 && (
                        <Badge
                          variant="default"
                          className="text-xs bg-yellow-500 bg-opacity-10 text-yellow-400 border border-yellow-500"
                        >
                          {group.selfHealCount} self-healed
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-pg-text-muted whitespace-nowrap">
                        {new Date(group.startedAt).toLocaleString()}
                      </span>
                      <span className="text-pg-text-muted">
                        {isExpanded ? '\u25B2' : '\u25BC'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Stats Row */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-pg-text-muted">
                    <span>{group.userEmail}</span>
                    <span>&middot;</span>
                    <span className="font-mono">{group.scanId.slice(0, 8)}...</span>
                    <span>&middot;</span>
                    <span>{group.logs.length} log entries</span>
                    {group.apiCallsUsed !== null && (
                      <>
                        <span>&middot;</span>
                        <span>{group.apiCallsUsed} API calls</span>
                      </>
                    )}
                    {group.resultsFound !== null && (
                      <>
                        <span>&middot;</span>
                        <span>{group.resultsFound} raw results</span>
                      </>
                    )}
                    {group.infringementsCreated !== null && (
                      <>
                        <span>&middot;</span>
                        <span className={group.infringementsCreated > 0 ? 'text-red-400' : ''}>
                          {group.infringementsCreated} infringements
                        </span>
                      </>
                    )}
                  </div>

                  {/* Stage Pipeline */}
                  <div className="flex items-center gap-1 mt-2 overflow-x-auto">
                    {group.stages.map((stage, i) => (
                      <span key={stage} className="flex items-center gap-1">
                        {i > 0 && <span className="text-pg-text-muted text-xs">&rarr;</span>}
                        <span className="text-xs px-1.5 py-0.5 rounded bg-pg-surface-light text-pg-text-muted whitespace-nowrap">
                          {stage.replace(/_/g, ' ')}
                        </span>
                      </span>
                    ))}
                  </div>
                </button>

                {/* Expanded: Individual Log Entries */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-pg-border">
                    {/* Full Scan ID */}
                    <div className="flex gap-4 mb-3 text-xs text-pg-text-muted">
                      <span><strong>Scan ID:</strong> <span className="font-mono">{group.scanId}</span></span>
                    </div>

                    <div className="space-y-1.5">
                      {group.logs.map((log) => (
                        <div key={log.id} className="rounded-lg bg-pg-bg border border-pg-border">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedLogId(expandedLogId === log.id ? null : log.id);
                            }}
                            className="w-full text-left px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="default"
                                className={`capitalize text-[10px] border ${getLevelColor(log.log_level)}`}
                              >
                                {log.log_level}
                              </Badge>

                              {log.self_healed && (
                                <Badge
                                  variant="default"
                                  className="text-[10px] bg-yellow-500 bg-opacity-10 text-yellow-400 border border-yellow-500"
                                >
                                  healed
                                </Badge>
                              )}

                              <span className="text-[10px] text-pg-text-muted font-mono">
                                {log.stage}
                              </span>

                              {log.error_code && (
                                <span className="text-[10px] font-mono text-red-400">
                                  {log.error_code}
                                </span>
                              )}

                              <span className="flex-1 text-xs text-pg-text truncate ml-1">
                                {log.message}
                              </span>

                              <span className="text-[10px] text-pg-text-muted whitespace-nowrap ml-2">
                                {new Date(log.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </button>

                          {/* Log Detail Expansion */}
                          {expandedLogId === log.id && (
                            <div className="px-3 pb-3 space-y-2 border-t border-pg-border mt-1 pt-2">
                              <p className="text-sm text-pg-text">{log.message}</p>

                              {log.heal_action && (
                                <div>
                                  <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Heal Action</h4>
                                  <p className="text-sm text-yellow-400">{log.heal_action}</p>
                                </div>
                              )}

                              {log.error_details && (
                                <div>
                                  <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Error Details</h4>
                                  <pre className="text-xs bg-pg-surface rounded-lg p-2 overflow-x-auto text-pg-text-muted">
                                    {JSON.stringify(log.error_details, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.metrics && (
                                <div>
                                  <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Metrics</h4>
                                  <pre className="text-xs bg-pg-surface rounded-lg p-2 overflow-x-auto text-pg-text-muted">
                                    {JSON.stringify(log.metrics, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.scan_params && (
                                <div>
                                  <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Scan Parameters</h4>
                                  <pre className="text-xs bg-pg-surface rounded-lg p-2 overflow-x-auto text-pg-text-muted">
                                    {JSON.stringify(log.scan_params, null, 2)}
                                  </pre>
                                </div>
                              )}

                              <div className="flex gap-3 text-[10px] text-pg-text-muted">
                                <span>Log ID: <span className="font-mono">{log.id}</span></span>
                                <span>Product: <span className="font-mono">{log.product_id}</span></span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
