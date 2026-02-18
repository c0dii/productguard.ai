'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface DmcaLogViewerProps {
  submissionLogs: any[];
  systemLogs: any[];
}

type ViewMode = 'submissions' | 'system';

export function DmcaLogViewer({ submissionLogs, systemLogs }: DmcaLogViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('submissions');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      {/* View Mode Tabs */}
      <div className="flex gap-1 bg-pg-bg rounded-lg p-1 mb-4 w-fit">
        <button
          onClick={() => setViewMode('submissions')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'submissions' ? 'bg-pg-accent/10 text-pg-accent' : 'text-pg-text-muted hover:text-pg-text'
          }`}
        >
          Submissions ({submissionLogs.length})
        </button>
        <button
          onClick={() => setViewMode('system')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'system' ? 'bg-pg-accent/10 text-pg-accent' : 'text-pg-text-muted hover:text-pg-text'
          }`}
        >
          System Events ({systemLogs.length})
        </button>
      </div>

      {/* Submission Logs */}
      {viewMode === 'submissions' && (
        <div className="space-y-2">
          {submissionLogs.length === 0 ? (
            <Card>
              <p className="text-pg-text-muted text-center py-8">No DMCA submissions found.</p>
            </Card>
          ) : (
            submissionLogs.slice(0, 100).map((log: any) => (
              <Card key={log.id}>
                <button
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="default"
                        className={`text-xs border ${
                          log.status === 'sent' || log.status === 'success'
                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : log.status === 'failed' || log.status === 'failure'
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                        }`}
                      >
                        {log.status || 'unknown'}
                      </Badge>
                      {log.submission_type && (
                        <span className="text-xs font-mono text-pg-text-muted">{log.submission_type}</span>
                      )}
                    </div>
                    <span className="text-xs text-pg-text-muted whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-pg-text mt-1.5 truncate">
                    {log.target_entity || log.recipient_email || 'DMCA Submission'}
                  </p>
                </button>

                {expandedId === log.id && (
                  <div className="mt-4 pt-4 border-t border-pg-border">
                    <pre className="text-xs bg-pg-bg rounded-lg p-3 overflow-x-auto text-pg-text-muted max-h-60 overflow-y-auto">
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* System DMCA Logs */}
      {viewMode === 'system' && (
        <div className="space-y-2">
          {systemLogs.length === 0 ? (
            <Card>
              <p className="text-pg-text-muted text-center py-8">
                No DMCA system events found. Events will appear here once the logger is integrated.
              </p>
            </Card>
          ) : (
            systemLogs.slice(0, 100).map((log: any) => (
              <Card key={log.id}>
                <button
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="default"
                        className={`text-xs border ${
                          log.status === 'success'
                            ? 'bg-green-500/10 text-green-400 border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {log.status}
                      </Badge>
                      <span className="text-xs font-mono text-pg-text-muted">{log.operation}</span>
                    </div>
                    <span className="text-xs text-pg-text-muted whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-pg-text mt-1.5 truncate">{log.message}</p>
                </button>

                {expandedId === log.id && (
                  <div className="mt-4 pt-4 border-t border-pg-border">
                    <pre className="text-xs bg-pg-bg rounded-lg p-3 overflow-x-auto text-pg-text-muted max-h-60 overflow-y-auto">
                      {JSON.stringify(log, null, 2)}
                    </pre>
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
