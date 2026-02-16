import type { Product, InfringementResult, RiskLevel } from '@/types';

/**
 * Cyberlocker Scanner
 *
 * Detects pirated files hosted on file-sharing services:
 * - Mega.nz
 * - MediaFire
 * - Google Drive
 * - Dropbox
 * - Zippyshare
 * - 4shared
 * - Uploaded.net
 * - RapidGator
 * - AnonFiles
 *
 * Uses Google search with site: operator to find public file links
 */
export async function scanCyberlockers(product: Product): Promise<InfringementResult[]> {
  console.log(`[Cyberlocker Scanner] Scanning for: ${product.name}`);

  try {
    const infringements: InfringementResult[] = [];

    // Major cyberlockers to search
    const cyberlockers = [
      'mega.nz',
      'mediafire.com',
      'drive.google.com',
      'dropbox.com',
      'zippyshare.com',
      '4shared.com',
      'uploaded.net',
      'rapidgator.net',
      'anonfiles.com',
      'sendspace.com',
    ];

    // If no SerpAPI key, skip search
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey || apiKey === 'xxxxx') {
      console.log('[Cyberlocker Scanner] No SerpAPI key configured, skipping');
      return [];
    }

    // Search each cyberlocker
    for (const site of cyberlockers) {
      const results = await searchCyberlocker(site, product, apiKey);
      infringements.push(...results);

      // Rate limiting - pause between searches
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

    console.log(`[Cyberlocker Scanner] Found ${uniqueInfringements.length} potential infringements`);
    return uniqueInfringements;
  } catch (error) {
    console.error('[Cyberlocker Scanner] Error:', error);
    return [];
  }
}

/**
 * Search a specific cyberlocker using Google
 */
async function searchCyberlocker(
  site: string,
  product: Product,
  apiKey: string
): Promise<InfringementResult[]> {
  try {
    // Build search query - target direct file shares
    const query = `site:${site} "${product.name}"`;

    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('num', '10'); // Top 10 results per cyberlocker

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`[Cyberlocker Scanner] SerpAPI error for ${site}: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.organic_results || data.organic_results.length === 0) {
      return [];
    }

    const infringements: InfringementResult[] = [];

    for (const result of data.organic_results) {
      // Filter out non-file links
      if (!isDirectFileLink(result.link, site)) {
        continue;
      }

      // Check if result indicates piracy
      if (isPiracyResult(result.title, result.snippet || '')) {
        const downloads = estimateDownloads(result.snippet || '', site);
        const riskLevel = calculateRiskLevel(downloads);
        const audienceSize = formatAudienceSize(downloads);
        const revenueLoss = estimateRevenueLoss(downloads, product.price);

        infringements.push({
          platform: 'cyberlocker',
          source_url: result.link,
          risk_level: riskLevel,
          type: 'direct_download',
          audience_size: audienceSize,
          est_revenue_loss: revenueLoss,
        });
      }
    }

    return infringements;
  } catch (error) {
    console.error(`[Cyberlocker Scanner] Error searching ${site}:`, error);
    return [];
  }
}

/**
 * Check if URL is a direct file link (not folder/profile/homepage)
 */
function isDirectFileLink(url: string, site: string): boolean {
  const urlLower = url.toLowerCase();

  // Site-specific patterns
  if (site === 'mega.nz') {
    return urlLower.includes('/file/') || urlLower.includes('/folder/');
  }

  if (site === 'mediafire.com') {
    return urlLower.includes('/file/') || urlLower.match(/mediafire\.com\/\?/);
  }

  if (site === 'drive.google.com') {
    return urlLower.includes('/file/d/') || urlLower.includes('/folders/');
  }

  if (site === 'dropbox.com') {
    return urlLower.includes('/s/') || urlLower.includes('/sh/');
  }

  if (site === 'zippyshare.com') {
    return urlLower.includes('/v/') || urlLower.match(/zippyshare\.com\/v\//);
  }

  if (site === '4shared.com') {
    return urlLower.includes('/file/') || urlLower.includes('/get/');
  }

  if (site === 'uploaded.net') {
    return urlLower.includes('/file/');
  }

  if (site === 'rapidgator.net') {
    return urlLower.includes('/file/');
  }

  if (site === 'anonfiles.com') {
    return urlLower.match(/anonfiles\.com\/[a-zA-Z0-9]+\//);
  }

  if (site === 'sendspace.com') {
    return urlLower.includes('/file/');
  }

  // Generic check: URL has more than just the domain
  return urlLower !== site && urlLower !== `https://${site}` && urlLower !== `http://${site}`;
}

/**
 * Detect if title/snippet indicates piracy
 */
function isPiracyResult(title: string, snippet: string): boolean {
  const combined = `${title} ${snippet}`.toLowerCase();

  const piracyIndicators = [
    'free download',
    'download free',
    'full version',
    'premium free',
    'cracked',
    'nulled',
    'leaked',
    'shared',
    'free access',
    'course free',
    'mega link',
    'drive link',
    'zip',
    '.rar',
    '.pdf',
    '.mp4',
    '.mkv',
  ];

  // Exclude legitimate sources
  if (
    combined.includes('official') ||
    combined.includes('purchase') ||
    combined.includes('buy now') ||
    combined.includes('demo')
  ) {
    return false;
  }

  return piracyIndicators.some((indicator) => combined.includes(indicator));
}

/**
 * Estimate download count from snippet or metadata
 * Most cyberlockers don't expose download counts publicly
 */
function estimateDownloads(snippet: string, site: string): number {
  // Try to extract download count from snippet
  const downloadMatch = snippet.match(/(\d+[\d,]*)\s*downloads?/i);
  if (downloadMatch) {
    return parseInt(downloadMatch[1].replace(/,/g, ''), 10);
  }

  const viewMatch = snippet.match(/(\d+[\d,]*)\s*views?/i);
  if (viewMatch) {
    // Assume 30% of views convert to downloads
    return Math.round(parseInt(viewMatch[1].replace(/,/g, ''), 10) * 0.3);
  }

  // Conservative default estimates based on platform popularity
  const defaultDownloads: Record<string, number> = {
    'mega.nz': 500,
    'mediafire.com': 300,
    'drive.google.com': 400,
    'dropbox.com': 200,
    'zippyshare.com': 150,
    '4shared.com': 250,
    'uploaded.net': 200,
    'rapidgator.net': 150,
    'anonfiles.com': 100,
    'sendspace.com': 100,
  };

  return defaultDownloads[site] || 100;
}

/**
 * Calculate risk level based on estimated downloads
 */
function calculateRiskLevel(downloads: number): RiskLevel {
  if (downloads >= 5000) return 'critical';
  if (downloads >= 1000) return 'high';
  if (downloads >= 500) return 'medium';
  return 'low';
}

/**
 * Format download count as audience size
 */
function formatAudienceSize(downloads: number): string {
  if (downloads >= 1000) {
    return `~${(downloads / 1000).toFixed(1)}k downloads`;
  }
  return `~${downloads} downloads`;
}

/**
 * Estimate revenue loss from cyberlocker downloads
 *
 * Assumptions:
 * - 30% of downloaders would have purchased if not available for free
 * - Formula: downloads * 0.30 * product_price
 */
function estimateRevenueLoss(downloads: number, productPrice: number): number {
  const conversionRate = 0.30; // 30% would have bought
  const potentialCustomers = downloads * conversionRate;

  return Math.round(potentialCustomers * productPrice);
}
