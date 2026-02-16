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
 * Generate optimized search query based on learned patterns
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
 * Improves AI filtering accuracy
 */
export async function getAIPromptExamples(productId: string): Promise<{
  verified_examples: string[];
  false_positive_examples: string[];
}> {
  const supabase = await createClient();

  // Get verified infringements (true positives)
  const { data: verified } = await supabase
    .from('infringements')
    .select('source_url, evidence')
    .eq('product_id', productId)
    .eq('status', 'active')
    .not('verified_by_user_at', 'is', null)
    .limit(5);

  // Get false positives
  const { data: falsePositives } = await supabase
    .from('infringements')
    .select('source_url, evidence')
    .eq('product_id', productId)
    .eq('status', 'false_positive')
    .limit(5);

  return {
    verified_examples: (verified || []).map(v => {
      const excerpts = v.evidence?.matched_excerpts || [];
      return `URL: ${v.source_url} - Contains: ${excerpts.join(', ')}`;
    }),
    false_positive_examples: (falsePositives || []).map(fp => {
      const excerpts = fp.evidence?.matched_excerpts || [];
      return `URL: ${fp.source_url} - Contains: ${excerpts.join(', ')} (NOT an infringement)`;
    }),
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
