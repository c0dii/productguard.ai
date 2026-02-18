import type { Product, InfringementResult, RiskLevel } from '@/types';

/**
 * Discord Server Scanner
 *
 * Detects pirated content shared via Discord using Google search
 * with site: operator targeting Discord and server directory sites.
 */

const DISCORD_SITES = [
  'discord.com',
  'discord.gg',
  'disboard.org',
  'top.gg',
  'discords.com',
];

export async function scanDiscord(product: Product): Promise<InfringementResult[]> {
  console.log(`[Discord Scanner] Scanning for: ${product.name}`);

  try {
    const infringements: InfringementResult[] = [];

    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey || apiKey === 'xxxxx') {
      console.log('[Discord Scanner] No Serper API key configured, skipping');
      return [];
    }

    for (const site of DISCORD_SITES) {
      const results = await searchDiscordSite(site, product, apiKey);
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

    console.log(`[Discord Scanner] Found ${unique.length} potential infringements`);
    return unique;
  } catch (error) {
    console.error('[Discord Scanner] Error:', error);
    return [];
  }
}

async function searchDiscordSite(
  site: string,
  product: Product,
  apiKey: string
): Promise<InfringementResult[]> {
  try {
    // Build queries — product name + piracy terms
    const queries = [
      `site:${site} "${product.name}"`,
      `site:${site} "${product.name}" free download`,
    ];

    // Add brand name query if available
    if (product.brand_name && product.brand_name !== product.name) {
      queries.push(`site:${site} "${product.brand_name}" "${product.name}"`);
    }

    const allResults: InfringementResult[] = [];

    for (const query of queries) {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num: 10 }),
      });
      if (!response.ok) {
        console.error(`[Discord Scanner] Serper API error for ${site}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (!data.organic || data.organic.length === 0) continue;

      for (const result of data.organic) {
        if (!isDiscordPage(result.link, site)) continue;

        const memberCount = extractMemberCount(result.snippet || '', result.title || '');
        const riskLevel = calculateRiskLevel(memberCount);
        const audienceSize = formatAudienceSize(memberCount);
        const revenueLoss = estimateRevenueLoss(memberCount, product.price);

        allResults.push({
          platform: 'discord',
          source_url: result.link,
          risk_level: riskLevel,
          type: 'server',
          audience_size: audienceSize,
          est_revenue_loss: revenueLoss,
        });
      }

      // Rate limit between queries
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return allResults;
  } catch (error) {
    console.error(`[Discord Scanner] Error searching ${site}:`, error);
    return [];
  }
}

function isDiscordPage(url: string, site: string): boolean {
  const urlLower = url.toLowerCase();

  // Exclude generic pages
  if (
    urlLower.endsWith('/discord.com') ||
    urlLower.endsWith('/discord.com/') ||
    urlLower.includes('/developers') ||
    urlLower.includes('/safety') ||
    urlLower.includes('/blog') ||
    urlLower.includes('/support')
  ) {
    return false;
  }

  // Discord invite/channel pages
  if (site === 'discord.com') {
    return urlLower.includes('/channels/') || urlLower.includes('/invite/');
  }

  if (site === 'discord.gg') {
    // All discord.gg URLs are invite links
    return urlLower.split('/').length >= 4;
  }

  // Directory sites — look for server detail pages
  if (site === 'disboard.org') {
    return urlLower.includes('/server/');
  }

  if (site === 'top.gg') {
    return urlLower.includes('/servers/');
  }

  // Generic: must have path depth
  return urlLower.split('/').length > 3;
}

function extractMemberCount(snippet: string, title: string): number {
  const text = `${title} ${snippet}`;

  // Match patterns like "12,345 members", "12k members", "12.5k"
  const memberMatch = text.match(/(\d[\d,]*(?:\.\d+)?)\s*k?\s*members?/i);
  if (memberMatch && memberMatch[1]) {
    let count = parseFloat(memberMatch[1].replace(/,/g, ''));
    if (text.match(/\d[\d,]*(?:\.\d+)?\s*k\s*members?/i)) {
      count *= 1000;
    }
    return Math.round(count);
  }

  // Match "12,345 online" as proxy
  const onlineMatch = text.match(/(\d[\d,]*)\s*online/i);
  if (onlineMatch && onlineMatch[1]) {
    // Online count is typically 10-30% of total members
    return Math.round(parseInt(onlineMatch[1].replace(/,/g, ''), 10) * 5);
  }

  // Default estimate for unknown Discord servers
  return 200;
}

function calculateRiskLevel(memberCount: number): RiskLevel {
  if (memberCount >= 10000) return 'critical';
  if (memberCount >= 1000) return 'high';
  if (memberCount >= 100) return 'medium';
  return 'low';
}

function formatAudienceSize(memberCount: number): string {
  if (memberCount >= 1000) {
    return `~${(memberCount / 1000).toFixed(1)}k members`;
  }
  return `~${memberCount} members`;
}

function estimateRevenueLoss(memberCount: number, productPrice: number): number {
  // 5% of members assumed to have downloaded/accessed the pirated content
  const conversionRate = 0.05;
  return Math.round(memberCount * conversionRate * productPrice);
}
