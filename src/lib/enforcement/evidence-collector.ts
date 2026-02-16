/**
 * Evidence Collector Module
 *
 * Collects comprehensive evidence during piracy scans:
 * - Screenshots of infringing pages (via screenshot API)
 * - Matched text excerpts (via HTML scraping)
 * - URL redirect chains
 * - File hashes (if applicable)
 * - Detection metadata
 */

import * as cheerio from 'cheerio';
import type { EvidencePacket, Product } from '@/types';

export interface EvidenceCollectionContext {
  productName: string;
  productUrl: string | null;
  keywords: string[] | null;
  fileHash: string | null;
}

export interface InfringementDetection {
  url: string;
  platform: string;
  detectionMethod: 'keyword' | 'hash' | 'manual';
  matchedTerms?: string[];
  matchedHash?: string;
}

/**
 * Main evidence collector class
 */
export class EvidenceCollector {
  /**
   * Collect comprehensive evidence packet for an infringement
   */
  async collectEvidence(
    detection: InfringementDetection,
    context: EvidenceCollectionContext
  ): Promise<EvidencePacket> {
    const evidence: EvidencePacket = {
      screenshots: [],
      matched_excerpts: [],
      hash_matches: [],
      url_chain: [],
      detection_metadata: {},
    };

    try {
      // Run evidence collection in parallel for speed
      const [screenshots, excerpts, urlChain] = await Promise.all([
        this.captureScreenshots(detection.url),
        this.extractMatchedExcerpts(detection.url, context),
        this.traceUrlChain(detection.url),
      ]);

      evidence.screenshots = screenshots;
      evidence.matched_excerpts = excerpts;
      evidence.url_chain = urlChain;

      // Collect hash matches if applicable
      if (detection.matchedHash) {
        evidence.hash_matches = [detection.matchedHash];
      }

      // Store detection metadata
      evidence.detection_metadata = {
        detection_method: detection.detectionMethod,
        matched_terms: detection.matchedTerms || [],
        platform: detection.platform,
        collected_at: new Date().toISOString(),
        product_name: context.productName,
      };

      return evidence;
    } catch (error) {
      console.error('[Evidence Collector] Collection error:', error);

      // Return partial evidence with error metadata
      evidence.detection_metadata = {
        ...evidence.detection_metadata,
        collection_error: error instanceof Error ? error.message : 'Unknown error',
        partial_collection: true,
      };

      return evidence;
    }
  }

  /**
   * Capture screenshots using screenshot API
   * Uses screenshot.rocks (free, no API key required)
   */
  private async captureScreenshots(url: string): Promise<string[]> {
    try {
      // Use screenshot.rocks free API
      // Alternative: screenshotapi.net, apiflash.com, or self-hosted Puppeteer
      const screenshotUrl = `https://api.screenshotmachine.com/?key=demo&url=${encodeURIComponent(url)}&device=desktop&dimension=1920x1080&format=jpg&cacheLimit=0&delay=2000`;

      console.log(`[Evidence Collector] Capturing screenshot of: ${url}`);

      // TODO Phase 2: Upload to Supabase Storage and return permanent URL
      // For now, return the screenshot API URL (expires after some time)
      return [screenshotUrl];
    } catch (error) {
      console.error('[Evidence Collector] Screenshot capture failed:', error);
      return [];
    }
  }

  /**
   * Extract page content and identify matched excerpts
   * Scrapes the page and extracts text containing keywords
   */
  private async extractMatchedExcerpts(
    url: string,
    context: EvidenceCollectionContext
  ): Promise<string[]> {
    try {
      console.log(`[Evidence Collector] Extracting excerpts from: ${url}`);

      // Fetch the page HTML
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        console.error(`[Evidence Collector] HTTP ${response.status} for ${url}`);
        return [];
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove script and style tags
      $('script, style, noscript').remove();

      // Get all text content
      const pageText = $('body').text();

      // Build keyword list from product name and keywords
      const searchTerms: string[] = [];
      if (context.productName) {
        searchTerms.push(context.productName.toLowerCase());
      }
      if (context.keywords) {
        searchTerms.push(...context.keywords.map((k) => k.toLowerCase()));
      }

      const excerpts: string[] = [];
      const excerptContextLength = 100; // Characters before/after match

      // Search for each keyword
      for (const term of searchTerms) {
        const regex = new RegExp(`.{0,${excerptContextLength}}${this.escapeRegex(term)}.{0,${excerptContextLength}}`, 'gi');
        const matches = pageText.match(regex);

        if (matches) {
          // Add unique excerpts
          matches.forEach((match) => {
            const cleaned = match.trim().replace(/\s+/g, ' ');
            if (cleaned.length > 10 && !excerpts.includes(cleaned)) {
              excerpts.push(cleaned);
            }
          });
        }
      }

      // Limit to top 5 most relevant excerpts
      const limitedExcerpts = excerpts.slice(0, 5);

      console.log(`[Evidence Collector] Found ${limitedExcerpts.length} text excerpts`);

      return limitedExcerpts;
    } catch (error) {
      console.error('[Evidence Collector] Excerpt extraction failed:', error);
      return [];
    }
  }

  /**
   * Trace URL redirect chain
   * Follows redirects to build complete URL chain
   */
  private async traceUrlChain(url: string): Promise<string[]> {
    try {
      console.log(`[Evidence Collector] Tracing URL chain for: ${url}`);

      const chain: string[] = [url];
      let currentUrl = url;
      let redirectCount = 0;
      const maxRedirects = 10;

      while (redirectCount < maxRedirects) {
        try {
          const response = await fetch(currentUrl, {
            redirect: 'manual',
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            signal: AbortSignal.timeout(5000), // 5 second timeout per redirect
          });

          // Check if it's a redirect
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location) {
              // Handle relative URLs
              const nextUrl = new URL(location, currentUrl).toString();
              if (!chain.includes(nextUrl)) {
                chain.push(nextUrl);
                currentUrl = nextUrl;
                redirectCount++;
              } else {
                // Circular redirect detected
                break;
              }
            } else {
              break;
            }
          } else {
            // No more redirects
            break;
          }
        } catch (error) {
          console.error(`[Evidence Collector] Redirect trace error at hop ${redirectCount}:`, error);
          break;
        }
      }

      console.log(`[Evidence Collector] URL chain has ${chain.length} hops`);

      return chain;
    } catch (error) {
      console.error('[Evidence Collector] URL chain tracing failed:', error);
      return [url]; // Return at least the original URL
    }
  }

  /**
   * Calculate match confidence score based on evidence quality
   * Returns a score from 0.00 to 1.00
   */
  calculateMatchConfidence(evidence: EvidencePacket, product: Product): number {
    let score = 0.0;
    const weights = {
      hash_match: 0.95, // Hash match is definitive
      excerpts: 0.5, // Text matches are strong evidence
      screenshots: 0.2, // Screenshots provide visual confirmation
      url_chain: 0.1, // URL chain provides context
    };

    // Hash match (most reliable)
    if (evidence.hash_matches && evidence.hash_matches.length > 0) {
      score = Math.max(score, weights.hash_match);
    }

    // Text excerpt matches
    if (evidence.matched_excerpts && evidence.matched_excerpts.length > 0) {
      const excerptScore = Math.min(evidence.matched_excerpts.length * 0.15, weights.excerpts);
      score = Math.max(score, excerptScore);
    }

    // Screenshots captured
    if (evidence.screenshots && evidence.screenshots.length > 0) {
      score += weights.screenshots;
    }

    // URL chain traced
    if (evidence.url_chain && evidence.url_chain.length > 1) {
      score += weights.url_chain;
    }

    // Normalize to 0.00-1.00 range
    return Math.min(Math.max(score, 0.0), 1.0);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Singleton instance
export const evidenceCollector = new EvidenceCollector();
