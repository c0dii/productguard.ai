'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getPlatformContact, getRecommendedRecipient } from '@/lib/utils/platform-abuse-contacts';
import { INFRINGEMENT_TYPES } from '@/lib/constants/infringement-types';
import { generateDMCANotice } from '@/lib/utils/dmca-templates';

interface TakedownFormProps {
  prefilledInfringement: any;
  prefilledProduct: any;
  availableProducts: any[];
  userId: string;
  inDrawer?: boolean;
  onSuccess?: (takedownId: string) => void;
}

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
  inDrawer = false,
  onSuccess,
}: TakedownFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedProduct, setSelectedProduct] = useState(prefilledProduct?.id || '');
  const [manualUrl, setManualUrl] = useState('');
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
  const [generatedNotice, setGeneratedNotice] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);

  const mergedProducts = allProducts.length > 0 ? allProducts : availableProducts;
  const selectedProductData = mergedProducts.find((p) => p.id === selectedProduct);
  const isManualEntry = !prefilledInfringement;
  const effectiveUrl = prefilledInfringement?.source_url || manualUrl;

  // Auto-populate contact info from profile + fetch all products on mount
  useEffect(() => {
    const fetchProfileAndProducts = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile and all products in parallel
        const [profileResult, productsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, company_name, phone, address, dmca_reply_email')
            .eq('id', user.id)
            .single(),
          supabase
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .order('name'),
        ]);

        const profile = profileResult.data;
        if (profile) {
          setContactName(profile.full_name || profile.company_name || '');
          setContactEmail(profile.dmca_reply_email || user.email || '');
          setContactAddress(profile.address || '');
          setContactPhone(profile.phone || '');
          setSignatureName(profile.full_name || '');
        } else {
          setContactEmail(user.email || '');
        }

        if (productsResult.data && productsResult.data.length > 0) {
          setAllProducts(productsResult.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile/products for DMCA form:', err);
      }
    };
    fetchProfileAndProducts();
  }, []);

  // Pre-populate IP ownership fields when product changes
  useEffect(() => {
    if (!selectedProductData) return;

    const p = selectedProductData;

    // Copyright date: from copyright_info.year or product created_at
    if (!copyrightDate) {
      if (p.copyright_info?.year) {
        setCopyrightDate(p.copyright_info.year);
      } else if (p.created_at) {
        setCopyrightDate(p.created_at.split('T')[0]);
      }
    }

    // License info: from license_info or a default based on copyright_owner
    if (!licenseInfo) {
      const parts: string[] = [];
      if (p.license_info?.type) parts.push(p.license_info.type);
      if (p.copyright_owner) parts.push(`Copyright Owner: ${p.copyright_owner}`);
      if (parts.length > 0) setLicenseInfo(parts.join('\n'));
    }

    // IP claims: from copyright_number, trademark_info, patent_info
    if (!ipClaims) {
      const claims: string[] = [];
      if (p.copyright_number) claims.push(`Copyright Registration: ${p.copyright_number}`);
      if (p.copyright_info?.registration_number) claims.push(`Copyright Reg #: ${p.copyright_info.registration_number}`);
      if (p.trademark_info?.name) {
        let tm = `Trademark: ${p.trademark_info.name}`;
        if (p.trademark_info.registration_number) tm += ` (Reg #${p.trademark_info.registration_number})`;
        claims.push(tm);
      }
      if (p.patent_info?.number) claims.push(`Patent: ${p.patent_info.number} (${p.patent_info.type})`);
      if (claims.length > 0) setIpClaims(claims.join('\n'));
    }
  }, [selectedProduct]); // eslint-disable-line react-hooks/exhaustive-deps

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
          .slice(0, 5)
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
          .slice(0, 5)
          .map((img: string, idx: number) => `  ${idx + 1}. ${img}`)
          .join('\n');
        sections.push(`\nIMAGES FOUND ON INFRINGING SITE:\n${images}`);
      }

      // Add external links found
      if (evidenceData.external_links && Array.isArray(evidenceData.external_links) && evidenceData.external_links.length > 0) {
        const links = evidenceData.external_links
          .slice(0, 5)
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
        sections.push(`\nRISK ASSESSMENT:\n${riskInfo.join('\n')}`);
      }

      // Combine all sections
      if (sections.length > 0) {
        const autoPopulatedEvidence = sections.join('\n\n');
        setAdditionalEvidence(autoPopulatedEvidence + '\n\n---\n\nADDITIONAL NOTES:\n[Add any additional context or evidence here]');
      }
    }
  }, [prefilledInfringement]); // Only run when prefilledInfringement changes

  // Auto-detect platform from infringement URL (works for both prefilled and manual)
  const platformInfo = effectiveUrl
    ? getPlatformContact(effectiveUrl)
    : null;
  const recommendedRecipient = effectiveUrl
    ? getRecommendedRecipient(effectiveUrl)
    : null;

  // Auto-populate recipient email from platform detection
  useEffect(() => {
    if (recommendedRecipient?.email && !recipientEmail) {
      setRecipientEmail(recommendedRecipient.email);
    }
  }, [recommendedRecipient?.email]);

  const handleInfringementTypeToggle = (type: string) => {
    if (infringementTypes.includes(type)) {
      setInfringementTypes(infringementTypes.filter((t) => t !== type));
    } else {
      setInfringementTypes([...infringementTypes, type]);
    }
  };

  // Generate the DMCA letter when entering step 4
  const generateLetter = () => {
    const notice = generateDMCANotice({
      copyrightHolder: contactName,
      copyrightHolderEmail: contactEmail,
      copyrightHolderAddress: contactAddress || undefined,
      copyrightHolderPhone: contactPhone || undefined,
      productName: selectedProductData?.name || '',
      productType: selectedProductData?.type || undefined,
      productUrl: selectedProductData?.url || '',
      infringingUrl: effectiveUrl,
      platformName: prefilledInfringement?.platform || platformInfo?.name || 'Unknown',
      recipientName: recommendedRecipient?.recipient,
      infringementTypes,
      tone,
      additionalEvidence,
      ipOwnership: {
        copyright_date: copyrightDate,
        license_info: licenseInfo,
        ip_claims: ipClaims,
        first_published_date: selectedProductData?.created_at,
      },
      infrastructure: prefilledInfringement?.infrastructure || undefined,
      signature: signatureName ? {
        full_name: signatureName,
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      } : undefined,
    });
    setGeneratedNotice(notice);
  };

  const goToStep4 = () => {
    generateLetter();
    setStep(4);
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
          notice_content: generatedNotice,
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
          infringing_url: effectiveUrl,
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
        if (onSuccess) {
          onSuccess(data.takedown_id);
        } else {
          alert('DMCA takedown notice created successfully!');
          router.push(`/dashboard/takedowns/${data.takedown_id}`);
        }
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
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8">
      {[1, 2, 3, 4].map((s) => (
        <div key={s} className="flex items-center gap-1.5 sm:gap-2">
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base ${
              s === step
                ? 'bg-pg-accent text-white'
                : s < step
                ? 'bg-green-500 text-white'
                : 'bg-pg-surface text-pg-text-muted border border-pg-border'
            }`}
          >
            {s < step ? '✓' : s}
          </div>
          {s < 4 && <div className={`w-6 sm:w-12 h-1 ${s < step ? 'bg-green-500' : 'bg-pg-border'}`} />}
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
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-pg-text">Step 1: Product & IP Ownership</h2>

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
              {mergedProducts.map((product) => (
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

          {/* Manual URL Input (when not coming from an infringement) */}
          {isManualEntry && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-pg-text mb-2">
                Infringing URL <span className="text-pg-danger">*</span>
              </label>
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="input-field w-full"
                placeholder="https://example.com/infringing-page"
              />
              <p className="text-xs text-pg-text-muted mt-1">
                Enter the URL where you found the unauthorized copy of your product
              </p>
              {manualUrl && platformInfo && (
                <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-sm text-pg-text">
                    Platform detected: <strong>{platformInfo.name}</strong>
                  </p>
                  {recommendedRecipient?.email && (
                    <p className="text-xs text-pg-text-muted mt-1">
                      Recommended recipient: {recommendedRecipient.email}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

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

          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedProduct || (isManualEntry && !manualUrl)}
            >
              Next: Infringement Type →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Infringement Type Selection */}
      {step === 2 && (
        <Card>
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-pg-text">Step 2: Infringement Type</h2>
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
              Next: Evidence & Delivery →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Evidence, Tone & Email Configuration */}
      {step === 3 && (
        <Card>
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-pg-text">Step 3: Evidence & Delivery</h2>

          {effectiveUrl && (
            <div className="mb-6 space-y-4">
              <div className="p-4 rounded-lg bg-pg-bg border border-pg-border">
                <h3 className="text-sm font-semibold text-pg-text mb-2">Infringing URL</h3>
                <a
                  href={effectiveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pg-accent hover:underline break-all text-sm"
                >
                  {effectiveUrl}
                </a>
                {isManualEntry && (
                  <p className="text-xs text-pg-text-muted mt-1">Manually reported URL</p>
                )}
              </div>

              {/* Platform Detection */}
              {platformInfo && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-start gap-3">
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
                          {platformInfo.instructions}
                        </p>
                      )}
                      {platformInfo.responseTime && (
                        <p className="text-xs text-pg-text-muted mt-1">
                          Typical response: {platformInfo.responseTime}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evidence */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-pg-text mb-2">
              Additional Evidence & Details
            </label>
            <textarea
              value={additionalEvidence}
              onChange={(e) => setAdditionalEvidence(e.target.value)}
              rows={10}
              className="input-field w-full font-mono text-sm"
              placeholder={`Evidence from the infringement scan will be auto-populated here.\n\nYou can edit, add, or modify any content to strengthen your case.`}
            />
            <p className="text-xs text-pg-text-muted mt-1">
              {prefilledInfringement ? (
                <span className="text-green-500">✓ Evidence auto-populated from scan results. Review and modify as needed.</span>
              ) : (
                <span>Be specific and factual. Include dates, comparisons, and concrete evidence.</span>
              )}
            </p>
          </div>

          {/* Tone Selection */}
          <div className="mb-6 pb-6 border-b border-pg-border">
            <h3 className="text-lg font-semibold text-pg-text mb-3">Notice Tone</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TONE_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setTone(option.value)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
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
                      <p className="font-semibold text-pg-text text-sm">{option.label}</p>
                      <p className="text-xs text-pg-text-muted">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Email Configuration */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-pg-text mb-3">Email Delivery</h3>

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
              <div className="p-3 rounded bg-pg-bg border border-pg-border">
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

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button onClick={goToStep4}>
              Next: Review Letter →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Full DMCA Letter Review & Send */}
      {step === 4 && (
        <Card>
          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-pg-text">Step 4: Review & Send</h2>
          <p className="text-sm text-pg-text-muted mb-6">
            Review the DMCA notice below. You can edit the text before sending.
          </p>

          {/* Editable DMCA Letter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-pg-text mb-2">
              DMCA Takedown Notice
            </label>
            <textarea
              value={generatedNotice}
              onChange={(e) => setGeneratedNotice(e.target.value)}
              rows={24}
              className="input-field w-full font-mono text-xs leading-relaxed"
              style={{ whiteSpace: 'pre-wrap' }}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-pg-text-muted">
                This is the exact text that will be sent. Edit as needed.
              </p>
              <button
                onClick={generateLetter}
                className="text-xs text-pg-accent hover:underline"
              >
                Regenerate from form data
              </button>
            </div>
          </div>

          {/* Signature Section */}
          <div className="mb-6 p-4 sm:p-6 rounded-lg bg-gradient-to-br from-pg-accent/5 to-blue-500/5 border-2 border-pg-accent/30">
            <h3 className="text-base sm:text-lg font-semibold text-pg-text mb-2">Electronic Signature (Required)</h3>
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
                <p className="font-semibold mb-1">Legal Validity</p>
                <p>
                  Your typed signature with consent checkbox constitutes a legally binding electronic
                  signature under the ESIGN Act (15 U.S.C. § 7001). The signature timestamp and IP
                  address will be logged for verification purposes.
                </p>
              </div>
            </div>
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
              {isSubmitting ? 'Submitting...' : 'Submit DMCA Takedown'}
            </Button>
          </div>
          {(!signatureName || !signatureConsent) && (
            <p className="text-sm text-pg-warning mt-2 text-center">
              You must provide your electronic signature and certify the information to submit
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
