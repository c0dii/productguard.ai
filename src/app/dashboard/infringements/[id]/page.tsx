import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InfringementActions } from '@/components/dashboard/InfringementActions';
import { EvidenceDisplay } from '@/components/dashboard/EvidenceDisplay';
import { BlockchainTimestamp } from '@/components/dashboard/BlockchainTimestamp';
import { EnforcementPlan } from '@/components/dmca/EnforcementPlan';
import { ReassignProductButton } from '@/components/dashboard/ReassignProductButton';
import type { Infringement } from '@/types';
import { isGenericKeyword, isEvidenceWorthy } from '@/lib/utils/keyword-quality';

/** Unified evidence item used for the evidence display component */
export interface EvidenceItem {
  id: string;
  type: 'exact_phrase' | 'brand_match' | 'keyword_match' | 'copyrighted_term';
  original: string;
  infringing: string;
  context?: string;
  legalSignificance?: 'critical' | 'strong' | 'supporting';
  explanation?: string;
  dmcaLanguage?: string;
  confidence?: number;
}

type MatchType = EvidenceItem['type'];

/** Map AI analysis type strings to our display types */
function mapAIType(aiType: string): MatchType {
  switch (aiType) {
    case 'brand_usage': return 'brand_match';
    case 'exact_reproduction': return 'exact_phrase';
    case 'unique_phrase': return 'exact_phrase';
    case 'content_structure': return 'exact_phrase';
    case 'copyrighted_content': return 'copyrighted_term';
    case 'pricing_copy': return 'keyword_match';
    case 'keyword_cluster': return 'keyword_match';
    default: return 'exact_phrase';
  }
}

/**
 * Build content comparison matches by comparing product AI data against
 * captured infringing page text. This generates "Original vs Infringing"
 * evidence items.
 */
function buildContentMatches(
  product: {
    name: string;
    brand_name?: string;
    ai_extracted_data?: {
      unique_phrases?: string[];
      brand_identifiers?: string[];
      copyrighted_terms?: string[];
      keywords?: string[];
      product_description?: string | null;
    } | null;
    description?: string | null;
  },
  capturedText: string,
  evidenceMatches?: Array<{ type?: string; matched_text?: string; context?: string }>,
) {
  const matches: Array<{
    type: MatchType;
    original: string;
    infringing: string;
    context?: string;
  }> = [];
  const seen = new Set<string>();

  const normalizedText = capturedText.toLowerCase();

  const addMatch = (
    type: MatchType,
    original: string,
    infringing: string,
    context?: string,
  ) => {
    const key = original.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      matches.push({ type, original, infringing, context });
    }
  };

  const ai = product.ai_extracted_data;

  if (ai && normalizedText.length > 0) {
    // 1. Unique phrase matches (strongest evidence)
    if (ai.unique_phrases) {
      for (const phrase of ai.unique_phrases) {
        if (normalizedText.includes(phrase.toLowerCase())) {
          // Find surrounding context from the captured text
          const idx = normalizedText.indexOf(phrase.toLowerCase());
          const start = Math.max(0, idx - 40);
          const end = Math.min(capturedText.length, idx + phrase.length + 40);
          const surrounding = capturedText.slice(start, end).trim();

          addMatch(
            'exact_phrase',
            phrase,
            phrase,
            `Found in context: "...${surrounding}..."`,
          );
        }
      }
    }

    // 2. Brand identifier matches
    if (ai.brand_identifiers) {
      for (const brand of ai.brand_identifiers) {
        if (normalizedText.includes(brand.toLowerCase())) {
          addMatch(
            'brand_match',
            brand,
            brand,
            'Trademark/brand name used without authorization',
          );
        }
      }
    }

    // 3. Copyrighted term matches
    if (ai.copyrighted_terms) {
      for (const term of ai.copyrighted_terms) {
        const cleanTerm = term.replace(/[®™©]/g, '').trim();
        if (cleanTerm.length > 2 && normalizedText.includes(cleanTerm.toLowerCase())) {
          addMatch(
            'copyrighted_term',
            term,
            cleanTerm,
            'Protected content reproduced without license',
          );
        }
      }
    }
  }

  // 4. Evidence extractor matches (from scan-time AI analysis)
  if (evidenceMatches) {
    for (const match of evidenceMatches) {
      if (match.matched_text && match.matched_text.length > 10) {
        const type = match.type === 'brand_mention'
          ? 'brand_match' as const
          : match.type === 'copyrighted_content'
          ? 'copyrighted_term' as const
          : 'exact_phrase' as const;

        addMatch(
          type,
          match.matched_text,
          match.matched_text,
          match.context,
        );
      }
    }
  }

  // 5. Keyword overlap calculation — only count product-specific keywords
  const allKeywords = (ai?.keywords || []).filter(kw => !isGenericKeyword(kw));
  const matchedKeywords = allKeywords.filter(kw =>
    normalizedText.includes(kw.toLowerCase()),
  );

  return {
    matches,
    keywordOverlap: allKeywords.length > 0
      ? { matched: matchedKeywords, total: allKeywords.length }
      : undefined,
  };
}

/**
 * Categorize raw matched_excerpts from scan against product data.
 * Used when no captured page text exists (pre-verification).
 */
function categorizeRawEvidence(
  product: {
    name: string;
    brand_name?: string;
    ai_extracted_data?: {
      unique_phrases?: string[];
      brand_identifiers?: string[];
      copyrighted_terms?: string[];
      keywords?: string[];
    } | null;
  },
  evidence: {
    matched_excerpts?: string[];
    matches?: Array<{ type?: string; matched_text?: string; context?: string }>;
  } | null,
): EvidenceItem[] {
  if (!evidence) return [];

  const items: EvidenceItem[] = [];
  const seen = new Set<string>();
  const ai = product.ai_extracted_data;

  const addItem = (type: MatchType, original: string, infringing: string, context: string) => {
    const key = `${original.toLowerCase()}::${infringing.slice(0, 50).toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push({ id: `raw-${items.length}`, type, original, infringing, context });
    }
  };

  // Process matched_excerpts from scan
  const excerpts = evidence.matched_excerpts || [];
  for (const excerpt of excerpts) {
    if (!excerpt || excerpt.length < 5) continue;
    const normalized = excerpt.toLowerCase();
    let matched = false;

    // Check product name
    if (product.name && normalized.includes(product.name.toLowerCase())) {
      addItem('brand_match', product.name, excerpt, 'Product name found on infringing page');
      matched = true;
    }

    // Check brand name
    if (!matched && product.brand_name && normalized.includes(product.brand_name.toLowerCase())) {
      addItem('brand_match', product.brand_name, excerpt, 'Brand name found on infringing page');
      matched = true;
    }

    // Check brand identifiers
    if (!matched && ai?.brand_identifiers) {
      for (const brand of ai.brand_identifiers) {
        if (normalized.includes(brand.toLowerCase())) {
          addItem('brand_match', brand, excerpt, 'Brand identifier found on infringing page');
          matched = true;
          break;
        }
      }
    }

    // Check unique phrases
    if (!matched && ai?.unique_phrases) {
      for (const phrase of ai.unique_phrases) {
        if (normalized.includes(phrase.toLowerCase())) {
          addItem('exact_phrase', phrase, excerpt, 'Unique phrase from your product found on infringing page');
          matched = true;
          break;
        }
      }
    }

    // Check copyrighted terms
    if (!matched && ai?.copyrighted_terms) {
      for (const term of ai.copyrighted_terms) {
        const clean = term.replace(/[®™©]/g, '').trim();
        if (clean.length > 2 && normalized.includes(clean.toLowerCase())) {
          addItem('copyrighted_term', term, excerpt, 'Copyrighted content found on infringing page');
          matched = true;
          break;
        }
      }
    }

    // Check keywords — only product-specific ones, not generic industry terms
    if (!matched && ai?.keywords) {
      for (const kw of ai.keywords) {
        if (kw.length > 2 && !isGenericKeyword(kw) && normalized.includes(kw.toLowerCase())) {
          addItem('keyword_match', kw, excerpt, 'Product keyword found on infringing page');
          matched = true;
          break;
        }
      }
    }

    // Fallback: still include as content match
    if (!matched) {
      addItem('exact_phrase', 'Matching Content', excerpt, 'Content from infringing page matching your product');
    }
  }

  // Process structured matches array (from enhanced scan)
  if (evidence.matches) {
    for (const match of evidence.matches) {
      if (match.matched_text && match.matched_text.length > 5) {
        const type: MatchType = match.type === 'brand_mention'
          ? 'brand_match'
          : match.type === 'copyrighted_content'
          ? 'copyrighted_term'
          : match.type === 'keyword_match'
          ? 'keyword_match'
          : 'exact_phrase';

        addItem(type, match.matched_text, match.matched_text, match.context || 'Found on infringing page');
      }
    }
  }

  return items;
}

/**
 * Build unified evidence items from all available sources.
 * Priority: AI analysis > content matches > raw categorized evidence
 */
function buildUnifiedEvidence(
  aiAnalysis: any | null,
  contentMatches: Array<{ type: MatchType; original: string; infringing: string; context?: string }>,
  rawItems: EvidenceItem[],
): EvidenceItem[] {
  // Priority 1: AI analysis matches (richest data with DMCA language)
  if (aiAnalysis?.matches?.length > 0) {
    return aiAnalysis.matches.map((m: any, i: number) => ({
      id: `ai-${i}`,
      type: mapAIType(m.type),
      original: m.original_text,
      infringing: m.infringing_text,
      context: m.context,
      legalSignificance: m.legal_significance,
      explanation: m.explanation,
      dmcaLanguage: m.dmca_language,
      confidence: m.confidence,
    }));
  }

  // Priority 2: Content comparison matches (from captured text analysis)
  if (contentMatches.length > 0) {
    return contentMatches.map((m, i) => ({
      id: `cm-${i}`,
      type: m.type,
      original: m.original,
      infringing: m.infringing,
      context: m.context,
    }));
  }

  // Priority 3: Categorized raw evidence
  return rawItems;
}

export default async function InfringementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch infringement with full product data (including AI extracted data)
  const { data: infringement, error } = await supabase
    .from('infringements')
    .select('*, products(name, price, type, brand_name, url, description, ai_extracted_data, keywords)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !infringement) {
    redirect('/dashboard/infringements');
  }

  // Fetch evidence snapshot if infringement is verified
  let evidenceSnapshot: any = null;
  if (infringement.evidence_snapshot_id) {
    const { data } = await supabase
      .from('evidence_snapshots')
      .select('*')
      .eq('id', infringement.evidence_snapshot_id)
      .eq('user_id', user.id)
      .single();

    evidenceSnapshot = data;
  }

  // Fetch existing takedowns for this infringement (for enforcement plan sent status)
  const { data: sentTakedowns } = await supabase
    .from('takedowns')
    .select('id, recipient_email, sent_at, status, created_at')
    .eq('infringement_id', id)
    .in('status', ['sent', 'acknowledged', 'removed']);

  // Build content comparison data from product AI data + captured page text
  const capturedText =
    evidenceSnapshot?.page_capture?.page_text ||
    '';
  const evidenceMatches =
    evidenceSnapshot?.evidence_matches ||
    infringement.evidence?.matches ||
    [];

  const product = infringement.products || {};
  // Also check if product AI data was stored in snapshot (for historical accuracy)
  const productAiData = evidenceSnapshot?.product_ai_data || product.ai_extracted_data;
  const productForComparison = {
    ...product,
    ai_extracted_data: productAiData,
  };

  const { matches: contentMatches, keywordOverlap } = capturedText.length > 0
    ? buildContentMatches(productForComparison, capturedText, evidenceMatches)
    : { matches: [], keywordOverlap: undefined };

  // Categorize raw evidence (for pre-verification fallback)
  const rawEvidenceItems = categorizeRawEvidence(productForComparison, infringement.evidence);

  // Build unified evidence items from all sources
  const aiAnalysis = evidenceSnapshot?.ai_evidence_analysis || null;
  const evidenceItems = buildUnifiedEvidence(aiAnalysis, contentMatches, rawEvidenceItems);

  // Calculate keyword overlap for raw evidence too (when no captured text)
  // Filter out generic keywords so only product-specific terms are counted
  const allProductKeywords = (productForComparison.ai_extracted_data?.keywords || [])
    .filter((kw: string) => !isGenericKeyword(kw));
  const rawKeywordOverlap = !keywordOverlap && allProductKeywords.length > 0 && infringement.evidence?.matched_excerpts
    ? (() => {
        const allText = (infringement.evidence.matched_excerpts || []).join(' ').toLowerCase();
        const matched = allProductKeywords.filter((kw: string) => allText.includes(kw.toLowerCase()));
        return matched.length > 0 ? { matched, total: allProductKeywords.length } : undefined;
      })()
    : undefined;

  const finalKeywordOverlap = keywordOverlap || rawKeywordOverlap;

  // Build external verification links
  const externalLinks: Array<{ label: string; url: string; icon: string; description: string }> = [];

  if (evidenceSnapshot?.page_capture?.wayback_url) {
    externalLinks.push({
      label: 'Wayback Machine Archive',
      url: evidenceSnapshot.page_capture.wayback_url,
      icon: '🌐',
      description: 'Independent third-party archive by Internet Archive — proves page content at time of capture',
    });
  }

  if (evidenceSnapshot?.timestamp_proof) {
    try {
      const proof = JSON.parse(evidenceSnapshot.timestamp_proof);
      if (proof.verification_url) {
        externalLinks.push({
          label: 'Bitcoin Blockchain Verification',
          url: proof.verification_url,
          icon: '₿',
          description: `Evidence hash anchored to Bitcoin blockchain via OpenTimestamps — ${
            proof.status === 'confirmed'
              ? `confirmed in block #${proof.bitcoin_block?.toLocaleString() || 'N/A'}`
              : 'pending confirmation'
          }`,
        });
      }
    } catch {
      // Ignore parse error
    }
  }

  if (infringement.source_url) {
    externalLinks.push({
      label: 'View Infringing Page (Live)',
      url: infringement.source_url,
      icon: '🔗',
      description: 'Open the current live page — content may have changed since evidence was captured',
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <Link href="/dashboard/infringements" className="text-sm text-pg-accent hover:underline mb-3 sm:mb-4 inline-block">
          ← Back to Infringements
        </Link>
        <h1 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2 text-pg-text">Infringement Details</h1>
        <p className="text-xs sm:text-sm text-pg-text-muted">Review and take action on this infringement</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Infringement Details */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Product Info */}
          <Card>
            <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4 text-pg-text">Product Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-pg-text-muted">Product Name</dt>
                <dd className="text-pg-text font-semibold mt-1">
                  <Link href={`/dashboard/products/${infringement.product_id}`} className="text-pg-accent hover:underline">
                    {product?.name || 'Unknown Product'}
                  </Link>
                </dd>
              </div>
              {product?.brand_name && (
                <div>
                  <dt className="text-sm text-pg-text-muted">Brand</dt>
                  <dd className="text-pg-text font-semibold mt-1">{product.brand_name}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-pg-text-muted">Product Type</dt>
                <dd className="text-pg-text font-semibold mt-1 capitalize">{product?.type}</dd>
              </div>
              <div>
                <dt className="text-sm text-pg-text-muted">Product Price</dt>
                <dd className="text-pg-text font-semibold mt-1">${product?.price}</dd>
              </div>
            </dl>
          </Card>

          {/* Infringement Details */}
          <Card>
            <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4 text-pg-text">Infringement Details</h2>
            <dl className="space-y-3 sm:space-y-4">
              <div>
                <dt className="text-sm text-pg-text-muted">Infringing URL</dt>
                <dd className="mt-1">
                  <a
                    href={infringement.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pg-accent hover:underline break-all"
                  >
                    {infringement.source_url}
                  </a>
                </dd>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <dt className="text-xs sm:text-sm text-pg-text-muted">Current Status</dt>
                  <dd className="mt-1">
                    <Badge
                      variant={
                        infringement.status === 'active'
                          ? 'critical'
                          : infringement.status === 'takedown_sent'
                          ? 'medium'
                          : 'default'
                      }
                      className="capitalize"
                    >
                      {infringement.status === 'takedown_sent' ? 'Takedown Sent' : infringement.status}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-pg-text-muted">Risk Level</dt>
                  <dd className="mt-1">
                    <Badge variant={infringement.risk_level as any} className="capitalize">
                      {infringement.risk_level}
                    </Badge>
                  </dd>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <dt className="text-sm text-pg-text-muted">Platform</dt>
                  <dd className="mt-1">
                    <Badge variant="default" className="capitalize">{infringement.platform}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-pg-text-muted">Priority</dt>
                  <dd className="mt-1">
                    <Badge variant="default" className="capitalize">{infringement.priority}</Badge>
                  </dd>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <dt className="text-sm text-pg-text-muted">Severity Score</dt>
                  <dd className="text-pg-text font-semibold mt-1">{infringement.severity_score}/100</dd>
                </div>
                <div>
                  <dt className="text-sm text-pg-text-muted">Audience Size</dt>
                  <dd className="text-pg-text font-semibold mt-1 capitalize">{infringement.audience_size || 'Unknown'}</dd>
                </div>
              </div>

              {/* Technical Infrastructure Details */}
              {infringement.infrastructure && (
                <div className="p-4 rounded-lg bg-pg-bg border border-pg-border space-y-3">
                  <h3 className="text-sm font-semibold text-pg-text mb-3">Infrastructure Details</h3>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {infringement.infrastructure.ip_address && (
                      <div>
                        <dt className="text-xs text-pg-text-muted">IP Address</dt>
                        <dd className="text-sm text-pg-text font-mono mt-1">{infringement.infrastructure.ip_address}</dd>
                      </div>
                    )}
                    {infringement.infrastructure.hosting_provider && (
                      <div>
                        <dt className="text-xs text-pg-text-muted">Hosting Provider</dt>
                        <dd className="text-sm text-pg-text font-semibold mt-1">{infringement.infrastructure.hosting_provider}</dd>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {infringement.infrastructure.country && (
                      <div>
                        <dt className="text-xs text-pg-text-muted">Location</dt>
                        <dd className="text-sm text-pg-text font-semibold mt-1">
                          {infringement.infrastructure.city && `${infringement.infrastructure.city}, `}
                          {infringement.infrastructure.region && `${infringement.infrastructure.region}, `}
                          {infringement.infrastructure.country}
                        </dd>
                      </div>
                    )}
                    {infringement.infrastructure.asn && (
                      <div>
                        <dt className="text-xs text-pg-text-muted">ASN</dt>
                        <dd className="text-sm text-pg-text font-mono mt-1">
                          {infringement.infrastructure.asn}
                          {infringement.infrastructure.asn_org && (
                            <span className="block text-xs text-pg-text-muted mt-0.5">{infringement.infrastructure.asn_org}</span>
                          )}
                        </dd>
                      </div>
                    )}
                  </div>

                  {(infringement.infrastructure.registrar || infringement.infrastructure.cdn) && (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {infringement.infrastructure.registrar && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">Domain Registrar</dt>
                          <dd className="text-sm text-pg-text font-semibold mt-1">{infringement.infrastructure.registrar}</dd>
                        </div>
                      )}
                      {infringement.infrastructure.cdn && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">CDN</dt>
                          <dd className="text-sm text-pg-text font-semibold mt-1">{infringement.infrastructure.cdn}</dd>
                        </div>
                      )}
                    </div>
                  )}

                  {(infringement.infrastructure.creation_date || infringement.infrastructure.expiration_date) && (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {infringement.infrastructure.creation_date && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">Domain Created</dt>
                          <dd className="text-sm text-pg-text mt-1">{new Date(infringement.infrastructure.creation_date).toLocaleDateString()}</dd>
                        </div>
                      )}
                      {infringement.infrastructure.expiration_date && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">Domain Expires</dt>
                          <dd className="text-sm text-pg-text mt-1">{new Date(infringement.infrastructure.expiration_date).toLocaleDateString()}</dd>
                        </div>
                      )}
                    </div>
                  )}

                  {infringement.infrastructure.abuse_contact && (
                    <div>
                      <dt className="text-xs text-pg-text-muted">Abuse Contact</dt>
                      <dd className="text-sm text-pg-accent mt-1">
                        <a href={`mailto:${infringement.infrastructure.abuse_contact}`} className="hover:underline">
                          {infringement.infrastructure.abuse_contact}
                        </a>
                      </dd>
                    </div>
                  )}
                </div>
              )}

              {/* Domain Registration (WHOIS) Details */}
              {infringement.whois_domain && (
                <div className="p-4 rounded-lg bg-pg-bg border border-pg-border space-y-3">
                  <h3 className="text-sm font-semibold text-pg-text mb-3">Domain Registration (WHOIS)</h3>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <dt className="text-xs text-pg-text-muted">Domain</dt>
                      <dd className="text-sm text-pg-text font-mono mt-1">{infringement.whois_domain}</dd>
                    </div>
                    {infringement.whois_domain_age_days && (
                      <div>
                        <dt className="text-xs text-pg-text-muted">Domain Age</dt>
                        <dd className="text-sm text-pg-text mt-1">{Math.floor(infringement.whois_domain_age_days / 365)} years</dd>
                      </div>
                    )}
                  </div>

                  {(infringement.whois_registrant_org || infringement.whois_registrant_country) && (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {infringement.whois_registrant_org && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">Registered To</dt>
                          <dd className="text-sm text-pg-text font-semibold mt-1">{infringement.whois_registrant_org}</dd>
                        </div>
                      )}
                      {infringement.whois_registrant_country && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">Registrant Country</dt>
                          <dd className="text-sm text-pg-text mt-1">{infringement.whois_registrant_country}</dd>
                        </div>
                      )}
                    </div>
                  )}

                  {infringement.whois_registrar_name && (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <dt className="text-xs text-pg-text-muted">Registrar</dt>
                        <dd className="text-sm text-pg-text font-semibold mt-1">{infringement.whois_registrar_name}</dd>
                      </div>
                      {infringement.whois_registrar_abuse_email && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">Abuse Contact</dt>
                          <dd className="text-sm text-pg-accent mt-1">
                            <a href={`mailto:${infringement.whois_registrar_abuse_email}`} className="hover:underline">
                              {infringement.whois_registrar_abuse_email}
                            </a>
                          </dd>
                        </div>
                      )}
                    </div>
                  )}

                  {(infringement.whois_created_date || infringement.whois_expires_date) && (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {infringement.whois_created_date && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">Registered On</dt>
                          <dd className="text-sm text-pg-text mt-1">{new Date(infringement.whois_created_date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</dd>
                        </div>
                      )}
                      {infringement.whois_expires_date && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">Expires On</dt>
                          <dd className="text-sm text-pg-text mt-1">{new Date(infringement.whois_expires_date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</dd>
                        </div>
                      )}
                    </div>
                  )}

                  {infringement.whois_name_servers && infringement.whois_name_servers.length > 0 && (
                    <div>
                      <dt className="text-xs text-pg-text-muted">Name Servers</dt>
                      <dd className="text-sm text-pg-text font-mono mt-1">
                        {infringement.whois_name_servers.slice(0, 4).map((ns: string, i: number) => (
                          <div key={i}>{ns}</div>
                        ))}
                      </dd>
                    </div>
                  )}

                  {infringement.whois_fetched_at && (
                    <div className="text-xs text-pg-text-muted pt-2 border-t border-pg-border">
                      WHOIS data fetched: {new Date(infringement.whois_fetched_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <dt className="text-sm text-pg-text-muted">First Detected</dt>
                  <dd className="text-pg-text mt-1">
                    <span className="font-semibold">{new Date(infringement.first_seen_at || infringement.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}</span>
                    <span className="block text-xs text-pg-text-muted mt-0.5">
                      {new Date(infringement.first_seen_at || infringement.created_at).toLocaleString('en-US', {
                        timeZoneName: 'short'
                      }).split(', ').pop()}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-pg-text-muted">Last Seen</dt>
                  <dd className="text-pg-text mt-1">
                    <span className="font-semibold">{new Date(infringement.last_seen_at || infringement.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}</span>
                    <span className="block text-xs text-pg-text-muted mt-0.5">
                      {new Date(infringement.last_seen_at || infringement.created_at).toLocaleString('en-US', {
                        timeZoneName: 'short'
                      }).split(', ').pop()}
                    </span>
                  </dd>
                </div>
              </div>

              {infringement.seen_count > 1 && (
                <div>
                  <dt className="text-sm text-pg-text-muted">Times Detected</dt>
                  <dd className="text-pg-text font-semibold mt-1">{infringement.seen_count}x (across multiple scans)</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Unified Evidence Section — categorized with checkboxes for DMCA */}
          <EvidenceDisplay
            infringementId={infringement.id}
            productName={product?.name || 'Product'}
            items={evidenceItems}
            keywordOverlap={finalKeywordOverlap}
            aiSummary={aiAnalysis?.summary}
            strengthScore={aiAnalysis?.strength_score}
            dmcaReady={aiAnalysis?.recommended_for_dmca}
            externalLinks={externalLinks}
            contentHash={evidenceSnapshot?.content_hash}
            capturedAt={evidenceSnapshot?.captured_at}
            pageTitle={infringement.evidence?.page_title}
            pageDescription={infringement.evidence?.page_description}
          />

          {/* Blockchain Timestamp (if verified) */}
          {evidenceSnapshot?.timestamp_proof && (
            <BlockchainTimestamp timestampProof={evidenceSnapshot.timestamp_proof} />
          )}
        </div>

        {/* Right Column: Actions */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <Card className="sticky top-6">
            {infringement.status === 'pending_verification' ? (
              <>
                <h2 className="text-lg sm:text-xl font-bold mb-2 text-pg-text">Is This Your Content?</h2>
                <p className="text-xs sm:text-sm text-pg-text-muted mb-3 sm:mb-4">
                  Review the URL and details on the left. Does this page contain your copyrighted material without authorization?
                </p>
                <InfringementActions
                  infringementId={infringement.id}
                  sourceUrl={infringement.source_url}
                  isResolved={false}
                  isPending={true}

                  productId={infringement.product_id}
                />
                <div className="mt-4 pt-3 border-t border-pg-border">
                  <p className="text-xs text-pg-text-muted mb-2">
                    Wrong product? Link this finding to a different product instead.
                  </p>
                  <ReassignProductButton
                    infringementId={infringement.id}
                    currentProductId={infringement.product_id}
                    currentProductName={product?.name || 'Unknown Product'}
                    sourceUrl={infringement.source_url}
                  />
                </div>
              </>
            ) : infringement.status === 'removed' || infringement.status === 'false_positive' || infringement.status === 'archived' ? (
              <>
                <h2 className="text-lg sm:text-xl font-bold mb-2 text-pg-text">
                  {infringement.status === 'archived' ? 'Archived' : 'Resolved'}
                </h2>
                <p className="text-sm text-pg-text-muted mb-4">
                  {infringement.status === 'removed' ? 'This infringement has been resolved.'
                    : infringement.status === 'archived' ? 'This URL has been archived as your approved content. Future scans will skip it.'
                    : 'This infringement has been dismissed.'}
                </p>
                <InfringementActions
                  infringementId={infringement.id}
                  sourceUrl={infringement.source_url}
                  isResolved={infringement.status === 'removed'}
                  isPending={false}

                  productId={infringement.product_id}
                />
                <div className="mt-4 pt-3 border-t border-pg-border">
                  <ReassignProductButton
                    infringementId={infringement.id}
                    currentProductId={infringement.product_id}
                    currentProductName={product?.name || 'Unknown Product'}
                    sourceUrl={infringement.source_url}
                  />
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg sm:text-xl font-bold mb-2 text-pg-text">Take Action</h2>
                <p className="text-sm text-pg-text-muted mb-4">
                  This infringement is confirmed. Follow the enforcement plan below to protect your IP.
                </p>
                <EnforcementPlan
                  infringementId={infringement.id}
                  productName={product?.name || 'Product'}
                  infringementUrl={infringement.source_url}
                  status={infringement.status}
                  platform={infringement.platform}
                  sentTakedowns={sentTakedowns || []}
                />
                <div className="border-t border-pg-border pt-3 mt-4">
                  <InfringementActions
                    infringementId={infringement.id}
                    sourceUrl={infringement.source_url}
                    isResolved={false}
                    isPending={false}
  
                    productId={infringement.product_id}
                  />
                </div>
                <div className="border-t border-pg-border pt-3 mt-1">
                  <ReassignProductButton
                    infringementId={infringement.id}
                    currentProductId={infringement.product_id}
                    currentProductName={product?.name || 'Unknown Product'}
                    sourceUrl={infringement.source_url}
                  />
                </div>
              </>
            )}
          </Card>

          {/* Evidence Snapshot - Comprehensive Breakdown */}
          {infringement.status !== 'pending_verification' && infringement.status !== 'false_positive' && evidenceSnapshot && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-pg-text">Evidence Snapshot</h2>
                  <p className="text-xs text-pg-text-muted">
                    {new Date(evidenceSnapshot.captured_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {/* Content Hash / Fingerprint */}
                <div className="p-3 rounded-lg bg-pg-bg border border-pg-border">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-pg-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                    <span className="font-semibold text-pg-text">SHA-256 Fingerprint</span>
                  </div>
                  <code className="text-xs text-pg-text-muted font-mono break-all block mt-1">
                    {evidenceSnapshot.content_hash}
                  </code>
                </div>

                {/* Checklist items */}
                {evidenceSnapshot.page_hash && (
                  <SnapshotCheckItem label="Full HTML Captured" detail={`Page hash: ${evidenceSnapshot.page_hash.slice(0, 16)}...`} />
                )}

                {evidenceSnapshot.page_title && (
                  <SnapshotCheckItem label="Page Title Recorded" detail={`"${evidenceSnapshot.page_title}"`} />
                )}

                {evidenceSnapshot.page_capture?.page_text && (
                  <SnapshotCheckItem
                    label="Page Text Extracted"
                    detail={`${Math.round(evidenceSnapshot.page_capture.page_text.length / 1000)}KB of visible text preserved`}
                  />
                )}

                {evidenceSnapshot.page_capture?.page_links?.length > 0 && (
                  <SnapshotCheckItem
                    label={`${evidenceSnapshot.page_capture.page_links.length} Links Captured`}
                    detail="All outbound links on the infringing page recorded"
                  />
                )}

                {(evidenceSnapshot.html_archive_url || evidenceSnapshot.page_capture?.html_storage_path) && (
                  <SnapshotCheckItem
                    label="HTML Archived to Secure Storage"
                    detail="Raw HTML preserved in encrypted storage bucket"
                  />
                )}

                {evidenceSnapshot.page_capture?.wayback_url && (
                  <SnapshotCheckItem
                    label="Wayback Machine Archived"
                    detail="Independent third-party archive"
                    link={evidenceSnapshot.page_capture.wayback_url}
                    linkText="View on Wayback Machine"
                  />
                )}

                {evidenceSnapshot.timestamp_proof && (
                  <SnapshotCheckItem
                    label="Bitcoin Blockchain Timestamp"
                    detail="Evidence hash anchored to Bitcoin via OpenTimestamps"
                  />
                )}

                {evidenceSnapshot.infrastructure_snapshot && Object.keys(evidenceSnapshot.infrastructure_snapshot).length > 0 && (
                  <SnapshotCheckItem
                    label="Infrastructure Snapshot Frozen"
                    detail="IP, hosting, DNS, and WHOIS data locked at time of verification"
                  />
                )}

                {evidenceSnapshot.evidence_matches?.length > 0 && (
                  <SnapshotCheckItem
                    label={`${evidenceSnapshot.evidence_matches.length} Content Match${evidenceSnapshot.evidence_matches.length !== 1 ? 'es' : ''} Preserved`}
                    detail="Matched text excerpts frozen as evidence"
                  />
                )}

                {/* Product AI Data Stored */}
                {evidenceSnapshot.product_ai_data && (
                  <SnapshotCheckItem
                    label="Product Fingerprint Stored"
                    detail="Original product keywords, phrases, and brand data preserved for comparison"
                  />
                )}

                {evidenceSnapshot.chain_of_custody?.length > 0 && (
                  <SnapshotCheckItem
                    label={`Chain of Custody (${evidenceSnapshot.chain_of_custody.length} entries)`}
                    detail="Complete audit trail with IP addresses and timestamps"
                  />
                )}

                {evidenceSnapshot.attestation && (
                  <SnapshotCheckItem
                    label="Legal Attestation Signed"
                    detail={`Digital signature: ${evidenceSnapshot.attestation.signature?.slice(0, 16)}...`}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-pg-border">
                <p className="text-xs text-pg-text-muted">
                  This evidence package is cryptographically sealed and tamper-proof. Any modification to the original content will invalidate the SHA-256 fingerprint.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** Reusable check item for the evidence snapshot sidebar */
function SnapshotCheckItem({
  label,
  detail,
  link,
  linkText,
}: {
  label: string;
  detail: string;
  link?: string;
  linkText?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <div>
        <span className="text-pg-text font-medium text-sm">{label}</span>
        <p className="text-xs text-pg-text-muted mt-0.5">{detail}</p>
        {link && linkText && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-pg-accent hover:underline mt-1 inline-block"
          >
            {linkText} →
          </a>
        )}
      </div>
    </div>
  );
}
