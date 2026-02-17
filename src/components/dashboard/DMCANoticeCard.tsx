'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface DMCANoticeCardProps {
  sentAt: string | null;
  recipientEmail: string | null;
  ccEmails: string[] | null;
  status: string;
  noticeContent: string | null;
  communicationStatus: string | null;
}

const deliveryStatusConfig: Record<string, { label: string; className: string }> = {
  sent: { label: 'Sent', className: 'bg-blue-500 bg-opacity-10 text-blue-400' },
  delivered: { label: 'Delivered', className: 'bg-pg-accent bg-opacity-10 text-pg-accent' },
  bounced: { label: 'Bounced', className: 'bg-pg-danger bg-opacity-10 text-pg-danger' },
  failed: { label: 'Failed', className: 'bg-pg-danger bg-opacity-10 text-pg-danger' },
  pending: { label: 'Pending', className: 'bg-pg-warning bg-opacity-10 text-pg-warning' },
  replied: { label: 'Replied', className: 'bg-pg-accent bg-opacity-10 text-pg-accent' },
};

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) + ' at ' + date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function DMCANoticeCard({
  sentAt,
  recipientEmail,
  ccEmails,
  status,
  noticeContent,
  communicationStatus,
}: DMCANoticeCardProps) {
  const [expanded, setExpanded] = useState(false);

  const effectiveDeliveryStatus = communicationStatus || (status === 'sent' ? 'sent' : status === 'draft' ? 'pending' : status);
  const deliveryConfig = deliveryStatusConfig[effectiveDeliveryStatus] ?? deliveryStatusConfig.pending!;

  return (
    <Card>
      {/* Collapsible Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">DMCA Notice</h2>
          {sentAt && (
            <span className="text-sm text-pg-text-muted">
              {formatDateTime(sentAt)}
            </span>
          )}
          {sentAt && (
            <Badge variant="default" className="bg-blue-500 bg-opacity-10 text-blue-400">
              Sent
            </Badge>
          )}
          {!sentAt && status === 'draft' && (
            <Badge variant="default" className="bg-pg-warning bg-opacity-10 text-pg-warning">
              Draft — Not Sent
            </Badge>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-pg-text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Delivery Details */}
          <div className="space-y-2 text-sm">
            {sentAt && (
              <div className="flex justify-between items-center py-2 border-b border-pg-border">
                <span className="text-pg-text-muted">Sent</span>
                <span className="text-pg-text">{formatDateTime(sentAt)}</span>
              </div>
            )}

            {recipientEmail && (
              <div className="flex justify-between items-center py-2 border-b border-pg-border">
                <span className="text-pg-text-muted">To</span>
                <span className="text-pg-text font-mono">{recipientEmail}</span>
              </div>
            )}

            {ccEmails && ccEmails.length > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-pg-border">
                <span className="text-pg-text-muted">CC</span>
                <span className="text-pg-text font-mono">{ccEmails.join(', ')}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-2 border-b border-pg-border">
              <span className="text-pg-text-muted">Delivery Status</span>
              <Badge variant="default" className={deliveryConfig.className}>
                {deliveryConfig.label}
              </Badge>
            </div>
          </div>

          {/* Notice Content */}
          {noticeContent && (
            <div>
              <h3 className="text-sm font-semibold text-pg-text-muted mb-2">Notice Content</h3>
              <div className="bg-pg-surface-light p-4 rounded-lg border border-pg-border">
                <pre className="whitespace-pre-wrap text-sm font-mono text-pg-text-muted leading-relaxed">
                  {noticeContent}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
