import type { Product, InfringementResult, RiskLevel } from '@/types';
import type { IntelligenceData } from '@/lib/intelligence/intelligence-engine';
import { isGenericKeyword, keywordSpecificityScore } from '@/lib/utils/keyword-quality';

interface SerperResult {
  organic?: Array<{
    title: string;
    link: string;
    snippet?: string;
    position: number;
  }>;
}

/**
 * Google Search Scanner using Serper.dev
 * Searches for pirated/leaked/unauthorized copies of digital products
 */
export async function scanGoogle(product: Product, intelligence?: IntelligenceData): Promise<InfringementResult[]> {
  console.log(`[Google Scanner] Scanning for: ${product.name}`);

  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey || apiKey === 'xxxxx') {
    console.log('[Google Scanner] No Serper API key configured, returning empty results');
    return [];
  }

  try {
    const infringements: InfringementResult[] = [];

    // Generate keyword variations for better coverage
    const keywordVariations = generateKeywordVariations(product);

    // Build comprehensive search queries (with intelligence optimization)
    const searchQueries = buildSearchQueries(product, keywordVariations, intelligence);

    console.log(`[Google Scanner] Running ${searchQueries.length} search queries`);

    // Run searches in parallel (in batches to avoid rate limits)
    const batchSize = 5;
    for (let i = 0; i < searchQueries.length; i += batchSize) {
      const batch = searchQueries.slice(i, i + batchSize);
      const batchPromises = batch.map((query) =>
        searchGoogleQuery(query, product, apiKey, keywordVariations)
      );

      const batchResults = await Promise.all(batchPromises);

      for (const queryResults of batchResults) {
        infringements.push(...queryResults);
      }

      // Rate limiting: wait between batches
      if (i + batchSize < searchQueries.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Deduplicate results by URL
    const seenUrls = new Set<string>();
    const uniqueInfringements = infringements.filter((inf) => {
      if (seenUrls.has(inf.source_url)) {
        return false;
      }
      seenUrls.add(inf.source_url);
      return true;
    });

    console.log(`[Google Scanner] Found ${uniqueInfringements.length} potential infringements`);
    return uniqueInfringements;
  } catch (error) {
    console.error('[Google Scanner] Error:', error);
    return [];
  }
}

/**
 * Generate keyword variations from product name
 * Example: "The Squeeze Pro Indicator" → ["Squeeze Pro", "TTM Squeeze Pro", "Squeeze PRO Indicator", etc.]
 */
function generateKeywordVariations(product: Product): string[] {
  const variations = new Set<string>();
  const name = product.name;

  // Original name
  variations.add(name);

  // Remove common words
  const withoutCommon = name
    .replace(/\b(the|a|an|by|for|of|and)\b/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  variations.add(withoutCommon);

  // All caps version
  variations.add(name.toUpperCase());

  // Lowercase version
  variations.add(name.toLowerCase());

  // Remove "indicator", "course", "template" suffixes
  const withoutSuffix = name.replace(/\b(indicator|course|template|software|tool|system)\b/gi, '').trim();
  if (withoutSuffix !== name) {
    variations.add(withoutSuffix);
  }

  // Add TTM prefix if "squeeze" is mentioned (common for Squeeze indicators)
  if (name.toLowerCase().includes('squeeze')) {
    variations.add(`TTM ${withoutCommon}`);
    variations.add(`TTM Squeeze`);
    variations.add(`TTM Squeeze Pro`);
  }

  // Add variations from product keywords — only specific ones, not generic terms
  if (product.keywords && product.keywords.length > 0) {
    product.keywords
      .filter((keyword) => keyword.length > 3 && !isGenericKeyword(keyword))
      .forEach((keyword) => {
        variations.add(keyword);
      });
  }

  // Add brand+product combination if brand_name exists
  if (product.brand_name) {
    variations.add(`${product.brand_name} ${name}`);
    variations.add(product.brand_name);
  }

  return Array.from(variations);
}

/**
 * Build comprehensive search queries
 */
function buildSearchQueries(product: Product, keywordVariations: string[], intelligence?: IntelligenceData): string[] {
  const queries: string[] = [];

  // Use primary keyword (original name or first variation)
  const primaryKeyword = keywordVariations[0];

  // Guard: If no keyword variations, return empty queries
  if (!primaryKeyword) {
    return queries;
  }

  // ============================================
  // -1. INTELLIGENCE ENGINE QUERIES (learned from user feedback)
  // ============================================

  if (intelligence?.hasLearningData) {
    console.log(`[Google Scanner] Intelligence engine active: +${intelligence.verifiedKeywords.length} keywords, -${intelligence.falsePositiveDomains.length} FP domains`);

    // Add queries using verified keywords (these led to confirmed infringements before)
    for (const keyword of intelligence.verifiedKeywords.slice(0, 3)) {
      queries.push(`"${keyword}" "${primaryKeyword}"`);
      queries.push(`"${keyword}" free download`);
    }
  }

  // Build domain exclusion suffix from false positive domains
  const fpExclusion = intelligence?.falsePositiveDomains
    ?.map(d => `-site:${d}`)
    .join(' ') || '';

  // ============================================
  // 0. AI-ENHANCED SEARCHES (if approved AI data exists)
  // ============================================

  const aiData = product.ai_extracted_data;
  const isAIDataApproved = aiData && product.last_analyzed_at;

  if (isAIDataApproved) {
    console.log('[Google Scanner] Using approved AI-extracted data for enhanced queries');

    // UNIQUE PHRASES - Exact match searches (most powerful for detecting copied content)
    if (aiData.unique_phrases && aiData.unique_phrases.length > 0) {
      // Use top 3 most unique phrases (avoid making too many queries)
      const topPhrases = aiData.unique_phrases.slice(0, 3);
      topPhrases.forEach((phrase) => {
        queries.push(`"${phrase}"`); // Exact phrase match
        queries.push(`"${phrase}" free`); // Phrase + piracy indicator
        queries.push(`"${phrase}" download`); // Phrase + download
      });
    }

    // BRAND IDENTIFIERS - Search for unauthorized brand use
    if (aiData.brand_identifiers && aiData.brand_identifiers.length > 0) {
      aiData.brand_identifiers.forEach((brand) => {
        queries.push(`"${brand}" "${primaryKeyword}" -site:${getOfficialDomain(product)}`);
        queries.push(`"${brand}" free download`);
      });
    }

    // COPYRIGHTED TERMS - Exact match for trademarked/copyrighted content
    if (aiData.copyrighted_terms && aiData.copyrighted_terms.length > 0) {
      const topTerms = aiData.copyrighted_terms.slice(0, 3);
      topTerms.forEach((term) => {
        queries.push(`"${term}" cracked`);
        queries.push(`"${term}" leaked`);
        queries.push(`"${term}" torrent`);
      });
    }

    // AI KEYWORDS - Only use product-specific keywords (skip generic terms)
    if (aiData.keywords && aiData.keywords.length > 0) {
      const specificAiKeywords = aiData.keywords
        .filter((kw) => !isGenericKeyword(kw) && keywordSpecificityScore(kw) >= 0.5)
        .slice(0, 5);
      specificAiKeywords.forEach((keyword) => {
        // Only add if not already in manual keywords
        if (!product.keywords?.includes(keyword)) {
          queries.push(`"${keyword}" free download`);
        }
      });
    }
  }

  // ============================================
  // 1. MARKETPLACE-SPECIFIC SEARCHES
  // ============================================

  // TradingView (huge source of indicator clones)
  queries.push(`site:tradingview.com "${primaryKeyword}"`);
  queries.push(`site:tradingview.com/script "${primaryKeyword}"`);

  // MQL5 Marketplace (MetaTrader indicators)
  queries.push(`site:mql5.com/market "${primaryKeyword}"`);
  queries.push(`site:mql5.com "${primaryKeyword}"`);

  // ProRealCode
  queries.push(`site:prorealcode.com "${primaryKeyword}"`);

  // ThinkOrSwim platforms
  queries.push(`site:wstrades.com "${primaryKeyword}"`);
  queries.push(`"thinkorswim" "${primaryKeyword}"`);

  // Etsy (unauthorized sales)
  queries.push(`site:etsy.com "${primaryKeyword}"`);

  // Trading forums and communities
  queries.push(`site:forex-station.com "${primaryKeyword}"`);
  queries.push(`site:strategyquant.com "${primaryKeyword}"`);

  // Indicator download sites
  queries.push(`site:best-metatrader-indicators.com "${primaryKeyword}"`);
  queries.push(`"metatrader indicator" "${primaryKeyword}"`);

  // ============================================
  // 2. PIRACY-SPECIFIC SEARCHES
  // ============================================

  // Core piracy terms (with FP domain exclusions if intelligence data available)
  queries.push(`"${primaryKeyword}" free download ${fpExclusion}`.trim());
  queries.push(`"${primaryKeyword}" torrent ${fpExclusion}`.trim());
  queries.push(`"${primaryKeyword}" leaked ${fpExclusion}`.trim());
  queries.push(`"${primaryKeyword}" cracked ${fpExclusion}`.trim());
  queries.push(`"${primaryKeyword}" nulled ${fpExclusion}`.trim());

  // File hosting
  queries.push(`"${primaryKeyword}" mega.nz`);
  queries.push(`"${primaryKeyword}" mediafire`);
  queries.push(`"${primaryKeyword}" google drive free`);

  // Course piracy sites
  queries.push(`site:tradesmint.com "${primaryKeyword}"`);
  queries.push(`site:rocket.place "${primaryKeyword}"`);
  queries.push(`site:dlsub.com "${primaryKeyword}"`);
  queries.push(`site:trading123.net "${primaryKeyword}"`);
  queries.push(`site:digitalassistant.academy "${primaryKeyword}"`);

  // Community sharing
  queries.push(`"${primaryKeyword}" telegram group`);
  queries.push(`"${primaryKeyword}" discord free`);
  queries.push(`"${primaryKeyword}" free course`);

  // ============================================
  // 3. BRAND/CREATOR SEARCHES
  // ============================================

  // If product has brand name, search for unauthorized use
  if (product.brand_name) {
    queries.push(`"${product.brand_name}" "${primaryKeyword}" -site:${getOfficialDomain(product)}`);
    queries.push(`site:tradingview.com "${product.brand_name}"`);
  }

  // ============================================
  // 4. KEYWORD VARIATION SEARCHES
  // ============================================

  // Use top 3 keyword variations for broader coverage
  for (let i = 1; i < Math.min(4, keywordVariations.length); i++) {
    const variant = keywordVariations[i];
    if (variant !== primaryKeyword) {
      queries.push(`"${variant}"`);
      queries.push(`site:tradingview.com "${variant}"`);
    }
  }

  return queries;
}

/**
 * Extract official domain from product URL
 */
function getOfficialDomain(product: Product): string {
  if (!product.url) return '';
  try {
    return new URL(product.url).hostname;
  } catch {
    return '';
  }
}

/**
 * Search Google using Serper.dev for a specific query
 */
async function searchGoogleQuery(
  query: string,
  product: Product,
  apiKey: string,
  keywordVariations: string[]
): Promise<InfringementResult[]> {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 30 }),
    });

    if (!response.ok) {
      console.error(`[Google Scanner] Serper API error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as SerperResult;

    if (!data.organic || data.organic.length === 0) {
      return [];
    }

    const infringements: InfringementResult[] = [];

    for (const result of data.organic) {
      // Skip legitimate sources
      if (isLegitimateSource(result.link, product)) {
        continue;
      }

      // Check if result is an infringement (relaxed criteria)
      if (isInfringement(result.title, result.snippet || '', result.link, query, keywordVariations)) {
        const riskLevel = calculateRiskLevel(result.position, result.link);
        const audienceSize = estimateAudienceSize(result.position, result.link);
        const revenueLoss = estimateRevenueLoss(audienceSize, product.price);

        infringements.push({
          platform: 'google',
          source_url: result.link,
          risk_level: riskLevel,
          type: determineInfringementType(result.link, query),
          audience_size: audienceSize,
          est_revenue_loss: revenueLoss,
        });
      }
    }

    return infringements;
  } catch (error) {
    console.error(`[Google Scanner] Query error for "${query}":`, error);
    return [];
  }
}

/**
 * Check if URL is a legitimate source (not piracy)
 */
function isLegitimateSource(url: string, product: Product): boolean {
  const urlLower = url.toLowerCase();

  const legitimateDomains = [
    // Official stores
    'gumroad.com',
    'teachable.com',
    'udemy.com',
    'coursera.org',
    'skillshare.com',
    'stripe.com',
    'paddle.com',
    'lemonsqueezy.com',
    'amazon.com',
    'shopify.com',

    // Social media (reviews, not sales)
    'youtube.com',
    'youtu.be',
    'facebook.com/posts',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'instagram.com',

    // Documentation
    'wikipedia.org',
    'trustpilot.com',
    'producthunt.com',
  ];

  // Add product's official domain
  if (product.url) {
    try {
      const productDomain = new URL(product.url).hostname;
      legitimateDomains.push(productDomain);
    } catch {
      // Invalid URL
    }
  }

  // Add whitelisted domains from product
  if (product.whitelist_domains && product.whitelist_domains.length > 0) {
    legitimateDomains.push(...product.whitelist_domains);
  }

  // Check if URL matches any legitimate domain
  if (legitimateDomains.some((domain) => urlLower.includes(domain))) {
    return true;
  }

  // Check against specifically whitelisted URLs (user-approved pages)
  if (product.whitelist_urls && product.whitelist_urls.length > 0) {
    const normalizedUrl = urlLower.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
    for (const whitelistedUrl of product.whitelist_urls) {
      const normalizedWhitelist = whitelistedUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
      if (normalizedUrl === normalizedWhitelist || normalizedUrl.startsWith(normalizedWhitelist)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if search result is an infringement
 * RELAXED CRITERIA - catches unauthorized sales, not just piracy
 */
function isInfringement(
  title: string,
  snippet: string,
  url: string,
  query: string,
  keywordVariations: string[]
): boolean {
  const combined = `${title} ${snippet}`.toLowerCase();
  const urlLower = url.toLowerCase();

  // Known infringement platforms (auto-flag)
  const knownInfringementPlatforms = [
    'tradingview.com/script', // TradingView scripts (likely clones)
    'mql5.com/market', // MQL5 marketplace
    'prorealcode.com',
    'forex-station.com',
    'best-metatrader-indicators.com',
    'tradesmint.com',
    'rocket.place',
    'dlsub.com',
    'digitalassistant.academy',
    'trading123.net',
    'wstrades.com',
    'strategyquant.com',
    'tosindicators.com',
    'software.informer.com',
  ];

  // Auto-flag known infringement platforms
  if (knownInfringementPlatforms.some((platform) => urlLower.includes(platform))) {
    // Check if any keyword variation appears in title or URL
    const hasKeywordMatch = keywordVariations.some(
      (kw) => title.toLowerCase().includes(kw.toLowerCase()) || urlLower.includes(kw.toLowerCase())
    );

    if (hasKeywordMatch) {
      return true;
    }
  }

  // Piracy indicators
  const piracyKeywords = [
    'free download',
    'download free',
    'leaked',
    'crack',
    'cracked',
    'nulled',
    'pirated',
    'torrent',
    'mega.nz',
    'mediafire',
    'telegram group',
    'discord leak',
    'free course',
    'premium free',
    'get for free',
  ];

  const hasPiracyKeyword = piracyKeywords.some((keyword) => combined.includes(keyword));

  // Exclude obvious non-infringements
  const isNonInfringement =
    combined.includes('official site') ||
    combined.includes('buy now') ||
    combined.includes('purchase from') ||
    combined.includes('how to use') ||
    combined.includes('tutorial on') ||
    combined.includes('review:') ||
    combined.includes('what is') ||
    urlLower.includes('youtube.com/watch'); // YouTube videos (usually tutorials)

  if (isNonInfringement) {
    return false;
  }

  // If piracy keywords found, it's an infringement
  if (hasPiracyKeyword) {
    return true;
  }

  // Etsy unauthorized sales
  if (urlLower.includes('etsy.com/listing')) {
    return keywordVariations.some((kw) => combined.includes(kw.toLowerCase()));
  }

  // Check for clone indicators (similar name but not official)
  const cloneIndicators = [
    'indicator',
    'script',
    'code',
    'download',
    'strategy',
    'template',
    'system',
    'tool',
  ];

  const hasCloneIndicator = cloneIndicators.some((indicator) => combined.includes(indicator));

  if (hasCloneIndicator) {
    // Check if product name or variation appears
    return keywordVariations.some((kw) => combined.includes(kw.toLowerCase()));
  }

  // Default: if keyword matches and not explicitly legitimate, flag it
  return keywordVariations.some((kw) => title.toLowerCase().includes(kw.toLowerCase()));
}

/**
 * Calculate risk level based on position and platform
 */
function calculateRiskLevel(position: number, url: string): RiskLevel {
  const urlLower = url.toLowerCase();

  // High-traffic platforms are always high risk
  if (
    urlLower.includes('tradingview.com') ||
    urlLower.includes('mql5.com') ||
    urlLower.includes('etsy.com')
  ) {
    return position <= 5 ? 'critical' : 'high';
  }

  // Position-based for other platforms
  if (position <= 3) {
    return 'critical';
  }

  if (position <= 10) {
    return 'high';
  }

  if (position <= 20) {
    return 'medium';
  }

  return 'low';
}

/**
 * Estimate audience size based on platform and position
 */
function estimateAudienceSize(position: number, url: string): string {
  const urlLower = url.toLowerCase();

  // Platform-specific estimates
  if (urlLower.includes('tradingview.com')) {
    return position <= 10 ? '~10k+ views/month' : '~2k+ views/month';
  }

  if (urlLower.includes('mql5.com')) {
    return position <= 10 ? '~5k+ views/month' : '~1k+ views/month';
  }

  if (urlLower.includes('etsy.com')) {
    return '~500+ views/month';
  }

  // Generic estimate based on position
  const monthlySearchVolume = 2000;
  const ctrMap: Record<number, number> = {
    1: 0.3,
    2: 0.15,
    3: 0.1,
    4: 0.08,
    5: 0.06,
  };

  const ctr = ctrMap[position] || (position <= 10 ? 0.04 : 0.02);
  const estimatedClicks = Math.round(monthlySearchVolume * ctr);

  if (estimatedClicks >= 1000) {
    return `~${(estimatedClicks / 1000).toFixed(1)}k views/month`;
  }

  return `~${estimatedClicks} views/month`;
}

/**
 * Estimate revenue loss
 */
function estimateRevenueLoss(audienceSize: string, productPrice: number): number {
  const match = audienceSize.match(/~([\d.]+)([k]?)/);
  if (!match || !match[1]) return 0;

  let views = parseFloat(match[1]);
  if (match[2] === 'k') {
    views *= 1000;
  }

  // Higher conversion for marketplace listings (people actively looking to buy)
  const conversionRate = 0.1; // 10% for unauthorized sales, 5% for piracy
  const potentialCustomers = views * conversionRate;

  return Math.round(potentialCustomers * productPrice);
}

/**
 * Determine type of infringement
 */
function determineInfringementType(
  url: string,
  query: string
): 'indexed_page' | 'direct_download' | 'torrent' | 'post' {
  const urlLower = url.toLowerCase();
  const queryLower = query.toLowerCase();

  if (urlLower.includes('torrent') || queryLower.includes('torrent')) {
    return 'torrent';
  }

  if (
    urlLower.includes('mega.nz') ||
    urlLower.includes('mediafire') ||
    urlLower.includes('zippyshare') ||
    urlLower.includes('dropbox') ||
    urlLower.includes('drive.google')
  ) {
    return 'direct_download';
  }

  if (
    urlLower.includes('forum') ||
    urlLower.includes('reddit') ||
    urlLower.includes('telegram') ||
    urlLower.includes('discord')
  ) {
    return 'post';
  }

  return 'indexed_page';
}
