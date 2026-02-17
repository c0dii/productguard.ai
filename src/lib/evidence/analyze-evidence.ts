/**
 * AI Evidence Analyzer
 *
 * Analyzes captured infringing page content against the original product data
 * to produce high-quality, legally-relevant evidence matches for DMCA notices.
 *
 * This runs after page capture during verification, and produces structured
 * evidence that is:
 * 1. Ranked by legal significance (unique phrases > brand names > keywords)
 * 2. Deduplicated and cleaned
 * 3. Contextually meaningful (includes surrounding text for proof)
 * 4. DMCA-ready (formatted for inclusion in takedown notices)
 */

import { generateCompletion, AI_MODELS } from '@/lib/ai/client';

export interface AnalyzedEvidenceMatch {
  type: 'exact_reproduction' | 'brand_usage' | 'unique_phrase' | 'content_structure' | 'pricing_copy' | 'keyword_cluster';
  original_text: string; // The text from the original product
  infringing_text: string; // The text found on the infringing page
  context: string; // Surrounding context from the infringing page
  legal_significance: 'critical' | 'strong' | 'supporting';
  explanation: string; // Why this constitutes infringement
  dmca_language: string; // Ready-to-use language for DMCA notice
  confidence: number; // 0-1
}

export interface EvidenceAnalysisResult {
  matches: AnalyzedEvidenceMatch[];
  summary: string; // Brief legal summary of findings
  strength_score: number; // 0-100, overall evidence strength
  recommended_for_dmca: boolean; // Whether evidence is strong enough
  analysis_model: string;
  analyzed_at: string;
}

interface AnalyzeEvidenceParams {
  productName: string;
  productDescription: string | null;
  productUrl: string | null;
  productType: string;
  productKeywords: string[] | null;
  aiExtractedData: {
    brand_identifiers?: string[];
    unique_phrases?: string[];
    keywords?: string[];
    copyrighted_terms?: string[];
    product_description?: string | null;
  } | null;
  capturedPageText: string; // Text from the infringing page
  capturedPageTitle: string | null;
  infringementUrl: string;
  platform: string;
}

const SYSTEM_PROMPT = `You are a legal evidence analyst specializing in intellectual property and DMCA takedown cases. Your job is to analyze captured web page content and identify specific evidence of copyright infringement by comparing it against the original product data.

IMPORTANT RULES:
1. Only identify GENUINE matches — text that clearly came from the original product
2. Prioritize unique, distinctive content over generic industry terms
3. Each match must include the EXACT text from both the original and the infringing page
4. Context should include 50-100 characters of surrounding text from the infringing page
5. Legal significance should be based on how distinctive the matched content is
6. DMCA language should be formal, specific, and legally actionable
7. Do NOT manufacture matches — if the evidence is weak, say so honestly
8. STRICTLY exclude common generic terms that anyone could use. These are NEVER evidence of infringement: "trading", "indicator", "course", "review", "chart", "strategy", "software", "tool", "system", "template", "download", "premium", "free", "analysis", "market", "stock", "forex", "crypto", "signal", "alert", "profit", "video", "tutorial", "guide", "ebook", "beginner", "advanced", "platform", "broker", etc. A single generic word match is NEVER valid evidence.
9. Focus ONLY on: exact reproductions of unique text, brand names, product names, creator names, unique marketing phrases, proprietary terminology, and product descriptions copied verbatim
10. Evidence must be PRODUCT-SPECIFIC. Ask yourself: "Could this text appear on ANY page in this industry, or does it specifically reference THIS product?" Only include the latter.

LEGAL SIGNIFICANCE LEVELS:
- "critical": Exact reproduction of unique copyrighted content (verbatim text blocks, unique product names, distinctive taglines)
- "strong": Brand identifiers, trademarked terms, or substantial similar phrasing used without authorization
- "supporting": Keyword clusters, structural similarities, or partial reproductions that corroborate other evidence

RESPONSE FORMAT: Return a JSON object with these fields:
{
  "matches": [
    {
      "type": "exact_reproduction" | "brand_usage" | "unique_phrase" | "content_structure" | "pricing_copy" | "keyword_cluster",
      "original_text": "The exact text from the original product",
      "infringing_text": "The exact text found on the infringing page",
      "context": "...surrounding text from the infringing page for proof...",
      "legal_significance": "critical" | "strong" | "supporting",
      "explanation": "Why this constitutes infringement",
      "dmca_language": "Formal language suitable for a DMCA notice describing this specific infringement",
      "confidence": 0.0 to 1.0
    }
  ],
  "summary": "Brief legal summary of all findings (2-3 sentences)",
  "strength_score": 0 to 100,
  "recommended_for_dmca": true/false
}

Return ONLY valid JSON. Limit to 8 best matches maximum, ordered by legal significance.`;

/**
 * Analyze captured page content against product data using AI.
 * Returns structured, legally-relevant evidence matches.
 */
export async function analyzeEvidence(params: AnalyzeEvidenceParams): Promise<EvidenceAnalysisResult | null> {
  try {
    // Build the user prompt with all available data
    const productInfo = buildProductContext(params);
    const pageInfo = buildPageContext(params);

    if (pageInfo.length < 50) {
      console.log('[Evidence Analyzer] Page text too short for analysis, skipping');
      return null;
    }

    const userPrompt = `ORIGINAL PRODUCT DATA:
${productInfo}

CAPTURED INFRINGING PAGE CONTENT:
URL: ${params.infringementUrl}
Platform: ${params.platform}
Page Title: ${params.capturedPageTitle || 'N/A'}

--- PAGE TEXT (first 8000 chars) ---
${pageInfo}
--- END PAGE TEXT ---

Analyze the captured page content and identify specific evidence of copyright infringement. Compare the infringing page against the original product data and find matches.`;

    const response = await generateCompletion<{
      matches: Array<{
        type: string;
        original_text: string;
        infringing_text: string;
        context: string;
        legal_significance: string;
        explanation: string;
        dmca_language: string;
        confidence: number;
      }>;
      summary: string;
      strength_score: number;
      recommended_for_dmca: boolean;
    }>(SYSTEM_PROMPT, userPrompt, {
      model: AI_MODELS.MINI,
      temperature: 0.2,
      maxTokens: 2000,
      responseFormat: 'json',
    });

    const data = response.data;

    // Validate and clean the response
    const cleanedMatches: AnalyzedEvidenceMatch[] = (data.matches || [])
      .filter((m) =>
        m.original_text?.length > 5 &&
        m.infringing_text?.length > 5 &&
        m.confidence >= 0.5
      )
      .slice(0, 8)
      .map((m) => ({
        type: validateMatchType(m.type),
        original_text: m.original_text.trim(),
        infringing_text: m.infringing_text.trim(),
        context: (m.context || '').trim(),
        legal_significance: validateSignificance(m.legal_significance),
        explanation: m.explanation?.trim() || '',
        dmca_language: m.dmca_language?.trim() || '',
        confidence: Math.min(1, Math.max(0, m.confidence)),
      }));

    return {
      matches: cleanedMatches,
      summary: data.summary || 'Evidence analysis completed.',
      strength_score: Math.min(100, Math.max(0, data.strength_score || 0)),
      recommended_for_dmca: data.recommended_for_dmca ?? cleanedMatches.length > 0,
      analysis_model: AI_MODELS.MINI,
      analyzed_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[Evidence Analyzer] AI analysis failed:', error);
    return null;
  }
}

function buildProductContext(params: AnalyzeEvidenceParams): string {
  const lines: string[] = [];

  lines.push(`Product Name: ${params.productName}`);
  lines.push(`Product Type: ${params.productType}`);

  if (params.productUrl) {
    lines.push(`Original URL: ${params.productUrl}`);
  }

  if (params.productDescription) {
    lines.push(`\nProduct Description:\n${params.productDescription.slice(0, 1000)}`);
  }

  const ai = params.aiExtractedData;
  if (ai) {
    if (ai.product_description) {
      lines.push(`\nAI-Generated Description:\n${ai.product_description}`);
    }
    if (ai.brand_identifiers?.length) {
      lines.push(`\nBrand Identifiers: ${ai.brand_identifiers.join(', ')}`);
    }
    if (ai.unique_phrases?.length) {
      lines.push(`\nUnique Phrases (copyrighted):\n${ai.unique_phrases.map((p) => `- "${p}"`).join('\n')}`);
    }
    if (ai.copyrighted_terms?.length) {
      lines.push(`\nCopyrighted Terms: ${ai.copyrighted_terms.join(', ')}`);
    }
    if (ai.keywords?.length) {
      lines.push(`\nProduct Keywords: ${ai.keywords.slice(0, 20).join(', ')}`);
    }
  }

  if (params.productKeywords?.length) {
    lines.push(`\nUser-Provided Keywords: ${params.productKeywords.join(', ')}`);
  }

  return lines.join('\n');
}

function buildPageContext(params: AnalyzeEvidenceParams): string {
  // Limit to 8000 chars to stay within token limits while providing enough context
  return (params.capturedPageText || '').slice(0, 8000);
}

function validateMatchType(type: string): AnalyzedEvidenceMatch['type'] {
  const validTypes: AnalyzedEvidenceMatch['type'][] = [
    'exact_reproduction', 'brand_usage', 'unique_phrase',
    'content_structure', 'pricing_copy', 'keyword_cluster',
  ];
  return validTypes.includes(type as any) ? (type as AnalyzedEvidenceMatch['type']) : 'exact_reproduction';
}

function validateSignificance(sig: string): AnalyzedEvidenceMatch['legal_significance'] {
  const valid: AnalyzedEvidenceMatch['legal_significance'][] = ['critical', 'strong', 'supporting'];
  return valid.includes(sig as any) ? (sig as AnalyzedEvidenceMatch['legal_significance']) : 'supporting';
}
