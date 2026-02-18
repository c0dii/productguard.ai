/**
 * AI-Powered Infringement Filter
 * Uses GPT-4o-mini to analyze search results and filter out false positives
 * Cost: ~$0.0001-0.0002 per result (~$0.01-0.02 per 100 results)
 */

import { generateCompletion, AI_MODELS } from './client';
import type { Product, InfringementResult } from '@/types';
import { getAIPromptExamples, type IntelligenceData } from '@/lib/intelligence/intelligence-engine';

export interface FilterResult {
  is_infringement: boolean;
  confidence: number; // 0.0 to 1.0
  reasoning: string;
  infringement_type?: 'piracy' | 'unauthorized_sale' | 'counterfeit' | 'unknown';
}

/**
 * Analyze a single search result to determine if it's a real infringement
 */
export async function filterSearchResult(
  result: InfringementResult,
  product: Product,
  intelligence?: IntelligenceData
): Promise<FilterResult> {
  // Get learned examples from intelligence engine
  const examples = await getAIPromptExamples(product.id);

  // Build system prompt with learned examples
  let systemPrompt = `You are an expert at identifying copyright infringement, piracy, and unauthorized distribution of digital products.

Your task is to analyze search results and determine if they represent actual infringements. Be thorough but precise — only flag results where there is clear evidence of infringement based on the URL, title, and snippet.

DEFINITE INFRINGEMENTS (flag with high confidence 0.8+):
- Free downloads of paid content (torrents, direct downloads, file sharing)
- Cracked, nulled, or pirated versions
- Unauthorized redistribution on known piracy sites
- Counterfeit copies or clones being sold
- Leaked premium content on file-sharing platforms

POSSIBLE INFRINGEMENTS (flag with moderate confidence 0.5-0.8):
- Unauthorized sales on unofficial platforms
- Sites that list the product alongside other pirated content
- URLs on suspicious domains with piracy-related terms in title/snippet

FALSE POSITIVES (filter out — confidence below 0.3):
- The product's own official website or authorized sales pages
- Major review sites (e.g., Trustpilot, G2, Capterra)
- News articles, blog posts, or discussions ABOUT the product
- The product creator's own social media accounts
- Official documentation, help pages, or changelogs
- Educational content, tutorials, or "how to use" guides
- Forums discussing the product legitimately (reviews, support questions)
- App stores and official marketplaces (Apple App Store, Google Play, MQL5 marketplace)
- Comparison sites or "alternatives to" pages`;

  // Add learned pattern intelligence (from user feedback history)
  if (intelligence?.hasLearningData) {
    systemPrompt += `\n\nLEARNED INTELLIGENCE FROM USER FEEDBACK:`;
    if (intelligence.verifiedPlatforms.length > 0) {
      systemPrompt += `\n- Platforms with confirmed infringements: ${intelligence.verifiedPlatforms.join(', ')}`;
    }
    if (intelligence.verifiedHosting.length > 0) {
      systemPrompt += `\n- Hosting providers linked to infringements: ${intelligence.verifiedHosting.join(', ')}`;
    }
    if (intelligence.verifiedCountries.length > 0) {
      systemPrompt += `\n- Countries frequently hosting infringements: ${intelligence.verifiedCountries.join(', ')}`;
    }
    if (intelligence.reliableMatchTypes.length > 0) {
      systemPrompt += `\n- Most reliable detection methods: ${intelligence.reliableMatchTypes.join(', ')}`;
    }
    if (intelligence.falsePositiveDomains.length > 0) {
      systemPrompt += `\n- Domains frequently flagged as false positives: ${intelligence.falsePositiveDomains.join(', ')}`;
    }
    if (intelligence.falsePositiveHosting.length > 0) {
      systemPrompt += `\n- Hosting providers frequently associated with false positives: ${intelligence.falsePositiveHosting.join(', ')}`;
    }
  }

  // Add learned examples if available (Few-Shot Learning)
  if (examples.verified_examples.length > 0) {
    systemPrompt += `\n\nLEARNED EXAMPLES OF REAL INFRINGEMENTS (verified by user):`;
    examples.verified_examples.forEach((ex, i) => {
      systemPrompt += `\n${i + 1}. ${ex}`;
    });
  }

  if (examples.false_positive_examples.length > 0) {
    systemPrompt += `\n\nLEARNED EXAMPLES OF FALSE POSITIVES (rejected by user):`;
    examples.false_positive_examples.forEach((ex, i) => {
      systemPrompt += `\n${i + 1}. ${ex}`;
    });
  }

  systemPrompt += `\n\nRespond ONLY with valid JSON in this exact format:
{
  "is_infringement": true or false,
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of your decision",
  "infringement_type": "piracy" | "unauthorized_sale" | "counterfeit" | "unknown" (only if is_infringement is true)
}`;

  // Build context about the product
  const productContext = buildProductContext(product);

  // Build context about the search result
  const resultContext = `
SEARCH RESULT TO ANALYZE:
- Platform: ${result.platform}
- URL: ${result.source_url}
- Risk Level: ${result.risk_level}
- Audience Size: ${result.audience_size || 'unknown'}${result.title ? `\n- Page Title: ${result.title}` : ''}${result.snippet ? `\n- Search Snippet: ${result.snippet}` : ''}

TASK: Determine if this URL represents an actual infringement of the product or a false positive.
Consider the URL domain, page title, search snippet, the platform type, and the context clues.
Only flag results where there is meaningful evidence of unauthorized distribution or piracy.
A page merely mentioning the product name is NOT an infringement.

Respond with JSON only.`;

  const userPrompt = `${productContext}\n\n${resultContext}`;

  try {
    const response = await generateCompletion<FilterResult>(
      systemPrompt,
      userPrompt,
      {
        model: AI_MODELS.MINI, // Use cheapest model
        temperature: 0.2, // Low temperature for consistent decisions
        maxTokens: 200, // Short response
        responseFormat: 'json',
      }
    );

    // Validate response
    if (
      typeof response.data.is_infringement !== 'boolean' ||
      typeof response.data.confidence !== 'number' ||
      typeof response.data.reasoning !== 'string'
    ) {
      console.warn('Invalid AI filter response, defaulting to low confidence:', response.data);
      return {
        is_infringement: true, // Be conservative, let user verify
        confidence: 0.5,
        reasoning: 'AI filter returned invalid response',
      };
    }

    return response.data;
  } catch (error) {
    console.error('AI filtering error:', error);
    // On error, be conservative and allow the result through with low confidence
    return {
      is_infringement: true,
      confidence: 0.5,
      reasoning: 'AI filter error, requires manual verification',
    };
  }
}

/**
 * Filter multiple search results in batch (with rate limiting)
 */
export async function filterSearchResults(
  results: InfringementResult[],
  product: Product,
  minConfidence: number = 0.75,
  intelligence?: IntelligenceData
): Promise<InfringementResult[]> {
  console.log(`[AI Filter] Analyzing ${results.length} results for product: ${product.name}`);

  const filteredResults: InfringementResult[] = [];
  let filtered = 0;
  let passed = 0;

  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);

    const analyses = await Promise.all(
      batch.map((result) => filterSearchResult(result, product, intelligence))
    );

    // Filter results based on AI analysis
    // Only pass results the AI has reasonable confidence are infringements.
    analyses.forEach((analysis, index) => {
      const result = batch[index];
      if (!result) return;

      // Pass if: AI says it's an infringement with sufficient confidence,
      // OR if AI is uncertain but above 0.50 floor — let human decide
      const isLikelyInfringement = analysis.is_infringement && analysis.confidence >= minConfidence;
      const isUncertain = analysis.confidence >= 0.50 && analysis.confidence < minConfidence;

      if (isLikelyInfringement || isUncertain) {
        filteredResults.push(result);
        passed++;
        console.log(
          `[AI Filter] ✓ PASS (${(analysis.confidence * 100).toFixed(0)}%${isUncertain ? ' uncertain' : ''}): ${result.source_url} - ${analysis.reasoning}`
        );
      } else {
        // Only filter out results the AI is confident are NOT infringements
        filtered++;
        console.log(
          `[AI Filter] ✗ FILTERED (${(analysis.confidence * 100).toFixed(0)}%): ${result.source_url} - ${analysis.reasoning}`
        );
      }
    });

    // Small delay between batches to respect rate limits
    if (i + batchSize < results.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(
    `[AI Filter] Results: ${passed} passed, ${filtered} filtered (${((passed / results.length) * 100).toFixed(1)}% accuracy)`
  );

  return filteredResults;
}

/**
 * Build comprehensive product context for AI analysis
 */
function buildProductContext(product: Product): string {
  const aiData = product.ai_extracted_data;

  let context = `PRODUCT INFORMATION:
- Name: ${product.name}
- Type: ${product.type}`;

  if (product.brand_name) {
    context += `\n- Brand: ${product.brand_name}`;
  }

  if (product.description) {
    context += `\n- Description: ${product.description.substring(0, 200)}...`;
  }

  if (product.price) {
    context += `\n- Price: $${product.price} (this is a PAID product, free downloads are infringements)`;
  }

  if (product.url) {
    context += `\n- Official URL: ${product.url} (this is the ONLY authorized source)`;
  }

  // Add AI-extracted context if available
  if (aiData) {
    if (aiData.brand_identifiers && aiData.brand_identifiers.length > 0) {
      context += `\n- Brand Identifiers: ${aiData.brand_identifiers.join(', ')}`;
    }

    if (aiData.unique_phrases && aiData.unique_phrases.length > 0) {
      context += `\n- Unique Marketing Phrases: "${aiData.unique_phrases.slice(0, 3).join('", "')}"`;
    }

    if (aiData.copyrighted_terms && aiData.copyrighted_terms.length > 0) {
      context += `\n- Copyrighted Terms: ${aiData.copyrighted_terms.join(', ')}`;
    }
  }

  if (product.keywords && product.keywords.length > 0) {
    context += `\n- Keywords: ${product.keywords.slice(0, 5).join(', ')}`;
  }

  return context;
}

/**
 * Estimate filtering cost for a scan
 */
export function estimateFilteringCost(resultCount: number): number {
  // Approximate cost per result with GPT-4o-mini
  const costPerResult = 0.0002; // $0.0002 per result
  return resultCount * costPerResult;
}
