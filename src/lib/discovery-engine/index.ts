// ============================================================
// Piracy Discovery Engine — Main Orchestrator
// src/lib/discovery-engine/index.ts
//
// Coordinates the full discovery pipeline:
//   1. Platform crawl (SerpAPI)
//   2. Product extraction (GPT-4o-mini)
//   3. Owner identification (SerpAPI + WHOIS + AI)
//   4. Confidence scoring
//   5. Qualification (via prospect-qualifier.ts)
//   6. Insert into marketing_prospects
//
// Follows the pattern from scan-engine/index.ts:
//   - Budget-tracked SerpClient
//   - 4-minute hard cap
//   - Delta detection via known URLs
//   - Structured error handling
// ============================================================

import { createAdminClient } from '@/lib/supabase/server';
import { SerpClient } from '@/lib/scan-engine/serp-client';
import { generateDiscoveryQueries } from './discovery-queries';
import { getDiscoveryProfile } from './discovery-profiles';
import { extractProducts, classifyPlatform } from './product-extractor';
import { identifyOwner } from './owner-identifier';
import { scoreCandidate } from './discovery-scoring';
import { qualifyProspect } from '@/lib/marketing/prospect-qualifier';
import type {
  DiscoveryRunConfig,
  DiscoveryRunResult,
  RawPiracyListing,
  DiscoveryCategory,
  ScoredCandidate,
} from './types';
import type { MarketingProspect } from '@/types/marketing';

const MAX_DURATION_MS = 240_000; // 4 min hard cap
const OWNER_CONCURRENCY = 2;     // Max concurrent owner lookups
const COST_PER_SERP = 0.01;
const COST_PER_AI = 0.002;
const COST_PER_WHOIS = 0.005;

/**
 * Run the discovery engine pipeline.
 */
export async function runDiscovery(
  config: DiscoveryRunConfig
): Promise<DiscoveryRunResult> {
  const supabase = createAdminClient();
  const startTime = Date.now();
  const errors: string[] = [];

  // Tracking counters
  let rawListingsFound = 0;
  let productsExtracted = 0;
  let ownersIdentified = 0;
  let candidatesScored = 0;
  let prospectsQualified = 0;
  let prospectsInserted = 0;
  let serpCallsUsed = 0;
  let aiCallsUsed = 0;
  let whoisCallsUsed = 0;

  // Create discovery run record
  const { data: run, error: runError } = await supabase
    .from('discovery_runs')
    .insert({
      status: 'running',
      categories: config.categories,
      config: config as unknown as Record<string, unknown>,
    })
    .select('id')
    .single();

  if (runError || !run) {
    throw new Error(`Failed to create discovery run: ${runError?.message}`);
  }

  const runId = run.id;
  console.log(`[Discovery] Run ${runId} started — categories: ${config.categories.join(', ')}, budget: ${config.serp_budget}`);

  // Create a shared SerpClient with the full budget
  const serpApiKey = process.env.SERPAPI_API_KEY || '';
  const serpClient = new SerpClient(serpApiKey, config.serp_budget);

  try {
    // ── Check for timeout ─────────────────────────────────
    const checkTimeout = () => {
      if (Date.now() - startTime > MAX_DURATION_MS) {
        throw new Error('TIMEOUT: Discovery run exceeded 4-minute limit');
      }
    };

    // ── Load known URLs for delta detection ───────────────
    const { data: existingProspects } = await supabase
      .from('marketing_prospects')
      .select('infringing_url')
      .limit(10000);

    const knownUrls = new Set(
      (existingProspects || []).map(p => normalizeUrl(p.infringing_url))
    );

    const { data: existingCandidates } = await supabase
      .from('discovery_candidates')
      .select('source_url')
      .limit(10000);

    for (const c of existingCandidates || []) {
      knownUrls.add(normalizeUrl(c.source_url));
    }

    console.log(`[Discovery] Delta detection: ${knownUrls.size} known URLs loaded`);

    // ── Stage 1: Platform Crawl ───────────────────────────
    const allListings: RawPiracyListing[] = [];
    const processedUrls = new Set<string>();

    for (const category of config.categories) {
      checkTimeout();

      const profile = getDiscoveryProfile(category);
      console.log(`[Discovery] Crawling category: ${category}`);

      // Generate Tier 1 + 2 queries
      const queries = generateDiscoveryQueries(profile);

      // Execute Tier 1
      const tier1Results = await serpClient.searchBatch(
        queries.tier1.map(q => ({ query: q.query, num: q.num }))
      );

      const tier1Urls: string[] = [];
      for (const resp of tier1Results) {
        for (const result of resp.organic_results) {
          tier1Urls.push(result.link);
          processListing(result, resp.query, category, knownUrls, processedUrls, allListings);
        }
      }

      // Execute Tier 2
      const tier2Results = await serpClient.searchBatch(
        queries.tier2.map(q => ({ query: q.query, num: q.num }))
      );

      for (const resp of tier2Results) {
        for (const result of resp.organic_results) {
          processListing(result, resp.query, category, knownUrls, processedUrls, allListings);
        }
      }

      checkTimeout();

      // Generate + execute Tier 3 from hot domains
      const tier3Queries = generateDiscoveryQueries(profile, tier1Urls);
      if (tier3Queries.tier3.length > 0) {
        const tier3Results = await serpClient.searchBatch(
          tier3Queries.tier3.map(q => ({ query: q.query, num: q.num }))
        );

        for (const resp of tier3Results) {
          for (const result of resp.organic_results) {
            processListing(result, resp.query, category, knownUrls, processedUrls, allListings);
          }
        }
      }

      // Cap listings per run
      if (allListings.length >= config.max_candidates) {
        console.log(`[Discovery] Hit max_candidates cap (${config.max_candidates})`);
        break;
      }
    }

    rawListingsFound = allListings.length;
    serpCallsUsed = serpClient.used;
    console.log(`[Discovery] Crawl complete: ${rawListingsFound} new listings, ${serpCallsUsed} SerpAPI calls`);

    if (allListings.length === 0) {
      console.log('[Discovery] No new listings found. Completing run.');
      await finalizeRun(supabase, runId, 'completed', {
        rawListingsFound, productsExtracted, ownersIdentified,
        candidatesScored, prospectsQualified, prospectsInserted,
        serpCallsUsed, aiCallsUsed, whoisCallsUsed, errors, startTime, config,
      });
      return buildResult(runId, config, startTime, {
        rawListingsFound, productsExtracted, ownersIdentified,
        candidatesScored, prospectsQualified, prospectsInserted,
        serpCallsUsed, aiCallsUsed, whoisCallsUsed, errors,
      });
    }

    // Insert raw candidates into DB
    await insertRawCandidates(supabase, runId, allListings);

    checkTimeout();

    // ── Stage 2: Product Extraction (AI) ──────────────────
    console.log(`[Discovery] Extracting products from ${allListings.length} listings...`);
    const { extracted, ai_calls: extractAiCalls } = await extractProducts(allListings);
    productsExtracted = extracted.length;
    aiCallsUsed += extractAiCalls;
    console.log(`[Discovery] Extracted ${productsExtracted} unique products`);

    checkTimeout();

    // ── Stage 3: Owner Identification ─────────────────────
    console.log(`[Discovery] Identifying owners for ${extracted.length} products...`);
    const scoredCandidates: ScoredCandidate[] = [];

    // Process in batches of OWNER_CONCURRENCY
    for (let i = 0; i < extracted.length; i += OWNER_CONCURRENCY) {
      checkTimeout();

      const batch = extracted.slice(i, i + OWNER_CONCURRENCY);
      const results = await Promise.all(
        batch.map(product => identifyOwner(product, serpClient))
      );

      for (const { owner, stats } of results) {
        serpCallsUsed += stats.serp_calls;
        aiCallsUsed += stats.ai_calls;
        whoisCallsUsed += stats.whois_calls;

        if (!owner) continue;
        ownersIdentified++;

        // ── Stage 4: Score ─────────────────────────────
        const scored = scoreCandidate(owner);
        candidatesScored++;

        if (scored.confidence_score >= config.min_confidence) {
          scoredCandidates.push(scored);
        }
      }

      // Small delay between owner lookups
      if (i + OWNER_CONCURRENCY < extracted.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`[Discovery] Scored ${candidatesScored} candidates, ${scoredCandidates.length} above min confidence`);

    checkTimeout();

    // ── Stage 5: Qualification & Insertion ─────────────────
    for (const candidate of scoredCandidates) {
      checkTimeout();

      const owner = candidate.owner;

      // Build a MarketingProspect shape for the qualifier
      const prospectData: MarketingProspect = {
        id: '',
        product_name: owner.extracted.product_name,
        product_url: owner.product_url,
        product_price: owner.product_price,
        infringing_url: owner.extracted.raw_listing.source_url,
        infringing_platform: candidate.infringing_platform,
        audience_size: candidate.audience_size,
        confidence_score: candidate.confidence_score,
        screenshot_url: candidate.screenshot_url,
        est_revenue_loss: candidate.est_revenue_loss,
        company_name: owner.company_name,
        owner_name: owner.owner_name,
        owner_email: owner.owner_email,
        company_domain: owner.company_domain,
        social_twitter: owner.social_twitter,
        social_instagram: owner.social_instagram,
        social_facebook: owner.social_facebook,
        social_linkedin: owner.social_linkedin,
        contact_source: owner.contact_source,
        status: 'new',
        ghl_contact_id: null,
        alert_page_url: null,
        discovered_at: new Date().toISOString(),
        qualified_at: null,
        pushed_to_ghl_at: null,
        updated_at: new Date().toISOString(),
      };

      try {
        const qualification = await qualifyProspect(prospectData);

        if (!qualification.qualified) {
          // Update candidate as skipped
          await supabase
            .from('discovery_candidates')
            .update({
              status: 'skipped',
              skip_reason: qualification.reason,
              confidence_score: candidate.confidence_score,
              score_breakdown: candidate.score_breakdown as unknown as Record<string, unknown>,
            })
            .eq('run_id', runId)
            .eq('source_url', owner.extracted.raw_listing.source_url);
          continue;
        }

        prospectsQualified++;

        // Insert into marketing_prospects
        const { data: prospect, error: insertError } = await supabase
          .from('marketing_prospects')
          .insert({
            product_name: owner.extracted.product_name,
            product_url: owner.product_url,
            product_price: owner.product_price,
            infringing_url: owner.extracted.raw_listing.source_url,
            infringing_platform: candidate.infringing_platform,
            audience_size: candidate.audience_size,
            confidence_score: candidate.confidence_score,
            screenshot_url: candidate.screenshot_url,
            est_revenue_loss: candidate.est_revenue_loss,
            company_name: owner.company_name,
            owner_name: owner.owner_name,
            owner_email: owner.owner_email,
            company_domain: owner.company_domain,
            social_twitter: owner.social_twitter,
            social_instagram: owner.social_instagram,
            social_facebook: owner.social_facebook,
            social_linkedin: owner.social_linkedin,
            contact_source: owner.contact_source,
            status: 'new',
          })
          .select('id')
          .single();

        if (insertError) {
          errors.push(`Insert failed for ${owner.extracted.product_name}: ${insertError.message}`);
          continue;
        }

        prospectsInserted++;

        // Update candidate record with prospect link
        if (prospect) {
          await supabase
            .from('discovery_candidates')
            .update({
              status: 'inserted',
              prospect_id: prospect.id,
              confidence_score: candidate.confidence_score,
              score_breakdown: candidate.score_breakdown as unknown as Record<string, unknown>,
              company_name: owner.company_name,
              owner_name: owner.owner_name,
              owner_email: owner.owner_email,
              company_domain: owner.company_domain,
              product_url: owner.product_url,
              product_price: owner.product_price,
              identification_confidence: owner.identification_confidence,
            })
            .eq('run_id', runId)
            .eq('source_url', owner.extracted.raw_listing.source_url);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Qualification error for ${owner.extracted.product_name}: ${msg}`);
      }
    }

    console.log(`[Discovery] Qualified: ${prospectsQualified}, Inserted: ${prospectsInserted}`);

    // ── Finalize ──────────────────────────────────────────
    await finalizeRun(supabase, runId, 'completed', {
      rawListingsFound, productsExtracted, ownersIdentified,
      candidatesScored, prospectsQualified, prospectsInserted,
      serpCallsUsed, aiCallsUsed, whoisCallsUsed, errors, startTime, config,
    });

    return buildResult(runId, config, startTime, {
      rawListingsFound, productsExtracted, ownersIdentified,
      candidatesScored, prospectsQualified, prospectsInserted,
      serpCallsUsed, aiCallsUsed, whoisCallsUsed, errors,
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(msg);
    console.error(`[Discovery] Run failed:`, error);

    await finalizeRun(supabase, runId, 'failed', {
      rawListingsFound, productsExtracted, ownersIdentified,
      candidatesScored, prospectsQualified, prospectsInserted,
      serpCallsUsed, aiCallsUsed, whoisCallsUsed, errors, startTime, config,
    });

    return buildResult(runId, config, startTime, {
      rawListingsFound, productsExtracted, ownersIdentified,
      candidatesScored, prospectsQualified, prospectsInserted,
      serpCallsUsed, aiCallsUsed, whoisCallsUsed, errors,
    });
  }
}

// ── Helpers ─────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  let normalized = url.toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  normalized = normalized.replace(/[?#].*$/, '');
  normalized = normalized.replace(/\/+$/, '');
  return normalized;
}

function processListing(
  result: { title: string; link: string; snippet: string },
  query: string,
  category: DiscoveryCategory,
  knownUrls: Set<string>,
  processedUrls: Set<string>,
  listings: RawPiracyListing[],
): void {
  const normalized = normalizeUrl(result.link);

  // Skip known or already-processed URLs
  if (knownUrls.has(normalized) || processedUrls.has(normalized)) return;
  processedUrls.add(normalized);

  const platform = classifyPlatform(result.link);

  listings.push({
    source_url: result.link,
    title: result.title,
    snippet: result.snippet,
    platform: typeof platform === 'string' ? platform : category,
    query_used: query,
    category,
  });
}

async function insertRawCandidates(
  supabase: ReturnType<typeof createAdminClient>,
  runId: string,
  listings: RawPiracyListing[],
): Promise<void> {
  // Insert in batches of 50
  const BATCH = 50;
  for (let i = 0; i < listings.length; i += BATCH) {
    const batch = listings.slice(i, i + BATCH);
    const rows = batch.map(l => ({
      run_id: runId,
      source_url: l.source_url,
      listing_title: l.title,
      listing_snippet: l.snippet.substring(0, 500),
      category: l.category,
      status: 'raw',
    }));

    await supabase.from('discovery_candidates').insert(rows);
  }
}

interface RunStats {
  rawListingsFound: number;
  productsExtracted: number;
  ownersIdentified: number;
  candidatesScored: number;
  prospectsQualified: number;
  prospectsInserted: number;
  serpCallsUsed: number;
  aiCallsUsed: number;
  whoisCallsUsed: number;
  errors: string[];
  startTime: number;
  config: DiscoveryRunConfig;
}

async function finalizeRun(
  supabase: ReturnType<typeof createAdminClient>,
  runId: string,
  status: 'completed' | 'failed',
  stats: RunStats,
): Promise<void> {
  const cost = (stats.serpCallsUsed * COST_PER_SERP)
    + (stats.aiCallsUsed * COST_PER_AI)
    + (stats.whoisCallsUsed * COST_PER_WHOIS);

  await supabase
    .from('discovery_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      raw_listings_found: stats.rawListingsFound,
      products_extracted: stats.productsExtracted,
      owners_identified: stats.ownersIdentified,
      candidates_scored: stats.candidatesScored,
      prospects_qualified: stats.prospectsQualified,
      prospects_inserted: stats.prospectsInserted,
      serp_calls_used: stats.serpCallsUsed,
      ai_calls_used: stats.aiCallsUsed,
      whois_calls_used: stats.whoisCallsUsed,
      estimated_cost_usd: Math.round(cost * 10000) / 10000,
      errors: stats.errors,
    })
    .eq('id', runId);
}

function buildResult(
  runId: string,
  config: DiscoveryRunConfig,
  startTime: number,
  stats: Omit<RunStats, 'startTime' | 'config'>,
): DiscoveryRunResult {
  const cost = (stats.serpCallsUsed * COST_PER_SERP)
    + (stats.aiCallsUsed * COST_PER_AI)
    + (stats.whoisCallsUsed * COST_PER_WHOIS);

  return {
    run_id: runId,
    started_at: new Date(startTime).toISOString(),
    completed_at: new Date().toISOString(),
    categories_scanned: config.categories,
    raw_listings_found: stats.rawListingsFound,
    products_extracted: stats.productsExtracted,
    owners_identified: stats.ownersIdentified,
    candidates_scored: stats.candidatesScored,
    prospects_qualified: stats.prospectsQualified,
    prospects_inserted: stats.prospectsInserted,
    serp_calls_used: stats.serpCallsUsed,
    ai_calls_used: stats.aiCallsUsed,
    whois_calls_used: stats.whoisCallsUsed,
    estimated_cost_usd: Math.round(cost * 10000) / 10000,
    errors: stats.errors,
  };
}
