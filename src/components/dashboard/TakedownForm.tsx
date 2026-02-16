'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';
import { getPlatformContact, getRecommendedRecipient } from '@/lib/utils/platform-abuse-contacts';

interface TakedownFormProps {
  prefilledInfringement: any;
  prefilledProduct: any;
  availableProducts: any[];
  userId: string;
}

const INFRINGEMENT_TYPES = [
  {
    value: 'exact_recreation',
    label: 'Exact Recreation/Clone',
    description: 'Someone has recreated your product with identical or nearly identical functionality',
    severity: 'high',
  },
  {
    value: 'name_trademark',
    label: 'Name/Trademark Infringement',
    description: 'Using your product name, brand, or trademark without authorization',
    severity: 'high',
  },
  {
    value: 'unauthorized_distribution',
    label: 'Unauthorized Distribution',
    description: 'Distributing your product (free or paid) without permission',
    severity: 'high',
  },
  {
    value: 'piracy_sale',
    label: 'Piracy/Unauthorized Sale',
    description: 'Selling unauthorized copies of your product',
    severity: 'critical',
  },
  {
    value: 'copyright_infringement',
    label: 'Copyright Infringement',
    description: 'Using your copyrighted code, documentation, or materials',
    severity: 'high',
  },
  {
    value: 'trade_dress',
    label: 'Trade Dress Infringement',
    description: 'Copying the look, feel, or presentation of your product',
    severity: 'medium',
  },
  {
    value: 'derivative_work',
    label: 'Unauthorized Derivative Work',
    description: 'Creating modifications or extensions without permission',
    severity: 'medium',
  },
];

const TONE_OPTIONS = [
  {
    value: 'professional',
    label: 'Professional',
    description: 'Balanced, formal tone suitable for most situations',
  },
  {
    value: 'formal_legal',
    label: 'Formal Legal',
    description: 'Strong legal language emphasizing consequences',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    description: 'Emphasizes immediate action required',
  },
  {
    value: 'friendly_firm',
    label: 'Friendly but Firm',
    description: 'Professional but approachable, good for first contact',
  },
];

export function TakedownForm({
  prefilledInfringement,
  prefilledProduct,
  availableProducts,
  userId,
}: TakedownFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedProduct, setSelectedProduct] = useState(prefilledProduct?.id || '');
  const [infringementTypes, setInfringementTypes] = useState<string[]>([]);
  const [tone, setTone] = useState('professional');
  const [additionalEvidence, setAdditionalEvidence] = useState('');
  const [copyrightDate, setCopyrightDate] = useState('');
  const [licenseInfo, setLicenseInfo] = useState('');
  const [ipClaims, setIpClaims] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [copySelf, setCopySelf] = useState(true);
  const [signatureName, setSignatureName] = useState('');
  const [signatureConsent, setSignatureConsent] = useState(false);

  const selectedProductData = availableProducts.find((p) => p.id === selectedProduct);

  // Auto-populate evidence from infringement data
  useEffect(() => {
    if (prefilledInfringement && !additionalEvidence) {
      const evidenceData = prefilledInfringement.evidence || {};
      const sections: string[] = [];

      // Add timeline information
      if (prefilledInfringement.first_seen_at) {
        const firstSeen = new Date(prefilledInfringement.first_seen_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        sections.push(`TIMELINE:\nFirst detected: ${firstSeen}`);

        if (prefilledInfringement.last_seen_at && prefilledInfringement.last_seen_at !== prefilledInfringement.first_seen_at) {
          const lastSeen = new Date(prefilledInfringement.last_seen_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          sections.push(`Last verified: ${lastSeen}`);
        }

        if (prefilledInfringement.seen_count && prefilledInfringement.seen_count > 1) {
          sections.push(`Detected in ${prefilledInfringement.seen_count} separate scans`);
        }
      }

      // Add matched text excerpts
      if (evidenceData.matched_excerpts && Array.isArray(evidenceData.matched_excerpts) && evidenceData.matched_excerpts.length > 0) {
        const excerpts = evidenceData.matched_excerpts
          .slice(0, 5) // Limit to first 5 excerpts
          .map((excerpt: string, idx: number) => `  ${idx + 1}. "${excerpt}"`)
          .join('\n');
        sections.push(`\nMATCHED CONTENT FROM INFRINGING SITE:\n${excerpts}`);
      }

      // Add brand-correlated keywords
      if (evidenceData.brand_keywords && Array.isArray(evidenceData.brand_keywords) && evidenceData.brand_keywords.length > 0) {
        const keywords = evidenceData.brand_keywords.join(', ');
        sections.push(`\nBRAND-RELATED TERMS FOUND:\n${keywords}`);
      }

      // Add URL chain (redirects)
      if (evidenceData.url_chain && Array.isArray(evidenceData.url_chain) && evidenceData.url_chain.length > 1) {
        const chain = evidenceData.url_chain
          .map((url: string, idx: number) => `  ${idx + 1}. ${url}`)
          .join('\n');
        sections.push(`\nURL REDIRECT CHAIN:\n${chain}`);
      }

      // Add images found
      if (evidenceData.images && Array.isArray(evidenceData.images) && evidenceData.images.length > 0) {
        const images = evidenceData.images
          .slice(0, 5) // Limit to first 5 images
          .map((img: string, idx: number) => `  ${idx + 1}. ${img}`)
          .join('\n');
        sections.push(`\nIMAGES FOUND ON INFRINGING SITE:\n${images}`);
      }

      // Add external links found
      if (evidenceData.external_links && Array.isArray(evidenceData.external_links) && evidenceData.external_links.length > 0) {
        const links = evidenceData.external_links
          .slice(0, 5) // Limit to first 5 links
          .map((link: string, idx: number) => `  ${idx + 1}. ${link}`)
          .join('\n');
        sections.push(`\nEXTERNAL LINKS ON PAGE:\n${links}`);
      }

      // Add severity and risk information
      if (prefilledInfringement.severity_score || prefilledInfringement.estimated_audience) {
        const riskInfo: string[] = [];
        if (prefilledInfringement.severity_score) {
          riskInfo.push(`Severity Score: ${prefilledInfringement.severity_score}/100`);
        }
        if (prefilledInfringement.estimated_audience) {
          riskInfo.push(`Estimated Audience Reach: ${prefilledInfringement.estimated_audience.toLocaleString()}`);
        }
        if (prefilledInfringement.est_revenue_loss) {
          riskInfo.push(`Estimated Revenue Impact: $${prefilledInfringement.est_revenue_loss.toLocaleString()}`);
        }
        sections.push(`\nRISK ASSESSMENT:\n${riskInfo.join('\n')}`);
      }

      // Combine all sections
      if (sections.length > 0) {
        const autoPopulatedEvidence = sections.join('\n\n');
        setAdditionalEvidence(autoPopulatedEvidence + '\n\n---\n\nADDITIONAL NOTES:\n[Add any additional context or evidence here]');
      }
    }
  }, [prefilledInfringement]); // Only run when prefilledInfringement changes

  // Auto-detect platform from infringement URL
  const platformInfo = prefilledInfringement?.source_url
    ? getPlatformContact(prefilledInfringement.source_url)
    : null;
  const recommendedRecipient = prefilledInfringement?.source_url
    ? getRecommendedRecipient(prefilledInfringement.source_url)
    : null;

  // Auto-populate recipient email from platform detection
  useEffect(() => {
    if (recommendedRecipient?.email && !recipientEmail) {
      setRecipientEmail(recommendedRecipient.email);
    }
  }, [recommendedRecipient]);

  const handleInfringementTypeToggle = (type: string) => {
    if (infringementTypes.includes(type)) {
      setInfringementTypes(infringementTypes.filter((t) => t !== type));
    } else {
      setInfringementTypes([...infringementTypes, type]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedProduct || infringementTypes.length === 0) {
      alert('Please select a product and at least one infringement type');
      return;
    }

    if (!recipientEmail) {
      alert('Please specify a recipient email for the DMCA notice');
      return;
    }

    if (!signatureName || !signatureConsent) {
      alert('You must provide your electronic signature and certify the information under penalty of perjury');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build CC email list
      const ccEmailList: string[] = [];
      if (copySelf && contactEmail) {
        ccEmailList.push(contactEmail);
      }
      if (ccEmails) {
        const additionalCcs = ccEmails.split(',').map(e => e.trim()).filter(e => e);
        ccEmailList.push(...additionalCcs);
      }

      // Get user's IP address for signature logging (best effort)
      let userIpAddress = '';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        userIpAddress = ipData.ip;
      } catch (e) {
        console.warn('Could not fetch IP for signature logging');
      }

      const signatureTimestamp = new Date().toISOString();

      const response = await fetch('/api/takedowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          infringement_ids: prefilledInfringement ? [prefilledInfringement.id] : [],
          product_id: selectedProduct,
          infringement_types: infringementTypes,
          tone,
          additional_evidence: additionalEvidence,
          ip_ownership: {
            copyright_date: copyrightDate,
            license_info: licenseInfo,
            ip_claims: ipClaims,
            first_published_date: selectedProductData?.created_at,
          },
          contact_info: {
            name: contactName,
            email: contactEmail,
            address: contactAddress,
            phone: contactPhone,
          },
          signature: {
            full_name: signatureName,
            date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            ip_address: userIpAddress,
            timestamp: signatureTimestamp,
            consent_given: signatureConsent,
          },
          infrastructure: prefilledInfringement?.infrastructure || null,
          infringing_url: prefilledInfringement?.source_url,
          recipient_email: recipientEmail,
          cc_emails: ccEmailList,
          // Timeline data
          discovered_at: prefilledInfringement?.first_seen_at,
          verified_at: prefilledInfringement?.verified_by_user_at,
          verified_by: prefilledInfringement?.verified_by_user_id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('DMCA takedown notice created successfully!');
        router.push(`/dashboard/takedowns/${data.takedown_id}`);
      } else {
        const error = await response.json();
        alert(`Failed to create takedown: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating takedown:', error);
      alert('Failed to create takedown. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-4 mb-8">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              s === step
                ? 'bg-pg-accent text-white'
                : s < step
                ? 'bg-green-500 text-white'
                : 'bg-pg-surface text-pg-text-muted border border-pg-border'
            }`}
          >
            {s < step ? '✓' : s}
          </div>
          {s < 4 && <div className={`w-12 h-1 ${s < step ? 'bg-green-500' : 'bg-pg-border'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {renderStepIndicator()}

      {/* Step 1: Product Selection & IP Ownership */}
      {step === 1 && (
        <Card>
          <h2 className="text-2xl font-bold mb-6 text-pg-text">Step 1: Product & IP Ownership</h2>

          {/* Product Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-pg-text mb-2">
              Select Your Product <span className="text-pg-danger">*</span>
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="input-field w-full"
            >
              <option value="">-- Select Product --</option>
              {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.type})
                </option>
              ))}
            </select>
            {selectedProductData && (
              <div className="mt-3 p-4 rounded-lg bg-pg-bg border border-pg-border">
                <p className="text-sm text-pg-text-muted">
                  <strong>Selected:</strong> {selectedProductData.name}
                </p>
                <p className="text-sm text-pg-text-muted">
                  <strong>Type:</strong> {selectedProductData.type}
                </p>
                <p className="text-sm text-pg-text-muted">
                  <strong>Price:</strong> ${selectedProductData.price}
                </p>
              </div>
            )}
          </div>

          {/* IP Ownership Information */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-pg-text">IP Ownership Proof</h3>
            <p className="text-sm text-pg-text-muted">
              Providing detailed ownership information strengthens your claim
            </p>

            <div>
              <label className="block text-sm font-medium text-pg-text mb-2">
                Copyright/Creation Date
              </label>
              <input
                type="date"
                value={copyrightDate}
                onChange={(e) => setCopyrightDate(e.target.value)}
                className="input-field w-full"
              />
              <p className="text-xs text-pg-text-muted mt-1">
                When was this product first created or published?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-pg-text mb-2">
                License Information
              </label>
              <textarea
                value={licenseInfo}
                onChange={(e) => setLicenseInfo(e.target.value)}
                rows={3}
                className="input-field w-full"
                placeholder="e.g., All Rights Reserved, Proprietary License, Copyright © 2024..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-pg-text mb-2">
                IP Claims & Registration
              </label>
              <textarea
                value={ipClaims}
                onChange={(e) => setIpClaims(e.target.value)}
                rows={3}
                className="input-field w-full"
                placeholder="e.g., Trademark registration number, copyright registration, patent information..."
              />
              <p className="text-xs text-pg-text-muted mt-1">
                Include any trademark, copyright, or patent registration numbers
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-pg-text">Your Contact Information</h3>
            <p className="text-sm text-pg-text-muted">
              Required for DMCA compliance. This information will appear in the notice.
            </p>

            <div>
              <label className="block text-sm font-medium text-pg-text mb-2">
                Your Name/Company Name <span className="text-pg-danger">*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="input-field w-full"
                placeholder="John Doe / Acme Corp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-pg-text mb-2">
                Contact Email <span className="text-pg-danger">*</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="input-field w-full"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-pg-text mb-2">
                Mailing Address (Optional but Recommended)
              </label>
              <textarea
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                rows={3}
                className="input-field w-full"
                placeholder="123 Main Street&#10;City, State ZIP&#10;Country"
              />
              <p className="text-xs text-pg-text-muted mt-1">
                Including your address strengthens your claim and provides alternative contact method
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-pg-text mb-2">
                Phone Number (Optional but Recommended)
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="input-field w-full"
                placeholder="+1 (555) 123-4567"
              />
              <p className="text-xs text-pg-text-muted mt-1">
                Recommended by DMCA best practices for urgent contact
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedProduct || !contactName || !contactEmail}
            >
              Next: Infringement Type →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Infringement Type Selection */}
      {step === 2 && (
        <Card>
          <h2 className="text-2xl font-bold mb-6 text-pg-text">Step 2: Infringement Type</h2>
          <p className="text-sm text-pg-text-muted mb-6">
            Select all types of infringement that apply. Multiple selections create a stronger case.
          </p>

          <div className="space-y-3 mb-6">
            {INFRINGEMENT_TYPES.map((type) => (
              <div
                key={type.value}
                onClick={() => handleInfringementTypeToggle(type.value)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  infringementTypes.includes(type.value)
                    ? 'border-pg-accent bg-pg-accent/10'
                    : 'border-pg-border bg-pg-surface hover:border-pg-accent/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={infringementTypes.includes(type.value)}
                    onChange={() => {}}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-pg-text">{type.label}</p>
                      <Badge
                        variant={type.severity === 'critical' ? 'danger' : type.severity === 'high' ? 'warning' : 'default'}
                        className="text-xs"
                      >
                        {type.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-pg-text-muted">{type.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={infringementTypes.length === 0}
            >
              Next: Evidence →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Additional Evidence */}
      {step === 3 && (
        <Card>
          <h2 className="text-2xl font-bold mb-6 text-pg-text">Step 3: Additional Evidence</h2>
          <p className="text-sm text-pg-text-muted mb-6">
            Provide any additional proof or context to strengthen your claim
          </p>

          {prefilledInfringement && (
            <div className="mb-6 space-y-4">
              <div className="p-4 rounded-lg bg-pg-bg border border-pg-border">
                <h3 className="text-sm font-semibold text-pg-text mb-2">Infringing URL</h3>
                <a
                  href={prefilledInfringement.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pg-accent hover:underline break-all text-sm"
                >
                  {prefilledInfringement.source_url}
                </a>
              </div>

              {/* Platform Detection */}
              {platformInfo && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🎯</div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-pg-text mb-2">
                        Platform Detected: {platformInfo.name}
                      </h3>
                      {recommendedRecipient?.email && (
                        <p className="text-sm text-pg-text mb-1">
                          <strong>Send to:</strong> {recommendedRecipient.email}
                        </p>
                      )}
                      {platformInfo.formUrl && (
                        <p className="text-sm text-pg-text mb-1">
                          <strong>Form:</strong>{' '}
                          <a
                            href={platformInfo.formUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pg-accent hover:underline"
                          >
                            {platformInfo.formUrl}
                          </a>
                        </p>
                      )}
                      {platformInfo.instructions && (
                        <p className="text-sm text-pg-text-muted mt-2">
                          💡 {platformInfo.instructions}
                        </p>
                      )}
                      {platformInfo.responseTime && (
                        <p className="text-xs text-pg-text-muted mt-1">
                          ⏱️ Typical response: {platformInfo.responseTime}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-pg-text mb-2">
              Additional Evidence & Details
            </label>
            <textarea
              value={additionalEvidence}
              onChange={(e) => setAdditionalEvidence(e.target.value)}
              rows={12}
              className="input-field w-full font-mono text-sm"
              placeholder={`Evidence from the infringement scan will be auto-populated here.\n\nYou can edit, add, or modify any content to strengthen your case:\n\n- Add screenshots or comparisons\n- Include specific code snippets that were copied\n- Mention user reviews or complaints about confusion\n- Document any previous correspondence with the infringer\n- Add context about your product's creation timeline`}
            />
            <p className="text-xs text-pg-text-muted mt-1">
              {prefilledInfringement ? (
                <span className="text-green-500">✓ Evidence auto-populated from scan results. Review and modify as needed.</span>
              ) : (
                <span>Be specific and factual. Include dates, comparisons, and concrete evidence.</span>
              )}
            </p>
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button onClick={() => setStep(4)}>
              Next: Tone & Review →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Tone Selection & Review */}
      {step === 4 && (
        <Card>
          <h2 className="text-2xl font-bold mb-6 text-pg-text">Step 4: Tone & Review</h2>

          {/* Email Configuration */}
          <div className="mb-8 p-6 rounded-lg bg-pg-bg border border-pg-border">
            <h3 className="text-lg font-semibold text-pg-text mb-4">📧 Email Configuration</h3>

            <div className="space-y-4">
              {/* Recipient Email */}
              <div>
                <label className="block text-sm font-medium text-pg-text mb-2">
                  Send DMCA Notice To <span className="text-pg-danger">*</span>
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="input-field w-full"
                  placeholder="copyright@platform.com"
                />
                {platformInfo && (
                  <p className="text-xs text-pg-text-muted mt-1">
                    ✓ Auto-detected from {platformInfo.name}
                  </p>
                )}
              </div>

              {/* Copy Self Checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="copySelf"
                  checked={copySelf}
                  onChange={(e) => setCopySelf(e.target.checked)}
                  className="rounded border-pg-border"
                />
                <label htmlFor="copySelf" className="text-sm text-pg-text cursor-pointer">
                  Send a copy to myself ({contactEmail})
                </label>
              </div>

              {/* Additional CC Emails */}
              <div>
                <label className="block text-sm font-medium text-pg-text mb-2">
                  Additional CC Recipients (Optional)
                </label>
                <input
                  type="text"
                  value={ccEmails}
                  onChange={(e) => setCcEmails(e.target.value)}
                  className="input-field w-full"
                  placeholder="email1@example.com, email2@example.com"
                />
                <p className="text-xs text-pg-text-muted mt-1">
                  Separate multiple emails with commas
                </p>
              </div>

              {/* Email Preview */}
              <div className="p-3 rounded bg-pg-surface border border-pg-border">
                <p className="text-xs font-semibold text-pg-text mb-2">Email Summary:</p>
                <p className="text-xs text-pg-text-muted">
                  <strong>To:</strong> {recipientEmail || '(not set)'}
                </p>
                {(copySelf || ccEmails) && (
                  <p className="text-xs text-pg-text-muted">
                    <strong>CC:</strong>{' '}
                    {[
                      copySelf && contactEmail,
                      ...ccEmails.split(',').map(e => e.trim()).filter(e => e)
                    ].filter(Boolean).join(', ') || 'None'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tone Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-pg-text mb-4">Select Notice Tone</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TONE_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setTone(option.value)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    tone === option.value
                      ? 'border-pg-accent bg-pg-accent/10'
                      : 'border-pg-border bg-pg-surface hover:border-pg-accent/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="tone"
                      checked={tone === option.value}
                      onChange={() => {}}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold text-pg-text">{option.label}</p>
                      <p className="text-sm text-pg-text-muted">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signature Section */}
          <div className="mb-8 p-6 rounded-lg bg-gradient-to-br from-pg-accent/5 to-blue-500/5 border-2 border-pg-accent/30">
            <h3 className="text-lg font-semibold text-pg-text mb-2">✍️ Electronic Signature (Required)</h3>
            <p className="text-sm text-pg-text-muted mb-4">
              Your electronic signature legally certifies this notice under the DMCA and ESIGN Act.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-pg-text mb-2">
                  Type Your Full Legal Name <span className="text-pg-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    className="input-field w-full text-lg font-serif italic"
                    placeholder="Type your full name as it will appear"
                    style={{ fontFamily: 'Georgia, serif' }}
                  />
                  {signatureName && (
                    <div className="mt-2 p-3 rounded bg-pg-surface border border-pg-border">
                      <p className="text-xs text-pg-text-muted mb-1">Signature Preview:</p>
                      <p className="text-xl font-serif italic text-pg-text">/{signatureName}/</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-pg-surface border border-pg-border">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signatureConsent}
                    onChange={(e) => setSignatureConsent(e.target.checked)}
                    className="mt-1 rounded border-pg-border"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-pg-text mb-1">
                      I certify under penalty of perjury <span className="text-pg-danger">*</span>
                    </p>
                    <p className="text-xs text-pg-text-muted leading-relaxed">
                      I certify under penalty of perjury under the laws of the United States that:
                      (1) I am authorized to act on behalf of the copyright owner,
                      (2) the information provided is accurate,
                      (3) I have a good faith belief the use is not authorized, and
                      (4) this electronic signature is my legally binding signature.
                    </p>
                  </div>
                </label>
              </div>

              <div className="text-xs text-pg-text-muted bg-blue-500/10 p-3 rounded border border-blue-500/20">
                <p className="font-semibold mb-1">🔒 Legal Validity</p>
                <p>
                  Your typed signature with consent checkbox constitutes a legally binding electronic
                  signature under the ESIGN Act (15 U.S.C. § 7001). The signature timestamp and IP
                  address will be logged for verification purposes.
                </p>
              </div>
            </div>
          </div>

          {/* Review Summary */}
          <div className="mb-6 p-6 rounded-lg bg-pg-bg border border-pg-border space-y-4">
            <h3 className="text-lg font-semibold text-pg-text">Review Your Submission</h3>

            <div>
              <p className="text-sm text-pg-text-muted">Product</p>
              <p className="text-pg-text font-semibold">{selectedProductData?.name}</p>
              {selectedProductData?.type && (
                <p className="text-sm text-pg-text-muted capitalize">Type: {selectedProductData.type}</p>
              )}
            </div>

            <div>
              <p className="text-sm text-pg-text-muted">Infringement Types</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {infringementTypes.map((type) => {
                  const typeData = INFRINGEMENT_TYPES.find((t) => t.value === type);
                  return (
                    <Badge key={type} variant="warning">
                      {typeData?.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm text-pg-text-muted">Tone</p>
              <p className="text-pg-text font-semibold capitalize">{tone.replace('_', ' ')}</p>
            </div>

            {copyrightDate && (
              <div>
                <p className="text-sm text-pg-text-muted">Copyright Date</p>
                <p className="text-pg-text font-semibold">{copyrightDate}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-pg-text-muted">Contact Information</p>
              <p className="text-pg-text font-semibold">{contactName}</p>
              <p className="text-sm text-pg-text-muted">{contactEmail}</p>
              {contactPhone && <p className="text-sm text-pg-text-muted">{contactPhone}</p>}
              {contactAddress && (
                <p className="text-sm text-pg-text-muted whitespace-pre-line mt-1">{contactAddress}</p>
              )}
            </div>

            {prefilledInfringement?.infrastructure && (
              <div>
                <p className="text-sm text-pg-text-muted">Infrastructure Evidence Available</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {prefilledInfringement.infrastructure.ip_address && (
                    <Badge variant="default" className="text-xs">IP Address</Badge>
                  )}
                  {prefilledInfringement.infrastructure.hosting_provider && (
                    <Badge variant="default" className="text-xs">Hosting Provider</Badge>
                  )}
                  {prefilledInfringement.infrastructure.registrar && (
                    <Badge variant="default" className="text-xs">Registrar</Badge>
                  )}
                </div>
                <p className="text-xs text-green-500 mt-1">✓ Technical evidence will be automatically included</p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(3)}>
              ← Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !signatureName || !signatureConsent}
              className="bg-pg-danger hover:bg-red-600"
            >
              {isSubmitting ? 'Submitting...' : '⚡ Submit DMCA Takedown'}
            </Button>
          </div>
          {(!signatureName || !signatureConsent) && (
            <p className="text-sm text-pg-warning mt-2 text-center">
              ⚠️ You must provide your electronic signature and certify the information to submit
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
