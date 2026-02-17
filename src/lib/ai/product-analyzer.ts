/**
 * Product Analyzer Service
 * AI-powered intelligent extraction from product pages
 * Extracts brands, keywords, unique phrases, and copyrighted content
 */

import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { generateCompletion, AI_MODELS } from './client';
import type { AIExtractedData } from '@/types';
import { filterGenericKeywords } from '@/lib/utils/keyword-quality';

/**
 * Extract clean text content from HTML
 */
function extractTextContent(html: string): string {
  const $ = cheerio.load(html);

  // Remove script and style elements
  $('script, style, noscript, iframe').remove();

  // Get main content areas (prioritize product-specific sections)
  const contentSelectors = [
    'main',
    '[role="main"]',
    '.product-description',
    '.product-details',
    '[class*="product"]',
    '[class*="content"]',
    'article',
    'body',
  ];

  let text = '';
  for (const selector of contentSelectors) {
    const content = $(selector).first().text();
    if (content && content.trim().length > 100) {
      text = content;
      break;
    }
  }

  // Fallback to body if nothing found
  if (!text) {
    text = $('body').text();
  }

  // Clean up whitespace
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();

  // Limit to reasonable size (first 15,000 chars to stay within token limits)
  return text.substring(0, 15000);
}

/**
 * Extract metadata from HTML
 */
function extractMetadata(html: string): {
  title: string;
  description: string;
  keywords: string;
  ogData: Record<string, string>;
} {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text() ||
    '';

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    '';

  const keywords =
    $('meta[name="keywords"]').attr('content') ||
    '';

  const ogData: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const property = $(el).attr('property');
    const content = $(el).attr('content');
    if (property && content) {
      ogData[property] = content;
    }
  });

  return { title, description, keywords, ogData };
}

/**
 * Generate content fingerprint for matching
 */
function generateContentFingerprint(text: string): string {
  // Create a hash of the most distinctive parts of the content
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

/**
 * AI-powered product page analysis
 */
export async function analyzeProductPage(
  html: string,
  productUrl: string
): Promise<{
  fullTextContent: string;
  aiExtractedData: AIExtractedData;
  productName: string | null;
}> {
  const startTime = Date.now();

  // Extract text and metadata
  const fullTextContent = extractTextContent(html);
  const metadata = extractMetadata(html);
  const contentFingerprint = generateContentFingerprint(fullTextContent);

  // Prepare AI prompt with context
  const systemPrompt = `You are an expert at analyzing product pages and extracting structured data for copyright protection and infringement detection.

Your task is to analyze the provided product page content and extract:
1. Product name: The ACTUAL name of the product being sold (not the page title). This should be the short, clean product name that a customer would use to refer to it. For example, if the page title is "10x Bars Indicator Evergreen sales page The 10x Bars Indicator – John Carter", the product name should be "10x Bars Indicator". Strip out page suffixes, author names, site names, and marketing fluff.
2. Brand identifiers: Company names, creator/author names, product line names, trademarked terms (look for ®, ™, © symbols). These MUST be specific to this brand — not generic industry terms.
3. Unique phrases: Distinctive marketing copy, taglines, unique descriptions (3-10 words each). These should be phrases that ONLY this product would use, not generic marketing.
4. Keywords: ONLY brand-specific and product-specific terms. These must be compound phrases that combine the product name, brand, or creator with descriptive terms. NEVER include single generic industry words.
5. Copyrighted terms: Any text explicitly marked with copyright symbols or clearly proprietary
6. Product description: A concise, professional 2-sentence description of the product suitable for use in DMCA takedown notices. The first sentence should identify what the product IS (type, creator, purpose). The second sentence should describe its key features or value proposition. Write in a factual, legal-appropriate tone — not marketing copy.

CRITICAL RULES FOR KEYWORDS:
- NEVER include generic single words like: "trading", "indicator", "course", "review", "chart", "strategy", "software", "tool", "system", "template", "download", "premium", "free", "analysis", "market", "stock", "forex", "crypto", "signal", "alert", "scanner", "profit", "video", "tutorial", "guide", "ebook", etc.
- Keywords MUST be specific to THIS product and brand. They should help identify content that is about THIS specific product, not the industry in general.
- Good keywords combine brand + product terms. Examples: "Simpler Trading 10x Bars", "John Carter squeeze indicator", "10x Bars TradingView"
- If you cannot find product-specific keywords, return an EMPTY array rather than generic terms.
- Each keyword should be 2+ words unless it is a proper noun / brand name.

Rules:
- Be precise and specific — every extracted term must help identify THIS specific product
- Extract only 5-10 items per category (most important)
- For unique phrases, select the MOST distinctive marketing language
- The product_name MUST be the short, clean product name only (2-6 words max). No page titles, no author names, no site names.
- The product_description MUST be exactly 2 sentences, professional, and suitable for legal correspondence
- Assign confidence scores (0.0-1.0) for each extraction type

Respond with valid JSON only, no additional text.`;

  const userPrompt = `Analyze this product page and extract key data:

**URL:** ${productUrl}

**Page Title:** ${metadata.title}

**Meta Description:** ${metadata.description}

**Meta Keywords:** ${metadata.keywords}

**Full Content (excerpt):**
${fullTextContent.substring(0, 5000)}

Extract and return JSON in this exact format:
{
  "product_name": "10x Bars Indicator",
  "brand_identifiers": ["Example Brand™", "Product Name"],
  "unique_phrases": ["Revolutionary trading system that...", "Unique feature description..."],
  "keywords": ["Simpler Trading squeeze", "10x Bars TradingView", "John Carter indicator", "TTM Squeeze Pro setup"],
  "copyrighted_terms": ["ProductName®", "Company Inc."],
  "product_description": "Example Product is a premium trading indicator software developed by Example Brand for technical analysis on TradingView. It provides real-time squeeze momentum detection, custom alerts, and multi-timeframe analysis tools for active traders.",
  "confidence_scores": {
    "product_name": 0.95,
    "brand_identifiers": 0.95,
    "unique_phrases": 0.88,
    "keywords": 0.92,
    "copyrighted_terms": 0.98,
    "product_description": 0.90
  }
}`;

  try {
    // Call AI with structured output
    const response = await generateCompletion<{
      product_name: string;
      brand_identifiers: string[];
      unique_phrases: string[];
      keywords: string[];
      copyrighted_terms: string[];
      product_description: string;
      confidence_scores: Record<string, number>;
    }>(systemPrompt, userPrompt, {
      model: AI_MODELS.MINI,
      temperature: 0.3,
      maxTokens: 1500,
      responseFormat: 'json',
    });

    const processingTimeMs = Date.now() - startTime;

    // Post-process: filter out any generic keywords the AI still returned
    const rawKeywords = response.data.keywords || [];
    const filteredKeywords = filterGenericKeywords(rawKeywords);

    if (rawKeywords.length !== filteredKeywords.length) {
      console.log(
        `[Product Analyzer] Filtered ${rawKeywords.length - filteredKeywords.length} generic keywords: ${rawKeywords.filter(k => !filteredKeywords.includes(k)).join(', ')}`
      );
    }

    // Build AI extracted data structure
    const aiExtractedData: AIExtractedData = {
      brand_identifiers: response.data.brand_identifiers || [],
      unique_phrases: response.data.unique_phrases || [],
      keywords: filteredKeywords,
      copyrighted_terms: response.data.copyrighted_terms || [],
      product_description: response.data.product_description || null,
      content_fingerprint: contentFingerprint,
      extraction_metadata: {
        model: response.metadata.model,
        analyzed_at: new Date().toISOString(),
        confidence_scores: response.data.confidence_scores || {},
        processing_time_ms: processingTimeMs,
        tokens_used: response.metadata.tokensUsed,
      },
    };

    return {
      fullTextContent,
      aiExtractedData,
      productName: response.data.product_name || null,
    };
  } catch (error) {
    console.error('Product analysis error:', error);

    // Return fallback with basic extraction
    const fallbackKeywords = metadata.keywords
      ? metadata.keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 10)
      : [];

    return {
      fullTextContent,
      productName: null,
      aiExtractedData: {
        brand_identifiers: [],
        unique_phrases: [],
        keywords: fallbackKeywords,
        copyrighted_terms: [],
        product_description: null,
        content_fingerprint: contentFingerprint,
        extraction_metadata: {
          model: 'fallback',
          analyzed_at: new Date().toISOString(),
          confidence_scores: {},
          processing_time_ms: Date.now() - startTime,
        },
      },
    };
  }
}

/**
 * Compare two content fingerprints for similarity
 */
export function compareContentFingerprints(fp1: string, fp2: string): number {
  if (!fp1 || !fp2) return 0;
  return fp1 === fp2 ? 1.0 : 0.0;
}

/**
 * Calculate keyword overlap between product and infringing content
 */
export function calculateKeywordOverlap(
  productKeywords: string[],
  infringingText: string
): number {
  if (!productKeywords || productKeywords.length === 0) return 0;

  // Only count product-specific keywords for overlap, not generic terms
  const specificKeywords = filterGenericKeywords(productKeywords);
  if (specificKeywords.length === 0) return 0;

  const normalizedText = infringingText.toLowerCase();
  const matchedKeywords = specificKeywords.filter(kw =>
    normalizedText.includes(kw.toLowerCase())
  );

  return matchedKeywords.length / specificKeywords.length;
}

/**
 * Find exact phrase matches in infringing content
 */
export function findPhraseMatches(
  uniquePhrases: string[],
  infringingText: string
): string[] {
  if (!uniquePhrases || uniquePhrases.length === 0) return [];

  const normalizedText = infringingText.toLowerCase();
  return uniquePhrases.filter(phrase =>
    normalizedText.includes(phrase.toLowerCase())
  );
}
