'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { SystemLogEntry as SystemLog, AdminAlert } from '@/types';

interface ErrorTrackerProps {
  errors: SystemLog[];
  alerts: AdminAlert[];
}

type ViewMode = 'errors' | 'alerts';
type ErrorFilter = 'all' | 'unresolved' | 'resolved';

function getLevelColor(level: string): string {
  switch (level) {
    case 'fatal': return 'bg-red-600/20 text-red-400 border-red-600';
    case 'error': return 'bg-red-500/10 text-red-400 border-red-500';
    default: return 'bg-pg-surface-light text-pg-text-muted border-pg-border';
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/30';
    case 'warning': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    case 'info': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    default: return 'bg-pg-surface-light text-pg-text-muted border-pg-border';
  }
}

export function ErrorTracker({ errors, alerts }: ErrorTrackerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('errors');
  const [filter, setFilter] = useState<ErrorFilter>('unresolved');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);

  const filteredErrors = errors.filter(e => {
    if (filter === 'unresolved') return !e.resolved_at;
    if (filter === 'resolved') return !!e.resolved_at;
    return true;
  });

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'unresolved') return !a.resolved_at;
    if (filter === 'resolved') return !!a.resolved_at;
    return true;
  });

  const handleResolve = async (id: string, type: 'error' | 'alert') => {
    setResolveLoading(true);
    try {
      const endpoint = type === 'alert'
        ? `/api/admin/data/alerts`
        : `/api/admin/data/alerts`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          type,
          action: 'resolve',
          resolution_notes: resolutionNotes,
        }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to resolve:', err);
    } finally {
      setResolveLoading(false);
      setResolvingId(null);
      setResolutionNotes('');
    }
  };

  return (
    <div>
      {/* View Mode Tabs + Filter */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1 bg-pg-bg rounded-lg p-1">
          <button
            onClick={() => setViewMode('errors')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'errors' ? 'bg-pg-accent/10 text-pg-accent' : 'text-pg-text-muted hover:text-pg-text'
            }`}
          >
            Errors ({errors.filter(e => !e.resolved_at).length})
          </button>
          <button
            onClick={() => setViewMode('alerts')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'alerts' ? 'bg-pg-accent/10 text-pg-accent' : 'text-pg-text-muted hover:text-pg-text'
            }`}
          >
            Alerts ({alerts.filter(a => !a.resolved_at).length})
          </button>
        </div>

        <div className="flex gap-1 bg-pg-bg rounded-lg p-1">
          {(['unresolved', 'all', 'resolved'] as ErrorFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                filter === f ? 'bg-pg-accent/10 text-pg-accent' : 'text-pg-text-muted hover:text-pg-text'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Error List */}
      {viewMode === 'errors' && (
        <div className="space-y-2">
          {filteredErrors.length === 0 ? (
            <Card>
              <p className="text-pg-text-muted text-center py-8">
                {filter === 'unresolved' ? 'No unresolved errors. All clear!' : 'No errors found.'}
              </p>
            </Card>
          ) : (
            filteredErrors.slice(0, 50).map(error => (
              <Card key={error.id}>
                <button
                  onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className={`text-xs border ${getLevelColor(error.log_level)}`}>
                        {error.log_level}
                      </Badge>
                      <span className="text-xs font-mono text-pg-text-muted">{error.log_source}</span>
                      <span className="text-xs font-mono text-pg-text-muted">{error.operation}</span>
                      {error.error_code && (
                        <span className="text-xs font-mono text-red-400">{error.error_code}</span>
                      )}
                      {error.resolved_at && (
                        <Badge variant="default" className="text-xs border bg-green-500/10 text-green-400 border-green-500/30">
                          resolved
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-pg-text-muted whitespace-nowrap">
                      {new Date(error.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-pg-text mt-1.5">{error.message}</p>
                  {error.error_message && (
                    <p className="text-xs text-red-400 mt-1 truncate">{error.error_message}</p>
                  )}
                </button>

                {expandedId === error.id && (
                  <div className="mt-4 pt-4 border-t border-pg-border space-y-3">
                    {error.error_stack && (
                      <div>
                        <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Stack Trace</h4>
                        <pre className="text-xs bg-pg-bg rounded-lg p-3 overflow-x-auto text-red-400 max-h-40 overflow-y-auto">
                          {error.error_stack}
                        </pre>
                      </div>
                    )}

                    {error.context && Object.keys(error.context).length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Context</h4>
                        <pre className="text-xs bg-pg-bg rounded-lg p-3 overflow-x-auto text-pg-text-muted max-h-40 overflow-y-auto">
                          {JSON.stringify(error.context, null, 2)}
                        </pre>
                      </div>
                    )}

                    {error.resolution_notes && (
                      <div>
                        <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Resolution Notes</h4>
                        <p className="text-sm text-green-400">{error.resolution_notes}</p>
                        <p className="text-xs text-pg-text-muted mt-1">
                          Resolved: {error.resolved_at ? new Date(error.resolved_at).toLocaleString() : ''}
                        </p>
                      </div>
                    )}

                    {/* Resolve Form */}
                    {!error.resolved_at && (
                      <div className="pt-2">
                        {resolvingId === error.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              placeholder="Resolution notes (what fixed it, root cause, etc.)..."
                              className="w-full bg-pg-bg border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text placeholder-pg-text-muted focus:outline-none focus:border-pg-accent"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleResolve(error.id, 'error')}
                                disabled={resolveLoading}
                              >
                                {resolveLoading ? 'Resolving...' : 'Mark Resolved'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setResolvingId(null); setResolutionNotes(''); }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setResolvingId(error.id)}
                          >
                            Resolve Error
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-pg-text-muted">
                      <span><strong>ID:</strong> {error.id}</span>
                      {error.trace_id && <span><strong>Trace:</strong> {error.trace_id}</span>}
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* Alert List */}
      {viewMode === 'alerts' && (
        <div className="space-y-2">
          {filteredAlerts.length === 0 ? (
            <Card>
              <p className="text-pg-text-muted text-center py-8">
                {filter === 'unresolved' ? 'No unresolved alerts. All clear!' : 'No alerts found.'}
              </p>
            </Card>
          ) : (
            filteredAlerts.slice(0, 50).map(alert => (
              <Card key={alert.id}>
                <button
                  onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="default" className={`text-xs border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </Badge>
                      <span className="text-xs font-mono text-pg-text-muted">{alert.category}</span>
                      {alert.resolved_at && (
                        <Badge variant="default" className="text-xs border bg-green-500/10 text-green-400 border-green-500/30">
                          resolved
                        </Badge>
                      )}
                      {alert.acknowledged_at && !alert.resolved_at && (
                        <Badge variant="default" className="text-xs border bg-blue-500/10 text-blue-400 border-blue-500/30">
                          acknowledged
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-pg-text-muted whitespace-nowrap">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-pg-text mt-1.5">{alert.title}</p>
                  <p className="text-xs text-pg-text-muted mt-0.5">{alert.message}</p>
                </button>

                {expandedId === alert.id && (
                  <div className="mt-4 pt-4 border-t border-pg-border space-y-3">
                    {alert.context && Object.keys(alert.context).length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Context</h4>
                        <pre className="text-xs bg-pg-bg rounded-lg p-3 overflow-x-auto text-pg-text-muted max-h-40 overflow-y-auto">
                          {JSON.stringify(alert.context, null, 2)}
                        </pre>
                      </div>
                    )}

                    {alert.resolution_notes && (
                      <div>
                        <h4 className="text-xs font-semibold text-pg-text-muted mb-1">Resolution Notes</h4>
                        <p className="text-sm text-green-400">{alert.resolution_notes}</p>
                      </div>
                    )}

                    {!alert.resolved_at && (
                      <div className="pt-2">
                        {resolvingId === alert.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              placeholder="Resolution notes..."
                              className="w-full bg-pg-bg border border-pg-border rounded-lg px-3 py-2 text-sm text-pg-text placeholder-pg-text-muted focus:outline-none focus:border-pg-accent"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleResolve(alert.id, 'alert')}
                                disabled={resolveLoading}
                              >
                                {resolveLoading ? 'Resolving...' : 'Resolve Alert'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setResolvingId(null); setResolutionNotes(''); }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setResolvingId(alert.id)}
                          >
                            Resolve Alert
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
