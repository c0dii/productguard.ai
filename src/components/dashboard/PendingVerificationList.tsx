'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';
import type { Infringement } from '@/types';

interface PendingVerificationListProps {
  infringements: Infringement[];
  productId: string;
}

export function PendingVerificationList({ infringements, productId }: PendingVerificationListProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleVerify = async (infringementId: string, action: 'verify' | 'reject') => {
    setProcessingId(infringementId);

    try {
      const response = await fetch(`/api/infringements/${infringementId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Infringement ${action}ed successfully:`, data);

        // Refresh page data to update chart and pending list
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Failed to ${action}: ${error.error}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing infringement:`, error);
      alert(`Failed to ${action} infringement. Please try again.`);
    } finally {
      setProcessingId(null);
    }
  };

  if (infringements.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-pg-text">Pending Verification ({infringements.length})</h2>
        <Badge variant="warning" className="text-xs uppercase font-bold">
          Action Required
        </Badge>
      </div>

      <p className="text-sm text-pg-text-muted mb-4">
        Review these potential infringements. <span className="text-pg-accent font-semibold">Verify</span> real threats or{' '}
        <span className="text-pg-text">mark as false positives</span>.
      </p>

      <div className="space-y-3">
        {infringements.map((infringement) => (
          <div
            key={infringement.id}
            className="p-4 rounded-lg bg-pg-bg border border-pg-border hover:border-pg-accent/50 transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Badges */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="default" className="capitalize text-xs">
                    {infringement.platform}
                  </Badge>
                  <Badge variant={infringement.risk_level as any} className="capitalize text-xs">
                    {infringement.risk_level}
                  </Badge>
                  {infringement.priority && (
                    <Badge variant="warning" className="text-xs">
                      {infringement.priority}
                    </Badge>
                  )}
                  {infringement.seen_count > 1 && (
                    <Badge variant="default" className="text-xs bg-blue-600">
                      Seen {infringement.seen_count}x
                    </Badge>
                  )}
                </div>

                {/* URL */}
                <a
                  href={infringement.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pg-accent hover:underline font-medium block mb-2 truncate text-sm"
                  title={infringement.source_url}
                >
                  {infringement.source_url}
                </a>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-pg-text-muted flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="opacity-70">Severity:</span>
                    <span className="font-semibold text-pg-text">{infringement.severity_score}/100</span>
                  </span>
                  {infringement.audience_size && (
                    <span className="flex items-center gap-1">
                      <span className="opacity-70">Audience:</span>
                      <span className="font-semibold text-pg-text">{infringement.audience_size}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="opacity-70">Est. Loss:</span>
                    <span className="font-semibold text-pg-danger">
                      ${(infringement.est_revenue_loss || 0).toLocaleString()}
                    </span>
                  </span>
                  {infringement.infrastructure?.country && (
                    <span className="flex items-center gap-1">
                      <span className="opacity-70">📍</span>
                      <span className="font-semibold text-pg-text">{infringement.infrastructure.country}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleVerify(infringement.id, 'verify')}
                  disabled={processingId === infringement.id}
                  className="text-xs px-3 py-2"
                >
                  {processingId === infringement.id ? '...' : '✓ Verify'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleVerify(infringement.id, 'reject')}
                  disabled={processingId === infringement.id}
                  className="text-xs px-3 py-2 hover:bg-pg-danger/10 hover:text-pg-danger"
                >
                  {processingId === infringement.id ? '...' : '✗ Reject'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {infringements.length >= 10 && (
        <p className="text-xs text-pg-text-muted mt-3 text-center">
          Showing first 10 pending verifications. Verify these to see more.
        </p>
      )}
    </Card>
  );
}
