/**
 * Product Analyzer Service
 * AI-powered intelligent extraction from product pages
 * Extracts brands, keywords, unique phrases, and copyrighted content
 */

import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { generateCompletion, AI_MODELS } from './client';
import type { AIExtractedData } from '@/types';

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
}> {
  const startTime = Date.now();

  // Extract text and metadata
  const fullTextContent = extractTextContent(html);
  const metadata = extractMetadata(html);
  const contentFingerprint = generateContentFingerprint(fullTextContent);

  // Prepare AI prompt with context
  const systemPrompt = `You are an expert at analyzing product pages and extracting structured data for copyright protection and infringement detection.

Your task is to analyze the provided product page content and extract:
1. Brand identifiers: Company names, product names, trademarked terms (look for ®, ™, © symbols)
2. Unique phrases: Distinctive marketing copy, taglines, unique descriptions (3-10 words each)
3. Keywords: Important product features, technical terms, industry-specific vocabulary
4. Copyrighted terms: Any text explicitly marked with copyright symbols or clearly proprietary

Rules:
- Be precise and specific
- Focus on distinctive, unique content (not generic terms)
- Extract only 5-10 items per category (most important)
- For unique phrases, select the MOST distinctive marketing language
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
  "brand_identifiers": ["Example Brand™", "Product Name"],
  "unique_phrases": ["Revolutionary trading system that...", "Unique feature description..."],
  "keywords": ["trading", "analytics", "software", "feature1", "feature2"],
  "copyrighted_terms": ["ProductName®", "Company Inc."],
  "confidence_scores": {
    "brand_identifiers": 0.95,
    "unique_phrases": 0.88,
    "keywords": 0.92,
    "copyrighted_terms": 0.98
  }
}`;

  try {
    // Call AI with structured output
    const response = await generateCompletion<{
      brand_identifiers: string[];
      unique_phrases: string[];
      keywords: string[];
      copyrighted_terms: string[];
      confidence_scores: Record<string, number>;
    }>(systemPrompt, userPrompt, {
      model: AI_MODELS.MINI,
      temperature: 0.3,
      maxTokens: 1500,
      responseFormat: 'json',
    });

    const processingTimeMs = Date.now() - startTime;

    // Build AI extracted data structure
    const aiExtractedData: AIExtractedData = {
      brand_identifiers: response.data.brand_identifiers || [],
      unique_phrases: response.data.unique_phrases || [],
      keywords: response.data.keywords || [],
      copyrighted_terms: response.data.copyrighted_terms || [],
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
    };
  } catch (error) {
    console.error('Product analysis error:', error);

    // Return fallback with basic extraction
    const fallbackKeywords = metadata.keywords
      ? metadata.keywords.split(',').map(k => k.trim()).filter(Boolean).slice(0, 10)
      : [];

    return {
      fullTextContent,
      aiExtractedData: {
        brand_identifiers: [],
        unique_phrases: [],
        keywords: fallbackKeywords,
        copyrighted_terms: [],
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

  const normalizedText = infringingText.toLowerCase();
  const matchedKeywords = productKeywords.filter(kw =>
    normalizedText.includes(kw.toLowerCase())
  );

  return matchedKeywords.length / productKeywords.length;
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
