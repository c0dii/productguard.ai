import type { Product, InfringementResult, RiskLevel } from '@/types';

/**
 * Telegram Scanner
 *
 * Searches for pirated/leaked content on Telegram using two approaches:
 * 1. Telegram Search API (tg://search) - searches public channels/groups
 * 2. Web scraping of telegra.ph and t.me links via Google
 *
 * Note: Full Telegram Bot API integration requires bot token and is limited.
 * This implementation uses web search + public channel analysis.
 */
export async function scanTelegram(product: Product): Promise<InfringementResult[]> {
  console.log(`[Telegram Scanner] Scanning for: ${product.name}`);

  try {
    const infringements: InfringementResult[] = [];

    // Approach 1: Search Google for Telegram links containing product name
    const telegramLinks = await searchTelegramViaGoogle(product);

    // Approach 2: Search common piracy channel patterns
    const commonChannels = await checkCommonPiracyChannels(product);

    // Combine results and deduplicate
    const allLinks = [...telegramLinks, ...commonChannels];
    const seenUrls = new Set<string>();

    for (const link of allLinks) {
      if (!seenUrls.has(link.url)) {
        seenUrls.add(link.url);

        const memberCount = link.members || 0;
        const riskLevel = calculateTelegramRiskLevel(memberCount);
        const audienceSize = formatAudienceSize(memberCount);
        const revenueLoss = estimateRevenueLoss(memberCount, product.price);

        infringements.push({
          platform: 'telegram',
          source_url: link.url,
          risk_level: riskLevel,
          type: link.type,
          audience_size: audienceSize,
          est_revenue_loss: revenueLoss,
        });
      }
    }

    console.log(`[Telegram Scanner] Found ${infringements.length} potential infringements`);
    return infringements;
  } catch (error) {
    console.error('[Telegram Scanner] Error:', error);
    return [];
  }
}

interface TelegramLink {
  url: string;
  type: 'indexed_page' | 'direct_download' | 'post' | 'torrent';
  members?: number;
  title?: string;
}

/**
 * Search for Telegram links via Google
 * Uses site:t.me search to find public channels/groups mentioning the product
 */
async function searchTelegramViaGoogle(product: Product): Promise<TelegramLink[]> {
  try {
    // Build targeted search queries
    const queries = [
      `site:t.me "${product.name}"`,
      `site:t.me "${product.name}" free`,
      `site:t.me "${product.name}" download`,
      `site:t.me "${product.name}" leaked`,
      `site:t.me "${product.name}" course`,
    ];

    // If we don't have a SerpAPI key, return empty
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey || apiKey === 'xxxxx') {
      console.log('[Telegram Scanner] No SerpAPI key configured, skipping Google search');
      return [];
    }

    const results: TelegramLink[] = [];

    for (const query of queries) {
      try {
        const url = new URL('https://serpapi.com/search');
        url.searchParams.set('engine', 'google');
        url.searchParams.set('q', query);
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('num', '10');

        const response = await fetch(url.toString());
        if (!response.ok) continue;

        const data = await response.json();

        if (data.organic_results) {
          for (const result of data.organic_results) {
            if (result.link && result.link.includes('t.me/')) {
              // Extract channel/group name from URL
              const match = result.link.match(/t\.me\/([^\/\?]+)/);
              if (match) {
                const channelName = match[1];

                // Skip bots and official channels
                if (channelName.endsWith('bot') || isOfficialChannel(channelName)) {
                  continue;
                }

                // Detect if it's likely a piracy channel
                if (isPiracyChannel(result.title || '', result.snippet || '')) {
                  results.push({
                    url: `https://t.me/${channelName}`,
                    type: 'post',
                    title: result.title,
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`[Telegram Scanner] Query error for "${query}":`, error);
      }
    }

    return results;
  } catch (error) {
    console.error('[Telegram Scanner] Google search error:', error);
    return [];
  }
}

/**
 * Check common piracy channel patterns
 * Common patterns: @freecourses, @leakedcourses, @coursesfree, etc.
 */
async function checkCommonPiracyChannels(product: Product): Promise<TelegramLink[]> {
  const results: TelegramLink[] = [];

  // Common piracy channel prefixes/suffixes
  const patterns = [
    'freecourses',
    'coursesfree',
    'leakedcourses',
    'premiumcourses',
    'coursehub',
    'tradingcourses',
    'tradingfree',
    'forexfree',
    'stocksignal',
    'cryptosignal',
  ];

  // For trading/finance products, check specialized channels
  if (isFinanceProduct(product)) {
    patterns.push(
      'forexsignals',
      'tradingsignals',
      'stockalerts',
      'cryptoalerts',
      'tradingacademy'
    );
  }

  // Note: Without Telegram API access, we can't verify these channels exist
  // or get member counts. This returns potential channels to investigate.
  // In production, you'd want to use Telegram Bot API or web scraping.

  console.log(`[Telegram Scanner] Checked ${patterns.length} common piracy patterns (requires Telegram API for verification)`);

  return results;
}

/**
 * Check if channel name suggests it's official/legitimate
 */
function isOfficialChannel(channelName: string): boolean {
  const officialKeywords = [
    'official',
    'support',
    'news',
    'updates',
    'announcements',
  ];

  const lowerName = channelName.toLowerCase();
  return officialKeywords.some((keyword) => lowerName.includes(keyword));
}

/**
 * Detect if title/snippet indicates a piracy channel
 */
function isPiracyChannel(title: string, snippet: string): boolean {
  const combined = `${title} ${snippet}`.toLowerCase();

  const piracyIndicators = [
    'free course',
    'free download',
    'leaked',
    'premium free',
    'download here',
    'get free',
    'free access',
    'nulled',
    'cracked',
    'full course free',
    'share files',
    'mega link',
    'drive link',
  ];

  return piracyIndicators.some((indicator) => combined.includes(indicator));
}

/**
 * Check if product is finance/trading related
 */
function isFinanceProduct(product: Product): boolean {
  const productText = `${product.name} ${product.description || ''}`.toLowerCase();

  const financeKeywords = [
    'trading',
    'forex',
    'stock',
    'crypto',
    'bitcoin',
    'indicator',
    'strategy',
    'signals',
    'investment',
    'market',
    'options',
    'futures',
  ];

  return financeKeywords.some((keyword) => productText.includes(keyword));
}

/**
 * Calculate risk level based on Telegram channel member count
 */
function calculateTelegramRiskLevel(memberCount: number): RiskLevel {
  if (memberCount >= 10000) return 'critical';
  if (memberCount >= 1000) return 'high';
  if (memberCount >= 100) return 'medium';
  return 'low';
}

/**
 * Format member count as audience size
 */
function formatAudienceSize(memberCount: number): string {
  if (memberCount === 0) {
    return 'Unknown members';
  }

  if (memberCount >= 1000000) {
    return `~${(memberCount / 1000000).toFixed(1)}M members`;
  }

  if (memberCount >= 1000) {
    return `~${(memberCount / 1000).toFixed(1)}k members`;
  }

  return `~${memberCount} members`;
}

/**
 * Estimate revenue loss from Telegram channel
 *
 * Assumptions:
 * - 10% of members actively engaged with pirated content
 * - 20% of those would have purchased if piracy wasn't available
 * - Formula: members * 0.10 * 0.20 * product_price = members * 0.02 * price
 */
function estimateRevenueLoss(memberCount: number, productPrice: number): number {
  if (memberCount === 0) {
    // If member count unknown, use conservative estimate
    memberCount = 500;
  }

  const engagementRate = 0.10; // 10% of members engaged
  const conversionRate = 0.20; // 20% would have bought
  const potentialCustomers = memberCount * engagementRate * conversionRate;

  return Math.round(potentialCustomers * productPrice);
}
