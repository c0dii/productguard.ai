'use client';

import { useState, useEffect, useCallback } from 'react';
import { SlideOver } from '@/components/ui/SlideOver';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TakedownForm } from '@/components/dashboard/TakedownForm';
import { getPlatformDisplayName } from '@/lib/utils/platform-display';
import type { Infringement } from '@/types';

type DrawerView = 'review' | 'takedown';

interface InfringementReviewDrawerProps {
  infringement: Infringement | null;
  onClose: () => void;
  onAction: (infringementId: string, action: 'verify' | 'reject' | 'whitelist') => void;
  product?: any;
  userId?: string;
}

export function InfringementReviewDrawer({
  infringement,
  onClose,
  onAction,
  product,
  userId,
}: InfringementReviewDrawerProps) {
  const [view, setView] = useState<DrawerView>('review');
  const [fullData, setFullData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reset view when infringement changes
  useEffect(() => {
    setView('review');
    setFullData(null);
    if (infringement) {
      fetchFullData(infringement.id);
    }
  }, [infringement?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFullData = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/infringements/${id}`);
      if (res.ok) {
        setFullData(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch infringement details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = useCallback(async (action: 'verify' | 'reject' | 'whitelist') => {
    if (!infringement) return;
    setActionLoading(action);

    try {
      const res = await fetch(`/api/infringements/${infringement.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        if (action === 'verify') {
          // Transition to DMCA form
          setView('takedown');
          onAction(infringement.id, action);
        } else {
          // Dismiss/whitelist → advance to next
          onAction(infringement.id, action);
        }
      } else {
        const error = await res.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (err) {
      console.error(`Error ${action}ing:`, err);
      alert('Action failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, [infringement, onAction]);

  const handleTakedownSuccess = useCallback(() => {
    if (infringement) {
      onAction(infringement.id, 'verify');
    }
  }, [infringement, onAction]);

  const data = fullData || infringement;
  const drawerWidth = view === 'takedown' ? 'xl' : 'lg';

  return (
    <SlideOver
      isOpen={!!infringement}
      onClose={onClose}
      title={view === 'takedown' ? 'Send DMCA Takedown' : 'Review Infringement'}
      width={drawerWidth}
    >
      {!data ? (
        <DrawerSkeleton />
      ) : view === 'review' ? (
        <div className="flex flex-col h-full">
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* URL & Badges */}
            <div>
              <a
                href={data.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pg-accent hover:underline font-medium text-sm break-all"
              >
                {data.source_url}
              </a>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Badge variant="default" className="text-xs">
                  {getPlatformDisplayName(data.source_url)}
                </Badge>
                <Badge variant={data.risk_level as any} className="capitalize text-xs">
                  {data.risk_level}
                </Badge>
                {data.priority && (
                  <Badge variant="default" className={`text-xs border ${
                    data.priority === 'P0' ? 'bg-pg-danger/20 text-pg-danger border-pg-danger' :
                    data.priority === 'P1' ? 'bg-pg-warning/20 text-pg-warning border-pg-warning' :
                    'bg-blue-500/20 text-blue-400 border-blue-400'
                  }`}>
                    {data.priority}
                  </Badge>
                )}
                {data.type && (
                  <Badge variant="default" className="text-xs capitalize">
                    {data.type.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Severity Score" value={`${data.severity_score}/100`} />
              <MetricCard
                label="Match Confidence"
                value={data.match_confidence != null ? `${Math.round(data.match_confidence * 100)}%` : 'N/A'}
              />
              <MetricCard
                label="Audience"
                value={
                  data.audience_count > 0
                    ? data.audience_count.toLocaleString()
                    : data.audience_size || 'Unknown'
                }
              />
              <MetricCard
                label="Est. Revenue Loss"
                value={data.est_revenue_loss > 0 ? `$${data.est_revenue_loss.toLocaleString()}` : 'N/A'}
              />
            </div>

            {/* Infrastructure */}
            {data.infrastructure && (
              <section>
                <h3 className="text-sm font-semibold text-pg-text mb-2">Infrastructure</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {data.infrastructure.country && (
                    <InfoRow label="Country" value={data.infrastructure.country} />
                  )}
                  {data.infrastructure.hosting_provider && (
                    <InfoRow label="Host" value={data.infrastructure.hosting_provider} />
                  )}
                  {data.infrastructure.registrar && (
                    <InfoRow label="Registrar" value={data.infrastructure.registrar} />
                  )}
                  {data.infrastructure.ip_address && (
                    <InfoRow label="IP" value={data.infrastructure.ip_address} />
                  )}
                  {data.infrastructure.cdn && (
                    <InfoRow label="CDN" value={data.infrastructure.cdn} />
                  )}
                  {data.infrastructure.asn_org && (
                    <InfoRow label="Network" value={data.infrastructure.asn_org} />
                  )}
                </div>
              </section>
            )}

            {/* Evidence */}
            {(data.match_type || data.match_evidence?.length > 0 || data.evidence?.matched_excerpts?.length > 0) && (
              <section>
                <h3 className="text-sm font-semibold text-pg-text mb-2">Evidence</h3>
                <div className="space-y-2">
                  {data.match_type && (
                    <div className="text-sm">
                      <span className="text-pg-text-muted">Match Type: </span>
                      <span className="text-pg-text font-medium capitalize">{data.match_type.replace('_', ' ')}</span>
                    </div>
                  )}
                  {data.evidence?.matched_excerpts?.length > 0 && (
                    <div>
                      <p className="text-xs text-pg-text-muted mb-1">Matched Excerpts:</p>
                      <div className="space-y-1">
                        {data.evidence.matched_excerpts.slice(0, 3).map((excerpt: string, i: number) => (
                          <p key={i} className="text-xs bg-pg-bg rounded p-2 text-pg-text-muted italic line-clamp-2">
                            &ldquo;{excerpt}&rdquo;
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.match_evidence?.length > 0 && (
                    <div>
                      <p className="text-xs text-pg-text-muted mb-1">Detection Signals:</p>
                      <div className="flex flex-wrap gap-1">
                        {data.match_evidence.slice(0, 6).map((ev: string, i: number) => (
                          <span key={i} className="text-xs bg-pg-bg border border-pg-border rounded px-2 py-0.5 text-pg-text-muted">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* WHOIS */}
            {data.whois_domain && (
              <section>
                <h3 className="text-sm font-semibold text-pg-text mb-2">Domain Info</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <InfoRow label="Domain" value={data.whois_domain} />
                  {data.whois_registrant_org && (
                    <InfoRow label="Registrant" value={data.whois_registrant_org} />
                  )}
                  {data.whois_registrar_name && (
                    <InfoRow label="Registrar" value={data.whois_registrar_name} />
                  )}
                  {data.whois_domain_age_days != null && (
                    <InfoRow label="Domain Age" value={`${Math.round(data.whois_domain_age_days / 365)} years`} />
                  )}
                </div>
              </section>
            )}

            {/* Timeline */}
            <section>
              <h3 className="text-sm font-semibold text-pg-text mb-2">Timeline</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {data.first_seen_at && (
                  <InfoRow
                    label="First Seen"
                    value={new Date(data.first_seen_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  />
                )}
                {data.last_seen_at && (
                  <InfoRow
                    label="Last Seen"
                    value={new Date(data.last_seen_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  />
                )}
                {data.seen_count > 1 && (
                  <InfoRow label="Times Detected" value={`${data.seen_count}x`} />
                )}
                {data.monetization_detected && (
                  <InfoRow label="Monetization" value="Detected" />
                )}
              </div>
            </section>
          </div>

          {/* Sticky action footer */}
          <div className="shrink-0 border-t border-pg-border p-4 sm:p-6 bg-pg-surface space-y-2">
            <Button
              className="w-full"
              onClick={() => handleAction('verify')}
              disabled={!!actionLoading}
            >
              {actionLoading === 'verify' ? 'Confirming...' : 'Confirm Infringement'}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 hover:bg-pg-danger/10 hover:text-pg-danger"
                onClick={() => handleAction('reject')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'reject' ? 'Dismissing...' : 'Dismiss'}
              </Button>
              <Button
                variant="ghost"
                className="flex-1 hover:bg-green-500/10 hover:text-green-400"
                onClick={() => handleAction('whitelist')}
                disabled={!!actionLoading}
              >
                {actionLoading === 'whitelist' ? 'Whitelisting...' : 'Whitelist URL'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* DMCA Takedown Form View */
        <div className="p-4 sm:p-6">
          <TakedownForm
            prefilledInfringement={fullData || data}
            prefilledProduct={fullData?.products || product}
            availableProducts={fullData?.products ? [fullData.products] : product ? [product] : []}
            userId={userId || ''}
            inDrawer
            onSuccess={handleTakedownSuccess}
          />
        </div>
      )}
    </SlideOver>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-pg-bg rounded-lg p-3 border border-pg-border">
      <p className="text-xs text-pg-text-muted">{label}</p>
      <p className="text-lg font-bold text-pg-text mt-0.5">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-pg-text-muted">{label}</p>
      <p className="text-sm text-pg-text font-medium truncate">{value}</p>
    </div>
  );
}

function DrawerSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4 animate-pulse">
      <div className="h-4 bg-pg-bg rounded w-3/4" />
      <div className="flex gap-2">
        <div className="h-6 bg-pg-bg rounded w-20" />
        <div className="h-6 bg-pg-bg rounded w-16" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-pg-bg rounded-lg" />
        ))}
      </div>
      <div className="h-24 bg-pg-bg rounded-lg" />
      <div className="h-20 bg-pg-bg rounded-lg" />
    </div>
  );
}
