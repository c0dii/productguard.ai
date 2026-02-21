'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { InlineDMCASendFlow } from './InlineDMCASendFlow';
import { DMCAQuickSetup } from './DMCAQuickSetup';

interface EnforcementTarget {
  type: 'platform' | 'hosting' | 'registrar' | 'search_engine';
  provider: {
    name: string;
    dmcaEmail: string | null;
    dmcaFormUrl: string | null;
    agentName: string;
    requirements: string;
    prefersWebForm: boolean;
  };
  step: number;
  recommended: boolean;
  reason: string;
  deadline_days: number;
}

interface SentTakedown {
  id: string;
  recipient_email: string | null;
  sent_at: string | null;
  status: string;
  created_at: string;
}

interface EnforcementPlanProps {
  infringementId: string;
  productName: string;
  infringementUrl: string;
  status: string;
  platform: string;
  sentTakedowns?: SentTakedown[];
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  platform: 'Platform Direct',
  hosting: 'Hosting Provider',
  registrar: 'Domain Registrar',
  search_engine: 'Search Engine',
};

export function EnforcementPlan({
  infringementId,
  productName,
  infringementUrl,
  status,
  platform,
  sentTakedowns: initialSentTakedowns = [],
}: EnforcementPlanProps) {
  const [targets, setTargets] = useState<EnforcementTarget[]>([]);
  const [isLoadingTargets, setIsLoadingTargets] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [activeFlow, setActiveFlow] = useState<{ notice: any; quality: any; target: EnforcementTarget } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [retryTarget, setRetryTarget] = useState<EnforcementTarget | null>(null);
  const [sentTakedowns, setSentTakedowns] = useState<SentTakedown[]>(initialSentTakedowns);

  // Fetch enforcement targets on mount
  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const response = await fetch(`/api/infringements/${infringementId}/enforcement-targets`);
        if (response.ok) {
          const data = await response.json();
          setTargets(data.targets || []);
        }
      } catch (err) {
        console.error('Error fetching enforcement targets:', err);
      } finally {
        setIsLoadingTargets(false);
      }
    };

    fetchTargets();
  }, [infringementId]);

  // Check if a target has been sent
  const getTargetTakedown = (target: EnforcementTarget): SentTakedown | undefined => {
    return sentTakedowns.find(
      (t) => t.recipient_email && target.provider.dmcaEmail &&
        t.recipient_email.toLowerCase() === target.provider.dmcaEmail.toLowerCase()
    );
  };

  // Find the first unsent target index
  const firstUnsentIndex = targets.findIndex((t) => !getTargetTakedown(t));

  const handleGenerate = async (target: EnforcementTarget) => {
    if (status !== 'active' && status !== 'takedown_sent') return;

    setGeneratingFor(target.provider.name);
    setError(null);

    try {
      // Read user-selected evidence items from sessionStorage
      let selectedEvidence: Array<{ original: string; infringing: string }> | undefined;
      try {
        const stored = sessionStorage.getItem(`pg_selected_evidence_items_${infringementId}`);
        if (stored) {
          const items = JSON.parse(stored);
          if (Array.isArray(items) && items.length > 0) {
            selectedEvidence = items.map((item: any) => ({
              original: item.original,
              infringing: item.dmcaLanguage || item.infringing,
            }));
          }
        }
      } catch {
        // Ignore sessionStorage errors
      }

      const response = await fetch('/api/dmca/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infringement_id: infringementId,
          target: {
            type: target.type,
            provider_name: target.provider.name,
          },
          selected_evidence: selectedEvidence,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.hint === 'profile_incomplete' || data.hint?.includes('profile settings')) {
          setRetryTarget(target);
          setShowQuickSetup(true);
          setGeneratingFor(null);
          return;
        }
        throw new Error(data.error || 'Failed to generate DMCA notice');
      }

      // Open the inline send flow with the generated notice
      setActiveFlow({
        notice: data.notice,
        quality: data.quality || null,
        target,
      });
    } catch (err: any) {
      console.error('Error generating DMCA notice:', err);
      setError(err.message || 'Couldn\'t generate the notice. Please try again.');
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleSent = (takedownId: string) => {
    // Add to local sent list so step immediately greys out
    if (activeFlow) {
      setSentTakedowns((prev) => [
        ...prev,
        {
          id: takedownId,
          recipient_email: activeFlow.notice.recipient_email,
          sent_at: new Date().toISOString(),
          status: 'sent',
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleCloseFlow = () => {
    setActiveFlow(null);
  };

  const canGenerate = status === 'active' || status === 'takedown_sent';

  if (isLoadingTargets) {
    return (
      <div className="flex items-center gap-2 py-4 justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-pg-accent border-t-transparent animate-spin" />
        <span className="text-sm text-pg-text-muted">Loading enforcement plan...</span>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-pg-text mb-1">Enforcement Plan</h3>
      <p className="text-xs text-pg-text-muted mb-4">
        We recommend contacting targets in order. Start with the platform, then escalate if needed.
      </p>

      {!canGenerate && (
        <div className="mb-3 p-3 rounded-lg bg-pg-bg border border-pg-border">
          <p className="text-xs text-pg-text-muted">
            Confirm this infringement first to generate takedown notices.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {targets.map((target, index) => {
          const existingTakedown = getTargetTakedown(target);
          const isSent = !!existingTakedown;
          const isNextActive = index === firstUnsentIndex;

          return (
            <div
              key={`${target.type}-${target.provider.name}`}
              className={`relative p-3 rounded-lg border transition-all ${
                isSent
                  ? 'bg-pg-bg/50 border-pg-border opacity-70'
                  : isNextActive
                  ? 'bg-pg-accent/5 border-pg-accent/30'
                  : target.recommended
                  ? 'bg-pg-accent/5 border-pg-accent/30'
                  : 'bg-pg-bg border-pg-border'
              }`}
            >
              {/* Step number & connection line */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSent
                      ? 'bg-green-500 text-white'
                      : isNextActive
                      ? 'bg-pg-accent text-white'
                      : 'bg-pg-surface border border-pg-border text-pg-text-muted'
                  }`}>
                    {isSent ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      target.step
                    )}
                  </div>
                  {index < targets.length - 1 && (
                    <div className={`w-px h-4 mt-1 ${isSent ? 'bg-green-500/50' : 'bg-pg-border'}`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-sm font-semibold ${isSent ? 'text-pg-text-muted' : 'text-pg-text'}`}>
                      {target.provider.name}
                    </span>
                    <Badge variant="default" className="text-[10px] capitalize">
                      {TARGET_TYPE_LABELS[target.type] || target.type}
                    </Badge>
                    {target.recommended && !isSent && (
                      <Badge variant="default" className="text-[10px] bg-pg-accent/20 text-pg-accent border-pg-accent/30">
                        Recommended
                      </Badge>
                    )}
                    {isSent && (
                      <Badge variant="default" className="text-[10px] bg-green-500/20 text-green-500 border-green-500/30">
                        DMCA Sent {existingTakedown.sent_at ? new Date(existingTakedown.sent_at).toLocaleDateString() : ''}
                      </Badge>
                    )}
                  </div>

                  <p className={`text-xs mb-2 leading-relaxed ${isSent ? 'text-pg-text-muted/60' : 'text-pg-text-muted'}`}>
                    {target.reason}
                  </p>

                  {/* Contact info */}
                  {!isSent && (
                    <div className="text-xs text-pg-text-muted space-y-0.5 mb-2">
                      {target.provider.dmcaEmail && (
                        <p>Email: <span className="text-pg-accent font-mono">{target.provider.dmcaEmail}</span></p>
                      )}
                      {target.provider.dmcaFormUrl && (
                        <p>
                          Web form:{' '}
                          <a
                            href={target.provider.dmcaFormUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pg-accent hover:underline"
                          >
                            Open form
                          </a>
                        </p>
                      )}
                      {target.deadline_days > 0 && (
                        <p className="text-pg-text-muted/70">
                          Wait {target.deadline_days} days before escalating to next step
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action button */}
                  {!isSent && (
                    <Button
                      size="sm"
                      variant={isNextActive || target.recommended ? 'primary' : 'secondary'}
                      onClick={() => handleGenerate(target)}
                      disabled={!canGenerate || generatingFor !== null}
                      className="w-full"
                    >
                      {generatingFor === target.provider.name ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        `Send DMCA Notice to ${target.provider.name}`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DMCA Quick Setup (shown when profile is incomplete) */}
      {showQuickSetup && (
        <div className="mt-4">
          <DMCAQuickSetup
            onComplete={() => {
              setShowQuickSetup(false);
              if (retryTarget) {
                handleGenerate(retryTarget);
                setRetryTarget(null);
              }
            }}
            onCancel={() => {
              setShowQuickSetup(false);
              setRetryTarget(null);
            }}
          />
        </div>
      )}

      {/* Inline DMCA Send Flow Modal */}
      {activeFlow && (
        <InlineDMCASendFlow
          notice={activeFlow.notice}
          quality={activeFlow.quality}
          target={activeFlow.target}
          infringementId={infringementId}
          productName={productName}
          infringementUrl={infringementUrl}
          onClose={handleCloseFlow}
          onSent={handleSent}
        />
      )}
    </div>
  );
}
