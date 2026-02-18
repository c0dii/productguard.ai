import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { analyzeProductPage } from '@/lib/ai/product-analyzer';
import { generatePiracyKeywords } from '@/lib/ai/piracy-keyword-generator';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { filterGenericKeywords } from '@/lib/utils/keyword-quality';
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

        // Merge AI-extracted keywords with scraped keywords, then filter generics
        if (aiData.keywords && aiData.keywords.length > 0) {
          const allKeywords = [...new Set([...extractedData.keywords, ...aiData.keywords])];
          extractedData.keywords = filterGenericKeywords(allKeywords).slice(0, 15);
        } else {
          extractedData.keywords = filterGenericKeywords(extractedData.keywords);
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

    // Smart fallback: extract intelligence from page content when AI didn't run
    if (!aiData) {
      const contentIntel = extractContentIntelligence($, extractedData.name, extractedData.type);
      const fallbackKeywords = filterGenericKeywords([
        ...extractedData.keywords,
        ...contentIntel.keywords,
      ]);

      // Generate a factual DMCA-ready description from extracted entities
      const factualDesc = buildFactualDescription(
        extractedData.name,
        extractedData.type,
        contentIntel.creator,
        contentIntel.brand,
        contentIntel.platforms
      );

      aiData = {
        brand_identifiers: contentIntel.brandIdentifiers,
        unique_phrases: contentIntel.uniquePhrases,
        keywords: fallbackKeywords,
        copyrighted_terms: [] as string[],
        product_description: factualDesc || null,
        content_fingerprint: null,
        extraction_metadata: {
          model: 'scrape-fallback',
          analyzed_at: new Date().toISOString(),
          confidence_scores: {},
          processing_time_ms: 0,
        },
      };

      // Use factual description for the product too (replaces marketing copy)
      if (factualDesc) {
        extractedData.description = factualDesc;
      }
    }

    // Always seed keywords from product name — it's the most fundamental search term
    const seedKeywords = generateSeedKeywords(extractedData.name, extractedData.type);
    const existingKeywords = new Set((aiData.keywords || []).map((k: string) => k.toLowerCase()));
    const newSeeds = seedKeywords.filter(sk => !existingKeywords.has(sk.toLowerCase()));
    if (newSeeds.length > 0) {
      aiData.keywords = [...newSeeds, ...(aiData.keywords || [])];
      extractedData.keywords = [...new Set([...newSeeds, ...extractedData.keywords])].slice(0, 15);
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

  // From og:site_name (skip og:type — it's page metadata like "article", not a product keyword)
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

// Generate baseline keywords from product name — ensures the product name
// itself is always present as a keyword regardless of AI availability
function generateSeedKeywords(productName: string, productType: string): string[] {
  if (!productName || productName.trim().length === 0) return [];

  const seeds: string[] = [];
  const name = productName.trim();

  // Full product name is always a keyword
  seeds.push(name);

  // Strip type suffix to get the core name (e.g., "Earnings Hot Zone Indicator" → "Earnings Hot Zone")
  const typeSuffixes = /\b(indicator|course|training|tutorial|software|tool|plugin|template|theme|ebook|book|guide|system|program|app|strategy)\b\s*$/i;
  const coreName = name.replace(typeSuffixes, '').trim();
  if (coreName && coreName !== name && coreName.length >= 3) {
    seeds.push(coreName);
  }

  return filterGenericKeywords(seeds);
}

// ============================================================================
// SMART CONTENT EXTRACTION (fallback when AI is unavailable)
// ============================================================================

/** Known platforms organized by product type */
const PLATFORMS_BY_TYPE: Record<string, string[]> = {
  indicator: [
    'ThinkorSwim', 'TOS', 'TradingView', 'MetaTrader', 'MT4', 'MT5',
    'NinjaTrader', 'TradeStation', 'cTrader', 'Sierra Chart', 'MultiCharts',
    'MotiveWave', 'Webull', 'Interactive Brokers', 'Tastyworks', 'tastytrade',
  ],
  course: [
    'Udemy', 'Teachable', 'Thinkific', 'Kajabi', 'Gumroad', 'Podia',
    'Skillshare', 'Coursera', 'Hotmart',
  ],
  software: [
    'Windows', 'macOS', 'Linux', 'Chrome', 'Firefox', 'VSCode',
    'Adobe Creative Cloud', 'AWS', 'Azure', 'Docker',
  ],
  template: [
    'WordPress', 'Shopify', 'WooCommerce', 'Webflow', 'Squarespace', 'Wix',
    'Elementor', 'Divi', 'Figma', 'Canva', 'Photoshop', 'Illustrator',
    'After Effects', 'Premiere Pro', 'Final Cut', 'DaVinci Resolve',
  ],
  ebook: [
    'Kindle', 'Amazon', 'Audible', 'Apple Books', 'Gumroad', 'Lulu',
  ],
  other: [],
};

/** Product-type words that signal a named product (e.g., "Earnings Volatility Indicator") */
const PRODUCT_TYPE_WORDS = /\b(indicator|system|formula|strategy|method|scanner|course|toolkit|suite|plugin|tool|template|theme|framework|module|package)\b/i;

/**
 * Extract intelligence from page content using pattern matching.
 * Runs when AI is unavailable — reads the actual page text to find
 * creator names, platforms, related products, and distinctive phrases.
 */
function extractContentIntelligence(
  $: cheerio.CheerioAPI,
  productName: string,
  productType: string
): {
  creator: string | null;
  brand: string | null;
  platforms: string[];
  keywords: string[];
  brandIdentifiers: string[];
  uniquePhrases: string[];
} {
  // Get page text content (strip scripts/styles)
  $('script, style, noscript, iframe').remove();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const headings = $('h1, h2, h3').map((_, el) => $(el).text().trim()).get();
  const siteName = $('meta[property="og:site_name"]').attr('content')?.trim() || null;

  // ── Extract creator/author names ──────────────────────────────────
  const creator = extractCreatorName(bodyText, headings, productName);

  // ── Extract platforms ─────────────────────────────────────────────
  const platforms = extractPlatforms(bodyText, productType);

  // ── Extract related product names ─────────────────────────────────
  const relatedProducts = extractRelatedProducts(bodyText, productName);

  // ── Extract unique phrases from headings ──────────────────────────
  const uniquePhrases = extractUniquePhrases(headings, productName);

  // ── Build keywords from extracted entities ────────────────────────
  const keywords: string[] = [];
  const brandIdentifiers: string[] = [];

  // Creator is a brand identifier and keyword
  if (creator) {
    brandIdentifiers.push(creator);
    keywords.push(`${creator} ${productName.replace(PRODUCT_TYPE_WORDS, '').trim()}`);
  }

  // Site name is a brand identifier
  if (siteName && siteName.length > 2) {
    brandIdentifiers.push(siteName);
    if (!keywords.some(k => k.toLowerCase().includes(siteName.toLowerCase()))) {
      keywords.push(`${siteName} ${productName.replace(PRODUCT_TYPE_WORDS, '').trim()}`);
    }
  }

  // Platform + product combos
  for (const platform of platforms.slice(0, 2)) {
    keywords.push(`${productName.replace(PRODUCT_TYPE_WORDS, '').trim()} ${platform}`);
  }

  // Related products are keywords themselves
  for (const rp of relatedProducts.slice(0, 3)) {
    keywords.push(rp);
  }

  return {
    creator,
    brand: siteName,
    platforms,
    keywords: [...new Set(keywords)],
    brandIdentifiers: [...new Set(brandIdentifiers)],
    uniquePhrases,
  };
}

/**
 * Extract creator/author name from page text using common patterns.
 * Looks for: "X's [product]", "by X", "created by X", "developed by X", etc.
 */
function extractCreatorName(
  bodyText: string,
  headings: string[],
  productName: string
): string | null {
  const allText = [
    ...headings,
    bodyText.substring(0, 5000), // Focus on top of page
  ].join(' ');

  // Pattern 1: Possessive near product name — "Danielle Shay's ... indicator"
  // Matches: "FirstName LastName's" where name is 2+ capitalized words
  const possessivePatterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'s\b/g,
    /([A-Z][a-z]+(?:\s+[A-Z]\.?\s*[a-z]+)+)'s\b/g, // With middle initial
  ];

  for (const pattern of possessivePatterns) {
    const matches = [...allText.matchAll(pattern)];
    for (const match of matches) {
      const name = match[1]?.trim();
      if (name && name.length >= 5 && !isCommonPhrase(name)) {
        return name;
      }
    }
  }

  // Pattern 2: "by FirstName LastName" / "created by" / "developed by"
  const byPatterns = [
    /(?:created|developed|designed|built|made)\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
    /\bby\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
  ];

  for (const pattern of byPatterns) {
    const matches = [...allText.matchAll(pattern)];
    for (const match of matches) {
      const name = match[1]?.trim();
      if (name && name.length >= 5 && !isCommonPhrase(name)) {
        return name;
      }
    }
  }

  // Pattern 3: Check og:description and meta description for name patterns
  // These often have "AuthorName's product" or "by AuthorName"
  return null;
}

/** Filter out common English phrases that look like names but aren't */
function isCommonPhrase(name: string): boolean {
  const common = new Set([
    'The Next', 'This Tool', 'Your Account', 'Our Team', 'The Best',
    'New York', 'Los Angeles', 'San Francisco', 'United States',
    'Terms Of', 'Privacy Policy', 'Read More', 'Learn More', 'See More',
    'Sign Up', 'Log In', 'Get Started', 'Find Out', 'Check Out',
    'Hot Zone', 'Free Trial', 'Limited Time', 'Right Now',
  ]);
  return common.has(name);
}

/**
 * Detect known platforms mentioned in the page text.
 * Only checks platforms relevant to the product type.
 */
function extractPlatforms(bodyText: string, productType: string): string[] {
  const found: string[] = [];
  const textLower = bodyText.toLowerCase();
  const platforms = PLATFORMS_BY_TYPE[productType] || PLATFORMS_BY_TYPE['other'] || [];

  for (const platform of platforms) {
    if (textLower.includes(platform.toLowerCase())) {
      found.push(platform);
    }
  }

  return [...new Set(found)];
}

/**
 * Extract related product names mentioned on the page.
 * Looks for Capitalized Multi-Word phrases adjacent to product-type words.
 */
function extractRelatedProducts(bodyText: string, mainProductName: string): string[] {
  const results: string[] = [];
  const mainNameLower = mainProductName.toLowerCase();

  // Match patterns like "Earnings Volatility Indicator", "Quarterly Profits Formula"
  // Capitalized words followed by a product-type word
  const pattern = /\b((?:[A-Z][a-z]+\s+){1,4}(?:Indicator|System|Formula|Strategy|Method|Scanner|Course|Toolkit|Suite|Plugin|Tool|Template|Theme))\b/g;
  const matches = [...bodyText.matchAll(pattern)];

  for (const match of matches) {
    const name = match[1]?.trim();
    if (
      name &&
      name.length >= 8 &&
      name.toLowerCase() !== mainNameLower &&
      !results.some(r => r.toLowerCase() === name.toLowerCase())
    ) {
      results.push(name);
    }
  }

  return results.slice(0, 5);
}

/**
 * Extract distinctive phrases from headings — these often contain
 * unique marketing language or feature descriptions.
 */
function extractUniquePhrases(headings: string[], productName: string): string[] {
  const phrases: string[] = [];
  const productWords = new Set(productName.toLowerCase().split(/\s+/));

  for (const heading of headings) {
    const cleaned = heading.trim();
    // Skip very short or very long headings
    if (cleaned.length < 10 || cleaned.length > 120) continue;
    // Skip headings that are just the product name
    if (cleaned.toLowerCase() === productName.toLowerCase()) continue;
    // Keep headings that reference the product or are distinctive
    const words = cleaned.toLowerCase().split(/\s+/);
    const hasProductWord = words.some(w => productWords.has(w) && w.length > 3);
    if (hasProductWord && cleaned.length >= 15) {
      phrases.push(cleaned);
    }
  }

  return phrases.slice(0, 5);
}

/**
 * Build a factual, DMCA-appropriate description from extracted entities.
 * Template: "{Name} is a {type} [for {platform}] [created by {creator}] [of {brand}]."
 */
function buildFactualDescription(
  productName: string,
  productType: string,
  creator: string | null,
  brand: string | null,
  platforms: string[]
): string | null {
  if (!productName) return null;

  const typeLabels: Record<string, string> = {
    indicator: 'trading indicator',
    course: 'educational course',
    software: 'software product',
    template: 'digital template',
    ebook: 'digital publication',
    other: 'digital product',
  };

  const typeLabel = typeLabels[productType] || typeLabels['other'];

  // First sentence: what it is, who made it
  let sentence1 = `${productName} is a ${typeLabel}`;
  if (platforms.length > 0) {
    sentence1 += ` for ${platforms[0]}`;
  }
  if (creator && brand) {
    sentence1 += ` created by ${creator} of ${brand}`;
  } else if (creator) {
    sentence1 += ` created by ${creator}`;
  } else if (brand) {
    sentence1 += ` by ${brand}`;
  }
  sentence1 += '.';

  // Second sentence: note it as commercially sold
  const sentence2 = `It is a commercially sold, copyrighted product available for purchase from its official source.`;

  return `${sentence1} ${sentence2}`;
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
