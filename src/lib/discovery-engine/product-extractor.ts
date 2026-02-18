// ============================================================
// Discovery Engine — Product Extractor
// src/lib/discovery-engine/product-extractor.ts
//
// Uses GPT-4o-mini to analyze piracy listing titles/snippets
// and extract structured product information:
//   - Original product name (cleaned)
//   - Product type
//   - Suspected sales platform
//   - Price hints
//
// Processes in batches of 10 for cost efficiency.
// ============================================================

import { generateCompletion, AI_MODELS } from '@/lib/ai/client';
import type { RawPiracyListing, ExtractedProduct, DiscoveryCategory } from './types';

interface AIExtractionResult {
  products: Array<{
    index: number;
    product_name: string;
    product_type: string;
    suspected_platform: string;
    price_hint: string | null;
    confidence: number;
    skip_reason?: string;
  }>;
}

const SYSTEM_PROMPT = `You are an expert at analyzing piracy/warez listing titles and snippets to identify the original legitimate digital product being pirated.

Given a batch of piracy listings (URL, title, snippet), extract for EACH one:
1. "product_name" — The original product name, cleaned of piracy terms (remove "free download", "cracked", "nulled", "leaked", etc.)
2. "product_type" — One of: course, wordpress_theme, wordpress_plugin, software, ebook, trading_indicator, membership_content, design_asset
3. "suspected_platform" — Where the legitimate version is likely sold (e.g., "Udemy", "ThemeForest", "Gumroad", "CodeCanyon", "own website")
4. "price_hint" — Any price mentioned or implied (e.g., "$97", "premium", null if unknown)
5. "confidence" — 0.0 to 1.0, how confident you are this is a real, commercially-sold product

CRITICAL RULES:
- Only return products you are confident are REAL, commercially-sold digital products
- SKIP and set confidence=0 for:
  - Generic/unnamed content where you cannot determine the specific product
  - Free or open-source software/content (e.g., free WordPress plugins, open-source tools)
  - Content that appears to be legitimately free
  - Listings that are just spam or unrelated content
- Clean product names: remove terms like "free download", "cracked", "nulled", "leaked", "torrent", "v2024", etc.
- For WordPress themes/plugins: include the exact theme/plugin name, not generic descriptions

Respond ONLY with JSON:
{
  "products": [
    { "index": 0, "product_name": "...", "product_type": "...", "suspected_platform": "...", "price_hint": "...", "confidence": 0.95 },
    { "index": 1, "product_name": "...", "product_type": "...", "suspected_platform": "...", "price_hint": null, "confidence": 0.85 },
    { "index": 2, "product_name": "...", "product_type": "...", "suspected_platform": "...", "price_hint": null, "confidence": 0, "skip_reason": "generic content" }
  ]
}`;

/**
 * Extract product information from piracy listings using AI.
 * Processes in batches of 10 for cost efficiency.
 *
 * @returns ExtractedProduct[] — only products with confidence > 0.5
 */
export async function extractProducts(
  listings: RawPiracyListing[],
): Promise<{ extracted: ExtractedProduct[]; ai_calls: number }> {
  const BATCH_SIZE = 10;
  const MIN_CONFIDENCE = 0.5;
  const allExtracted: ExtractedProduct[] = [];
  let aiCalls = 0;

  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE);

    try {
      const extracted = await extractBatch(batch);
      aiCalls++;
      allExtracted.push(...extracted.filter(e => e.extraction_confidence >= MIN_CONFIDENCE));
    } catch (error) {
      console.error(`[ProductExtractor] Batch ${i / BATCH_SIZE + 1} failed:`, error);
      // Continue with next batch on failure
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < listings.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Deduplicate by normalized product name
  const seen = new Set<string>();
  const deduped = allExtracted.filter(e => {
    const key = normalizeProductName(e.product_name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(
    `[ProductExtractor] ${listings.length} listings → ${allExtracted.length} extracted → ${deduped.length} unique products (${aiCalls} AI calls)`
  );

  return { extracted: deduped, ai_calls: aiCalls };
}

/**
 * Process a single batch of ≤10 listings through GPT-4o-mini.
 */
async function extractBatch(batch: RawPiracyListing[]): Promise<ExtractedProduct[]> {
  const userPrompt = batch.map((listing, index) => (
    `[${index}] URL: ${listing.source_url}\nTitle: ${listing.title}\nSnippet: ${listing.snippet}\nCategory hint: ${listing.category}`
  )).join('\n\n');

  const response = await generateCompletion<AIExtractionResult>(
    SYSTEM_PROMPT,
    userPrompt,
    {
      model: AI_MODELS.MINI,
      temperature: 0.2,
      maxTokens: 2000,
      responseFormat: 'json',
    }
  );

  const results: ExtractedProduct[] = [];

  for (const product of response.data.products || []) {
    if (product.confidence <= 0 || product.skip_reason) continue;

    const listing = batch[product.index];
    if (!listing) continue;

    results.push({
      raw_listing: listing,
      product_name: product.product_name.trim(),
      product_type: product.product_type,
      suspected_platform: product.suspected_platform,
      price_hint: product.price_hint || null,
      extraction_confidence: Math.min(1, Math.max(0, product.confidence)),
    });
  }

  return results;
}

/**
 * Normalize a product name for deduplication.
 */
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Map a piracy listing URL to an InfringingPlatform value.
 */
export function classifyPlatform(url: string): DiscoveryCategory | string {
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
