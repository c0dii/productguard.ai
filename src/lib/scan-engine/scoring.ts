/**
 * Confidence Scoring & False Positive Filtering
 *
 * Scores each search result on a 0-100 confidence scale using:
 * - Profile-based boost/penalty terms
 * - Position in search results
 * - Tier of the query that found it
 * - Dedicated piracy site detection
 * - Legitimate site / whitelist detection
 * - Product name matching in title
 * - File extension presence
 *
 * Results below the threshold or flagged as false positives are filtered out.
 */

import type { Product, RiskLevel, PlatformType, InfringementType } from '@/types';
import { getProfile } from './profiles';

// ============================================================================
// TYPES
// ============================================================================

export interface ScoringInput {
  url: string;
  title: string;
  snippet: string;
  position: number;
  query: string;
  queryCategory: string;
  tier: 1 | 2 | 3;
}

export interface ScoringResult {
  confidence: number; // 0-100
  risk_level: RiskLevel;
  platform: PlatformType;
  type: InfringementType;
  audience_size: string;
  est_revenue_loss: number;
  isFalsePositive: boolean;
  reasons: string[];
}

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

/**
 * Detect the platform type from a URL.
 */
function detectPlatform(url: string): PlatformType {
  const u = url.toLowerCase();

  if (u.includes('t.me/') || u.includes('telegram.')) return 'telegram';
  if (u.includes('discord.gg') || u.includes('discord.com')) return 'discord';

  // Torrent sites
  const torrentDomains = [
    '1337x.to', 'thepiratebay', 'torrentgalaxy', 'yts.mx', 'eztv.re',
    'torlock', 'limetorrents', 'nyaa.si', 'rutracker', 'btdig',
  ];
  if (torrentDomains.some((d) => u.includes(d))) return 'torrent';

  // Cyberlockers
  const cyberlockerDomains = [
    'mega.nz', 'mediafire.com', 'drive.google.com', 'dropbox.com',
    '4shared.com', 'uploaded.net', 'rapidgator.net', 'sendspace.com',
    'fichier.com', 'uptobox.com',
  ];
  if (cyberlockerDomains.some((d) => u.includes(d))) return 'cyberlocker';

  // Forums
  const forumDomains = [
    'nulled.to', 'cracked.io', 'sinisterly.com', 'hackforums',
    'leakforums', 'blackhatworld', 'nsaneforums', 'reddit.com',
    'forex-station.com',
  ];
  if (forumDomains.some((d) => u.includes(d))) return 'forum';

  // Social
  const socialDomains = [
    'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
    'tiktok.com', 'linkedin.com',
  ];
  if (socialDomains.some((d) => u.includes(d))) return 'social';

  return 'google'; // Default: indexed web page
}

/**
 * Detect infringement type from URL and query context.
 */
function detectInfringementType(
  url: string,
  query: string
): InfringementType {
  const u = url.toLowerCase();
  const q = query.toLowerCase();

  if (u.includes('t.me/')) {
    if (u.includes('/c/') || u.match(/t\.me\/[a-zA-Z][\w]{3,}$/)) return 'channel';
    return 'post';
  }
  if (u.includes('discord.gg') || u.includes('discord.com/invite')) return 'server';
  if (u.includes('torrent') || q.includes('torrent') || u.match(/1337x|piratebay|torrentgalaxy|yts|eztv/)) return 'torrent';
  if (u.match(/mega\.nz|mediafire|drive\.google|dropbox|rapidgator|uploaded\.net/)) return 'direct_download';
  if (u.match(/reddit\.com|forum|nulled|cracked\.io/)) return 'post';

  return 'indexed_page';
}

// ============================================================================
// AUDIENCE & REVENUE ESTIMATION
// ============================================================================

/**
 * Estimate audience size based on platform and search position.
 */
function estimateAudienceSize(
  url: string,
  position: number,
  platform: PlatformType
): string {
  const u = url.toLowerCase();

  // Platform-specific estimates
  if (u.includes('tradingview.com')) {
    return position <= 10 ? '~10k+ views/month' : '~2k+ views/month';
  }
  if (u.includes('mql5.com')) {
    return position <= 10 ? '~5k+ views/month' : '~1k+ views/month';
  }
  if (u.includes('etsy.com')) return '~500+ views/month';

  // Platform-based defaults
  if (platform === 'telegram') return '~500 members';
  if (platform === 'torrent') return '~50 peers';
  if (platform === 'cyberlocker') return '~300 downloads';
  if (platform === 'discord') return '~200 members';
  if (platform === 'forum') return '~1k views';

  // Position-based for generic Google results
  const monthlySearchVolume = 2000;
  const ctrMap: Record<number, number> = {
    1: 0.30, 2: 0.15, 3: 0.10, 4: 0.08, 5: 0.06,
  };
  const ctr = ctrMap[position] || (position <= 10 ? 0.04 : 0.02);
  const clicks = Math.round(monthlySearchVolume * ctr);

  if (clicks >= 1000) return `~${(clicks / 1000).toFixed(1)}k views/month`;
  return `~${clicks} views/month`;
}

/**
 * Estimate revenue loss from a single infringing URL.
 */
function estimateRevenueLoss(
  audienceSize: string,
  productPrice: number,
  platform: PlatformType
): number {
  // Extract numeric value from audience string
  const match = audienceSize.match(/~([\d.]+)([kKmM]?)/);
  if (!match?.[1]) return 0;

  let views = parseFloat(match[1]);
  const suffix = match[2]?.toLowerCase();
  if (suffix === 'k') views *= 1000;
  if (suffix === 'm') views *= 1000000;

  // Platform-specific conversion rates
  // Two-step model: (% who actually download) × (% who would have bought)
  // Based on industry research showing ~10-20% of pirates would have purchased
  const conversionRates: Record<string, number> = {
    telegram: 0.01,    // 1% — mostly lurkers, few download, fewer would buy
    torrent: 0.10,     // 10% — active downloaders but price-sensitive
    cyberlocker: 0.08, // 8% — direct downloads, similar to torrents
    discord: 0.01,     // 1% — community lurkers
    forum: 0.01,       // 1% — passive browsing, low conversion
    google: 0.02,      // 2% — mixed intent, most just browsing
    social: 0.001,     // 0.1% — passive exposure, near-zero conversion
  };

  const rate = conversionRates[platform] || 0.10;
  return Math.round(views * rate * productPrice);
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Score a search result's confidence of being a real infringement.
 */
export function scoreResult(
  input: ScoringInput,
  product: Product
): ScoringResult {
  const profile = getProfile(product.type);
  const combined = `${input.title} ${input.snippet}`.toLowerCase();
  const urlLower = input.url.toLowerCase();
  const reasons: string[] = [];

  let score = 40; // Base score

  // ── Position-based scoring ──
  if (input.position <= 3) {
    score += 10;
    reasons.push('top-3 position');
  } else if (input.position <= 10) {
    score += 5;
    reasons.push('first page');
  }

  // ── Tier-based scoring ──
  if (input.tier === 1) score += 5;  // Broad query match
  if (input.tier === 2) score += 10; // Targeted platform match
  if (input.tier === 3) score += 15; // Deep-dive signal

  // ── Platform detection (early, needed for weight scoring) ──
  const platform = detectPlatform(input.url);

  // ── Platform weight scoring (type-aware) ──
  const platformWeight = profile.platformWeights[platform] ?? 0.5;
  if (platformWeight >= 0.8) {
    score += 8;
    reasons.push(`high-priority platform (${platform})`);
  } else if (platformWeight >= 0.6) {
    score += 4;
    reasons.push(`relevant platform (${platform})`);
  } else if (platformWeight < 0.4) {
    score -= 5;
    reasons.push(`low-priority platform (${platform})`);
  }

  // ── Profile boost terms ──
  let boostCount = 0;
  for (const term of profile.boostTerms) {
    if (combined.includes(term.toLowerCase())) {
      boostCount++;
      if (boostCount <= 3) score += 8; // Cap total boost
    }
  }
  if (boostCount > 0) reasons.push(`${boostCount} piracy indicators`);

  // ── Profile penalty terms ──
  let penaltyCount = 0;
  for (const term of profile.penaltyTerms) {
    if (combined.includes(term.toLowerCase())) {
      penaltyCount++;
      score -= 10;
    }
  }
  if (penaltyCount > 0) reasons.push(`${penaltyCount} non-piracy indicators`);

  // ── Dedicated piracy site ──
  const isDedicatedSite = profile.dedicatedSites.some((site) =>
    urlLower.includes(site)
  );
  if (isDedicatedSite) {
    score += 15;
    reasons.push('known piracy site');
  }

  // ── Legitimate site ──
  const isLegitSite = profile.legitimateSites.some((site) =>
    urlLower.includes(site)
  );
  if (isLegitSite) {
    score -= 30;
    reasons.push('legitimate site');
  }

  // ── Official domain ──
  if (product.url) {
    try {
      const officialDomain = new URL(product.url).hostname;
      if (urlLower.includes(officialDomain)) {
        score -= 50;
        reasons.push('official domain');
      }
    } catch {
      // Invalid product URL
    }
  }

  // ── Whitelist domain ──
  if (product.whitelist_domains?.some((d) => urlLower.includes(d))) {
    score -= 50;
    reasons.push('whitelisted domain');
  }

  // ── Product name in title ──
  if (input.title.toLowerCase().includes(product.name.toLowerCase())) {
    score += 10;
    reasons.push('name in title');
  }

  // ── File extension in URL or snippet ──
  const hasFileExt = profile.fileExtensions.some(
    (ext) => urlLower.includes(ext) || combined.includes(ext)
  );
  if (hasFileExt) {
    score += 5;
    reasons.push('file extension match');
  }

  // ── Clamp to 0-100 ──
  const confidence = Math.max(0, Math.min(100, score));

  // ── Derived fields ──
  const type = detectInfringementType(input.url, input.query);
  const risk_level = confidenceToRiskLevel(confidence);
  const audience_size = estimateAudienceSize(input.url, input.position, platform);
  const est_revenue_loss = estimateRevenueLoss(audience_size, product.price, platform);

  const isFalsePositive =
    confidence < 30 ||
    isLegitSite ||
    (product.whitelist_domains?.some((d) => urlLower.includes(d)) ?? false);

  return {
    confidence,
    risk_level,
    platform,
    type,
    audience_size,
    est_revenue_loss,
    isFalsePositive,
    reasons,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function confidenceToRiskLevel(confidence: number): RiskLevel {
  if (confidence >= 80) return 'critical';
  if (confidence >= 60) return 'high';
  if (confidence >= 40) return 'medium';
  return 'low';
}

/**
 * Filter a scored result set to only real infringements.
 */
export function filterByConfidence(
  results: Array<{ url: string; score: ScoringResult }>,
  threshold: number = 35
): Array<{ url: string; score: ScoringResult }> {
  return results.filter(
    (r) => !r.score.isFalsePositive && r.score.confidence >= threshold
  );
}
