'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { INFRINGEMENT_TYPES } from '@/lib/constants/infringement-types';
import { createClient } from '@/lib/supabase/client';

interface GeneratedDMCANotice {
  subject: string;
  body: string;
  recipient_email: string;
  recipient_name: string;
  recipient_form_url?: string | null;
  legal_references: string[];
  evidence_links: string[];
  sworn_statement: string;
  profile?: string;
}

interface QualityResult {
  passed: boolean;
  score: number;
  strength: 'strong' | 'standard' | 'weak';
  errors: Array<{ code: string; message: string; fix: string }>;
  warnings: Array<{ code: string; message: string; fix: string }>;
}

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

interface InlineDMCASendFlowProps {
  notice: GeneratedDMCANotice;
  quality?: QualityResult;
  target: EnforcementTarget;
  infringementId: string;
  productName: string;
  infringementUrl: string;
  onClose: () => void;
  onSent: (takedownId: string) => void;
}

type FlowStep = 1 | 2 | 3;

const STEP_LABELS = ['Infringement', 'Delivery', 'Review & Send'];

export function InlineDMCASendFlow({
  notice,
  quality,
  target,
  infringementId,
  productName,
  infringementUrl,
  onClose,
  onSent,
}: InlineDMCASendFlowProps) {
  const [step, setStep] = useState<FlowStep>(1);

  // Step 1 state
  const [infringementTypes, setInfringementTypes] = useState<string[]>([]);

  // Step 2 state
  const [editedRecipientEmail, setEditedRecipientEmail] = useState(notice.recipient_email);
  const [editedRecipientName, setEditedRecipientName] = useState(notice.recipient_name);
  const [ccSelf, setCcSelf] = useState(true);
  const [ccEmails, setCcEmails] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Step 3 state
  const [editedSubject, setEditedSubject] = useState(notice.subject);
  const [editedBody, setEditedBody] = useState(notice.body);
  const [signatureName, setSignatureName] = useState('');
  const [signatureConsent, setSignatureConsent] = useState(false);
  const [liabilityConsent, setLiabilityConsent] = useState(false);

  // Shared state
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentTakedownId, setSentTakedownId] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);

  const isSent = !!sentTakedownId;

  // Fetch user email + profile name on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserEmail(user.email || '');

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (profile?.full_name) {
          setSignatureName(profile.full_name);
        }
      } catch {
        // Ignore errors
      }
    };
    fetchUser();
  }, []);

  const handleTypeToggle = (value: string) => {
    setInfringementTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  };

  const handleSend = async () => {
    if (!signatureName || !signatureConsent || !liabilityConsent) return;

    setIsSending(true);
    setSendError(null);

    // Build CC list
    const ccList: string[] = [];
    if (ccSelf && userEmail) ccList.push(userEmail);
    if (ccEmails) {
      ccList.push(...ccEmails.split(',').map(e => e.trim()).filter(e => e));
    }

    try {
      const response = await fetch('/api/dmca/send-inline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infringement_id: infringementId,
          notice_content: editedBody,
          notice_subject: editedSubject,
          recipient_email: editedRecipientEmail,
          recipient_name: editedRecipientName,
          provider_name: target.provider.name,
          target_type: target.type,
          infringement_types: infringementTypes,
          signature_name: signatureName,
          cc_emails: ccList,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Couldn\'t send the notice. Check the recipient email and try again.');
      }

      setSentTakedownId(data.takedown.id);
      setSentAt(data.takedown.sent_at);
      onSent(data.takedown.id);
    } catch (err: any) {
      setSendError(err.message || 'Couldn\'t send the notice. Check the recipient email and try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = () => {
    const timestamp = new Date().toISOString();
    const fullNotice = [
      `DMCA TAKEDOWN NOTICE`,
      `Generated by ProductGuard.ai`,
      `Date: ${new Date(sentAt || timestamp).toLocaleString()}`,
      ``,
      `Subject: ${editedSubject}`,
      ``,
      `To: ${editedRecipientName}`,
      `Email: ${editedRecipientEmail}`,
      `Provider: ${target.provider.name}`,
      ``,
      `---`,
      ``,
      editedBody,
      ``,
      `---`,
      ``,
      `Electronic Signature: /${signatureName}/`,
      `Signed at: ${new Date(sentAt || timestamp).toISOString()}`,
      `Infringement Types: ${infringementTypes.join(', ')}`,
      `Product: ${productName}`,
      `Infringing URL: ${infringementUrl}`,
    ].join('\n');

    const blob = new Blob([fullNotice], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DMCA-${target.provider.name.replace(/\s+/g, '-')}-${productName.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Quality score styling
  const getStrengthFromScore = (score: number) => {
    if (score >= 85) return 'strong';
    if (score >= 75) return 'standard';
    return 'weak';
  };

  const strengthConfig = {
    strong: { bg: 'bg-green-100 dark:bg-green-500/20', border: 'border-green-400 dark:border-green-500/50', barColor: 'bg-green-500', label: 'Strong' },
    standard: { bg: 'bg-yellow-100 dark:bg-yellow-500/20', border: 'border-yellow-400 dark:border-yellow-500/50', barColor: 'bg-yellow-500', label: 'Standard' },
    weak: { bg: 'bg-red-100 dark:bg-red-500/20', border: 'border-red-400 dark:border-red-500/50', barColor: 'bg-red-500', label: 'Weak' },
  };

  const effectiveStrength = quality ? getStrengthFromScore(quality.score) : null;
  const strengthStyle = effectiveStrength ? strengthConfig[effectiveStrength] : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
      <Card className="max-w-3xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-b-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-pg-border">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-pg-text">
              {isSent ? 'DMCA Notice Sent' : `Send DMCA to ${target.provider.name}`}
            </h2>
            {!isSent && (
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
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
            )}
          </div>
          <button onClick={onClose} className="text-pg-text-muted hover:text-pg-text transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* STEP 1: Product & Infringement Type */}
        {step === 1 && !isSent && (
          <div>
            {/* Product & Infringement Context */}
            <div className="mb-4 p-3 rounded-lg bg-pg-bg border border-pg-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-pg-text-muted">Product</span>
                <span className="font-semibold text-pg-text">{productName}</span>
              </div>
              <div className="text-sm">
                <span className="text-pg-text-muted">Infringing URL</span>
                <a
                  href={infringementUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-pg-accent hover:underline text-xs break-all mt-0.5"
                >
                  {infringementUrl}
                </a>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-pg-text-muted">Target</span>
                <span className="text-pg-text">{target.provider.name}</span>
              </div>
            </div>

            {/* Infringement Type Selection */}
            <p className="text-sm text-pg-text-muted mb-3">
              Select all infringement types that apply. Multiple selections strengthen your claim.
            </p>

            <div className="space-y-2 mb-6 max-h-[45vh] overflow-y-auto">
              {INFRINGEMENT_TYPES.map((type) => (
                <div
                  key={type.value}
                  onClick={() => handleTypeToggle(type.value)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    infringementTypes.includes(type.value)
                      ? 'border-pg-accent bg-pg-accent/10'
                      : 'border-pg-border bg-pg-surface hover:border-pg-accent/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={infringementTypes.includes(type.value)}
                      onChange={() => {}}
                      className="mt-1 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-pg-text">{type.label}</p>
                        <Badge
                          variant={type.severity === 'critical' ? 'danger' : type.severity === 'high' ? 'warning' : 'default'}
                          className="text-[10px]"
                        >
                          {type.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-pg-text-muted">{type.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-pg-border">
              <Button onClick={() => setStep(2)} disabled={infringementTypes.length === 0}>
                Next: Delivery →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Delivery Configuration */}
        {step === 2 && !isSent && (
          <div>
            <p className="text-sm text-pg-text-muted mb-4">
              Confirm where the notice should be sent. We auto-detect the right contact when possible.
            </p>

            <div className="space-y-4 mb-6">
              {/* Recipient Name */}
              <div>
                <label className="block text-xs font-medium text-pg-text mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={editedRecipientName}
                  onChange={(e) => setEditedRecipientName(e.target.value)}
                  className="input-field w-full"
                  placeholder="Copyright Agent"
                />
              </div>

              {/* Recipient Email */}
              <div>
                <label className="block text-xs font-medium text-pg-text mb-1">
                  Send DMCA Notice To <span className="text-pg-danger">*</span>
                </label>
                <input
                  type="email"
                  value={editedRecipientEmail}
                  onChange={(e) => setEditedRecipientEmail(e.target.value)}
                  className="input-field w-full"
                  placeholder="copyright@platform.com"
                />
                {notice.recipient_email && editedRecipientEmail === notice.recipient_email && (
                  <p className="text-xs text-green-500 mt-1">
                    Auto-detected from {target.provider.name}
                  </p>
                )}
              </div>

              {/* Web form link */}
              {notice.recipient_form_url && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <span className="text-xs text-pg-text-muted">This provider also accepts web form submissions: </span>
                  <a
                    href={notice.recipient_form_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-pg-accent hover:underline"
                  >
                    Open Form →
                  </a>
                </div>
              )}

              {/* CC Self */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ccSelf"
                  checked={ccSelf}
                  onChange={(e) => setCcSelf(e.target.checked)}
                  className="rounded border-pg-border"
                />
                <label htmlFor="ccSelf" className="text-sm text-pg-text cursor-pointer">
                  Send a copy to myself {userEmail && `(${userEmail})`}
                </label>
              </div>

              {/* Additional CC */}
              <div>
                <label className="block text-xs font-medium text-pg-text mb-1">
                  Additional CC Recipients (Optional)
                </label>
                <input
                  type="text"
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  className="input-field w-full"
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-xs text-pg-text-muted mt-1">Separate multiple emails with commas</p>
              </div>

              {/* Email Summary */}
              <div className="p-3 rounded bg-pg-bg border border-pg-border">
                <p className="text-xs font-semibold text-pg-text mb-2">Delivery Summary</p>
                <p className="text-xs text-pg-text-muted">
                  <strong>To:</strong> {editedRecipientName} &lt;{editedRecipientEmail || '(not set)'}&gt;
                </p>
                {(ccSelf || ccEmails) && (
                  <p className="text-xs text-pg-text-muted">
                    <strong>CC:</strong>{' '}
                    {[
                      ccSelf && userEmail,
                      ...ccEmails.split(',').map(e => e.trim()).filter(e => e)
                    ].filter(Boolean).join(', ') || 'None'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-pg-border">
              <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={() => setStep(3)} disabled={!editedRecipientEmail}>
                Next: Review & Send →
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Review, Sign & Send */}
        {step === 3 && !isSent && (
          <div>
            {/* Quality Score */}
            {quality && strengthStyle && (
              <div className={`mb-4 p-3 rounded-lg ${strengthStyle.bg} border ${strengthStyle.border}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-900">
                    Notice Strength: {strengthStyle.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold text-gray-900 ${strengthStyle.barColor}/30`}>
                    {quality.score}/100
                  </span>
                </div>
                <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${strengthStyle.barColor}`}
                    style={{ width: `${quality.score}%` }}
                  />
                </div>
                {quality.errors.length > 0 && (
                  <div className="mt-2">
                    {quality.errors.map((err, i) => (
                      <p key={i} className="text-xs text-gray-900 dark:text-gray-900">
                        <strong>✕ {err.message}</strong> — {err.fix}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Subject */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-pg-text mb-1">Subject Line</label>
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>

            {/* Notice Body */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-pg-text mb-1">DMCA Notice</label>
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={14}
                className="w-full px-3 py-2 bg-pg-bg border border-pg-border rounded-lg text-pg-text font-mono text-xs focus:outline-none focus:ring-2 focus:ring-pg-accent resize-none leading-relaxed"
              />
              <p className="text-xs text-pg-text-muted mt-1">
                This is the exact text that will be sent. Edit as needed.
              </p>
            </div>

            {/* Signature */}
            <div className="mb-4 p-4 rounded-lg bg-gradient-to-br from-pg-accent/5 to-blue-500/5 border-2 border-pg-accent/30">
              <h3 className="text-sm font-semibold text-pg-text mb-3">Electronic Signature</h3>

              <div className="mb-3">
                <label className="block text-xs font-medium text-pg-text mb-1">
                  Type Your Full Legal Name <span className="text-pg-danger">*</span>
                </label>
                <input
                  type="text"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="input-field w-full text-base font-serif italic"
                  placeholder="Your full legal name"
                  style={{ fontFamily: 'Georgia, serif' }}
                />
                {signatureName && (
                  <div className="mt-2 p-2 rounded bg-pg-surface border border-pg-border">
                    <p className="text-xs text-pg-text-muted mb-0.5">Preview:</p>
                    <p className="text-lg font-serif italic text-pg-text">/{signatureName}/</p>
                  </div>
                )}
              </div>

              {/* Perjury Certification */}
              <label className="flex items-start gap-2 cursor-pointer p-3 rounded-lg bg-pg-surface border border-pg-border mb-3">
                <input
                  type="checkbox"
                  checked={signatureConsent}
                  onChange={(e) => setSignatureConsent(e.target.checked)}
                  className="mt-0.5 rounded border-pg-border"
                />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-pg-text mb-0.5">
                    I certify under penalty of perjury <span className="text-pg-danger">*</span>
                  </p>
                  <p className="text-[11px] text-pg-text mb-1 font-medium">
                    You&apos;re confirming that you own this content and that it&apos;s being used without permission.
                  </p>
                  <p className="text-[11px] text-pg-text-muted leading-relaxed">
                    Specifically: (1) I am authorized to act on behalf of the copyright owner,
                    (2) the information provided is accurate, (3) I have a good faith belief the use is not authorized, and
                    (4) this electronic signature is my legally binding signature.
                  </p>
                </div>
              </label>

              {/* Liability Waiver */}
              <label className="flex items-start gap-2 cursor-pointer p-3 rounded-lg bg-pg-surface border border-pg-border">
                <input
                  type="checkbox"
                  checked={liabilityConsent}
                  onChange={(e) => setLiabilityConsent(e.target.checked)}
                  className="mt-0.5 rounded border-pg-border"
                />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-pg-text mb-0.5">
                    Limitation of liability <span className="text-pg-danger">*</span>
                  </p>
                  <p className="text-[11px] text-pg-text mb-1 font-medium">
                    ProductGuard helps you send notices — but you&apos;re responsible for the claims in them.
                  </p>
                  <p className="text-[11px] text-pg-text-muted leading-relaxed">
                    I acknowledge that ProductGuard.ai provides tools for generating and sending DMCA notices but does not
                    provide legal advice. I accept full responsibility for the accuracy and legal validity of this notice.
                    I agree that ProductGuard.ai, its officers, employees, and affiliates shall not be held liable for any
                    damages, litigation, claims, or losses arising from the submission of this notice.
                  </p>
                </div>
              </label>
            </div>

            {sendError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-xs text-red-400">{sendError}</p>
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-pg-border">
              <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
              <Button
                onClick={handleSend}
                disabled={!signatureName || !signatureConsent || !liabilityConsent || isSending}
              >
                {isSending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send DMCA Notice'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {isSent && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-pg-text mb-2">Notice Sent Successfully</h3>
            <p className="text-sm text-pg-text-muted mb-1">
              Your takedown notice is on its way to <strong className="text-pg-text">{target.provider.name}</strong>.
            </p>
            <p className="text-xs text-pg-text-muted mb-6">
              {editedRecipientEmail} &middot; {sentAt ? new Date(sentAt).toLocaleDateString() : 'Just now'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="secondary" onClick={handleDownload}>
                Download Copy
              </Button>
              <Button onClick={onClose}>
                Close
              </Button>
            </div>

            <p className="text-xs text-pg-text-muted mt-4">
              Most providers respond within {target.deadline_days || 7} days. We&apos;ll track the status for you.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
