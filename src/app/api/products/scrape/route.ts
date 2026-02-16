import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { analyzeProductPage } from '@/lib/ai/product-analyzer';

export async function POST(request: Request) {
  try {
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

        // Merge AI-extracted keywords with scraped keywords
        if (aiData.keywords && aiData.keywords.length > 0) {
          const allKeywords = [...new Set([...extractedData.keywords, ...aiData.keywords])];
          extractedData.keywords = allKeywords.slice(0, 15); // Limit to 15 total
        }
      } catch (aiError) {
        console.error('AI analysis failed, continuing with basic scraping:', aiError);
        // Continue without AI data if it fails
      }
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
    () => $('title').text().split('|')[0].split('-')[0].trim(),
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
  const strategies = [
    () => $('meta[property="product:price:amount"]').attr('content'),
    () => $('meta[property="og:price:amount"]').attr('content'),
    () => $('[itemtype*="schema.org/Product"] [itemprop="price"]').attr('content'),
    () => $('[itemtype*="schema.org/Product"] [itemprop="price"]').text(),
    () => $('.price').first().text(),
    () => $('[class*="price"]').first().text(),
    () => $('[data-price]').first().attr('data-price'),
  ];

  for (const strategy of strategies) {
    const result = strategy();
    if (result) {
      // Extract numeric value from price string
      const match = result.toString().match(/[\d,]+\.?\d*/);
      if (match) {
        const price = parseFloat(match[0].replace(',', ''));
        if (price > 0) {
          return price;
        }
      }
    }
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
    { pattern: /(software|app|application|program|tool)/i, type: 'software' },
    { pattern: /(ebook|book|pdf|guide|manual)/i, type: 'ebook' },
    { pattern: /(video|movie|film)/i, type: 'video' },
    { pattern: /(audio|music|podcast|sound)/i, type: 'audio' },
    { pattern: /(template|theme|design)/i, type: 'template' },
    { pattern: /(plugin|extension|addon)/i, type: 'plugin' },
    { pattern: /(service|subscription)/i, type: 'service' },
  ];

  for (const { pattern, type } of typePatterns) {
    if (pattern.test(content)) {
      return type;
    }
  }

  return 'digital_product';
}
