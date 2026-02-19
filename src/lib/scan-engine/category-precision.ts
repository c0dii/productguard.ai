/**
 * Category Precision Cache
 *
 * Fetches precision stats per query category from the database,
 * cached once per scan. Used by the AI filter to adjust confidence
 * based on historical category accuracy.
 */

import { createAdminClient } from '@/lib/supabase/server';

export interface CategoryPrecision {
  query_category: string;
  query_tier: number;
  total_results: number;
  verified_count: number;
  rejected_count: number;
  precision_pct: number | null;
}

/**
 * Fetch category precision stats from the admin_category_precision view.
 * Returns a map of category → precision data.
 * Uses service-role client (admin view requires it).
 */
export async function fetchCategoryPrecisionStats(): Promise<Map<string, CategoryPrecision>> {
  const supabase = createAdminClient();
  const map = new Map<string, CategoryPrecision>();

  try {
    const { data, error } = await supabase
      .from('admin_category_precision')
      .select('*');

    if (error || !data) return map;

    for (const row of data) {
      // Use category as key (aggregate across product types for AI context)
      const existing = map.get(row.query_category);
      if (existing) {
        // Merge stats across product types
        existing.total_results += row.total_results;
        existing.verified_count += row.verified_count;
        existing.rejected_count += row.rejected_count;
        const reviewed = existing.verified_count + existing.rejected_count;
        existing.precision_pct = reviewed > 0
          ? Math.round((existing.verified_count / reviewed) * 100 * 10) / 10
          : null;
      } else {
        map.set(row.query_category, {
          query_category: row.query_category,
          query_tier: row.query_tier,
          total_results: row.total_results,
          verified_count: row.verified_count,
          rejected_count: row.rejected_count,
          precision_pct: row.precision_pct,
        });
      }
    }
  } catch {
    // Non-fatal: return empty map, AI filter works without precision context
  }

  return map;
}

/**
 * Build a compact context string for the AI filter prompt.
 * Only includes categories that have enough data (5+ reviewed results).
 */
export function buildPrecisionContext(
  precisionMap: Map<string, CategoryPrecision>,
  resultCategory?: string,
): string {
  if (precisionMap.size === 0) return '';

  const lines: string[] = [];

  // Show the specific category's precision for this result
  if (resultCategory) {
    const cat = precisionMap.get(resultCategory);
    if (cat && (cat.verified_count + cat.rejected_count) >= 3) {
      lines.push(
        `This result was found by the "${resultCategory}" search strategy, which has a historical precision of ${cat.precision_pct ?? 0}% (${cat.verified_count} verified, ${cat.rejected_count} false positives out of ${cat.total_results} total).`
      );

      if (cat.precision_pct !== null && cat.precision_pct < 30) {
        lines.push(
          `NOTE: This search strategy has LOW historical precision. Be extra skeptical — most results from this strategy are false positives.`
        );
      } else if (cat.precision_pct !== null && cat.precision_pct >= 70) {
        lines.push(
          `NOTE: This search strategy has HIGH historical precision. Results from this strategy are usually real infringements.`
        );
      }
    }
  }

  // Add overall category summary (top 5 most accurate + top 5 least accurate)
  const reviewed = Array.from(precisionMap.values())
    .filter(c => (c.verified_count + c.rejected_count) >= 5);

  if (reviewed.length > 0) {
    const sorted = reviewed.sort((a, b) => (b.precision_pct ?? 0) - (a.precision_pct ?? 0));

    const highPrecision = sorted.filter(c => c.precision_pct !== null && c.precision_pct >= 60).slice(0, 3);
    const lowPrecision = sorted.filter(c => c.precision_pct !== null && c.precision_pct < 40).slice(-3);

    if (highPrecision.length > 0) {
      lines.push(
        `High-precision strategies: ${highPrecision.map(c => `${c.query_category} (${c.precision_pct}%)`).join(', ')}`
      );
    }

    if (lowPrecision.length > 0) {
      lines.push(
        `Low-precision strategies (most results are false positives): ${lowPrecision.map(c => `${c.query_category} (${c.precision_pct}%)`).join(', ')}`
      );
    }
  }

  if (lines.length === 0) return '';

  return '\n\nHISTORICAL PRECISION CONTEXT (from user verification feedback):\n' + lines.join('\n');
}
