// ============================================================
// Discovery Engine — Confidence Scoring
// src/lib/discovery-engine/discovery-scoring.ts
//
// 4-component scoring system (0-100 total):
//   A. Piracy Evidence   (0-30)
//   B. Product Match     (0-25)
//   C. Owner Verification(0-25)
//   D. Data Completeness (0-20)
//
// Must reach 95 to pass qualifyProspect() gate.
// ============================================================

import type { IdentifiedOwner, ScoredCandidate, ScoreBreakdown } from './types';
import type { InfringingPlatform } from '@/types/marketing';

// ── Known piracy sites (for evidence scoring) ───────────────

const DEDICATED_PIRACY_SITES = new Set([
  'nulled.to', 'cracked.io', 'gpldl.com', 'babiato.co',
  'courseclub.me', 'freecourseweb.com', 'getfreecourses.co',
  'paidcoursesforfree.com', 'filecr.com', 'getintopc.com',
  'pdfdrive.com', 'libgen.is', 'libgen.rs', 'themelock.com',
  'freecoursesonline.me', 'desirecourse.net',
  '1337x.to', 'thepiratebay.org', 'torrentgalaxy.to',
]);

const PIRACY_TERMS = [
  'free download', 'cracked', 'nulled', 'leaked',
  'pirated', 'torrent', 'crack', 'keygen', 'warez',
  'mega link', 'google drive', 'download free',
];

const GENERIC_EMAILS = new Set([
  'info@', 'admin@', 'noreply@', 'no-reply@',
  'support@', 'help@', 'webmaster@', 'contact@',
]);

/**
 * Score a candidate across 4 components.
 * Returns ScoredCandidate with total score and breakdown.
 */
export function scoreCandidate(owner: IdentifiedOwner): ScoredCandidate {
  const breakdown: ScoreBreakdown = {
    piracy_evidence: scorePiracyEvidence(owner),
    product_match: scoreProductMatch(owner),
    owner_verification: scoreOwnerVerification(owner),
    data_completeness: scoreDataCompleteness(owner),
  };

  let total = breakdown.piracy_evidence
    + breakdown.product_match
    + breakdown.owner_verification
    + breakdown.data_completeness;

  // Apply penalties
  total += calculatePenalties(owner);
  total = Math.max(0, Math.min(100, total));

  // Classify the infringing platform
  const infringingPlatform = classifyInfringingPlatform(
    owner.extracted.raw_listing.source_url
  );

  return {
    owner,
    audience_size: null,
    est_revenue_loss: estimateRevenueLoss(owner),
    infringing_platform: infringingPlatform,
    confidence_score: Math.round(total * 100) / 100,
    screenshot_url: null,
    score_breakdown: breakdown,
  };
}

// ── A. Piracy Evidence (0-30) ───────────────────────────────

function scorePiracyEvidence(owner: IdentifiedOwner): number {
  let score = 0;
  const listing = owner.extracted.raw_listing;

  // Found on dedicated piracy site (+15)
  const sourceDomain = extractDomain(listing.source_url);
  if (sourceDomain && DEDICATED_PIRACY_SITES.has(sourceDomain)) {
    score += 15;
  }

  // Piracy terms in title/snippet (up to +10)
  const text = `${listing.title} ${listing.snippet}`.toLowerCase();
  let termMatches = 0;
  for (const term of PIRACY_TERMS) {
    if (text.includes(term)) {
      termMatches++;
    }
  }
  score += Math.min(10, termMatches * 5);

  // Telegram with piracy indicators (+3)
  if (listing.source_url.includes('t.me') && termMatches > 0) {
    score += 3;
  }

  // File hosting links in snippet (+2)
  if (/mega\.nz|mediafire\.com|drive\.google/.test(listing.snippet)) {
    score += 2;
  }

  return Math.min(30, score);
}

// ── B. Product Match (0-25) ─────────────────────────────────

function scoreProductMatch(owner: IdentifiedOwner): number {
  let score = 0;

  // AI extraction confidence
  const extractionConf = owner.extracted.extraction_confidence;
  if (extractionConf >= 0.9) score += 10;
  else if (extractionConf >= 0.7) score += 5;

  // Official product page found (reflected in product_url)
  if (owner.product_url) score += 10;

  // Product exists on known commercial platform
  if (owner.extracted.suspected_platform !== 'own website') score += 5;

  return Math.min(25, score);
}

// ── C. Owner Verification (0-25) ────────────────────────────

function scoreOwnerVerification(owner: IdentifiedOwner): number {
  let score = 0;

  // Official product page accessible
  if (owner.product_url) score += 10;

  // Owner email found with valid domain
  if (owner.owner_email) {
    const isGeneric = GENERIC_EMAILS.has(
      owner.owner_email.split('@')[0]?.toLowerCase() + '@'
    );
    score += isGeneric ? 2 : 5;
  }

  // Owner name found
  if (owner.owner_name) score += 3;

  // Company domain matches product URL domain
  if (owner.company_domain && owner.product_url) {
    const productDomain = extractDomain(owner.product_url);
    if (productDomain && owner.company_domain === productDomain) {
      score += 5;
    }
  }

  // WHOIS data confirms (reflected in identification confidence)
  if (owner.identification_confidence >= 0.7) score += 2;

  return Math.min(25, score);
}

// ── D. Data Completeness (0-20) ─────────────────────────────

function scoreDataCompleteness(owner: IdentifiedOwner): number {
  let score = 0;

  if (owner.product_url) score += 4;
  if (owner.product_price) score += 3;
  if (owner.owner_email) score += 5;
  if (owner.company_name) score += 3;
  if (owner.social_twitter || owner.social_instagram || owner.social_linkedin || owner.social_facebook) score += 3;
  if (owner.company_domain) score += 2;

  return Math.min(20, score);
}

// ── Penalties ───────────────────────────────────────────────

function calculatePenalties(owner: IdentifiedOwner): number {
  let penalty = 0;

  // Product name too generic (less than 3 characters or single common word)
  const name = owner.extracted.product_name.trim();
  if (name.length < 5 || name.split(/\s+/).length < 2) {
    penalty -= 20;
  }

  // WHOIS privacy-protected with no other contact
  if (
    owner.identification_confidence < 0.4 &&
    !owner.owner_email &&
    !owner.social_twitter &&
    !owner.social_linkedin
  ) {
    penalty -= 15;
  }

  return penalty;
}

// ── Helpers ─────────────────────────────────────────────────

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function classifyInfringingPlatform(url: string): InfringingPlatform {
  const hostname = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  })();

  if (hostname.includes('t.me') || hostname.includes('telegram')) return 'telegram';
  if (hostname.includes('1337x') || hostname.includes('piratebay') || hostname.includes('torrent')) return 'torrent';
  if (hostname.includes('mega.nz') || hostname.includes('mediafire') || hostname.includes('drive.google')) return 'cyberlocker';
  if (hostname.includes('discord')) return 'discord';
  if (hostname.includes('nulled') || hostname.includes('cracked') || hostname.includes('babiato')) return 'forum';
  return 'google_indexed';
}

function estimateRevenueLoss(owner: IdentifiedOwner): string | null {
  const price = parseFloat(owner.product_price || owner.extracted.price_hint || '0');
  if (!price || price <= 0) return null;

  // Conservative estimate: 50-200 pirated downloads per listing
  const estimatedDownloads = 100;
  const loss = price * estimatedDownloads;
  return `$${loss.toLocaleString()}`;
}
