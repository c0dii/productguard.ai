// ============================================================
// Discovery Engine Query Generator
// src/lib/discovery-engine/discovery-queries.ts
//
// Generates 3-tier SerpAPI queries from discovery profiles.
// Mirrors the pattern from scan-engine/query-generator.ts
// but generates GENERIC piracy queries (no specific product).
// ============================================================

import type { DiscoveryCategory, DiscoveryProfile, DiscoveryQuery } from './types';
import { getActivePiracySites } from './discovery-profiles';
import { DEAD_SITES } from '@/lib/scan-engine/profiles';

/**
 * Generate all discovery queries for a category.
 * @param profile  The category's discovery profile
 * @param tier1ResultUrls  URLs found in Tier 1 (for Tier 3 hot-domain deep dives)
 */
export function generateDiscoveryQueries(
  profile: DiscoveryProfile,
  tier1ResultUrls?: string[],
): {
  tier1: DiscoveryQuery[];
  tier2: DiscoveryQuery[];
  tier3: DiscoveryQuery[];
} {
  const seen = new Set<string>();

  const dedupe = (query: string): boolean => {
    const normalized = query.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  };

  const tier1 = generateTier1(profile, dedupe);
  const tier2 = generateTier2(profile, dedupe);
  const tier3 = tier1ResultUrls ? generateTier3(profile, tier1ResultUrls, dedupe) : [];

  return { tier1, tier2, tier3 };
}

// ── Tier 1: Broad Discovery ─────────────────────────────────
// 5-8 queries per category, num=30 (wide net)

function generateTier1(
  profile: DiscoveryProfile,
  dedupe: (q: string) => boolean,
): DiscoveryQuery[] {
  const queries: DiscoveryQuery[] = [];

  for (const q of profile.genericQueries) {
    if (dedupe(q)) {
      queries.push({
        query: q,
        tier: 1,
        num: 30,
        category: profile.category,
      });
    }
  }

  return queries;
}

// ── Tier 2: Targeted Platform ───────────────────────────────
// 10-15 queries per category, num=10 (specific hotspots)

function generateTier2(
  profile: DiscoveryProfile,
  dedupe: (q: string) => boolean,
): DiscoveryQuery[] {
  const queries: DiscoveryQuery[] = [];
  const piracySites = getActivePiracySites();

  // Profile-specific site queries
  for (const sq of profile.siteQueries) {
    if (DEAD_SITES.has(sq.site)) continue;

    for (const term of sq.terms) {
      const q = `site:${sq.site} ${term}`;
      if (dedupe(q)) {
        queries.push({
          query: q,
          tier: 2,
          num: 10,
          category: profile.category,
        });
      }
    }
  }

  // Cross-category torrent sites (top 3 not already covered)
  const coveredSites = new Set(profile.siteQueries.map(sq => sq.site));
  const typeIndicator = profile.typeIndicators[0] || profile.category;

  for (const torrentSite of piracySites.torrent) {
    if (coveredSites.has(torrentSite) || DEAD_SITES.has(torrentSite)) continue;
    const q = `site:${torrentSite} "${typeIndicator}"`;
    if (dedupe(q)) {
      queries.push({
        query: q,
        tier: 2,
        num: 10,
        category: profile.category,
      });
    }
    if (queries.filter(q2 => q2.tier === 2).length >= 18) break;
  }

  return queries;
}

// ── Tier 3: Hot-Domain Deep Dive ────────────────────────────
// 0-5 queries, num=10 (domains with 2+ Tier 1/2 results)

function generateTier3(
  profile: DiscoveryProfile,
  tier1ResultUrls: string[],
  dedupe: (q: string) => boolean,
): DiscoveryQuery[] {
  const queries: DiscoveryQuery[] = [];

  // Count domains from Tier 1/2 results
  const domainCounts = new Map<string, number>();
  for (const url of tier1ResultUrls) {
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '');
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    } catch {
      // Skip invalid URLs
    }
  }

  // Find "hot" domains with 2+ results
  const hotDomains = Array.from(domainCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const typeIndicator = profile.typeIndicators[0] || profile.category;

  for (const [domain] of hotDomains) {
    // Skip legitimate platforms — we don't want to deep-dive official sites
    if (profile.legitimatePlatforms.some(lp => domain.includes(lp.replace('www.', '')))) {
      continue;
    }

    const q = `site:${domain} "${typeIndicator}" OR "premium" OR "download"`;
    if (dedupe(q)) {
      queries.push({
        query: q,
        tier: 3,
        num: 10,
        category: profile.category,
      });
    }
  }

  return queries;
}

/**
 * Estimate total SerpAPI calls for a set of query tiers.
 */
export function estimateQueryCost(queries: {
  tier1: DiscoveryQuery[];
  tier2: DiscoveryQuery[];
  tier3: DiscoveryQuery[];
}): number {
  return queries.tier1.length + queries.tier2.length + queries.tier3.length;
}
