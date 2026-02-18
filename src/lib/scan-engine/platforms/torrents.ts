import type { Product, InfringementResult, RiskLevel } from '@/types';

/**
 * Torrent Scanner
 *
 * Detects pirated content on major torrent sites using Google search
 * with site: operator targeting known torrent indexers:
 * - 1337x.to
 * - thepiratebay.org (various mirrors)
 * - torrentgalaxy.to
 * - yts.mx (movies)
 * - eztv.re (TV shows)
 * - etc.
 *
 * Note: Direct torrent site APIs are unreliable/blocked, so we use Google search
 */
export async function scanTorrents(product: Product): Promise<InfringementResult[]> {
  console.log(`[Torrent Scanner] Scanning for: ${product.name}`);

  try {
    const infringements: InfringementResult[] = [];

    // Major torrent sites (current working domains as of 2025)
    const torrentSites = [
      '1337x.to',
      'thepiratebay.org',
      'torrentgalaxy.to',
      'yts.mx',
      'eztv.re',
      'rarbg.to',
      'torlock.com',
      'torrentz2.eu',
      'limetorrents.pro',
      'zooqle.com',
    ];

    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey || apiKey === 'xxxxx') {
      console.log('[Torrent Scanner] No Serper API key configured, skipping');
      return [];
    }

    // Search each torrent site
    for (const site of torrentSites) {
      const results = await searchTorrentSite(site, product, apiKey);
      infringements.push(...results);

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const uniqueInfringements = infringements.filter((inf) => {
      if (seenUrls.has(inf.source_url)) {
        return false;
      }
      seenUrls.add(inf.source_url);
      return true;
    });

    console.log(`[Torrent Scanner] Found ${uniqueInfringements.length} potential infringements`);
    return uniqueInfringements;
  } catch (error) {
    console.error('[Torrent Scanner] Error:', error);
    return [];
  }
}

/**
 * Search a specific torrent site using Google
 */
async function searchTorrentSite(
  site: string,
  product: Product,
  apiKey: string
): Promise<InfringementResult[]> {
  try {
    // Build search query
    const query = `site:${site} "${product.name}"`;

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 10 }),
    });

    if (!response.ok) {
      console.error(`[Torrent Scanner] Serper API error for ${site}: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.organic || data.organic.length === 0) {
      return [];
    }

    const infringements: InfringementResult[] = [];

    for (const result of data.organic) {
      // Check if result is a torrent page (not homepage/category page)
      if (!isTorrentPage(result.link, site)) {
        continue;
      }

      // Extract seeder/leecher counts from snippet if available
      const { seeders, leechers } = extractTorrentStats(result.snippet || '');

      const riskLevel = calculateRiskLevel(seeders);
      const audienceSize = formatAudienceSize(seeders, leechers);
      const revenueLoss = estimateRevenueLoss(seeders, leechers, product.price);

      infringements.push({
        platform: 'torrent',
        source_url: result.link,
        risk_level: riskLevel,
        type: 'torrent',
        audience_size: audienceSize,
        est_revenue_loss: revenueLoss,
      });
    }

    return infringements;
  } catch (error) {
    console.error(`[Torrent Scanner] Error searching ${site}:`, error);
    return [];
  }
}

/**
 * Check if URL is a torrent detail page (not homepage/category)
 */
function isTorrentPage(url: string, site: string): boolean {
  const urlLower = url.toLowerCase();

  // Exclude category/browse pages
  if (
    urlLower.includes('/browse') ||
    urlLower.includes('/category') ||
    urlLower.includes('/search') ||
    urlLower.includes('/top') ||
    urlLower.includes('/trending')
  ) {
    return false;
  }

  // Site-specific patterns for torrent pages
  if (site === '1337x.to') {
    return urlLower.includes('/torrent/');
  }

  if (site === 'thepiratebay.org') {
    return urlLower.includes('/torrent/');
  }

  if (site === 'torrentgalaxy.to') {
    return urlLower.includes('/torrent/');
  }

  if (site === 'yts.mx') {
    return urlLower.includes('/movies/');
  }

  if (site === 'eztv.re') {
    return urlLower.includes('/ep/');
  }

  // Generic check: URL has path after domain
  return urlLower.split('/').length > 4;
}

/**
 * Extract seeder and leecher counts from search result snippet
 */
function extractTorrentStats(snippet: string): { seeders: number; leechers: number } {
  // Try to match patterns like "123 seeders, 45 leechers"
  const seederMatch = snippet.match(/(\d+[\d,]*)\s*seeders?/i);
  const leecherMatch = snippet.match(/(\d+[\d,]*)\s*leechers?/i);

  const seeders = (seederMatch && seederMatch[1]) ? parseInt(seederMatch[1].replace(/,/g, ''), 10) : 0;
  const leechers = (leecherMatch && leecherMatch[1]) ? parseInt(leecherMatch[1].replace(/,/g, ''), 10) : 0;

  // If no stats found, use conservative estimates
  if (seeders === 0 && leechers === 0) {
    return { seeders: 50, leechers: 25 };
  }

  return { seeders, leechers };
}

/**
 * Calculate risk level based on seeder count
 * More seeders = higher availability = higher risk
 */
function calculateRiskLevel(seeders: number): RiskLevel {
  if (seeders >= 500) return 'critical';
  if (seeders >= 100) return 'high';
  if (seeders >= 50) return 'medium';
  return 'low';
}

/**
 * Format seeder/leecher counts as audience size
 */
function formatAudienceSize(seeders: number, leechers: number): string {
  if (seeders === 0 && leechers === 0) {
    return 'Unknown peers';
  }

  const total = seeders + leechers;

  if (total >= 1000) {
    return `~${(total / 1000).toFixed(1)}k peers (${seeders} seeders)`;
  }

  return `~${total} peers (${seeders} seeders)`;
}

/**
 * Estimate revenue loss from torrent activity
 *
 * Assumptions:
 * - Each seeder represents 1 completed download
 * - Each leecher represents 0.5 downloads (still downloading)
 * - 40% of downloaders would have purchased if torrent wasn't available
 * - Formula: (seeders + leechers * 0.5) * 0.40 * product_price
 */
function estimateRevenueLoss(seeders: number, leechers: number, productPrice: number): number {
  const completedDownloads = seeders;
  const partialDownloads = leechers * 0.5;
  const totalDownloads = completedDownloads + partialDownloads;

  const conversionRate = 0.40; // 40% would have bought
  const potentialCustomers = totalDownloads * conversionRate;

  return Math.round(potentialCustomers * productPrice);
}
