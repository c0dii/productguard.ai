/**
 * AI-Powered Evidence Extraction System
 * CRITICAL: Only analyzes REAL page content - never hallucinates
 *
 * Legal Requirements:
 * - Extract only text that actually exists on the page
 * - Preserve exact quotes with byte positions
 * - Maintain chain of custody metadata
 */

import { generateCompletion, AI_MODELS } from '@/lib/ai/client';
import type { Product } from '@/types';
import crypto from 'crypto';

export interface EvidenceMatch {
  type: 'brand_mention' | 'keyword_match' | 'copyrighted_content' | 'pricing_info' | 'download_link';
  matched_text: string; // Exact text from page
  context: string; // Surrounding text for context
  position: number; // Character position in HTML
  confidence: number; // 0-1 score
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ExtractedEvidence {
  matches: EvidenceMatch[];
  page_hash: string; // SHA-256 of page content
  extracted_at: string; // ISO timestamp
  page_title: string;
  page_description: string;
  total_matches: number;
  critical_findings: string[]; // High-priority evidence
}

interface AIEvidenceAnalysis {
  matches: Array<{
    type: string;
    exact_quote: string;
    surrounding_context: string;
    confidence: number;
    reasoning: string;
    severity: string;
  }>;
  critical_findings: string[];
  summary: string;
}

/**
 * Extract evidence from REAL page content using AI
 * AI is used ONLY to identify matches - all quotes must exist in actual content
 */
export async function extractEvidence(
  pageHTML: string,
  pageText: string,
  sourceUrl: string,
  product: Product
): Promise<ExtractedEvidence> {
  // Generate hash of original content for legal proof
  const pageHash = crypto.createHash('sha256').update(pageHTML).digest('hex');

  // Extract metadata
  const titleMatch = pageHTML.match(/<title>(.*?)<\/title>/i);
  const descMatch = pageHTML.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);

  const pageTitle = titleMatch ? titleMatch[1] : '';
  const pageDescription = descMatch ? descMatch[1] : '';

  // Prepare context for AI (product info + actual page content)
  const systemPrompt = `You are a forensic content analyzer for intellectual property protection.

CRITICAL RULES:
1. Extract ONLY text that actually appears in the provided page content
2. Return exact quotes - never paraphrase or generate text
3. Include surrounding context for each match
4. Identify matches for: brand names, product names, copyrighted phrases, pricing, download links
5. Rate confidence based on exactness of match
6. Flag critical evidence (direct copies, download links, pricing that undercuts legitimate product)

NEVER make up quotes. ONLY extract what's actually there.

Return JSON in this format:
{
  "matches": [
    {
      "type": "brand_mention" | "keyword_match" | "copyrighted_content" | "pricing_info" | "download_link",
      "exact_quote": "Exact text from page",
      "surrounding_context": "...text before... [MATCH] ...text after...",
      "confidence": 0.0-1.0,
      "reasoning": "Why this is evidence",
      "severity": "critical" | "high" | "medium" | "low"
    }
  ],
  "critical_findings": ["High-priority evidence summaries"],
  "summary": "Brief analysis of evidence strength"
}`;

  const userPrompt = `Analyze this page for IP infringement evidence.

PRODUCT INFORMATION:
- Name: ${product.name}
- Brand: ${product.brand_name || 'N/A'}
- Keywords: ${product.keywords?.join(', ') || 'N/A'}
- Copyrighted phrases: ${(product.ai_extracted_data as any)?.copyrighted_terms?.join(', ') || 'N/A'}
- Price: $${product.price}

PAGE URL: ${sourceUrl}
PAGE TITLE: ${pageTitle}

ACTUAL PAGE CONTENT (first 8000 chars):
${pageText.slice(0, 8000)}

Extract evidence that proves IP infringement. Remember: ONLY extract text that actually exists in the content above.`;

  try {
    const response = await generateCompletion<AIEvidenceAnalysis>(
      systemPrompt,
      userPrompt,
      {
        model: AI_MODELS.MINI,
        temperature: 0.1, // Low temperature = more deterministic, less creative
        maxTokens: 2000,
        responseFormat: 'json',
      }
    );

    // Validate that all "exact_quote" values actually exist in the page text
    const validatedMatches: EvidenceMatch[] = [];

    for (const match of response.data.matches) {
      const exactQuote = match.exact_quote;
      const position = pageText.toLowerCase().indexOf(exactQuote.toLowerCase());

      // CRITICAL: Only include if quote actually exists in page
      if (position !== -1) {
        validatedMatches.push({
          type: match.type as EvidenceMatch['type'],
          matched_text: exactQuote,
          context: match.surrounding_context,
          position,
          confidence: match.confidence,
          severity: match.severity as EvidenceMatch['severity'],
        });
      } else {
        console.warn(`[Evidence Extraction] AI returned quote not found in page: "${exactQuote}"`);
        // This is a hallucination - reject it
      }
    }

    return {
      matches: validatedMatches,
      page_hash: pageHash,
      extracted_at: new Date().toISOString(),
      page_title: pageTitle,
      page_description: pageDescription,
      total_matches: validatedMatches.length,
      critical_findings: response.data.critical_findings,
    };
  } catch (error) {
    console.error('[Evidence Extraction] AI analysis failed:', error);

    // Fallback: Basic keyword matching without AI
    return extractEvidenceFallback(pageText, pageHash, product, pageTitle, pageDescription);
  }
}

/**
 * Fallback evidence extraction using simple keyword matching
 * Used if AI fails - no hallucination risk
 */
function extractEvidenceFallback(
  pageText: string,
  pageHash: string,
  product: Product,
  pageTitle: string,
  pageDescription: string
): ExtractedEvidence {
  const matches: EvidenceMatch[] = [];
  const lowerText = pageText.toLowerCase();

  // Search for product name
  if (product.name) {
    const position = lowerText.indexOf(product.name.toLowerCase());
    if (position !== -1) {
      const contextStart = Math.max(0, position - 50);
      const contextEnd = Math.min(pageText.length, position + product.name.length + 50);

      matches.push({
        type: 'keyword_match',
        matched_text: pageText.slice(position, position + product.name.length),
        context: pageText.slice(contextStart, contextEnd),
        position,
        confidence: 0.9,
        severity: 'high',
      });
    }
  }

  // Search for keywords
  if (product.keywords) {
    for (const keyword of product.keywords) {
      const position = lowerText.indexOf(keyword.toLowerCase());
      if (position !== -1) {
        const contextStart = Math.max(0, position - 50);
        const contextEnd = Math.min(pageText.length, position + keyword.length + 50);

        matches.push({
          type: 'keyword_match',
          matched_text: pageText.slice(position, position + keyword.length),
          context: pageText.slice(contextStart, contextEnd),
          position,
          confidence: 0.7,
          severity: 'medium',
        });
      }
    }
  }

  return {
    matches,
    page_hash: pageHash,
    extracted_at: new Date().toISOString(),
    page_title: pageTitle,
    page_description: pageDescription,
    total_matches: matches.length,
    critical_findings: matches.length > 0 ? ['Product name or keywords found on page'] : [],
  };
}

/**
 * Verify that extracted evidence hasn't been tampered with
 */
export function verifyEvidence(
  pageHTML: string,
  recordedHash: string
): boolean {
  const currentHash = crypto.createHash('sha256').update(pageHTML).digest('hex');
  return currentHash === recordedHash;
}
