'use client';

import { useState } from 'react';
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

function getLevelColor(level: ScanLogLevel): string {
  switch (level) {
    case 'fatal': return 'bg-red-600 bg-opacity-20 text-red-400 border-red-600';
    case 'error': return 'bg-red-500 bg-opacity-10 text-red-400 border-red-500';
    case 'warn': return 'bg-yellow-500 bg-opacity-10 text-yellow-400 border-yellow-500';
    case 'info': return 'bg-blue-500 bg-opacity-10 text-blue-400 border-blue-500';
    default: return 'bg-gray-500 bg-opacity-10 text-gray-400 border-gray-500';
  }
}

export function ScanLogFilters({ logs, productMap, userMap }: ScanLogFiltersProps) {
  const [levelFilter, setLevelFilter] = useState<ScanLogLevel | 'all'>('all');
  const [stageFilter, setStageFilter] = useState<ScanLogStage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
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
  });

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
          {filteredLogs.length} of {logs.length} logs
        </span>
      </div>

      {/* Log Entries */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <Card>
            <p className="text-pg-text-muted text-center py-8">No scan logs found matching filters.</p>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id}>
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Badge
                      variant="default"
                      className={`capitalize text-xs border ${getLevelColor(log.log_level)}`}
                    >
                      {log.log_level}
                    </Badge>

                    {log.self_healed && (
                      <Badge
                        variant="default"
                        className="text-xs bg-yellow-500 bg-opacity-10 text-yellow-400 border border-yellow-500"
                      >
                        self-healed
                      </Badge>
                    )}

                    <span className="text-xs text-pg-text-muted font-mono">
                      {log.stage}
                    </span>

                    {log.error_code && (
                      <span className="text-xs font-mono text-red-400">
                        {log.error_code}
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-pg-text-muted whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm text-pg-text mt-1.5 truncate">
                  {log.message}
                </p>

                <div className="flex items-center gap-3 mt-1.5 text-xs text-pg-text-muted">
                  <span>{productMap[log.product_id] || 'Unknown product'}</span>
                  <span>&middot;</span>
                  <span>{userMap[log.user_id] || 'Unknown user'}</span>
                  <span>&middot;</span>
                  <span className="font-mono">{log.scan_id.slice(0, 8)}...</span>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedId === log.id && (
                <div className="mt-4 pt-4 border-t border-pg-border space-y-3">
                  {log.heal_action && (
                    <div>
                      <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Heal Action</h4>
                      <p className="text-sm text-yellow-400">{log.heal_action}</p>
                    </div>
                  )}

                  {log.error_details && (
                    <div>
                      <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Error Details</h4>
                      <pre className="text-xs bg-pg-bg rounded-lg p-3 overflow-x-auto text-pg-text-muted">
                        {JSON.stringify(log.error_details, null, 2)}
                      </pre>
                    </div>
                  )}

                  {log.metrics && (
                    <div>
                      <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Metrics</h4>
                      <pre className="text-xs bg-pg-bg rounded-lg p-3 overflow-x-auto text-pg-text-muted">
                        {JSON.stringify(log.metrics, null, 2)}
                      </pre>
                    </div>
                  )}

                  {log.scan_params && (
                    <div>
                      <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Scan Parameters</h4>
                      <pre className="text-xs bg-pg-bg rounded-lg p-3 overflow-x-auto text-pg-text-muted">
                        {JSON.stringify(log.scan_params, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex gap-4 text-xs text-pg-text-muted">
                    <span><strong>Scan ID:</strong> {log.scan_id}</span>
                    <span><strong>Product ID:</strong> {log.product_id}</span>
                    <span><strong>User ID:</strong> {log.user_id}</span>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
