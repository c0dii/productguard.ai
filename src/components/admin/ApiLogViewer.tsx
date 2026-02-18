'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { SystemLogEntry as SystemLog } from '@/types';

interface ApiLogViewerProps {
  logs: SystemLog[];
}

type ProviderFilter = 'all' | 'openai' | 'serper' | 'whois' | 'resend' | 'scrape';

function getProvider(log: SystemLog): string {
  if (log.log_source === 'scrape') return 'scrape';
  const op = log.operation.toLowerCase();
  if (op.startsWith('openai')) return 'openai';
  if (op.startsWith('serper')) return 'serper';
  if (op.startsWith('whois')) return 'whois';
  if (op.startsWith('resend') || op.startsWith('email')) return 'resend';
  return 'other';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'success': return 'bg-green-500/10 text-green-400 border-green-500/30';
    case 'failure': return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'timeout': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    case 'partial': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    default: return 'bg-pg-surface-light text-pg-text-muted border-pg-border';
  }
}

export function ApiLogViewer({ logs }: ApiLogViewerProps) {
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredLogs = logs.filter(log => {
    if (providerFilter !== 'all' && getProvider(log) !== providerFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !log.operation.toLowerCase().includes(q) &&
        !log.message.toLowerCase().includes(q) &&
        !(log.error_message || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const providers: { value: ProviderFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'serper', label: 'Serper' },
    { value: 'whois', label: 'WHOIS' },
    { value: 'resend', label: 'Resend' },
    { value: 'scrape', label: 'Scrape' },
  ];

  return (
    <div>
      {/* Provider Tabs + Search */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1 bg-pg-bg rounded-lg p-1">
          {providers.map(p => (
            <button
              key={p.value}
              onClick={() => setProviderFilter(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                providerFilter === p.value
                  ? 'bg-pg-accent/10 text-pg-accent'
                  : 'text-pg-text-muted hover:text-pg-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search operations, messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] bg-pg-surface border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text placeholder-pg-text-muted focus:outline-none focus:border-pg-accent"
        />

        <span className="text-sm text-pg-text-muted self-center">
          {filteredLogs.length} entries
        </span>
      </div>

      {/* Log Entries */}
      <div className="space-y-2">
        {filteredLogs.length === 0 ? (
          <Card>
            <p className="text-pg-text-muted text-center py-8">No API logs found matching filters.</p>
          </Card>
        ) : (
          filteredLogs.slice(0, 100).map(log => (
            <Card key={log.id}>
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Badge
                      variant="default"
                      className={`text-xs border ${getStatusColor(log.status)}`}
                    >
                      {log.status}
                    </Badge>
                    <span className="text-xs font-mono text-pg-text-muted">
                      {log.operation}
                    </span>
                    {log.duration_ms && (
                      <span className="text-xs text-pg-text-muted">
                        {log.duration_ms}ms
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-pg-text-muted whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm text-pg-text mt-1.5 truncate">{log.message}</p>

                {log.error_message && (
                  <p className="text-xs text-red-400 mt-1 truncate">{log.error_message}</p>
                )}
              </button>

              {expandedId === log.id && (
                <div className="mt-4 pt-4 border-t border-pg-border space-y-3">
                  {log.error_stack && (
                    <div>
                      <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Stack Trace</h4>
                      <pre className="text-xs bg-pg-bg rounded-lg p-3 overflow-x-auto text-red-400 max-h-40 overflow-y-auto">
                        {log.error_stack}
                      </pre>
                    </div>
                  )}

                  {log.context && Object.keys(log.context).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Context</h4>
                      <pre className="text-xs bg-pg-bg rounded-lg p-3 overflow-x-auto text-pg-text-muted max-h-60 overflow-y-auto">
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-pg-text-muted">
                    <span><strong>ID:</strong> {log.id}</span>
                    {log.trace_id && <span><strong>Trace:</strong> {log.trace_id}</span>}
                    {log.user_id && <span><strong>User:</strong> {log.user_id.slice(0, 8)}...</span>}
                    {log.product_id && <span><strong>Product:</strong> {log.product_id.slice(0, 8)}...</span>}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}

        {filteredLogs.length > 100 && (
          <p className="text-center text-sm text-pg-text-muted py-4">
            Showing first 100 of {filteredLogs.length} entries. Use filters to narrow results.
          </p>
        )}
      </div>
    </div>
  );
}
