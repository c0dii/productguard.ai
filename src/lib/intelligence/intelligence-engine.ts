/**
 * Intelligence Engine - Self-Improving Search & AI System
 *
 * Learns from user feedback (verify/reject) to:
 * 1. Improve search queries
 * 2. Refine AI filtering prompts
 * 3. Track accuracy metrics
 * 4. Suggest optimizations
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';

export interface LearningPattern {
  pattern_value: string;
  confidence_score: number;
  occurrences: number;
  verified_count: number;
}

export interface PerformanceMetrics {
  precision_rate: number; // verified / (verified + false_positives)
  total_detections: number;
  verified_infringements: number;
  false_positives: number;
  ai_pass_rate: number;
}

/**
 * Learn from user verification/rejection
 * Called automatically when user verifies or rejects an infringement
 */
export async function learnFromFeedback(
  infringementId: string,
  action: 'verify' | 'reject'
): Promise<void> {
  const supabase = await createClient();

  try {
    // Call database function to extract and store patterns
    const { error } = await supabase.rpc('learn_from_user_feedback', {
      p_infringement_id: infringementId,
      p_action: action,
    });

    if (error) {
      console.error('[Intelligence Engine] Error learning from feedback:', error);
    } else {
      console.log(`[Intelligence Engine] Learned from ${action} action on infringement ${infringementId}`);
    }
  } catch (error) {
    console.error('[Intelligence Engine] Exception in learnFromFeedback:', error);
  }
}

/**
 * Get top verified keywords for a product
 * Use these to improve search queries
 */
export async function getTopVerifiedKeywords(
  productId: string,
  limit: number = 10
): Promise<LearningPattern[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_top_patterns', {
    p_product_id: productId,
    p_pattern_type: 'verified_keyword',
    p_limit: limit,
  });

  if (error) {
    console.error('[Intelligence Engine] Error fetching verified keywords:', error);
    return [];
  }

  return data || [];
}

/**
 * Get domains that are frequently false positives
 * Use these to exclude from future searches
 */
export async function getFalsePositiveDomains(
  productId: string,
  limit: number = 10
): Promise<LearningPattern[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_top_patterns', {
    p_product_id: productId,
    p_pattern_type: 'false_positive_domain',
    p_limit: limit,
  });

  if (error) {
    console.error('[Intelligence Engine] Error fetching false positive domains:', error);
    return [];
  }

  return data || [];
}

/**
 * Generate optimized search query based on learned patterns.
 * Uses pre-fetched IntelligenceData to avoid additional DB calls during scans.
 */
export function optimizeSearchQueryFromIntelligence(
  baseQuery: string,
  intelligence: IntelligenceData,
): string {
  if (!intelligence.hasLearningData) return baseQuery;

  let optimizedQuery = baseQuery;

  // Add verified keywords to query (already high-confidence filtered)
  if (intelligence.verifiedKeywords.length > 0) {
    const topKeywords = intelligence.verifiedKeywords.slice(0, 2);
    optimizedQuery = `${baseQuery} ${topKeywords.join(' ')}`;
  }

  // Exclude known false positive domains
  if (intelligence.falsePositiveDomains.length > 0) {
    const excludeDomains = intelligence.falsePositiveDomains
      .slice(0, 3)
      .map(d => `-site:${d}`)
      .join(' ');
    optimizedQuery = `${optimizedQuery} ${excludeDomains}`;
  }

  return optimizedQuery;
}

/**
 * Generate optimized search query based on learned patterns.
 * @deprecated Use optimizeSearchQueryFromIntelligence() with pre-fetched data instead.
 */
export async function optimizeSearchQuery(
  product: Product,
  platform: string,
  baseQuery: string
): Promise<string> {
  const supabase = await createClient();

  // Get top verified keywords for this product
  const verifiedKeywords = await getTopVerifiedKeywords(product.id, 5);

  // Get false positive domains to exclude
  const falsePositiveDomains = await getFalsePositiveDomains(product.id, 5);

  let optimizedQuery = baseQuery;

  // Add high-confidence keywords to query
  if (verifiedKeywords.length > 0) {
    const topKeywords = verifiedKeywords
      .filter(k => k.confidence_score > 0.7) // Only high-confidence patterns
      .slice(0, 3)
      .map(k => k.pattern_value);

    if (topKeywords.length > 0) {
      optimizedQuery = `${baseQuery} ${topKeywords.join(' ')}`;
    }
  }

  // Exclude known false positive domains
  if (falsePositiveDomains.length > 0 && platform === 'google') {
    const excludeDomains = falsePositiveDomains
      .filter(d => d.confidence_score > 0.6)
      .map(d => `-site:${d.pattern_value}`)
      .join(' ');

    if (excludeDomains) {
      optimizedQuery = `${optimizedQuery} ${excludeDomains}`;
    }
  }

  // Store optimized query for tracking
  if (optimizedQuery !== baseQuery) {
    await supabase.from('optimized_queries').insert({
      product_id: product.id,
      platform,
      base_query: baseQuery,
      optimized_query: optimizedQuery,
      optimization_reason: `Added ${verifiedKeywords.length} verified keywords, excluded ${falsePositiveDomains.length} false positive domains`,
    });

    console.log(`[Intelligence Engine] Optimized query for ${platform}: "${baseQuery}" → "${optimizedQuery}"`);
  }

  return optimizedQuery;
}

/**
 * Generate AI prompt examples from verified vs rejected infringements
 * Includes rich context: platform, severity, infrastructure, match type
 */
export async function getAIPromptExamples(productId: string): Promise<{
  verified_examples: string[];
  false_positive_examples: string[];
}> {
  const supabase = await createClient();

  const selectFields = 'source_url, platform, severity_score, match_type, match_confidence, monetization_detected, infrastructure, evidence';

  // Get verified infringements (true positives)
  const { data: verified } = await supabase
    .from('infringements')
    .select(selectFields)
    .eq('product_id', productId)
    .eq('status', 'active')
    .not('verified_by_user_at', 'is', null)
    .order('severity_score', { ascending: false })
    .limit(5);

  // Get false positives
  const { data: falsePositives } = await supabase
    .from('infringements')
    .select(selectFields)
    .eq('product_id', productId)
    .eq('status', 'false_positive')
    .limit(5);

  const formatExample = (item: any, isFP: boolean) => {
    const parts = [`URL: ${item.source_url}`];
    if (item.platform) parts.push(`Platform: ${item.platform}`);
    if (item.severity_score) parts.push(`Severity: ${item.severity_score}/100`);
    if (item.match_type) parts.push(`Match: ${item.match_type}`);
    if (item.match_confidence) parts.push(`Confidence: ${(item.match_confidence * 100).toFixed(0)}%`);
    const hosting = item.infrastructure?.hosting_provider;
    if (hosting) parts.push(`Hosting: ${hosting}`);
    const country = item.infrastructure?.country;
    if (country) parts.push(`Country: ${country}`);
    if (item.monetization_detected) parts.push(`Monetized: yes`);
    const excerpts = item.evidence?.matched_excerpts;
    if (excerpts?.length) parts.push(`Contains: ${excerpts.join(', ')}`);
    if (isFP) parts.push('(NOT an infringement)');
    return parts.join(' | ');
  };

  return {
    verified_examples: (verified || []).map(v => formatExample(v, false)),
    false_positive_examples: (falsePositives || []).map(fp => formatExample(fp, true)),
  };
}

/**
 * Calculate performance metrics for a product
 */
export async function calculatePerformanceMetrics(productId: string): Promise<PerformanceMetrics> {
  const supabase = await createClient();

  // Get all infringements for this product
  const { data: infringements } = await supabase
    .from('infringements')
    .select('status, verified_by_user_at')
    .eq('product_id', productId);

  if (!infringements || infringements.length === 0) {
    return {
      precision_rate: 0,
      total_detections: 0,
      verified_infringements: 0,
      false_positives: 0,
      ai_pass_rate: 0,
    };
  }

  const total = infringements.length;
  const verified = infringements.filter(i =>
    i.status === 'active' && i.verified_by_user_at
  ).length;
  const falsePositives = infringements.filter(i =>
    i.status === 'false_positive'
  ).length;

  const precision = verified / (verified + falsePositives) || 0;

  return {
    precision_rate: precision,
    total_detections: total,
    verified_infringements: verified,
    false_positives: falsePositives,
    ai_pass_rate: verified / total || 0, // Simplified - could be more sophisticated
  };
}

/**
 * Store daily performance metrics
 */
export async function recordDailyMetrics(
  productId: string,
  userId: string,
  metrics: PerformanceMetrics
): Promise<void> {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  await supabase
    .from('ai_performance_metrics')
    .upsert({
      product_id: productId,
      user_id: userId,
      date: today,
      total_detections: metrics.total_detections,
      verified_infringements: metrics.verified_infringements,
      false_positives: metrics.false_positives,
      precision_rate: metrics.precision_rate,
      ai_pass_rate: metrics.ai_pass_rate,
    });

  console.log(`[Intelligence Engine] Recorded metrics for product ${productId}: Precision ${(metrics.precision_rate * 100).toFixed(1)}%`);
}

/**
 * Get suggested improvements for a product
 */
export async function getSuggestedImprovements(productId: string): Promise<string[]> {
  const metrics = await calculatePerformanceMetrics(productId);
  const suggestions: string[] = [];

  // Low precision = too many false positives
  if (metrics.precision_rate < 0.5 && metrics.false_positives > 5) {
    suggestions.push(
      `🔧 Precision is low (${(metrics.precision_rate * 100).toFixed(0)}%). Consider increasing AI confidence threshold or adding more specific keywords.`
    );
  }

  // High precision = good filtering
  if (metrics.precision_rate > 0.8) {
    suggestions.push(
      `✅ Excellent precision (${(metrics.precision_rate * 100).toFixed(0)}%)! Your filters are working well.`
    );
  }

  // Low detections = need broader search
  if (metrics.total_detections < 10 && metrics.verified_infringements < 3) {
    suggestions.push(
      `📊 Low detection count. Consider adding more keywords or enabling more platforms.`
    );
  }

  return suggestions;
}

// ── Admin-Client Functions (for background scan context) ──────────────

/**
 * Intelligence data bundle for scan-time query optimization.
 * Fetched once and passed to all platform scanners.
 */
export interface IntelligenceData {
  verifiedKeywords: string[];
  falsePositiveDomains: string[];
  /** Platforms (e.g. google, telegram) with high verified-infringement rates */
  verifiedPlatforms: string[];
  /** Hosting providers frequently associated with real infringements */
  verifiedHosting: string[];
  /** Countries frequently associated with real infringements */
  verifiedCountries: string[];
  /** Match types (e.g. keyword, exact_hash) that are most reliable */
  reliableMatchTypes: string[];
  /** Hosting providers frequently associated with false positives */
  falsePositiveHosting: string[];
  hasLearningData: boolean;
}

/**
 * Fetch intelligence data for a product using an admin client.
 * Call this ONCE before scanning, then pass the data to all platform scanners.
 */
export async function fetchIntelligenceForScan(
  supabase: SupabaseClient,
  productId: string
): Promise<IntelligenceData> {
  try {
    // Fetch all pattern types in parallel
    const [
      { data: keywordPatterns },
      { data: fpDomains },
      { data: platformPatterns },
      { data: hostingPatterns },
      { data: countryPatterns },
      { data: matchTypePatterns },
      { data: fpHostingPatterns },
    ] = await Promise.all([
      supabase.rpc('get_top_patterns', { p_product_id: productId, p_pattern_type: 'verified_keyword', p_limit: 10 }),
      supabase.rpc('get_top_patterns', { p_product_id: productId, p_pattern_type: 'false_positive_domain', p_limit: 10 }),
      supabase.rpc('get_top_patterns', { p_product_id: productId, p_pattern_type: 'verified_platform', p_limit: 10 }),
      supabase.rpc('get_top_patterns', { p_product_id: productId, p_pattern_type: 'verified_hosting', p_limit: 10 }),
      supabase.rpc('get_top_patterns', { p_product_id: productId, p_pattern_type: 'verified_country', p_limit: 10 }),
      supabase.rpc('get_top_patterns', { p_product_id: productId, p_pattern_type: 'verified_match_type', p_limit: 10 }),
      supabase.rpc('get_top_patterns', { p_product_id: productId, p_pattern_type: 'false_positive_hosting', p_limit: 10 }),
    ]);

    const extractValues = (data: any[] | null, minConfidence: number) =>
      (data || []).filter((p: any) => p.confidence_score > minConfidence).map((p: any) => p.pattern_value);

    const verifiedKeywords = extractValues(keywordPatterns, 0.7).slice(0, 5);
    const falsePositiveDomains = extractValues(fpDomains, 0.6);
    const verifiedPlatforms = extractValues(platformPatterns, 0.6);
    const verifiedHosting = extractValues(hostingPatterns, 0.6);
    const verifiedCountries = extractValues(countryPatterns, 0.6);
    const reliableMatchTypes = extractValues(matchTypePatterns, 0.7);
    const falsePositiveHosting = extractValues(fpHostingPatterns, 0.6);

    const hasLearningData = verifiedKeywords.length > 0 || falsePositiveDomains.length > 0
      || verifiedPlatforms.length > 0 || verifiedHosting.length > 0;

    if (hasLearningData) {
      console.log(
        `[Intelligence Engine] Loaded scan intelligence: ${verifiedKeywords.length} keywords, ${falsePositiveDomains.length} FP domains, ${verifiedPlatforms.length} platforms, ${verifiedHosting.length} hosting, ${verifiedCountries.length} countries, ${reliableMatchTypes.length} match types`
      );
    }

    return {
      verifiedKeywords, falsePositiveDomains, verifiedPlatforms,
      verifiedHosting, verifiedCountries, reliableMatchTypes,
      falsePositiveHosting, hasLearningData,
    };
  } catch (error) {
    // Intelligence fetch failures should never block scans
    console.warn('[Intelligence Engine] Failed to fetch intelligence data (non-blocking):', error);
    return {
      verifiedKeywords: [], falsePositiveDomains: [], verifiedPlatforms: [],
      verifiedHosting: [], verifiedCountries: [], reliableMatchTypes: [],
      falsePositiveHosting: [], hasLearningData: false,
    };
  }
}

/**
 * Refresh piracy keywords for a product using feedback-enhanced context.
 *
 * Re-runs the piracy keyword generator with intelligence data about
 * which search terms led to verified infringements vs. false positives.
 * Updates the product's ai_extracted_data in the database.
 *
 * Constraints:
 * - Only for products with 5+ verified/rejected infringements
 * - Maximum once per 24 hours per product
 */
export async function refreshPiracyKeywords(
  supabase: SupabaseClient,
  productId: string
): Promise<boolean> {
  try {
    // Fetch product data
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, type, brand_name, url, ai_extracted_data, full_text_content, last_analyzed_at')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.warn(`[Intelligence Engine] Cannot refresh piracy keywords: product ${productId} not found`);
      return false;
    }

    // Check 24-hour cooldown
    if (product.last_analyzed_at) {
      const hoursSinceAnalysis = (Date.now() - new Date(product.last_analyzed_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceAnalysis < 24) {
        console.log(`[Intelligence Engine] Skipping piracy keyword refresh for ${productId}: ${Math.ceil(24 - hoursSinceAnalysis)}h remaining`);
        return false;
      }
    }

    // Check minimum feedback threshold (5+ verified/rejected)
    const { count: feedbackCount } = await supabase
      .from('infringements')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .or('status.eq.active,status.eq.false_positive')
      .not('verified_by_user_at', 'is', null);

    if ((feedbackCount ?? 0) < 5) {
      console.log(`[Intelligence Engine] Skipping piracy keyword refresh for ${productId}: only ${feedbackCount} feedback items (need 5+)`);
      return false;
    }

    // Fetch intelligence data for context
    const intelligence = await fetchIntelligenceForScan(supabase, productId);

    if (!product.ai_extracted_data || !product.full_text_content) {
      console.log(`[Intelligence Engine] Skipping piracy keyword refresh for ${productId}: missing AI data or page content`);
      return false;
    }

    // Dynamically import to avoid circular dependencies
    const { generatePiracyKeywords } = await import('@/lib/ai/piracy-keyword-generator');

    const piracyData = await generatePiracyKeywords(
      product.name,
      product.type,
      product.brand_name,
      product.ai_extracted_data,
      product.full_text_content,
      product.url || ''
    );

    // Merge new piracy data into existing ai_extracted_data
    const updatedAiData = {
      ...product.ai_extracted_data,
      piracy_search_terms: piracyData.piracy_search_terms,
      auto_alternative_names: piracyData.auto_alternative_names,
      auto_unique_identifiers: piracyData.auto_unique_identifiers,
      platform_search_terms: piracyData.platform_search_terms,
      piracy_analysis_metadata: piracyData.metadata,
    };

    // Update product in database
    const { error: updateError } = await supabase
      .from('products')
      .update({
        ai_extracted_data: updatedAiData,
        last_analyzed_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (updateError) {
      console.error(`[Intelligence Engine] Failed to update piracy keywords for ${productId}:`, updateError);
      return false;
    }

    console.log(
      `[Intelligence Engine] Refreshed piracy keywords for ${product.name}: ` +
      `${piracyData.piracy_search_terms.length} terms, ${piracyData.auto_alternative_names.length} alt names`
    );
    return true;
  } catch (error) {
    console.error(`[Intelligence Engine] Error refreshing piracy keywords for ${productId}:`, error);
    return false;
  }
}
