'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GoogleAssistedSubmit } from '@/components/dmca/GoogleAssistedSubmit';
import type { DMCABatchSummary } from '@/types';

interface QueueItem {
  id: string;
  infringement_id: string;
  recipient_email: string | null;
  recipient_name: string | null;
  provider_name: string;
  target_type: string;
  delivery_method: string;
  form_url: string | null;
  notice_subject: string;
  notice_body: string;
  status: string;
  attempt_count: number;
  error_message: string | null;
  scheduled_for: string;
  completed_at: string | null;
  created_at: string;
}

interface QueueStatusClientProps {
  batches: DMCABatchSummary[];
  activeBatch: DMCABatchSummary | null;
  initialItems: QueueItem[];
}

export function QueueStatusClient({
  batches,
  activeBatch: initialActiveBatch,
  initialItems,
}: QueueStatusClientProps) {
  const [activeBatch, setActiveBatch] = useState(initialActiveBatch);
  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [isCancelling, setIsCancelling] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Auto-poll for updates every 30 seconds if batch has pending items
  const refreshBatch = useCallback(async () => {
    if (!activeBatch) return;

    try {
      const res = await fetch(`/api/dmca/batch/${activeBatch.batch_id}`);
      if (!res.ok) return;

      const data = await res.json();
      setActiveBatch(data.batch);
      setItems(data.items);
    } catch {
      // Ignore polling errors
    }
  }, [activeBatch?.batch_id]);

  useEffect(() => {
    if (!activeBatch || (activeBatch.pending_count === 0 && activeBatch.processing_count === 0)) {
      return;
    }

    const interval = setInterval(refreshBatch, 30000);
    return () => clearInterval(interval);
  }, [activeBatch, refreshBatch]);

  // Countdown to next scheduled send
  useEffect(() => {
    if (!activeBatch?.next_scheduled) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const nextTime = new Date(activeBatch.next_scheduled!).getTime();
      const diff = Math.max(0, Math.floor((nextTime - Date.now()) / 1000));
      setCountdown(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeBatch?.next_scheduled]);

  const handleCancel = async () => {
    if (!activeBatch) return;
    setIsCancelling(true);

    try {
      const res = await fetch(`/api/dmca/batch/${activeBatch.batch_id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await refreshBatch();
      }
    } catch {
      // Ignore
    } finally {
      setIsCancelling(false);
    }
  };

  const handleWebFormSubmitted = () => {
    refreshBatch();
  };

  const switchBatch = async (batchId: string) => {
    try {
      const res = await fetch(`/api/dmca/batch/${batchId}`);
      if (!res.ok) return;

      const data = await res.json();
      setActiveBatch(data.batch);
      setItems(data.items);
    } catch {
      // Ignore
    }
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="text-green-400">&#10003;</span>;
      case 'failed':
        return <span className="text-red-400">&#10007;</span>;
      case 'processing':
        return (
          <svg className="animate-spin h-3.5 w-3.5 text-pg-accent" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'pending':
        return <span className="text-pg-text-muted">&#9679;</span>;
      case 'web_form':
        return <span className="text-blue-400">&#128279;</span>;
      case 'skipped':
        return <span className="text-pg-text-muted">&#8722;</span>;
      default:
        return <span className="text-pg-text-muted">?</span>;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Sent';
      case 'failed': return 'Failed';
      case 'processing': return 'Sending...';
      case 'pending': return 'Queued';
      case 'web_form': return 'Web Form';
      case 'skipped': return 'Cancelled';
      default: return status;
    }
  };

  if (!activeBatch && batches.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-pg-surface-light border border-pg-border flex items-center justify-center">
          <svg className="w-7 h-7 text-pg-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-pg-text mb-2">No batch submissions yet</p>
        <p className="text-sm text-pg-text-muted">
          Select infringements from the{' '}
          <a href="/dashboard/ready-for-takedown" className="text-pg-accent hover:underline">
            Ready for Takedown
          </a>{' '}
          page and send bulk DMCAs.
        </p>
      </Card>
    );
  }

  const emailItems = items.filter((i) => i.delivery_method === 'email');
  const webFormItems = items.filter((i) => i.delivery_method === 'web_form');
  const completedCount = activeBatch ? activeBatch.sent_count + activeBatch.web_form_count : 0;
  const totalCount = activeBatch?.total_items || 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isActive = activeBatch && (activeBatch.pending_count > 0 || activeBatch.processing_count > 0);

  return (
    <div className="space-y-6">
      {/* Batch selector if multiple batches */}
      {batches.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {batches.map((b) => (
            <button
              key={b.batch_id}
              onClick={() => switchBatch(b.batch_id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeBatch?.batch_id === b.batch_id
                  ? 'bg-pg-accent text-white'
                  : 'bg-pg-surface border border-pg-border text-pg-text-muted hover:text-pg-text'
              }`}
            >
              {new Date(b.batch_created_at).toLocaleDateString()} ({b.total_items})
            </button>
          ))}
        </div>
      )}

      {/* Progress Card */}
      {activeBatch && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-pg-text">
              Batch Progress
            </h2>
            {isActive && (
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={isCancelling}
                className="text-xs"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Remaining'}
              </Button>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-pg-text font-medium">
                {completedCount} / {totalCount} completed
              </span>
              <span className="text-pg-text-muted">{progressPct}%</span>
            </div>
            <div className="w-full h-3 bg-pg-surface-light rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="text-center p-2 rounded-lg bg-pg-bg">
              <p className="text-lg font-bold text-green-400">{activeBatch.sent_count}</p>
              <p className="text-[10px] text-pg-text-muted">Sent</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-pg-bg">
              <p className="text-lg font-bold text-pg-accent">{activeBatch.pending_count + activeBatch.processing_count}</p>
              <p className="text-[10px] text-pg-text-muted">Pending</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-pg-bg">
              <p className="text-lg font-bold text-blue-400">{activeBatch.web_form_count}</p>
              <p className="text-[10px] text-pg-text-muted">Web Form</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-pg-bg">
              <p className="text-lg font-bold text-red-400">{activeBatch.failed_count}</p>
              <p className="text-[10px] text-pg-text-muted">Failed</p>
            </div>
          </div>

          {/* Next send countdown */}
          {isActive && countdown !== null && countdown > 0 && (
            <div className="text-center p-2 rounded-lg bg-pg-accent/5 border border-pg-accent/20">
              <p className="text-xs text-pg-text-muted">Next send in</p>
              <p className="text-lg font-bold text-pg-accent font-mono">{formatCountdown(countdown)}</p>
            </div>
          )}
        </Card>
      )}

      {/* Email Items List */}
      {emailItems.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-pg-text mb-3">Email Deliveries</h3>
          <div className="space-y-2">
            {emailItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-pg-bg border border-pg-border"
              >
                <div className="shrink-0 w-5 text-center">{getStatusIcon(item.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-pg-text truncate">{item.provider_name}</p>
                  <p className="text-[10px] text-pg-text-muted truncate">{item.recipient_email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-xs font-medium ${
                    item.status === 'sent' ? 'text-green-400'
                      : item.status === 'failed' ? 'text-red-400'
                      : item.status === 'processing' ? 'text-pg-accent'
                      : 'text-pg-text-muted'
                  }`}>
                    {getStatusLabel(item.status)}
                  </p>
                  {item.status === 'pending' && (
                    <p className="text-[10px] text-pg-text-muted">
                      {new Date(item.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  {item.status === 'failed' && item.error_message && (
                    <p className="text-[10px] text-red-400 max-w-[200px] truncate" title={item.error_message}>
                      {item.error_message}
                    </p>
                  )}
                  {item.completed_at && item.status === 'sent' && (
                    <p className="text-[10px] text-pg-text-muted">
                      {new Date(item.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Web Form Items */}
      {webFormItems.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-pg-text mb-1">Web Form Submissions</h3>
          <p className="text-xs text-pg-text-muted mb-4">
            These providers require manual form submission. Copy the notice and submit via their form.
          </p>
          <div className="space-y-3">
            {webFormItems.map((item) => (
              <GoogleAssistedSubmit
                key={item.id}
                queueItemId={item.id}
                noticeBody={item.notice_body}
                noticeSubject={item.notice_subject}
                formUrl={item.form_url || ''}
                providerName={item.provider_name}
                sourceUrl=""
                onMarkedSubmitted={handleWebFormSubmitted}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Past Batches */}
      {batches.length > 1 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-pg-text mb-3">Batch History</h3>
          <div className="space-y-2">
            {batches.map((b) => (
              <button
                key={b.batch_id}
                onClick={() => switchBatch(b.batch_id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                  activeBatch?.batch_id === b.batch_id
                    ? 'border-pg-accent/30 bg-pg-accent/5'
                    : 'border-pg-border bg-pg-bg hover:bg-pg-surface-light'
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-pg-text">
                    {new Date(b.batch_created_at).toLocaleDateString()} at{' '}
                    {new Date(b.batch_created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-[10px] text-pg-text-muted mt-0.5">
                    {b.total_items} notices &middot; {b.sent_count} sent &middot; {b.failed_count} failed
                  </p>
                </div>
                <div>
                  {b.pending_count > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-pg-accent/10 border border-pg-accent/30 text-pg-accent font-bold">
                      IN PROGRESS
                    </span>
                  ) : b.failed_count > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold">
                      PARTIAL
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 font-bold">
                      COMPLETE
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
