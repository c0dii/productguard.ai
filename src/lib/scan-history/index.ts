/**
 * Scan History Utilities
 *
 * Server-side helper functions for working with scan history data
 * in the "Living Scans" architecture.
 *
 * For client-safe utility functions (formatTimeAgo, formatDuration, etc.),
 * import from '@/lib/scan-history/utils' instead.
 */

import { createAdminClient } from '@/lib/supabase/server';
import type { ScanHistory, ProductScanStatus } from '@/types';

// Re-export client-safe utilities so existing server imports still work
export { formatTimeAgo, formatDuration, calculateCostSavings } from './utils';

/**
 * Get scan history for a specific scan
 * Returns chronological history of all runs
 */
export async function getScanHistory(scanId: string): Promise<ScanHistory[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('scan_history')
    .select('*')
    .eq('scan_id', scanId)
    .order('run_at', { ascending: false });

  if (error) {
    console.error('[Scan History] Error fetching scan history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get the most recent scan run for a product
 */
export async function getLatestScanRun(productId: string): Promise<ScanHistory | null> {
  const supabase = createAdminClient();

  // First get the scan for this product
  const { data: scan } = await supabase
    .from('scans')
    .select('id')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!scan) {
    return null;
  }

  // Get the most recent run
  const { data: history } = await supabase
    .from('scan_history')
    .select('*')
    .eq('scan_id', scan.id)
    .order('run_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return history;
}

/**
 * Get product scan status (from materialized view)
 * Includes aggregated infringement counts and recent run stats
 */
export async function getProductScanStatus(productId: string): Promise<ProductScanStatus | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('product_scan_status')
    .select('*')
    .eq('product_id', productId)
    .maybeSingle();

  if (error) {
    console.error('[Scan History] Error fetching product scan status:', error);
    return null;
  }

  return data;
}

/**
 * Get scan statistics across all runs
 */
export async function getScanStatistics(scanId: string): Promise<{
  total_runs: number;
  total_urls_scanned: number;
  total_new_infringements: number;
  total_api_savings: number;
  total_ai_savings: number;
  avg_duration_seconds: number;
  first_run_at: string | null;
  last_run_at: string | null;
}> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('scan_history')
    .select('*')
    .eq('scan_id', scanId);

  if (!data || data.length === 0) {
    return {
      total_runs: 0,
      total_urls_scanned: 0,
      total_new_infringements: 0,
      total_api_savings: 0,
      total_ai_savings: 0,
      avg_duration_seconds: 0,
      first_run_at: null,
      last_run_at: null,
    };
  }

  const stats = {
    total_runs: data.length,
    total_urls_scanned: data.reduce((sum, run) => sum + (run.total_urls_scanned || 0), 0),
    total_new_infringements: data.reduce((sum, run) => sum + (run.new_infringements_created || 0), 0),
    total_api_savings: data.reduce((sum, run) => sum + (run.api_calls_saved || 0), 0),
    total_ai_savings: data.reduce((sum, run) => sum + (run.ai_filtering_saved || 0), 0),
    avg_duration_seconds: Math.round(
      data.reduce((sum, run) => sum + (run.duration_seconds || 0), 0) / data.length
    ),
    first_run_at: data[data.length - 1]?.run_at || null,
    last_run_at: data[0]?.run_at || null,
  };

  return stats;
}

