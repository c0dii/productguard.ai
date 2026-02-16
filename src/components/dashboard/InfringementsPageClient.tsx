'use client';

import { useState, useMemo } from 'react';
import { InfringementList } from '@/components/dashboard/InfringementList';
import Link from 'next/link';

interface Infringement {
  id: string;
  source_url: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  platform: string;
  audience_size: string;
  est_revenue_loss: number;
  priority: 'P0' | 'P1' | 'P2';
  severity_score: number;
  status: string;
  infrastructure: {
    country?: string | null;
    [key: string]: any;
  } | null;
  products?: {
    name: string;
    price: number;
  } | null;
  [key: string]: any;
}

interface InfringementsPageClientProps {
  infringements: Infringement[];
  totalRevenueLoss: number;
}

type FilterOption = 'all' | 'needs_review' | 'action_required' | 'in_progress' | 'resolved' | 'dismissed';

export function InfringementsPageClient({ infringements, totalRevenueLoss }: InfringementsPageClientProps) {
  const [filter, setFilter] = useState<FilterOption>('all');

  // Filter infringements based on selected filter
  const filteredInfringements = useMemo(() => {
    switch (filter) {
      case 'needs_review':
        return infringements.filter((i) => i.status === 'pending_verification');
      case 'action_required':
        return infringements.filter((i) => i.status === 'active');
      case 'in_progress':
        return infringements.filter((i) => ['takedown_sent', 'disputed'].includes(i.status));
      case 'resolved':
        return infringements.filter((i) => i.status === 'removed');
      case 'dismissed':
        return infringements.filter((i) => i.status === 'false_positive');
      case 'all':
      default:
        return infringements;
    }
  }, [infringements, filter]);

  const getTitle = () => {
    switch (filter) {
      case 'needs_review':
        return 'Needs Review';
      case 'action_required':
        return 'Action Required';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      case 'dismissed':
        return 'Dismissed';
      default:
        return 'All Infringements';
    }
  };

  const getEmptyMessage = () => {
    switch (filter) {
      case 'needs_review':
        return 'No items to review. All detected infringements have been reviewed.';
      case 'action_required':
        return 'No action required. All confirmed threats have been addressed.';
      case 'in_progress':
        return 'No infringements in progress.';
      case 'resolved':
        return 'No resolved infringements yet.';
      case 'dismissed':
        return 'No dismissed items.';
      default:
        return 'No infringements found.';
    }
  };

  return (
    <div>
      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === 'all'
                ? 'bg-pg-accent text-white shadow-lg shadow-pg-accent/30'
                : 'bg-pg-surface text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text border border-pg-border'
            }`}
          >
            All ({infringements.length})
          </button>
          <button
            onClick={() => setFilter('needs_review')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === 'needs_review'
                ? 'bg-pg-warning text-white shadow-lg shadow-pg-warning/30'
                : 'bg-pg-surface text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text border border-pg-border'
            }`}
          >
            ⚠️ Needs Review ({infringements.filter((i) => i.status === 'pending_verification').length})
          </button>
          <button
            onClick={() => setFilter('action_required')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === 'action_required'
                ? 'bg-pg-danger text-white shadow-lg shadow-pg-danger/30'
                : 'bg-pg-surface text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text border border-pg-border'
            }`}
          >
            🔴 Action Required ({infringements.filter((i) => i.status === 'active').length})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === 'in_progress'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-pg-surface text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text border border-pg-border'
            }`}
          >
            📧 In Progress ({infringements.filter((i) => ['takedown_sent', 'disputed'].includes(i.status)).length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === 'resolved'
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                : 'bg-pg-surface text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text border border-pg-border'
            }`}
          >
            ✅ Resolved ({infringements.filter((i) => i.status === 'removed').length})
          </button>
          <button
            onClick={() => setFilter('dismissed')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === 'dismissed'
                ? 'bg-gray-600 text-white shadow-lg shadow-gray-600/30'
                : 'bg-pg-surface text-pg-text-muted hover:bg-pg-surface-light hover:text-pg-text border border-pg-border'
            }`}
          >
            Dismissed ({infringements.filter((i) => i.status === 'false_positive').length})
          </button>
        </div>

        {(filter === 'action_required' || filter === 'in_progress') && totalRevenueLoss > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-pg-text">
              <span className="font-semibold">Est. Revenue Loss:</span>{' '}
              <span className="text-pg-danger font-bold text-lg">${totalRevenueLoss.toLocaleString()}</span>
            </p>
          </div>
        )}
      </div>

      {/* Infringements List */}
      {filteredInfringements.length > 0 ? (
        <InfringementList
          infringements={filteredInfringements}
          productPrice={0}
          title={getTitle()}
          emptyMessage={getEmptyMessage()}
          showProductName={true}
        />
      ) : (
        <div className="p-12 rounded-2xl bg-pg-surface backdrop-blur-sm border border-pg-border">
          <div className="text-center">
            <p className="text-xl font-semibold mb-2 text-pg-text">{getTitle()}</p>
            <p className="text-pg-text-muted mb-4">{getEmptyMessage()}</p>
            <Link
              href="/dashboard/scans"
              className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              Run New Scan
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
