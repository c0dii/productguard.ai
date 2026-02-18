/**
 * Tiered Query Generator — builds search queries organized by priority.
 *
 * Tier 1: Broad Discovery (8-12 queries @ num=30)
 *   Cast a wide net: core piracy terms + product name variations.
 *
 * Tier 2: Targeted Platform (10-20 queries @ num=10)
 *   Search known piracy sites, cyberlockers, torrent indexers, forums.
 *
 * Tier 3: Signal-Based Deep Dive (0-10 queries @ num=10)
 *   Follow up on high-signal domains and AI-extracted data.
 *
 * Hard cap: combined query count is capped before execution in the orchestrator
 * to stay within the 50-call SerpAPI budget.
 */

import type { Product, ProductType } from '@/types';
import {
  getProfile,
  DEAD_SITES,
  TORRENT_SITES,
  CYBERLOCKER_SITES,
  WAREZ_FORUMS,
  CODE_REPOS,
} from './profiles';
import type { IntelligenceData } from '@/lib/intelligence/intelligence-engine';
import { getDiscoveryProfile } from '@/lib/discovery-engine/discovery-profiles';
import type { DiscoveryCategory } from '@/lib/discovery-engine/types';

// ============================================================================
// TYPES
// ============================================================================

export interface GeneratedQuery {
  query: string;
  tier: 1 | 2 | 3;
  num: number; // Results to fetch (10 or 30)
  category: string; // For logging/analytics
}

interface NormalizedProduct {
  canonical: string; // Full official name
  short: string; // Shortened/common form
  slug: string; // URL-safe slug
  creator: string | null; // Brand/creator name
}

// ============================================================================
// NAME NORMALIZATION
// ============================================================================

/**
 * Normalize product name into multiple forms for query generation.
 */
function normalizeProductName(product: Product): NormalizedProduct {
  const name = product.name;

  // Canonical: full name as-is
  const canonical = name;

  // Short: remove common articles and product-type suffixes
  const short = name
    .replace(/\b(the|a|an|by|for|of|and)\b/gi, '')
    .replace(
      /\b(indicator|course|template|software|tool|system|ebook|book|guide)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

  // Slug: URL-safe form
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Creator: brand name from product fields or extracted from "by X" pattern
  let creator = product.brand_name || null;
  if (!creator) {
    const byMatch = name.match(/\bby\s+(.+)$/i);
    if (byMatch?.[1]) creator = byMatch[1].trim();
  }

  return { canonical, short, slug, creator };
}

// ============================================================================
// HELPERS
// ============================================================================

function getOfficialDomain(product: Product): string {
  if (!product.url) return '';
  try {
    return new URL(product.url).hostname;
  } catch {
    return '';
  }
}

/**
 * Build domain exclusion string for legitimate/whitelisted domains.
 * Keeps queries from matching official pages, reviews, etc.
 */
function buildExclusions(
  product: Product,
  profile: ReturnType<typeof getProfile>
): string {
  const domains = new Set<string>();

  const officialDomain = getOfficialDomain(product);
  if (officialDomain) domains.add(officialDomain);

  // User-configured whitelist domains
  product.whitelist_domains?.forEach((d) => domains.add(d));

  // Profile legitimate sites (top 5 to keep query length manageable)
  profile.legitimateSites.slice(0, 5).forEach((d) => domains.add(d));

  let exclusionStr = Array.from(domains)
    .map((d) => `-site:${d}`)
    .join(' ');

  // Append negative keyword exclusions (max 3 to keep query length manageable)
  if (product.negative_keywords?.length) {
    const negTerms = product.negative_keywords
      .slice(0, 3)
      .map((nk) => `-"${nk}"`)
      .join(' ');
    exclusionStr = `${exclusionStr} ${negTerms}`.trim();
  }

  return exclusionStr;
}

/**
 * Filter out dead/offline sites from a list.
 */
function filterAliveSites(sites: string[]): string[] {
  return sites.filter((s) => !DEAD_SITES.has(s));
}

/**
 * Map ProductType to DiscoveryCategory for bridging discovery profile queries.
 * Returns null for types without a matching discovery profile.
 */
function mapProductTypeToDiscoveryCategory(type: ProductType): DiscoveryCategory | null {
  const mapping: Partial<Record<ProductType, DiscoveryCategory>> = {
    course: 'course',
    indicator: 'trading_indicator',
    software: 'software',
    template: 'design_asset',
    ebook: 'ebook',
  };
  return mapping[type] ?? null;
}

// ============================================================================
// TIER 1: BROAD DISCOVERY (8-12 queries @ num=30)
// ============================================================================

function generateTier1(
  product: Product,
  names: NormalizedProduct,
  profile: ReturnType<typeof getProfile>,
  exclusions: string,
  intelligence?: IntelligenceData
): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];
  const q = (query: string, category: string) =>
    queries.push({ query, tier: 1, num: 30, category });

  // AI-generated piracy search terms (product-specific, highest priority)
  const aiPiracyTerms = product.ai_extracted_data?.piracy_search_terms || [];
  for (const term of aiPiracyTerms.slice(0, 4)) {
    q(`${term} ${exclusions}`.trim(), 'ai-piracy');
  }

  // Core piracy searches — type-specific terms from profile (reduced when AI terms exist)
  const profileTermCount = aiPiracyTerms.length > 0 ? 2 : 4;
  const typePiracyTerms = profile.piracyTerms.slice(0, profileTermCount);
  for (const term of typePiracyTerms) {
    q(`"${names.canonical}" ${term} ${exclusions}`.trim(), 'piracy-core');
  }

  // Short name variations (if meaningfully different from canonical)
  if (names.short && names.short !== names.canonical && names.short.length > 3) {
    q(`"${names.short}" free download ${exclusions}`.trim(), 'piracy-short');
    q(`"${names.short}" nulled ${exclusions}`.trim(), 'piracy-short');
  }

  // User-specified keywords as additional search terms
  if (product.keywords?.length) {
    for (const keyword of product.keywords.slice(0, 3)) {
      if (!names.canonical.toLowerCase().includes(keyword.toLowerCase())) {
        q(`"${keyword}" "${names.canonical}" ${exclusions}`.trim(), 'user-keyword');
      }
    }
  }

  // Brand + product search
  if (names.creator) {
    const officialDomain = getOfficialDomain(product) || 'example.com';
    q(
      `"${names.creator}" "${names.canonical}" -site:${officialDomain}`,
      'brand'
    );
  }

  // AI-extracted unique phrases (most powerful for detecting copied content)
  const aiData = product.ai_extracted_data;
  if (aiData?.unique_phrases?.length) {
    const topPhrases = aiData.unique_phrases.slice(0, 2);
    for (const phrase of topPhrases) {
      q(`"${phrase}" ${exclusions}`.trim(), 'ai-phrase');
    }
  }

  // Platform-specific Google terms (AI-optimized for Google search)
  const googleTerms = aiData?.platform_search_terms?.google || [];
  for (const term of googleTerms.slice(0, 2)) {
    q(`${term} ${exclusions}`.trim(), 'platform-google');
  }

  // Bridge discovery profile genericQueries (type-specific pre-built patterns)
  const discoveryCategory = mapProductTypeToDiscoveryCategory(product.type);
  if (discoveryCategory) {
    const discoveryProfile = getDiscoveryProfile(discoveryCategory);
    if (discoveryProfile) {
      for (const gq of discoveryProfile.genericQueries.slice(0, 2)) {
        q(`"${names.canonical}" ${gq} ${exclusions}`.trim(), 'discovery-supplement');
      }
    }
  }

  // Intelligence-enhanced queries (learned from verified infringements)
  if (intelligence?.hasLearningData && intelligence.verifiedKeywords.length > 0) {
    const fpExclusion =
      intelligence.falsePositiveDomains?.map((d) => `-site:${d}`).join(' ') ||
      '';
    for (const keyword of intelligence.verifiedKeywords.slice(0, 2)) {
      q(
        `"${keyword}" "${names.canonical}" ${fpExclusion}`.trim(),
        'intelligence'
      );
    }
  }

  return queries;
}

// ============================================================================
// TIER 2: TARGETED PLATFORM (10-20 queries @ num=10)
// ============================================================================

function generateTier2(
  product: Product,
  names: NormalizedProduct,
  profile: ReturnType<typeof getProfile>
): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];
  const q = (query: string, category: string) =>
    queries.push({ query, tier: 2, num: 10, category });

  const weights = profile.platformWeights;

  // Profile-specific dedicated sites
  for (const site of profile.dedicatedSites.filter((s) => !DEAD_SITES.has(s))) {
    q(`site:${site} "${names.canonical}"`, 'dedicated-site');
  }

  // Telegram — prefer AI platform-specific terms when available
  const telegramTerms = product.ai_extracted_data?.platform_search_terms?.telegram || [];
  if (telegramTerms.length > 0) {
    for (const term of telegramTerms.slice(0, 2)) {
      q(`site:t.me ${term}`, 'telegram-ai');
    }
  } else {
    q(`site:t.me "${names.canonical}"`, 'telegram');
    q(`site:t.me "${names.canonical}" free`, 'telegram');
  }

  // Torrent sites — count varies by platform weight
  if ((weights.torrent ?? 0) >= 0.6) {
    const count = (weights.torrent ?? 0) >= 0.8 ? 5 : 3;
    const aliveTorrents = filterAliveSites(TORRENT_SITES).slice(0, count);
    for (const site of aliveTorrents) {
      q(`site:${site} "${names.canonical}"`, 'torrent');
    }
  }

  // Cyberlocker sites — count varies by platform weight
  if ((weights.cyberlocker ?? 0) >= 0.6) {
    const count = (weights.cyberlocker ?? 0) >= 0.8 ? 5 : 3;
    const aliveCyberlockers = filterAliveSites(CYBERLOCKER_SITES).slice(0, count);
    for (const site of aliveCyberlockers) {
      q(`site:${site} "${names.canonical}"`, 'cyberlocker');
    }
  }

  // Warez forums — count varies by platform weight
  if ((weights.forum ?? 0) >= 0.6) {
    const count = (weights.forum ?? 0) >= 0.7 ? 3 : 2;
    for (const site of WAREZ_FORUMS.slice(0, count)) {
      q(`site:${site} "${names.canonical}"`, 'warez-forum');
    }
  }

  // Code repos (for software/indicator types only)
  if (product.type === 'software' || product.type === 'indicator') {
    for (const site of CODE_REPOS.slice(0, 2)) {
      q(`site:${site} "${names.canonical}"`, 'code-repo');
    }
  }

  // File extension searches (type-specific, top 2 extensions)
  const topExtensions = profile.fileExtensions.slice(0, 2);
  for (const ext of topExtensions) {
    q(
      `"${names.canonical}" filetype:${ext.replace('.', '')}`,
      'file-ext'
    );
  }

  // AI-detected file identifiers (e.g., "10xbars.ex4", "v2.1")
  const autoIdentifiers = product.ai_extracted_data?.auto_unique_identifiers || [];
  for (const id of autoIdentifiers.slice(0, 2)) {
    q(`"${id}" free download`, 'auto-identifier');
  }

  return queries;
}

// ============================================================================
// TIER 3: SIGNAL-BASED DEEP DIVE (0-10 queries @ num=10)
// ============================================================================

function generateTier3(
  product: Product,
  names: NormalizedProduct,
  profile: ReturnType<typeof getProfile>,
  tier1ResultUrls: string[],
  intelligence?: IntelligenceData
): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];
  const q = (query: string, category: string) =>
    queries.push({ query, tier: 3, num: 10, category });

  const aiData = product.ai_extracted_data;

  // AI copyrighted terms (more targeted than Tier 1 phrases)
  if (aiData?.copyrighted_terms?.length) {
    const topTerms = aiData.copyrighted_terms.slice(0, 3);
    for (const term of topTerms) {
      q(`"${term}" cracked`, 'ai-copyright');
      q(`"${term}" leaked`, 'ai-copyright');
    }
  }

  // Brand identifiers from AI
  if (aiData?.brand_identifiers?.length) {
    for (const brand of aiData.brand_identifiers.slice(0, 2)) {
      q(`"${brand}" free download`, 'ai-brand');
    }
  }

  // Alternative names (merge user-provided + AI auto-detected, deduplicated)
  const userAltNames = product.alternative_names || [];
  const autoAltNames = aiData?.auto_alternative_names || [];
  const allAltNames = [...new Set([...userAltNames, ...autoAltNames])];
  for (const altName of allAltNames.slice(0, 3)) {
    q(`"${altName}" free download`, 'alt-name');
  }

  // Unique identifiers (file names, version codes, serial patterns)
  if (product.unique_identifiers?.length) {
    for (const identifier of product.unique_identifiers.slice(0, 2)) {
      q(`"${identifier}" free download`, 'unique-id');
    }
  }

  // Deep dive into high-signal domains found in Tier 1/2
  const domainCounts = new Map<string, number>();
  for (const url of tier1ResultUrls) {
    try {
      const domain = new URL(url).hostname;
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    } catch {
      // Skip invalid URLs
    }
  }

  // Search domains with 2+ results more deeply
  const hotDomains = Array.from(domainCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [domain] of hotDomains) {
    q(`site:${domain} "${names.canonical}"`, 'hot-domain');
  }

  return queries;
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

function deduplicateQueries(queries: GeneratedQuery[]): GeneratedQuery[] {
  const seen = new Set<string>();
  return queries.filter((q) => {
    const normalized = q.query.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Generate all tiered search queries for a product.
 *
 * @param product - The product to scan
 * @param intelligence - Intelligence data from past feedback (optional)
 * @param tier1ResultUrls - URLs found in Tier 1/2 (pass to generate Tier 3)
 * @returns Object with tier1, tier2, tier3 query arrays (deduplicated)
 */
export function generateQueries(
  product: Product,
  intelligence?: IntelligenceData,
  tier1ResultUrls?: string[]
): {
  tier1: GeneratedQuery[];
  tier2: GeneratedQuery[];
  tier3: GeneratedQuery[];
} {
  const profile = getProfile(product.type);
  const names = normalizeProductName(product);
  const exclusions = buildExclusions(product, profile);

  const tier1 = deduplicateQueries(
    generateTier1(product, names, profile, exclusions, intelligence)
  );
  const tier2 = deduplicateQueries(
    generateTier2(product, names, profile)
  );
  const tier3 = tier1ResultUrls
    ? deduplicateQueries(
        generateTier3(product, names, profile, tier1ResultUrls, intelligence)
      )
    : [];

  return { tier1, tier2, tier3 };
}
