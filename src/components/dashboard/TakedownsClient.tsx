'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import type { TakedownStatus } from '@/types';

interface Takedown {
  id: string;
  type: string;
  status: TakedownStatus;
  created_at: string;
  sent_at: string | null;
  resolved_at: string | null;
  infringements: {
    source_url: string;
    platform: string;
  } | null;
}

interface TakedownsClientProps {
  takedowns: Takedown[];
}

export function TakedownsClient({ takedowns }: TakedownsClientProps) {
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [statusFilter, setStatusFilter] = useState<TakedownStatus | 'all'>('all');

  // Filter takedowns by status
  const filteredTakedowns = useMemo(() => {
    if (statusFilter === 'all') return takedowns;
    return takedowns.filter((t) => t.status === statusFilter);
  }, [takedowns, statusFilter]);

  // Count takedowns by status
  const statusCounts = useMemo(() => {
    const counts = {
      all: takedowns.length,
      draft: 0,
      sent: 0,
      acknowledged: 0,
      removed: 0,
      failed: 0,
    };

    takedowns.forEach((t) => {
      if (t.status in counts) {
        counts[t.status as keyof typeof counts]++;
      }
    });

    return counts;
  }, [takedowns]);

  const getStatusBadgeClass = (status: TakedownStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'sent':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'acknowledged':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      case 'removed':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const needsAction = (takedown: Takedown) => {
    return takedown.status === 'draft';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-pg-text">DMCA Takedowns</h1>
        <p className="text-pg-text-muted">Track your takedown notices and their status</p>
      </div>

      {/* Controls: View Toggle + Status Filter */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-pg-text-muted">Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TakedownStatus | 'all')}
            className="px-3 py-2 rounded-lg bg-pg-surface border border-pg-border text-pg-text text-sm focus:outline-none focus:border-pg-accent transition-colors"
          >
            <option value="all">All ({statusCounts.all})</option>
            <option value="draft">Draft ({statusCounts.draft})</option>
            <option value="sent">Sent ({statusCounts.sent})</option>
            <option value="acknowledged">Acknowledged ({statusCounts.acknowledged})</option>
            <option value="removed">Removed ({statusCounts.removed})</option>
            <option value="failed">Failed ({statusCounts.failed})</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-pg-surface rounded-lg p-1 border border-pg-border">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-pg-accent text-white shadow-sm'
                : 'text-pg-text-muted hover:text-pg-text'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'card'
                ? 'bg-pg-accent text-white shadow-sm'
                : 'text-pg-text-muted hover:text-pg-text'
            }`}
          >
            Cards
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredTakedowns.length === 0 ? (
        <div className="p-12 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <div className="text-center">
            <p className="text-xl font-semibold mb-2 text-pg-text">
              {statusFilter === 'all' ? 'No takedowns yet' : `No ${statusFilter} takedowns`}
            </p>
            <p className="text-pg-text-muted">
              {statusFilter === 'all'
                ? 'When you find infringements, you can send DMCA takedown notices from here'
                : `Try changing the filter to see more takedowns`}
            </p>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-4">
          {filteredTakedowns.map((takedown) => (
            <Link key={takedown.id} href={`/dashboard/takedowns/${takedown.id}`}>
              <div className="group relative p-6 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border hover:bg-pg-surface-light hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Badge variant="default" className="capitalize bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {takedown.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant="default" className={getStatusBadgeClass(takedown.status)}>
                        {takedown.status}
                      </Badge>
                      {needsAction(takedown) && (
                        <Badge variant="warning" className="text-xs uppercase font-bold animate-pulse">
                          Action Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-pg-text-muted">
                      Platform: <span className="text-pg-text capitalize">{takedown.infringements?.platform || 'Unknown'}</span>
                    </p>
                    <p className="text-sm text-pg-text-muted truncate max-w-2xl">
                      URL: <span className="text-pg-accent hover:underline">{takedown.infringements?.source_url || 'N/A'}</span>
                    </p>
                  </div>
                  <div className="text-right text-sm text-pg-text-muted">
                    <p>Created: {new Date(takedown.created_at).toLocaleDateString()}</p>
                    {takedown.sent_at && <p className="text-blue-400">Sent: {new Date(takedown.sent_at).toLocaleDateString()}</p>}
                    {takedown.resolved_at && (
                      <p className="text-green-400">Resolved: {new Date(takedown.resolved_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTakedowns.map((takedown) => (
            <Link key={takedown.id} href={`/dashboard/takedowns/${takedown.id}`}>
              <Card className="group cursor-pointer hover:border-pg-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 h-full">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Badge variant="default" className="capitalize text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {takedown.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant="default" className={`text-xs ${getStatusBadgeClass(takedown.status)}`}>
                        {takedown.status}
                      </Badge>
                    </div>
                    {needsAction(takedown) && (
                      <Badge variant="warning" className="text-xs uppercase font-bold mb-2 animate-pulse">
                        ⚠️ Action Required
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2 text-sm mb-4">
                    <div>
                      <span className="text-pg-text-muted">Platform: </span>
                      <span className="text-pg-text capitalize font-medium">{takedown.infringements?.platform || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-pg-text-muted">URL: </span>
                      <p className="text-pg-accent hover:underline truncate text-xs mt-1">
                        {takedown.infringements?.source_url || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-pg-border text-xs text-pg-text-muted space-y-1">
                    <p>Created: {new Date(takedown.created_at).toLocaleDateString()}</p>
                    {takedown.sent_at && <p className="text-blue-400">Sent: {new Date(takedown.sent_at).toLocaleDateString()}</p>}
                    {takedown.resolved_at && (
                      <p className="text-green-400">Resolved: {new Date(takedown.resolved_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
