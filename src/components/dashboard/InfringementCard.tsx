'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface InfringementCardProps {
  infringement: any;
  productPrice: number;
  isResolved?: boolean;
}

export function InfringementCard({ infringement, productPrice, isResolved = false }: InfringementCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const riskColors = {
    critical: 'border-pg-danger bg-pg-danger bg-opacity-5',
    high: 'border-pg-warning bg-pg-warning bg-opacity-5',
    medium: 'border-blue-400 bg-blue-400 bg-opacity-5',
    low: 'border-pg-border bg-pg-surface',
  };

  const typeLabels = {
    indexed_page: '🔍 Indexed Page',
    direct_download: '📥 Direct Download',
    torrent: '🧲 Torrent',
    post: '💬 Forum/Social Post',
    channel: '📢 Channel',
    group: '👥 Group',
    bot: '🤖 Bot',
    server: '🖥️ Server',
  };

  const handleVisitSite = () => {
    window.open(infringement.source_url, '_blank', 'noopener,noreferrer');
  };

  const handleSendDMCA = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/takedowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infringement_id: infringement.id,
          type: 'dmca',
        }),
      });

      if (response.ok) {
        alert('DMCA notice generated! Check the Takedowns page to send it.');
        router.refresh();
      } else {
        alert('Failed to generate DMCA notice');
      }
    } catch (error) {
      console.error('Error sending DMCA:', error);
      alert('Error generating DMCA notice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkResolved = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/infringements/${infringement.id}/resolve`, {
        method: 'PUT',
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Failed to mark as resolved');
      }
    } catch (error) {
      console.error('Error marking resolved:', error);
      alert('Error marking as resolved');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReopen = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/infringements/${infringement.id}/reopen`, {
        method: 'PUT',
      });

      if (response.ok) {
        router.refresh();
      } else {
        alert('Failed to reopen infringement');
      }
    } catch (error) {
      console.error('Error reopening:', error);
      alert('Error reopening infringement');
    } finally {
      setIsLoading(false);
    }
  };

  // Priority badge colors
  const priorityColors = {
    P0: 'bg-pg-danger bg-opacity-20 text-pg-danger border-pg-danger',
    P1: 'bg-pg-warning bg-opacity-20 text-pg-warning border-pg-warning',
    P2: 'bg-blue-500 bg-opacity-20 text-blue-400 border-blue-400',
  };

  return (
    <Card
      className={`${riskColors[infringement.risk_level as keyof typeof riskColors]} border-2 ${
        isResolved ? 'opacity-60' : ''
      }`}
    >
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        {/* Left Side - Details */}
        <div className="flex-1">
          <div className="flex items-start gap-2 mb-3 flex-wrap">
            {isResolved && (
              <Badge variant="default" className="bg-green-600 bg-opacity-20 text-green-400 shrink-0">
                ✓ Resolved
              </Badge>
            )}
            <Badge variant={infringement.risk_level} className="capitalize shrink-0">
              {infringement.risk_level}
            </Badge>
            {infringement.priority && (
              <Badge
                variant="default"
                className={`shrink-0 border ${priorityColors[infringement.priority as keyof typeof priorityColors]}`}
              >
                {infringement.priority} {infringement.priority === 'P0' ? '🚨' : infringement.priority === 'P1' ? '⚠️' : '📋'}
              </Badge>
            )}
            <Badge variant="default" className="shrink-0">
              {typeLabels[infringement.type as keyof typeof typeLabels] || infringement.type}
            </Badge>
            {infringement.monetization_detected && (
              <Badge variant="default" className="shrink-0 bg-pg-danger bg-opacity-20 text-pg-danger">
                💰 Monetized
              </Badge>
            )}
          </div>

          <a
            href={infringement.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pg-accent hover:underline font-medium break-all block mb-4"
          >
            {infringement.source_url}
          </a>

          {/* Phase 1: Enhanced Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <p className="text-pg-text-muted">Platform</p>
              <p className="font-semibold capitalize">{infringement.platform}</p>
            </div>
            <div>
              <p className="text-pg-text-muted">Audience</p>
              <p className="font-semibold">
                {infringement.audience_count > 0
                  ? infringement.audience_count.toLocaleString()
                  : infringement.audience_size || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-pg-text-muted">Est. Loss</p>
              <p className="font-semibold text-pg-danger">
                ${(infringement.est_revenue_loss || 0).toLocaleString()}
              </p>
            </div>
            {infringement.severity_score !== undefined && (
              <div>
                <p className="text-pg-text-muted">Severity</p>
                <p className="font-semibold">
                  {infringement.severity_score}/100
                  {infringement.severity_score >= 75 && ' 🔴'}
                  {infringement.severity_score >= 50 && infringement.severity_score < 75 && ' 🟡'}
                  {infringement.severity_score < 50 && ' 🟢'}
                </p>
              </div>
            )}
          </div>

          {/* Phase 1: Match Quality & Evidence */}
          {(infringement.match_confidence !== undefined || infringement.match_type) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-4 p-3 rounded-lg bg-pg-surface-light border border-pg-border">
              {infringement.match_confidence !== undefined && (
                <div>
                  <p className="text-pg-text-muted text-xs">Match Confidence</p>
                  <p className="font-semibold">
                    {Math.round(infringement.match_confidence * 100)}%
                  </p>
                </div>
              )}
              {infringement.match_type && (
                <div>
                  <p className="text-pg-text-muted text-xs">Match Type</p>
                  <p className="font-semibold capitalize">{infringement.match_type.replace('_', ' ')}</p>
                </div>
              )}
              {infringement.evidence && (
                <div>
                  <p className="text-pg-text-muted text-xs">Evidence</p>
                  <p className="font-semibold">
                    {infringement.evidence.screenshots?.length || 0} 📸 • {infringement.evidence.matched_excerpts?.length || 0} 📝
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side - Actions */}
        <div className="flex flex-col gap-2 lg:w-48">
          <Button
            size="sm"
            className="w-full"
            variant="secondary"
            onClick={handleVisitSite}
            disabled={isLoading}
          >
            🔗 Visit Site
          </Button>

          {!isResolved ? (
            <>
              <Button
                size="sm"
                className="w-full"
                onClick={handleSendDMCA}
                disabled={isLoading}
              >
                ⚡ Send DMCA
              </Button>
              <Button
                size="sm"
                className="w-full"
                variant="ghost"
                onClick={handleMarkResolved}
                disabled={isLoading}
              >
                ✓ Mark Resolved
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="w-full"
              variant="secondary"
              onClick={handleReopen}
              disabled={isLoading}
            >
              ↻ Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 pt-4 border-t border-pg-border text-xs text-pg-text-muted">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>
            Found on {new Date(infringement.created_at).toLocaleDateString()}
          </span>
          <span>
            Status: <span className="capitalize">{infringement.status}</span>
          </span>
          {infringement.next_check_at && (
            <span>
              Next Check: {new Date(infringement.next_check_at).toLocaleDateString()}
            </span>
          )}
          {infringement.infrastructure?.hosting_provider && (
            <span>
              Host: {infringement.infrastructure.hosting_provider}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
