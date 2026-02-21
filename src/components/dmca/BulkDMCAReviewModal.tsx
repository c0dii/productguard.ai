'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { BulkGenerationResult, BulkSummary } from '@/lib/dmca/bulk-helpers';

interface BulkDMCAReviewModalProps {
  infringementIds: string[];
  userId: string;
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    dmca_reply_email: string | null;
  } | null;
  onClose: () => void;
  onSubmitted: (batchId: string) => void;
}

type ModalStep = 1 | 2 | 3;

const STEP_LABELS = ['Review Targets', 'Sign & Consent', 'Confirm & Submit'];

export function BulkDMCAReviewModal({
  infringementIds,
  profile,
  onClose,
  onSubmitted,
}: BulkDMCAReviewModalProps) {
  const [step, setStep] = useState<ModalStep>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generation results
  const [results, setResults] = useState<BulkGenerationResult[]>([]);
  const [summary, setSummary] = useState<BulkSummary | null>(null);

  // Step 2 state
  const [signatureName, setSignatureName] = useState(profile?.full_name || '');
  const [perjuryConfirmed, setPerjuryConfirmed] = useState(false);
  const [liabilityConfirmed, setLiabilityConfirmed] = useState(false);

  // Step 3 state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Generate notices on mount
  useEffect(() => {
    const generate = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/dmca/generate-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ infringement_ids: infringementIds }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to generate notices');
        }

        setResults(data.results);
        setSummary(data.summary);

        if (data.contact?.full_name && !signatureName) {
          setSignatureName(data.contact.full_name);
        }
      } catch (err: any) {
        setError(err.message || 'Couldn\'t generate the notices. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    generate();
  }, [infringementIds]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Build queue items from results
      const items = results.map((r) => ({
        infringement_id: r.infringement_id,
        recipient_email: r.notice.recipient_email || null,
        recipient_name: r.notice.recipient_name || null,
        provider_name: r.provider.name,
        target_type: r.target.type,
        delivery_method: r.delivery_method,
        form_url: r.provider.dmcaFormUrl || null,
        notice_subject: r.notice.subject,
        notice_body: r.notice.body,
        cc_emails: null,
      }));

      const res = await fetch('/api/dmca/submit-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          signature_name: signatureName,
          perjury_confirmed: perjuryConfirmed,
          liability_confirmed: liabilityConfirmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit bulk DMCA');
      }

      onSubmitted(data.batch_id);
    } catch (err: any) {
      setSubmitError(err.message || 'Couldn\'t submit the notices. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const truncateUrl = (url: string, maxLen = 50) => {
    if (url.length <= maxLen) return url;
    return url.slice(0, maxLen) + '...';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="bulk-dmca-title">
      <Card className="max-w-3xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-b-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-pg-border">
          <div>
            <h2 id="bulk-dmca-title" className="text-lg sm:text-xl font-bold text-pg-text">
              Bulk DMCA Takedown
            </h2>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    s < step ? 'bg-green-500 text-white'
                      : s === step ? 'bg-pg-accent text-white'
                      : 'bg-pg-surface-light text-pg-text-muted border border-pg-border'
                  }`}>
                    {s < step ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : s}
                  </div>
                  <span className={`text-xs hidden sm:inline ${s === step ? 'text-pg-accent font-medium' : 'text-pg-text-muted'}`}>
                    {STEP_LABELS[s - 1]}
                  </span>
                  {s < 3 && <div className="w-6 h-px bg-pg-border mx-1" />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-pg-text-muted hover:text-pg-text transition-colors p-2 -mr-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 text-center">
            <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-pg-accent" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm text-pg-text-muted">Generating {infringementIds.length} DMCA notices...</p>
            <p className="text-xs text-pg-text-muted mt-1">Resolving targets and building legally compliant notices</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        )}

        {/* STEP 1: Review Targets */}
        {step === 1 && !isLoading && !error && summary && (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-xl sm:text-2xl font-bold text-green-400">{summary.total_email}</p>
                <p className="text-[11px] sm:text-xs text-pg-text-muted mt-0.5">Auto-Send Email</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-xl sm:text-2xl font-bold text-blue-400">{summary.total_web_form}</p>
                <p className="text-[11px] sm:text-xs text-pg-text-muted mt-0.5">Web Form (Manual)</p>
              </div>
              <div className="col-span-2 sm:col-span-1 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <p className="text-xl sm:text-2xl font-bold text-yellow-400">{summary.total_manual}</p>
                <p className="text-[11px] sm:text-xs text-pg-text-muted mt-0.5">Manual</p>
              </div>
            </div>

            {/* Email Targets */}
            {summary.email_targets.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-pg-text uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  Auto-Send via Email ({summary.total_email})
                </h3>
                <div className="space-y-2">
                  {summary.email_targets.map((group) => (
                    <div key={group.recipient_email} className="rounded-lg border border-pg-border overflow-hidden">
                      <button
                        onClick={() => toggleGroup(`email-${group.recipient_email}`)}
                        className="w-full flex items-center justify-between p-3 bg-pg-surface-light hover:bg-pg-surface-light/80 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-pg-text truncate">{group.provider_name}</span>
                          <span className="text-xs text-pg-text-muted shrink-0">({group.count} notice{group.count !== 1 ? 's' : ''})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-pg-text-muted">{group.recipient_email}</span>
                          <svg className={`w-4 h-4 text-pg-text-muted transition-transform ${expandedGroups.has(`email-${group.recipient_email}`) ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      {expandedGroups.has(`email-${group.recipient_email}`) && (
                        <div className="p-3 space-y-1 border-t border-pg-border">
                          {results
                            .filter((r) => r.delivery_method === 'email' && r.notice.recipient_email === group.recipient_email)
                            .map((r) => {
                              const inf = infringementIds.find((id) => id === r.infringement_id);
                              return (
                                <div key={r.infringement_id} className="flex items-center gap-2 text-xs">
                                  <span className="text-green-400">&#9679;</span>
                                  <span className="text-pg-text-muted font-mono truncate">
                                    {truncateUrl(r.notice.evidence_links[0] || r.infringement_id)}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Web Form Targets */}
            {summary.web_form_targets.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-pg-text uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Manual Web Form ({summary.total_web_form})
                </h3>
                <div className="space-y-2">
                  {summary.web_form_targets.map((group) => (
                    <div key={group.provider_name} className="p-3 rounded-lg border border-pg-border bg-pg-surface-light">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-pg-text">{group.provider_name}</span>
                          <span className="text-xs text-pg-text-muted ml-2">({group.count} notice{group.count !== 1 ? 's' : ''})</span>
                        </div>
                        <a
                          href={group.form_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-pg-accent hover:underline"
                        >
                          Open Form
                        </a>
                      </div>
                      <p className="text-[11px] sm:text-xs text-pg-text-muted mt-1">
                        Notices will be generated for you to copy and submit via the provider&apos;s web form.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Targets */}
            {summary.manual_targets.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-pg-text uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  Manual Submission ({summary.total_manual})
                </h3>
                <div className="space-y-2">
                  {summary.manual_targets.map((group) => (
                    <div key={group.provider_name} className="p-3 rounded-lg border border-pg-border bg-pg-surface-light">
                      <span className="text-sm font-medium text-pg-text">{group.provider_name}</span>
                      <span className="text-xs text-pg-text-muted ml-2">({group.count})</span>
                      <p className="text-[11px] sm:text-xs text-pg-text-muted mt-1">
                        No automated delivery available. Notices will be generated for manual sending.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-pg-border">
              <Button onClick={() => setStep(2)}>
                Next: Sign & Consent
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Signature & Consent */}
        {step === 2 && (
          <div>
            {/* Contact Info */}
            <div className="mb-4 p-3 rounded-lg bg-pg-bg border border-pg-border">
              <h3 className="text-xs font-semibold text-pg-text mb-2">Contact Information</h3>
              <div className="space-y-1 text-xs text-pg-text-muted">
                <p><strong className="text-pg-text">Name:</strong> {profile?.full_name || '-'}</p>
                <p><strong className="text-pg-text">Email:</strong> {profile?.dmca_reply_email || profile?.email || '-'}</p>
                {profile?.phone && <p><strong className="text-pg-text">Phone:</strong> {profile.phone}</p>}
                {profile?.address && <p><strong className="text-pg-text">Address:</strong> {profile.address}</p>}
              </div>
            </div>

            {/* Signature */}
            <div className="mb-4 p-4 rounded-lg bg-gradient-to-br from-pg-accent/5 to-blue-500/5 border-2 border-pg-accent/30">
              <h3 className="text-sm font-semibold text-pg-text mb-3">Electronic Signature</h3>

              <div className="mb-3">
                <label className="block text-xs font-medium text-pg-text mb-1">
                  Type Your Full Legal Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full px-3 py-2 bg-pg-bg border border-pg-border rounded-lg text-pg-text text-base focus:outline-none focus:ring-2 focus:ring-pg-accent"
                  placeholder="Your full legal name"
                  style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
                />
                {signatureName && (
                  <div className="mt-2 p-2 rounded bg-pg-surface border border-pg-border">
                    <p className="text-xs text-pg-text-muted mb-0.5">Preview:</p>
                    <p className="text-lg text-pg-text" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>/{signatureName}/</p>
                  </div>
                )}
              </div>

              {/* Perjury Certification */}
              <label className="flex items-start gap-2 cursor-pointer p-3 rounded-lg bg-pg-surface border border-pg-border mb-3">
                <input
                  type="checkbox"
                  checked={perjuryConfirmed}
                  onChange={(e) => setPerjuryConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-pg-border"
                />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-pg-text mb-0.5">
                    I certify under penalty of perjury <span className="text-red-400">*</span>
                  </p>
                  <p className="text-[11px] text-pg-text-muted leading-relaxed">
                    I certify under penalty of perjury that: (1) I am authorized to act on behalf of the copyright owner,
                    (2) the information provided is accurate, (3) I have a good faith belief the use is not authorized, and
                    (4) this electronic signature is my legally binding signature for all {results.length} notices in this batch.
                  </p>
                </div>
              </label>

              {/* Liability Waiver */}
              <label className="flex items-start gap-2 cursor-pointer p-3 rounded-lg bg-pg-surface border border-pg-border">
                <input
                  type="checkbox"
                  checked={liabilityConfirmed}
                  onChange={(e) => setLiabilityConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-pg-border"
                />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-pg-text mb-0.5">
                    Limitation of liability <span className="text-red-400">*</span>
                  </p>
                  <p className="text-[11px] text-pg-text-muted leading-relaxed">
                    I acknowledge that ProductGuard.ai provides tools for generating and sending DMCA notices but does not
                    provide legal advice. I accept full responsibility for the accuracy and legal validity of these notices.
                    I agree that ProductGuard.ai shall not be held liable for any damages arising from the submission of these notices.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-between pt-3 border-t border-pg-border">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!signatureName || !perjuryConfirmed || !liabilityConfirmed}
              >
                Next: Confirm
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirm & Submit */}
        {step === 3 && summary && (
          <div>
            <div className="mb-5 p-4 rounded-lg bg-pg-bg border border-pg-border">
              <h3 className="text-sm font-semibold text-pg-text mb-3">Submission Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-pg-text-muted">Total notices</span>
                  <span className="font-bold text-pg-text">{results.length}</span>
                </div>
                {summary.total_email > 0 && (
                  <div className="flex justify-between">
                    <span className="text-pg-text-muted">Auto-send via email</span>
                    <span className="text-green-400 font-medium">{summary.total_email}</span>
                  </div>
                )}
                {summary.total_web_form > 0 && (
                  <div className="flex justify-between">
                    <span className="text-pg-text-muted">Web form (assisted)</span>
                    <span className="text-blue-400 font-medium">{summary.total_web_form}</span>
                  </div>
                )}
                {summary.total_email > 1 && (
                  <div className="flex justify-between">
                    <span className="text-pg-text-muted">Estimated time</span>
                    <span className="text-pg-text">~{(summary.total_email - 1) * 3} minutes</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-pg-text-muted">Signed by</span>
                  <span className="text-pg-text" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>/{signatureName}/</span>
                </div>
              </div>
            </div>

            {summary.total_email > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-300">
                  Email notices will be sent one at a time, 3 minutes apart, to protect deliverability.
                  You can track progress on the queue status page.
                </p>
              </div>
            )}

            {summary.total_web_form > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-300">
                  Web form notices will be ready for you to copy and submit manually.
                  We&apos;ll provide a &quot;Copy to Clipboard&quot; button and direct link to each form.
                </p>
              </div>
            )}

            {submitError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-xs text-red-400">{submitError}</p>
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-pg-border">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  `Send ${results.length} DMCA Notices`
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
