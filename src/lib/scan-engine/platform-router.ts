/**
 * Platform Router — budget-aware routing of platform scanners
 * based on product-type platformWeights.
 *
 * Only runs platforms whose weight >= threshold for this product type.
 * Allocates remaining Serper budget proportionally by weight.
 */

import type { Product, InfringementResult } from '@/types';
import type { IntelligenceData } from '@/lib/intelligence/intelligence-engine';
import { getRelevantPlatforms } from './profiles';
import { scanDiscord } from './platforms/discord';
import { scanForums } from './platforms/forums';
import { scanTorrents } from './platforms/torrents';
import { scanCyberlockers } from './platforms/cyberlockers';
import type { ScanLogger } from './scan-logger';

interface PlatformScanConfig {
  platform: string;
  weight: number;
  budgetAllocation: number;
}

/**
 * Calculate budget allocation for platform scanners.
 * Distributes the remaining budget proportionally by platform weight.
 */
export function allocatePlatformBudget(
  product: Product,
  remainingBudget: number,
  maxPlatformBudget: number = 12,
): PlatformScanConfig[] {
  const relevantPlatforms = getRelevantPlatforms(product.type);

  if (relevantPlatforms.length === 0) return [];

  const availableBudget = Math.min(remainingBudget, maxPlatformBudget);
  if (availableBudget <= 0) return [];

  const totalWeight = relevantPlatforms.reduce((sum, p) => sum + p.weight, 0);

  return relevantPlatforms.map((p) => ({
    platform: p.platform,
    weight: p.weight,
    budgetAllocation: Math.max(1, Math.round((p.weight / totalWeight) * availableBudget)),
  }));
}

/**
 * Run platform scanners based on type-specific routing.
 * Each scanner runs in parallel with error isolation.
 *
 * Returns combined results from all platform scanners.
 */
export async function runPlatformScanners(
  product: Product,
  remainingBudget: number,
  intelligence?: IntelligenceData,
  logger?: ScanLogger,
): Promise<{
  results: InfringementResult[];
  budgetUsed: number;
  platformsRun: string[];
}> {
  const allocations = allocatePlatformBudget(product, remainingBudget);
  const platformsRun: string[] = [];

  if (allocations.length === 0) {
    logger?.info('platform_scan', 'No platform scanners meet weight threshold for this product type');
    return { results: [], budgetUsed: 0, platformsRun };
  }

  logger?.info('platform_scan', `Platform routing for ${product.type}: ${allocations.map(
    (a) => `${a.platform}(w=${a.weight}, budget=${a.budgetAllocation})`
  ).join(', ')}`, {
    product_type: product.type,
    platforms: allocations.map((a) => a.platform),
  });

  // Build scanner promises based on allocations
  const scanPromises: Array<{ platform: string; promise: Promise<InfringementResult[]> }> = [];

  for (const alloc of allocations) {
    let promise: Promise<InfringementResult[]> | null = null;

    switch (alloc.platform) {
      case 'discord':
        promise = scanDiscord(product);
        break;
      case 'forum':
        promise = scanForums(product);
        break;
      case 'torrent':
        promise = scanTorrents(product);
        break;
      case 'cyberlocker':
        promise = scanCyberlockers(product);
        break;
    }

    if (promise) {
      platformsRun.push(alloc.platform);
      scanPromises.push({
        platform: alloc.platform,
        promise: promise.catch((error) => {
          logger?.error(
            'platform_scan',
            `${alloc.platform} scanner failed: ${error instanceof Error ? error.message : String(error)}`,
            'UNKNOWN',
          );
          return [] as InfringementResult[];
        }),
      });
    }
  }

  // Run all scanners in parallel
  const results = await Promise.all(scanPromises.map((s) => s.promise));
  const allResults: InfringementResult[] = [];
  let budgetUsed = 0;

  for (let i = 0; i < results.length; i++) {
    const platformResults = results[i];
    const scanInfo = scanPromises[i];
    if (!platformResults || !scanInfo) continue;

    if (platformResults.length > 0) {
      logger?.info('platform_scan', `${scanInfo.platform}: +${platformResults.length} results`);
    }
    allResults.push(...platformResults);

    // Approximate budget tracking (each scanner uses its own Serper calls)
    const alloc = allocations.find((a) => a.platform === scanInfo.platform);
    if (alloc) budgetUsed += alloc.budgetAllocation;
  }

  logger?.info('platform_scan', `Platform scanners total: ${allResults.length} results from ${platformsRun.join(', ')}`, {
    total_results: allResults.length,
    platforms_run: platformsRun,
    budget_used: budgetUsed,
  });

  if (allResults.length === 0 && platformsRun.length > 0) {
    logger?.warn('platform_scan', `All ${platformsRun.length} platform scanners returned 0 results. If Serper API errors were logged above, the API key may be invalid.`, 'SERP_ERROR');
  }

  return { results: allResults, budgetUsed, platformsRun };
}
