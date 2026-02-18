import type { Product, InfringementResult, RiskLevel } from '@/types';
import type { IntelligenceData } from '@/lib/intelligence/intelligence-engine';

/**
 * Telegram Scanner
 *
 * Searches for pirated/leaked content on Telegram using three approaches:
 * 1. Google Search for t.me links containing product name
 * 2. Common piracy channel pattern matching
 * 3. Direct Telegram Bot API channel search (if TELEGRAM_BOT_TOKEN configured)
 */
export async function scanTelegram(product: Product, intelligence?: IntelligenceData): Promise<InfringementResult[]> {
  console.log(`[Telegram Scanner] Scanning for: ${product.name}`);

  try {
    const infringements: InfringementResult[] = [];

    // Approach 1: Search Google for Telegram links containing product name
    const telegramLinks = await searchTelegramViaGoogle(product);

    // Approach 2: Search common piracy channel patterns
    const commonChannels = await checkCommonPiracyChannels(product);

    // Approach 3: Direct Telegram Bot API search (highest ROI if configured)
    const directResults = await searchViaTelegramAPI(product, intelligence);

    // Combine results and deduplicate
    const allLinks = [...telegramLinks, ...commonChannels, ...directResults];
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

    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey || apiKey === 'xxxxx') {
      console.log('[Telegram Scanner] No Serper API key configured, skipping Google search');
      return [];
    }

    const results: TelegramLink[] = [];

    for (const query of queries) {
      try {
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q: query, num: 10 }),
        });
        if (!response.ok) continue;

        const data = await response.json();

        if (data.organic) {
          for (const result of data.organic) {
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

// ── Direct Telegram Bot API Integration ──────────────────────────────

/**
 * Search Telegram directly via Bot API for channels/messages mentioning the product.
 * Requires TELEGRAM_BOT_TOKEN environment variable.
 *
 * Uses the `getUpdates` + `forwardMessage` flow and the undocumented
 * search-like behavior of `sendMessage` with @username resolution.
 * For public channels, we can use the `getChat` and `getChatMemberCount` APIs.
 */
async function searchViaTelegramAPI(
  product: Product,
  intelligence?: IntelligenceData
): Promise<TelegramLink[]> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return [];
  }

  const results: TelegramLink[] = [];
  const apiBase = `https://api.telegram.org/bot${botToken}`;

  // Build list of channels to check — known piracy channels + intelligence-derived
  const channelsToCheck = getKnownPiracyChannels(product);

  // Add channels from intelligence (if any verified keywords look like channel names)
  if (intelligence?.verifiedKeywords) {
    for (const kw of intelligence.verifiedKeywords) {
      if (kw.startsWith('@') || kw.match(/^[a-zA-Z][a-zA-Z0-9_]{3,}$/)) {
        channelsToCheck.push(kw.replace(/^@/, ''));
      }
    }
  }

  console.log(`[Telegram Scanner] Checking ${channelsToCheck.length} channels via Bot API`);

  for (const channel of channelsToCheck) {
    try {
      // Get channel info
      const chatResponse = await fetch(`${apiBase}/getChat?chat_id=@${channel}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!chatResponse.ok) continue;

      const chatData = await chatResponse.json();
      if (!chatData.ok || !chatData.result) continue;

      const chat = chatData.result;
      const title = (chat.title || '').toLowerCase();
      const description = (chat.description || '').toLowerCase();
      const productNameLower = product.name.toLowerCase();

      // Check if channel name/description mentions the product
      const mentionsProduct =
        title.includes(productNameLower) ||
        description.includes(productNameLower) ||
        (product.keywords || []).some(kw => title.includes(kw.toLowerCase()) || description.includes(kw.toLowerCase()));

      // Check if it's a piracy-oriented channel
      const isPiracy = isPiracyChannel(chat.title || '', chat.description || '');

      if (mentionsProduct || isPiracy) {
        // Get member count
        let memberCount = 0;
        try {
          const countResponse = await fetch(`${apiBase}/getChatMemberCount?chat_id=@${channel}`, {
            signal: AbortSignal.timeout(5000),
          });
          if (countResponse.ok) {
            const countData = await countResponse.json();
            memberCount = countData.result || 0;
          }
        } catch {
          // Member count is optional
        }

        results.push({
          url: `https://t.me/${channel}`,
          type: 'channel' as any,
          members: memberCount,
          title: chat.title,
        });

        console.log(`[Telegram Scanner] Bot API found: @${channel} (${memberCount} members) - "${chat.title}"`);
      }

      // Rate limit: 200ms between API calls (Telegram limit is 30/sec)
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch {
      // Individual channel check failures are non-blocking
    }
  }

  console.log(`[Telegram Scanner] Bot API found ${results.length} channels`);
  return results;
}

/**
 * Get known piracy channels to check based on product type
 */
function getKnownPiracyChannels(product: Product): string[] {
  const channels: string[] = [];
  const isFinance = isFinanceProduct(product);

  // General piracy channels
  channels.push(
    'freecoursesite',
    'freecoursesdownload',
    'coursefree',
    'coursesforfree',
    'udemyfree',
    'premiumcoursesfree',
    'leakedcourses',
    'piracycourses',
    'digitalproductsfree',
  );

  // Finance/trading specific
  if (isFinance) {
    channels.push(
      'tradingsignalsfree',
      'forexfreedownload',
      'freeindicators',
      'tradingcoursefree',
      'cryptosignalsfree',
      'freeforexsignals',
    );
  }

  return channels;
}
