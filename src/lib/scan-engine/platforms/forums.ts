import type { Product, InfringementResult, RiskLevel } from '@/types';

/**
 * Pirate Forum Scanner
 *
 * Detects pirated content shared on known piracy/warez forums
 * using Google search with site: operator.
 */

const FORUM_SITES = [
  'nulled.to',
  'cracked.io',
  'blackhatworld.com',
  'hackforums.net',
  'sinisterly.com',
  'leakforums.net',
  'leakforums.co',
  'nsaneforums.com',
  'crackingking.com',
  'crackia.com',
];

export async function scanForums(product: Product): Promise<InfringementResult[]> {
  console.log(`[Forum Scanner] Scanning for: ${product.name}`);

  try {
    const infringements: InfringementResult[] = [];

    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey || apiKey === 'xxxxx') {
      console.log('[Forum Scanner] No SerpAPI key configured, skipping');
      return [];
    }

    for (const site of FORUM_SITES) {
      const results = await searchForumSite(site, product, apiKey);
      infringements.push(...results);

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const unique = infringements.filter((inf) => {
      if (seenUrls.has(inf.source_url)) return false;
      seenUrls.add(inf.source_url);
      return true;
    });

    console.log(`[Forum Scanner] Found ${unique.length} potential infringements`);
    return unique;
  } catch (error) {
    console.error('[Forum Scanner] Error:', error);
    return [];
  }
}

async function searchForumSite(
  site: string,
  product: Product,
  apiKey: string
): Promise<InfringementResult[]> {
  try {
    const query = `site:${site} "${product.name}"`;

    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('num', '10');

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`[Forum Scanner] SerpAPI error for ${site}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!data.organic_results || data.organic_results.length === 0) return [];

    const infringements: InfringementResult[] = [];

    for (const result of data.organic_results) {
      if (!isForumThread(result.link, site)) continue;

      const { views, replies } = extractForumStats(result.snippet || '', result.title || '');
      const riskLevel = calculateRiskLevel(views);
      const audienceSize = formatAudienceSize(views, replies);
      const revenueLoss = estimateRevenueLoss(views, product.price);

      infringements.push({
        platform: 'forum',
        source_url: result.link,
        risk_level: riskLevel,
        type: 'post',
        audience_size: audienceSize,
        est_revenue_loss: revenueLoss,
      });
    }

    return infringements;
  } catch (error) {
    console.error(`[Forum Scanner] Error searching ${site}:`, error);
    return [];
  }
}

function isForumThread(url: string, site: string): boolean {
  const urlLower = url.toLowerCase();

  // Exclude category/index pages
  if (
    urlLower.endsWith(`/${site}`) ||
    urlLower.endsWith(`/${site}/`) ||
    urlLower.includes('/search') ||
    urlLower.includes('/members') ||
    urlLower.includes('/register') ||
    urlLower.includes('/login')
  ) {
    return false;
  }

  // Thread URL patterns across common forum software
  if (
    urlLower.includes('/threads/') ||
    urlLower.includes('/thread-') ||
    urlLower.includes('/topic/') ||
    urlLower.includes('/showthread') ||
    urlLower.includes('/viewtopic') ||
    urlLower.includes('/post/')
  ) {
    return true;
  }

  // Generic: must have decent path depth (e.g., /forum/section/thread-title)
  return urlLower.split('/').filter(Boolean).length > 3;
}

function extractForumStats(snippet: string, title: string): { views: number; replies: number } {
  const text = `${title} ${snippet}`;

  // Match "1,234 views", "1.2k views", "viewed 1234 times"
  const viewMatch = text.match(/(\d[\d,]*(?:\.\d+)?)\s*k?\s*(?:views?|times?\s*viewed|reads?)/i);
  let views = 0;
  if (viewMatch && viewMatch[1]) {
    views = parseFloat(viewMatch[1].replace(/,/g, ''));
    if (text.match(/\d[\d,]*(?:\.\d+)?\s*k\s*(?:views?|reads?)/i)) {
      views *= 1000;
    }
    views = Math.round(views);
  }

  // Match "45 replies", "123 posts", "67 comments"
  const replyMatch = text.match(/(\d[\d,]*)\s*(?:replies?|posts?|comments?|responses?)/i);
  const replies = replyMatch && replyMatch[1] ? parseInt(replyMatch[1].replace(/,/g, ''), 10) : 0;

  // Default estimates for forum threads if no stats found
  if (views === 0 && replies === 0) {
    return { views: 500, replies: 10 };
  }

  // If we have replies but no views, estimate views
  if (views === 0 && replies > 0) {
    views = replies * 20; // ~20 views per reply ratio
  }

  return { views, replies };
}

function calculateRiskLevel(views: number): RiskLevel {
  if (views >= 10000) return 'critical';
  if (views >= 1000) return 'high';
  if (views >= 500) return 'medium';
  return 'low';
}

function formatAudienceSize(views: number, replies: number): string {
  const parts: string[] = [];

  if (views >= 1000) {
    parts.push(`~${(views / 1000).toFixed(1)}k views`);
  } else if (views > 0) {
    parts.push(`~${views} views`);
  }

  if (replies > 0) {
    parts.push(`${replies} replies`);
  }

  return parts.join(', ') || 'Unknown';
}

function estimateRevenueLoss(views: number, productPrice: number): number {
  // 2% of viewers assumed to download the pirated content
  const conversionRate = 0.02;
  return Math.round(views * conversionRate * productPrice);
}
