import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { analyzeProductPage } from '@/lib/ai/product-analyzer';
import { generatePiracyKeywords } from '@/lib/ai/piracy-keyword-generator';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import type { ProductType } from '@/types';

export async function POST(request: Request) {
  try {
    // Rate limit: 10 scrapes per minute per IP
    const ip = getClientIp(request);
    const limiter = rateLimit(`scrape:${ip}`, { limit: 10, windowSeconds: 60 });
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limiter.resetIn) } }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, useAI = true } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    let productUrl: URL;
    try {
      productUrl = new URL(url);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // SSRF protection: only allow http/https and block internal hostnames
    if (!['http:', 'https:'].includes(productUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are allowed' }, { status: 400 });
    }

    const blockedHostnames = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', 'metadata.google.internal'];
    const hostname = productUrl.hostname.toLowerCase();
    if (
      blockedHostnames.includes(hostname) ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
    }

    // Fetch the page
    const response = await fetch(productUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch page: ${response.statusText}` }, { status: 500 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract basic data with multiple fallback strategies
    const extractedData = {
      name: extractTitle($),
      description: extractDescription($),
      price: extractPrice($),
      image_url: extractImage($, productUrl.origin),
      keywords: extractKeywords($),
      type: inferProductType($),
      url: productUrl.toString(),
    };

    // AI-powered analysis (if enabled and API key available)
    let aiData = null;
    let fullTextContent = null;

    if (useAI && process.env.OPENAI_API_KEY) {
      try {
        const analysis = await analyzeProductPage(html, productUrl.toString());
        aiData = analysis.aiExtractedData;
        fullTextContent = analysis.fullTextContent;

        // Prefer AI-extracted clean product name over raw page title
        if (analysis.productName) {
          extractedData.name = analysis.productName;
        }

        // Merge AI-extracted keywords with scraped keywords
        if (aiData.keywords && aiData.keywords.length > 0) {
          const allKeywords = [...new Set([...extractedData.keywords, ...aiData.keywords])];
          extractedData.keywords = allKeywords.slice(0, 15); // Limit to 15 total
        }

        // Prefer AI-generated description (DMCA-ready) over generic meta description
        if (aiData.product_description) {
          extractedData.description = aiData.product_description;
        }

        // Generate piracy-specific search intelligence (second AI call)
        try {
          const piracyData = await generatePiracyKeywords(
            analysis.productName || extractedData.name,
            (extractedData.type || 'other') as ProductType,
            null, // brand_name not available at scrape time
            aiData,
            fullTextContent || '',
            productUrl.toString()
          );

          aiData.piracy_search_terms = piracyData.piracy_search_terms;
          aiData.auto_alternative_names = piracyData.auto_alternative_names;
          aiData.auto_unique_identifiers = piracyData.auto_unique_identifiers;
          aiData.platform_search_terms = piracyData.platform_search_terms;
          aiData.piracy_analysis_metadata = piracyData.metadata;
        } catch (piracyError) {
          console.error('[Scrape] Piracy keyword generation failed (non-blocking):', piracyError);
        }
      } catch (aiError) {
        console.error('[Scrape] AI analysis failed, continuing with basic scraping:', aiError);
      }
    } else if (useAI && !process.env.OPENAI_API_KEY) {
      console.warn('[Scrape] OPENAI_API_KEY not set — skipping AI analysis');
    }

    // Fallback: construct ai_extracted_data from scraped content when AI didn't run
    if (!aiData) {
      aiData = {
        brand_identifiers: [] as string[],
        unique_phrases: [] as string[],
        keywords: extractedData.keywords || [],
        copyrighted_terms: [] as string[],
        product_description: extractedData.description || null,
        content_fingerprint: null,
        extraction_metadata: {
          model: 'scrape-fallback',
          analyzed_at: new Date().toISOString(),
          confidence_scores: {},
          processing_time_ms: 0,
        },
      };
    }

    return NextResponse.json({
      ...extractedData,
      ai_extracted_data: aiData,
      full_text_content: fullTextContent,
    });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape product data. Please try again or enter details manually.' },
      { status: 500 }
    );
  }
}

// Extract product title with multiple fallback strategies
function extractTitle($: cheerio.CheerioAPI): string {
  // Priority order: og:title, product schema, h1, title tag
  const strategies = [
    () => $('meta[property="og:title"]').attr('content'),
    () => $('meta[name="twitter:title"]').attr('content'),
    () => $('[itemtype*="schema.org/Product"] [itemprop="name"]').text(),
    () => $('h1').first().text(),
    () => $('title').text().split('|')[0]?.split('-')[0]?.trim(),
  ];

  for (const strategy of strategies) {
    const result = strategy();
    if (result && result.trim()) {
      return result.trim();
    }
  }

  return '';
}

// Extract product description
function extractDescription($: cheerio.CheerioAPI): string {
  const strategies = [
    () => $('meta[property="og:description"]').attr('content'),
    () => $('meta[name="description"]').attr('content'),
    () => $('meta[name="twitter:description"]').attr('content'),
    () => $('[itemtype*="schema.org/Product"] [itemprop="description"]').text(),
    () => $('.product-description').first().text(),
    () => $('.description').first().text(),
    () => $('[class*="description"]').first().text(),
  ];

  for (const strategy of strategies) {
    const result = strategy();
    if (result && result.trim().length > 20) {
      return result.trim().substring(0, 500); // Limit to 500 chars
    }
  }

  return '';
}

// Extract price
function extractPrice($: cheerio.CheerioAPI): number {
  // Strategy 1: Structured data (meta tags, schema.org)
  const metaStrategies = [
    () => $('meta[property="product:price:amount"]').attr('content'),
    () => $('meta[property="og:price:amount"]').attr('content'),
    () => $('[itemtype*="schema.org/Product"] [itemprop="price"]').attr('content'),
    () => $('[itemtype*="schema.org/Product"] [itemprop="price"]').text(),
    () => $('[data-price]').first().attr('data-price'),
  ];

  for (const strategy of metaStrategies) {
    const result = strategy();
    if (result) {
      const price = parsePriceString(result.toString());
      if (price > 0) return price;
    }
  }

  // Strategy 2: JSON-LD structured data
  try {
    let jsonLdPrice = 0;
    $('script[type="application/ld+json"]').each((_, el) => {
      if (jsonLdPrice > 0) return;
      const text = $(el).html();
      if (!text) return;
      try {
        const json = JSON.parse(text);
        const offers = json.offers || json?.mainEntity?.offers;
        if (offers) {
          const p = parseFloat(offers.price || offers.lowPrice || '0');
          if (p > 0) jsonLdPrice = p;
        }
      } catch {
        // Ignore individual parse errors
      }
    });
    if (jsonLdPrice > 0) return jsonLdPrice;
  } catch {
    // Ignore JSON-LD errors
  }

  // Strategy 3: Common price selectors
  const selectorStrategies = [
    () => $('.price').first().text(),
    () => $('[class*="price"]').first().text(),
    () => $('[class*="Price"]').first().text(),
    () => $('[class*="amount"]').first().text(),
    () => $('[class*="cost"]').first().text(),
  ];

  for (const strategy of selectorStrategies) {
    const result = strategy();
    if (result) {
      const price = parsePriceString(result.toString());
      if (price > 0) return price;
    }
  }

  // Strategy 4: Scan page text for price patterns like "$597" or "$29.99"
  const bodyText = $('body').text();
  const pricePatterns = bodyText.match(/\$[\d,]+(?:\.\d{2})?/g);
  if (pricePatterns && pricePatterns.length > 0) {
    // Take the first reasonable price found (skip very small or huge values)
    for (const p of pricePatterns) {
      const price = parsePriceString(p);
      if (price >= 1 && price <= 50000) return price;
    }
  }

  return 0;
}

function parsePriceString(str: string): number {
  const match = str.replace(/[^\d.,]/g, '').match(/[\d,]+\.?\d*/);
  if (match) {
    const price = parseFloat(match[0].replace(',', ''));
    if (price > 0 && isFinite(price)) return price;
  }
  return 0;
}

// Extract product image
function extractImage($: cheerio.CheerioAPI, origin: string): string {
  const strategies = [
    () => $('meta[property="og:image"]').attr('content'),
    () => $('meta[property="og:image:secure_url"]').attr('content'),
    () => $('meta[name="twitter:image"]').attr('content'),
    () => $('[itemtype*="schema.org/Product"] [itemprop="image"]').attr('content'),
    () => $('[itemtype*="schema.org/Product"] [itemprop="image"]').attr('src'),
    () => $('.product-image img').first().attr('src'),
    () => $('[class*="product"] img').first().attr('src'),
    () => $('img[alt*="product" i]').first().attr('src'),
  ];

  for (const strategy of strategies) {
    let result = strategy();
    if (result) {
      // Make relative URLs absolute
      if (result.startsWith('/')) {
        result = origin + result;
      } else if (result.startsWith('//')) {
        result = 'https:' + result;
      }
      return result;
    }
  }

  return '';
}

// Extract keywords
function extractKeywords($: cheerio.CheerioAPI): string[] {
  const keywordsSet = new Set<string>();

  // From meta keywords
  const metaKeywords = $('meta[name="keywords"]').attr('content');
  if (metaKeywords) {
    metaKeywords.split(',').forEach(kw => {
      const trimmed = kw.trim();
      if (trimmed) keywordsSet.add(trimmed);
    });
  }

  // From og:site_name, og:type, article:tag
  const ogType = $('meta[property="og:type"]').attr('content');
  if (ogType) keywordsSet.add(ogType);

  const siteName = $('meta[property="og:site_name"]').attr('content');
  if (siteName) keywordsSet.add(siteName);

  // From article tags
  $('meta[property="article:tag"]').each((_, el) => {
    const tag = $(el).attr('content');
    if (tag) keywordsSet.add(tag);
  });

  // From schema.org categories
  $('[itemtype*="schema.org"] [itemprop="category"]').each((_, el) => {
    const category = $(el).text().trim();
    if (category) keywordsSet.add(category);
  });

  return Array.from(keywordsSet).slice(0, 10); // Limit to 10 keywords
}

// Infer product type from content
function inferProductType($: cheerio.CheerioAPI): string {
  const title = $('title').text().toLowerCase();
  const description = $('meta[name="description"]').attr('content')?.toLowerCase() || '';
  const content = (title + ' ' + description).toLowerCase();

  const typePatterns = [
    { pattern: /(course|training|tutorial|lesson|class)/i, type: 'course' },
    { pattern: /(indicator|trading|strategy|signal)/i, type: 'indicator' },
    { pattern: /(software|app|application|program|tool|plugin|extension|addon)/i, type: 'software' },
    { pattern: /(ebook|book|pdf|guide|manual)/i, type: 'ebook' },
    { pattern: /(template|theme|design)/i, type: 'template' },
  ];

  for (const { pattern, type } of typePatterns) {
    if (pattern.test(content)) {
      return type;
    }
  }

  return 'other';
}
