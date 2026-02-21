/**
 * Piracy Keyword Generator — Semantic Keyword Engine
 *
 * Second AI analysis pass that asks: "How would a pirate search for this product?"
 * Generates product-specific piracy search terms, alternative names,
 * unique identifiers, and platform-optimized search terms.
 *
 * Called after analyzeProductPage() during product creation/edit.
 * Cost: ~$0.0003 per call (GPT-4o-mini)
 */

import { generateCompletion, AI_MODELS } from './client';
import type { AIExtractedData, ExtractionMetadata, ProductType } from '@/types';
import { filterPiracySearchTerms } from '@/lib/utils/keyword-quality';

export interface PiracyKeywordResult {
  piracy_search_terms: string[];
  auto_alternative_names: string[];
  auto_unique_identifiers: string[];
  platform_search_terms: Record<string, string[]>;
  metadata: ExtractionMetadata;
}

/**
 * Get type-specific piracy search instructions for the AI prompt.
 */
function getTypeInstructions(productType: ProductType): string {
  const instructions: Record<ProductType, string> = {
    indicator: `
PRODUCT TYPE: Trading Indicator
- People searching for stolen indicators search: product name + trading platform name + "free" or "download"
- They are NOT searching for "crack sites" — they search for the indicator on the platform they trade on
- Trading platforms and their file extensions:
  * MetaTrader 4 (MT4): .ex4, .mq4
  * MetaTrader 5 (MT5): .ex5, .mq5
  * TradingView: .pine (PineScript)
  * ThinkOrSwim (TOS/ToS): .ts, .thinkscript
  * NinjaTrader: .cs (NinjaScript)
  * TradeStation: .eld, .els (EasyLanguage)
  * MultiCharts: .pln (PowerLanguage)
  * Sierra Chart: .dll
  * cTrader: .algo, .cs (cAlgo)
- Common search patterns: "[indicator name] TradingView", "[indicator name] ThinkOrSwim free", "[indicator name] MT4 download", "[indicator name] NinjaTrader"
- Alternative names include: platform suffixes (MT4/MT5/TV/TOS), version numbers, abbreviated forms
- File identifiers: generate filenames for EACH platform the indicator could run on (e.g., "ProductName.ex4", "ProductName.pine", "ProductName.ts", "ProductName.mq5")
- Sharing platforms: forex-station.com, mql5.com forums, Telegram indicator channels, TradingView public scripts, ThinkOrSwim sharing groups, futures.io forums
- Telegram searches use short terms: product abbreviation + platform name or "free"`,

    course: `
PRODUCT TYPE: Online Course
- Pirates share courses via Google Drive, Mega.nz, Telegram groups, torrent sites
- Common piracy terms: "free download", "leaked", "full course free", "mega link", "drive link"
- Platforms: courseclub.me, freecourseweb.com, Telegram course channels, torrent sites
- Alternative names: abbreviated course names, instructor name + topic combos
- File identifiers: module names, lesson titles, course platform references (Udemy/Teachable/Kajabi)
- Telegram searches: instructor last name + "course free" or "leaked"`,

    software: `
PRODUCT TYPE: Software
- Pirates distribute via crack sites, keygens, serial key generators, portable versions
- Common piracy terms: "crack", "keygen", "serial key", "license key", "activator", "portable", "patch"
- Platforms: filecr.com, getintopc.com, crackedpc.org, torrent sites, GitHub (source leaks)
- Alternative names: version numbers, build numbers, abbreviated names, ".exe" suffixed
- File identifiers: installer names, .exe/.msi/.dmg file names, version strings, license file names
- Torrent names often follow: "ProductName.v2.1.Cracked.zip" or "ProductName.2024.Keygen"`,

    ebook: `
PRODUCT TYPE: Ebook/Book
- Pirates distribute via Library Genesis (libgen), Z-Library, PDF download sites, Telegram
- Common piracy terms: "free pdf", "epub free", "free download", "libgen", "z-library"
- Platforms: libgen.is, z-lib.org, b-ok.cc, PDF drive sites, Telegram ebook channels
- Alternative names: author name + title combos, shortened titles, subtitle variations
- File identifiers: ISBN numbers, "pdf", "epub", "mobi", edition numbers, page counts
- Search patterns: "Author LastName BookTitle pdf free download"`,

    template: `
PRODUCT TYPE: Template/Theme
- Pirates distribute "nulled" versions via GPL sites, nulled theme forums
- Common piracy terms: "nulled", "free download", "GPL", "cracked", "unlicensed"
- Platforms: nulled.to, themelock.com, gpldl.com, theme/plugin repositories
- Alternative names: theme/plugin slug names, version numbers, marketplace variations
- File identifiers: .zip file names, theme slug (e.g., "theme-name.zip"), version strings
- WordPress/Shopify themes often use: "theme-name-nulled" or "theme-name-gpl"`,

    other: `
PRODUCT TYPE: Digital Product (General)
- Apply broad piracy detection patterns
- Common piracy terms: "free download", "leaked", "cracked", "nulled", "torrent"
- Look for file-sharing links, unauthorized redistribution on any platform
- Alternative names: shortened forms, abbreviations, common misspellings
- File identifiers: any referenced file names, version strings, download links`,
  };

  return instructions[productType] || instructions.other;
}

/**
 * Generate piracy-focused search intelligence for a product.
 *
 * Takes the already-extracted AIExtractedData and generates terms a pirate
 * would use to find, share, or search for this product.
 */
export async function generatePiracyKeywords(
  productName: string,
  productType: ProductType,
  brandName: string | null,
  aiData: AIExtractedData,
  fullTextContent: string,
  productUrl: string
): Promise<PiracyKeywordResult> {
  const startTime = Date.now();

  const systemPrompt = `You are an expert in online piracy patterns and copyright infringement detection. Your task is to think like a pirate: how would someone searching for a pirated copy of this product phrase their search queries?

You will analyze a digital product and generate:

1. **piracy_search_terms** (8-14 items): Realistic search queries someone would type to find a free/stolen copy of this product. Each term MUST include the product name (or a recognizable part of it). For trading indicators, people search the product name + the trading platform they use + "free" or "download". Do NOT use generic piracy jargon like "crack site" or "keygen" for indicators.
   - GOOD for indicators: "10x bars TradingView", "10x bars ThinkOrSwim free", "10x bars MT4 download", "10x bars indicator free", "10x bars NinjaTrader"
   - GOOD for other products: "ProductName free download", "ProductName leaked pdf"
   - BAD: "free download crack" (too generic, no product identity)
   - BAD for indicators: "10x bars crack site", "10x bars keygen" (not how people search for indicators)

2. **alternative_names** (3-8 items): Common variations of the product name that pirates might use:
   - Abbreviations: "10x Bars Indicator" → "10xbars", "10x-bars"
   - No-space/slug forms: "productname", "product-name"
   - Common misspellings (if the name is easily misspelled)
   - With version suffixes: "ProductName v2", "ProductName 2024"
   - With platform suffixes: "ProductName MT4", "ProductName TradingView"
   - DO NOT include the exact original name as an alternative

3. **unique_identifiers** (6-15 items): File names, version numbers, and platform-specific file identifiers. For trading indicators, generate expected file names for EVERY major trading platform the indicator could exist on:
   - MetaTrader: "ProductName.ex4", "ProductName.mq4", "ProductName.ex5", "ProductName.mq5"
   - TradingView: "ProductName.pine"
   - ThinkOrSwim: "ProductName.ts", "ProductName.thinkscript"
   - NinjaTrader: "ProductName.cs"
   - TradeStation: "ProductName.eld", "ProductName.els"
   - MultiCharts: "ProductName.pln"
   - General: "ProductName.zip", version strings like "v2.1"
   - Use the actual product name (or slug form) in the file names
   - Include version strings if visible on the product page

4. **platform_terms**: Search terms optimized for specific platforms. For trading indicators, focus on how people actually search — by product name + trading platform, NOT piracy jargon:
   - **google** (4-6 items): Full search queries for Google. For indicators: "[name] TradingView free", "[name] ThinkOrSwim download", "[name] MT4 free download", "[name] NinjaTrader indicator". For other products: use natural search queries with "free download", "free pdf", etc.
   - **telegram** (3-4 items): Short terms for Telegram search (2-4 words). For indicators: "[name] free", "[name] MT4", "[name] indicator". For others: product abbreviation + "free" or "leaked"
   - **torrent** (2-3 items): Torrent site search patterns (include file extensions, version numbers)
   - **forum** (3-4 items): Forum search patterns. For indicators: "[name] forex-station", "[name] futures.io", "[name] mql5 forum free". For others: relevant forum terms
   - **cyberlocker** (2-3 items): File-sharing search patterns (include "mega", "mediafire", "drive")

${getTypeInstructions(productType)}

CRITICAL RULES:
- Every piracy_search_term MUST contain at least part of the product name or brand name
- Be realistic — generate terms that real pirates actually use
- Platform terms should be natural for that platform's search style
- Do NOT include the product's official URL or legitimate marketplace terms
- Generate varied terms — don't just append different piracy words to the same base

Respond with valid JSON only.`;

  const userPrompt = `Analyze this product and generate piracy search intelligence:

**Product Name:** ${productName}
**Product Type:** ${productType}
**Brand/Creator:** ${brandName || 'Unknown'}
**URL:** ${productUrl}

**AI-Extracted Brand Identifiers:** ${aiData.brand_identifiers.join(', ') || 'None'}
**AI-Extracted Copyrighted Terms:** ${aiData.copyrighted_terms.join(', ') || 'None'}
**AI-Extracted Unique Phrases:** ${aiData.unique_phrases.slice(0, 3).join(', ') || 'None'}
**AI-Extracted Keywords:** ${aiData.keywords.slice(0, 5).join(', ') || 'None'}

**Page Content (excerpt):**
${fullTextContent.substring(0, 3000)}

Generate piracy search intelligence as JSON:
{
  "piracy_search_terms": ["term1", "term2", ...],
  "alternative_names": ["alt1", "alt2", ...],
  "unique_identifiers": ["id1", "id2", ...],
  "platform_terms": {
    "google": ["query1", "query2", ...],
    "telegram": ["term1", "term2", ...],
    "torrent": ["term1", "term2", ...],
    "forum": ["term1", "term2", ...],
    "cyberlocker": ["term1", "term2", ...]
  }
}`;

  try {
    const response = await generateCompletion<{
      piracy_search_terms: string[];
      alternative_names: string[];
      unique_identifiers: string[];
      platform_terms: Record<string, string[]>;
    }>(systemPrompt, userPrompt, {
      model: AI_MODELS.MINI,
      temperature: 0.4,
      maxTokens: 2000,
      responseFormat: 'json',
    });

    const processingTimeMs = Date.now() - startTime;

    // Validate piracy terms are product-anchored
    const rawPiracyTerms = response.data.piracy_search_terms || [];
    const validatedPiracyTerms = filterPiracySearchTerms(
      rawPiracyTerms,
      productName,
      brandName,
      aiData.brand_identifiers
    );

    if (rawPiracyTerms.length !== validatedPiracyTerms.length) {
      console.log(
        `[Piracy Keywords] Filtered ${rawPiracyTerms.length - validatedPiracyTerms.length} non-anchored piracy terms`
      );
    }

    // Validate platform terms are also product-anchored
    const platformTerms: Record<string, string[]> = {};
    const rawPlatformTerms = response.data.platform_terms || {};
    for (const [platform, terms] of Object.entries(rawPlatformTerms)) {
      platformTerms[platform] = filterPiracySearchTerms(
        terms || [],
        productName,
        brandName,
        aiData.brand_identifiers
      );
    }

    // Filter alternative names — remove exact product name and empty strings
    const altNames = (response.data.alternative_names || [])
      .filter(name => name.trim().length > 0 && name.toLowerCase() !== productName.toLowerCase());

    // Filter unique identifiers — remove empty strings
    const uniqueIds = (response.data.unique_identifiers || [])
      .filter(id => id.trim().length > 0);

    const metadata: ExtractionMetadata = {
      model: response.metadata.model,
      analyzed_at: new Date().toISOString(),
      confidence_scores: {
        piracy_search_terms: validatedPiracyTerms.length > 0 ? 0.85 : 0,
        alternative_names: altNames.length > 0 ? 0.80 : 0,
        unique_identifiers: uniqueIds.length > 0 ? 0.75 : 0,
        platform_search_terms: Object.keys(platformTerms).length > 0 ? 0.80 : 0,
      },
      processing_time_ms: processingTimeMs,
      tokens_used: response.metadata.tokensUsed,
    };

    console.log(
      `[Piracy Keywords] Generated: ${validatedPiracyTerms.length} piracy terms, ` +
      `${altNames.length} alt names, ${uniqueIds.length} identifiers, ` +
      `${Object.values(platformTerms).flat().length} platform terms ` +
      `(${processingTimeMs}ms)`
    );

    return {
      piracy_search_terms: validatedPiracyTerms,
      auto_alternative_names: altNames,
      auto_unique_identifiers: uniqueIds,
      platform_search_terms: platformTerms,
      metadata,
    };
  } catch (error) {
    console.error('[Piracy Keywords] Generation failed:', error);

    // Return empty result — piracy keywords are a nice-to-have, not critical
    return {
      piracy_search_terms: [],
      auto_alternative_names: [],
      auto_unique_identifiers: [],
      platform_search_terms: {},
      metadata: {
        model: 'fallback',
        analyzed_at: new Date().toISOString(),
        confidence_scores: {},
        processing_time_ms: Date.now() - startTime,
      },
    };
  }
}
