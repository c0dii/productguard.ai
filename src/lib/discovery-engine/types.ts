// ============================================================
// Piracy Discovery Engine Types
// src/lib/discovery-engine/types.ts
//
// Types for the reverse-discovery pipeline that crawls piracy
// hotspots, identifies legitimate product owners, and creates
// marketing prospects for outreach.
// ============================================================

import type { InfringingPlatform } from '@/types/marketing';

// ── Discovery categories ────────────────────────────────────

export type DiscoveryCategory =
  | 'course'
  | 'wordpress_theme'
  | 'wordpress_plugin'
  | 'software'
  | 'ebook'
  | 'trading_indicator'
  | 'membership_content'
  | 'design_asset';

// ── Pipeline stage types ────────────────────────────────────

/** Raw SerpAPI result from platform crawl */
export interface RawPiracyListing {
  source_url: string;
  title: string;
  snippet: string;
  platform: string;        // e.g., 'nulled.to', 'telegram', '1337x.to'
  query_used: string;
  category: DiscoveryCategory;
}

/** After AI extraction — structured product info from piracy listing */
export interface ExtractedProduct {
  raw_listing: RawPiracyListing;
  product_name: string;
  product_type: string;           // course, plugin, theme, ebook, etc.
  suspected_platform: string;     // e.g., 'Udemy', 'ThemeForest', 'Gumroad'
  price_hint: string | null;      // "$97", "premium", etc.
  extraction_confidence: number;  // 0.0 to 1.0
}

/** After owner identification — legitimate owner data */
export interface IdentifiedOwner {
  extracted: ExtractedProduct;
  product_url: string | null;
  product_price: string | null;
  company_name: string;
  owner_name: string | null;
  owner_email: string | null;
  company_domain: string | null;
  social_twitter: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_linkedin: string | null;
  contact_source: string;           // 'website_about' | 'whois' | 'platform_profile' | 'social_bio' etc.
  identification_confidence: number; // 0.0 to 1.0
}

/** Score breakdown for transparency */
export interface ScoreBreakdown {
  piracy_evidence: number;    // 0-30
  product_match: number;      // 0-25
  owner_verification: number; // 0-25
  data_completeness: number;  // 0-20
}

/** After enrichment and scoring — ready for qualification */
export interface ScoredCandidate {
  owner: IdentifiedOwner;
  audience_size: string | null;
  est_revenue_loss: string | null;
  infringing_platform: InfringingPlatform;
  confidence_score: number;       // 0-100
  screenshot_url: string | null;
  score_breakdown: ScoreBreakdown;
}

// ── Discovery run config & results ──────────────────────────

export interface DiscoveryRunConfig {
  categories: DiscoveryCategory[];
  serp_budget: number;        // max SerpAPI calls for this run
  max_candidates: number;     // cap total candidates per run
  min_confidence: number;     // skip scoring below this (default 85)
}

export interface DiscoveryRunResult {
  run_id: string;
  started_at: string;
  completed_at: string;
  categories_scanned: DiscoveryCategory[];
  raw_listings_found: number;
  products_extracted: number;
  owners_identified: number;
  candidates_scored: number;
  prospects_qualified: number;
  prospects_inserted: number;
  serp_calls_used: number;
  ai_calls_used: number;
  whois_calls_used: number;
  estimated_cost_usd: number;
  errors: string[];
}

// ── Discovery profile (per-category config) ─────────────────

export interface DiscoveryProfile {
  category: DiscoveryCategory;
  /** Generic piracy queries (no specific product name) */
  genericQueries: string[];
  /** Site-specific queries for known piracy hotspots */
  siteQueries: Array<{ site: string; terms: string[] }>;
  /** Platforms where legitimate versions are typically sold */
  legitimatePlatforms: string[];
  /** Terms that help identify this product type in listings */
  typeIndicators: string[];
  /** Expected price range for revenue loss estimation */
  typicalPriceRange: { min: number; max: number; median: number };
}

// ── Query types ─────────────────────────────────────────────

export interface DiscoveryQuery {
  query: string;
  tier: 1 | 2 | 3;
  num: number;       // 10 or 30
  category: DiscoveryCategory;
}

// ── Candidate status tracking ───────────────────────────────

export type CandidateStatus =
  | 'raw'
  | 'extracted'
  | 'identified'
  | 'scored'
  | 'qualified'
  | 'inserted'
  | 'skipped';
