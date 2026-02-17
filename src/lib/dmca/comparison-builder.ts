/**
 * Comparison Item Builder
 *
 * Automatically generates "Original → Infringing" comparison mappings
 * from evidence matches, page capture data, and infringement metadata.
 * These are the single strongest element in any DMCA notice.
 */

export interface ComparisonItem {
  original: string;
  infringing: string;
}

interface BuildComparisonParams {
  productName: string;
  productUrl?: string | null;
  productType?: string;
  sourceUrl: string;
  evidence?: {
    matched_excerpts?: string[];
    matches?: Array<{
      type?: string;
      matched_text?: string;
      context?: string;
    }>;
    page_title?: string;
    similarity_score?: number;
  } | null;
  pageCapture?: {
    page_title?: string;
    page_text?: string;
    page_links?: Array<{ href: string; text: string }>;
  } | null;
  evidenceSnapshot?: {
    page_title?: string;
    evidence_matches?: Array<{
      type?: string;
      matched_text?: string;
      original_text?: string;
      context?: string;
      severity?: string;
      confidence?: number;
      explanation?: string;
      dmca_language?: string;
    }>;
    page_capture?: {
      page_text?: string;
      page_links?: Array<{ href: string; text: string }>;
    };
    ai_evidence_analysis?: {
      matches: Array<{
        type: string;
        original_text: string;
        infringing_text: string;
        context: string;
        legal_significance: 'critical' | 'strong' | 'supporting';
        explanation: string;
        dmca_language: string;
        confidence: number;
      }>;
      summary: string;
      strength_score: number;
      recommended_for_dmca: boolean;
    } | null;
  } | null;
  // AI-extracted product data (from product analyzer)
  aiExtractedData?: {
    brand_identifiers?: string[];
    unique_phrases?: string[];
    keywords?: string[];
    copyrighted_terms?: string[];
  } | null;
}

/**
 * Build comparison items from all available evidence.
 * Returns 1-10 items, targeting 3-8 for strongest notices.
 *
 * Priority: AI-curated evidence (highest quality) → structured matches → raw excerpts → metadata
 */
export function buildComparisonItems(params: BuildComparisonParams): ComparisonItem[] {
  const items: ComparisonItem[] = [];
  const seen = new Set<string>();

  const addItem = (original: string, infringing: string) => {
    const key = `${original}|||${infringing}`.toLowerCase();
    if (!seen.has(key) && items.length < 10) {
      seen.add(key);
      items.push({ original, infringing });
    }
  };

  // ── AI-Curated Evidence (highest quality, legally-formatted) ───
  // When AI evidence analysis is available, use it as the primary source.
  // Each match already has DMCA-ready language ranked by legal significance.
  const aiAnalysis = params.evidenceSnapshot?.ai_evidence_analysis;

  if (aiAnalysis?.matches && aiAnalysis.matches.length > 0) {
    // Sort: critical first, then strong, then supporting
    const significanceOrder = { critical: 0, strong: 1, supporting: 2 };
    const sortedMatches = [...aiAnalysis.matches].sort(
      (a, b) => (significanceOrder[a.legal_significance] ?? 2) - (significanceOrder[b.legal_significance] ?? 2)
    );

    // 1. Product listing vs infringing page (always include as context)
    if (params.productUrl) {
      addItem(
        `Original product page: ${params.productUrl}`,
        `Unauthorized copy found at: ${params.sourceUrl}`
      );
    }

    // 2. AI-curated matches with DMCA-ready language
    for (const match of sortedMatches.slice(0, 7)) {
      if (match.dmca_language) {
        // Use the AI's DMCA language directly — it's already formatted for legal notice
        addItem(
          `Original ${formatMatchType(match.type)} from "${params.productName}": "${match.original_text.slice(0, 200)}"`,
          match.dmca_language
        );
      } else {
        // Fallback to structured format
        addItem(
          `Original ${formatMatchType(match.type)} from "${params.productName}": "${match.original_text.slice(0, 200)}"`,
          `Reproduced without authorization at ${params.sourceUrl}: "${match.infringing_text.slice(0, 200)}"`
        );
      }
    }

    // 3. Product type context (if room)
    if (params.productType && params.productUrl && items.length < 9) {
      const typeLabel = formatProductType(params.productType);
      addItem(
        `${typeLabel} legitimately sold at ${params.productUrl}`,
        `${typeLabel} made available without authorization at ${params.sourceUrl}`
      );
    }

    return items;
  }

  // ── Fallback: Non-AI evidence (legacy path) ───────────────────
  // Used when AI analysis hasn't run or produced no matches

  // 1. Product listing vs infringing page
  if (params.productUrl) {
    addItem(
      `Original product page: ${params.productUrl}`,
      `Unauthorized copy found at: ${params.sourceUrl}`
    );
  }

  // 2. Structured evidence matches with AI fields (from evidence_matches column)
  // Check if evidence_matches have the enriched AI fields (original_text, dmca_language)
  const snapshotMatches = params.evidenceSnapshot?.evidence_matches;
  if (snapshotMatches) {
    // Check if these are AI-enriched matches (have original_text and dmca_language)
    const aiEnriched = snapshotMatches.filter((m) => m.original_text && m.dmca_language);

    if (aiEnriched.length > 0) {
      // Use AI-enriched matches from evidence_matches column
      for (const match of aiEnriched.slice(0, 6)) {
        addItem(
          `Original ${formatMatchType(match.type || 'content')} from "${params.productName}": "${(match.original_text || '').slice(0, 200)}"`,
          match.dmca_language || `Reproduced without authorization at ${params.sourceUrl}: "${(match.matched_text || '').slice(0, 200)}"`
        );
      }
    } else {
      // Basic evidence_matches without AI enrichment
      for (const match of snapshotMatches.slice(0, 5)) {
        if (match.matched_text && match.matched_text.length > 10) {
          const text = match.matched_text.slice(0, 150);
          addItem(
            `Original ${match.type || 'content'} from "${params.productName}": "${text}"`,
            `Reproduced at ${params.sourceUrl}: "${text}"`
          );
        }
      }
    }
  }

  // 3. Text excerpt matches from raw evidence
  if (params.evidence?.matched_excerpts) {
    for (const excerpt of params.evidence.matched_excerpts.slice(0, 5)) {
      const trimmed = excerpt.trim().slice(0, 150);
      if (trimmed.length > 10) {
        addItem(
          `Original text from "${params.productName}": "${trimmed}"`,
          `Same text found at ${params.sourceUrl}: "${trimmed}"`
        );
      }
    }
  }

  // 4. Basic structured matches from evidence (non-snapshot)
  if (params.evidence?.matches && !snapshotMatches) {
    for (const match of params.evidence.matches.slice(0, 5)) {
      if (match.matched_text && match.matched_text.length > 10) {
        const text = match.matched_text.slice(0, 150);
        addItem(
          `Original ${match.type || 'content'} from "${params.productName}": "${text}"`,
          `Reproduced at ${params.sourceUrl}: "${text}"`
        );
      }
    }
  }

  // 5. Page title comparison
  const capturedTitle =
    params.pageCapture?.page_title ||
    params.evidenceSnapshot?.page_title ||
    params.evidence?.page_title;
  if (capturedTitle && capturedTitle.toLowerCase().includes(params.productName.toLowerCase())) {
    addItem(
      `Original product name: "${params.productName}"`,
      `Product name used without authorization in page title: "${capturedTitle}"`
    );
  }

  // 6. Product type context
  if (params.productType && params.productUrl) {
    const typeLabel = formatProductType(params.productType);
    addItem(
      `${typeLabel} legitimately sold at ${params.productUrl}`,
      `${typeLabel} made available without authorization at ${params.sourceUrl}`
    );
  }

  // ── AI-Extracted Data Comparisons (from product analyzer) ──────

  const ai = params.aiExtractedData;
  const capturedText = (
    params.evidenceSnapshot?.page_capture?.page_text ||
    params.pageCapture?.page_text ||
    ''
  ).toLowerCase();

  if (ai && capturedText.length > 0) {
    // 7. Unique phrase matches (strongest AI-derived evidence)
    if (ai.unique_phrases) {
      for (const phrase of ai.unique_phrases.slice(0, 3)) {
        if (capturedText.includes(phrase.toLowerCase())) {
          addItem(
            `Original copyrighted phrase from "${params.productName}": "${phrase}"`,
            `Identical phrase reproduced without authorization at ${params.sourceUrl}`
          );
        }
      }
    }

    // 8. Brand identifier matches
    if (ai.brand_identifiers) {
      for (const brand of ai.brand_identifiers.slice(0, 2)) {
        if (capturedText.includes(brand.toLowerCase())) {
          addItem(
            `Trademarked brand identifier: "${brand}"`,
            `Brand used without authorization at ${params.sourceUrl}`
          );
        }
      }
    }

    // 9. Copyrighted term matches
    if (ai.copyrighted_terms) {
      for (const term of ai.copyrighted_terms.slice(0, 2)) {
        if (capturedText.includes(term.toLowerCase().replace(/[®™©]/g, ''))) {
          addItem(
            `Copyrighted term: "${term}"`,
            `Protected term reproduced at ${params.sourceUrl}`
          );
        }
      }
    }
  }

  return items;
}

function formatMatchType(type: string): string {
  const labels: Record<string, string> = {
    exact_reproduction: 'copyrighted content',
    brand_usage: 'brand identifier',
    unique_phrase: 'unique phrase',
    content_structure: 'content structure',
    pricing_copy: 'pricing information',
    keyword_cluster: 'keyword pattern',
    text_match: 'text',
    brand_mention: 'brand mention',
    copyrighted_content: 'copyrighted content',
    download_link: 'download link',
  };
  return labels[type] || 'content';
}

function formatProductType(type: string): string {
  const labels: Record<string, string> = {
    video_course: 'Video course',
    ebook: 'E-book',
    pdf: 'PDF document',
    software: 'Software application',
    images: 'Image collection',
    audio: 'Audio content',
    slides: 'Presentation slides',
    trading_indicator: 'Trading indicator',
    template: 'Digital template',
    digital_asset: 'Digital asset',
    course: 'Online course',
  };
  return labels[type] || 'Digital product';
}
