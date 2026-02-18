'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { SystemLogEntry as SystemLog } from '@/types';

interface SystemEventViewerProps {
  events: SystemLog[];
}

type SourceFilter = 'all' | 'cron' | 'webhook' | 'email';

function getSourceColor(source: string): string {
  switch (source) {
    case 'cron': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'webhook': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'email': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    default: return 'bg-pg-surface-light text-pg-text-muted border-pg-border';
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'success': return 'bg-green-500/10 text-green-400 border-green-500/30';
    case 'failure': return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'timeout': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    default: return 'bg-pg-surface-light text-pg-text-muted border-pg-border';
  }
}

export function SystemEventViewer({ events }: SystemEventViewerProps) {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredEvents = events.filter(e => {
    if (sourceFilter !== 'all' && e.log_source !== sourceFilter) return false;
    return true;
  });

  const sources: { value: SourceFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'cron', label: 'Cron Jobs' },
    { value: 'webhook', label: 'Webhooks' },
    { value: 'email', label: 'Emails' },
  ];

  return (
    <div>
      {/* Source Tabs */}
      <div className="flex gap-1 bg-pg-bg rounded-lg p-1 mb-4 w-fit">
        {sources.map(s => (
          <button
            key={s.value}
            onClick={() => setSourceFilter(s.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              sourceFilter === s.value
                ? 'bg-pg-accent/10 text-pg-accent'
                : 'text-pg-text-muted hover:text-pg-text'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Event Timeline */}
      <div className="space-y-2">
        {filteredEvents.length === 0 ? (
          <Card>
            <p className="text-pg-text-muted text-center py-8">
              No system events found. Events will appear here once the logger is integrated.
            </p>
          </Card>
        ) : (
          filteredEvents.slice(0, 100).map(event => (
            <Card key={event.id}>
              <button
                onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="default"
                      className={`text-xs border ${getSourceColor(event.log_source)}`}
                    >
                      {event.log_source}
                    </Badge>
                    <Badge
                      variant="default"
                      className={`text-xs border ${getStatusColor(event.status)}`}
                    >
                      {event.status}
                    </Badge>
                    <span className="text-xs font-mono text-pg-text-muted">
                      {event.operation}
                    </span>
                    {event.duration_ms && (
                      <span className="text-xs text-pg-text-muted">{event.duration_ms}ms</span>
                    )}
                  </div>
                  <span className="text-xs text-pg-text-muted whitespace-nowrap">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm text-pg-text mt-1.5 truncate">{event.message}</p>

                {event.error_message && (
                  <p className="text-xs text-red-400 mt-1 truncate">{event.error_message}</p>
                )}
              </button>

              {expandedId === event.id && (
                <div className="mt-4 pt-4 border-t border-pg-border space-y-3">
                  {event.context && Object.keys(event.context).length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Context</h4>
                      <pre className="text-xs bg-pg-bg rounded-lg p-3 overflow-x-auto text-pg-text-muted max-h-60 overflow-y-auto">
                        {JSON.stringify(event.context, null, 2)}
                      </pre>
                    </div>
                  )}

                  {event.error_stack && (
                    <div>
                      <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Stack Trace</h4>
                      <pre className="text-xs bg-pg-bg rounded-lg p-3 overflow-x-auto text-red-400 max-h-40 overflow-y-auto">
                        {event.error_stack}
                      </pre>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-pg-text-muted">
                    <span><strong>ID:</strong> {event.id}</span>
                    {event.trace_id && <span><strong>Trace:</strong> {event.trace_id}</span>}
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
