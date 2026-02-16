/**
 * AI-Powered Infringement Filter
 * Uses GPT-4o-mini to analyze search results and filter out false positives
 * Cost: ~$0.0001-0.0002 per result (~$0.01-0.02 per 100 results)
 */

import { generateCompletion, AI_MODELS } from './client';
import type { Product, InfringementResult } from '@/types';
import { getAIPromptExamples } from '@/lib/intelligence/intelligence-engine';

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
  product: Product
): Promise<FilterResult> {
  // Get learned examples from intelligence engine
  const examples = await getAIPromptExamples(product.id);

  // Build system prompt with learned examples
  let systemPrompt = `You are an expert at identifying copyright infringement, piracy, and unauthorized distribution of digital products.

Your task is to analyze search results and determine if they represent ACTUAL INFRINGEMENTS or FALSE POSITIVES.

WHAT IS AN INFRINGEMENT:
- Free downloads of paid content (torrents, direct downloads, file sharing)
- Cracked, nulled, or pirated versions
- Unauthorized redistribution on piracy sites
- Counterfeit copies or clones
- Unauthorized sales on unofficial platforms
- Leaked premium content

WHAT IS NOT AN INFRINGEMENT (False Positives):
- Reviews, testimonials, or critiques
- News articles or press releases
- Educational content or tutorials about the product
- Comparison sites or affiliate marketing
- Official sales pages or authorized resellers
- User discussions asking questions about the product
- Social media posts mentioning the product
- Videos explaining how to use the product`;

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
- Audience Size: ${result.audience_size || 'unknown'}

TASK: Determine if this URL represents an actual infringement of the product or a false positive.
Consider the URL domain, the platform type, and the context clues.

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
  minConfidence: number = 0.75
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
      batch.map((result) => filterSearchResult(result, product))
    );

    // Filter results based on AI analysis
    analyses.forEach((analysis, index) => {
      const result = batch[index];
      if (!result) return;

      if (analysis.is_infringement && analysis.confidence >= minConfidence) {
        // High confidence infringement - include it
        filteredResults.push(result);
        passed++;
        console.log(
          `[AI Filter] ✓ PASS (${(analysis.confidence * 100).toFixed(0)}%): ${result.source_url} - ${analysis.reasoning}`
        );
      } else {
        // Low confidence or not an infringement - filter it out
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
