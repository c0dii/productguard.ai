/**
 * Page Evidence Capture
 *
 * Captures a full snapshot of an infringing page for legal defense:
 * 1. Fetches raw HTML and stores it in Supabase Storage
 * 2. Extracts page title, text content, and all links via cheerio
 * 3. Submits to Wayback Machine for independent third-party archival
 *
 * Zero external paid services needed.
 */

import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

export interface PageCapture {
  page_title: string;
  page_text: string; // Visible text content
  page_links: Array<{ href: string; text: string }>;
  page_html_hash: string; // SHA256 of raw HTML
  html_storage_path: string | null; // Supabase Storage path
  wayback_url: string | null; // Wayback Machine archive URL
  captured_at: string;
}

/**
 * Capture full page evidence for an infringing URL.
 * Designed to be called during verification (non-blocking failures).
 */
export async function capturePageEvidence(
  url: string,
  userId: string,
  infringementId: string
): Promise<PageCapture> {
  const now = new Date().toISOString();

  let rawHtml = '';
  let pageTitle = '';
  let pageText = '';
  let pageLinks: Array<{ href: string; text: string }> = [];
  let pageHtmlHash = '';
  let htmlStoragePath: string | null = null;
  let waybackUrl: string | null = null;

  // Step 1: Fetch the page HTML
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    clearTimeout(timeout);

    if (response.ok) {
      rawHtml = await response.text();
      pageHtmlHash = crypto.createHash('sha256').update(rawHtml).digest('hex');
      console.log(`[Evidence Capture] Fetched ${rawHtml.length} bytes of HTML from ${url}`);
    } else {
      console.warn(`[Evidence Capture] HTTP ${response.status} fetching ${url}`);
    }
  } catch (err) {
    console.error('[Evidence Capture] Failed to fetch page:', err);
  }

  // Step 2: Parse with cheerio to extract text, title, links
  if (rawHtml) {
    try {
      const $ = cheerio.load(rawHtml);

      // Remove scripts, styles, and hidden elements
      $('script, style, noscript, iframe, svg').remove();

      pageTitle = $('title').text().trim()
        || $('meta[property="og:title"]').attr('content')?.trim()
        || '';

      // Get visible text (limited to 50KB to avoid bloat)
      pageText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 50000);

      // Extract all links with their anchor text
      const links: Array<{ href: string; text: string }> = [];
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          // Resolve relative URLs
          let fullUrl = href;
          try {
            fullUrl = new URL(href, url).toString();
          } catch {
            // Keep as-is if URL parsing fails
          }
          links.push({ href: fullUrl, text: text.slice(0, 200) });
        }
      });
      pageLinks = links.slice(0, 500); // Cap at 500 links

      console.log(`[Evidence Capture] Extracted: title="${pageTitle.slice(0, 60)}", ${pageText.length} chars text, ${pageLinks.length} links`);
    } catch (err) {
      console.error('[Evidence Capture] Cheerio parse error:', err);
    }
  }

  // Step 3: Store HTML in Supabase Storage
  if (rawHtml) {
    try {
      const supabase = createAdminClient();
      const storagePath = `${userId}/${infringementId}/page-${Date.now()}.html`;

      const { error } = await supabase.storage
        .from('evidence-snapshots')
        .upload(storagePath, rawHtml, {
          contentType: 'text/html',
          upsert: false,
        });

      if (!error) {
        htmlStoragePath = storagePath;
        console.log(`[Evidence Capture] HTML stored at: ${storagePath}`);
      } else {
        console.error('[Evidence Capture] Storage upload error:', error);
      }
    } catch (err) {
      console.error('[Evidence Capture] Storage error:', err);
    }
  }

  // Step 4: Submit to Wayback Machine for third-party archival
  try {
    const waybackResponse = await fetch(`https://web.archive.org/save/${url}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'ProductGuard.ai Evidence Archiver',
      },
      redirect: 'manual', // Don't follow redirects - the Location header has the archive URL
    });

    // The Wayback Machine returns a redirect to the archived page
    const archiveLocation = waybackResponse.headers.get('location')
      || waybackResponse.headers.get('content-location');

    if (archiveLocation) {
      waybackUrl = archiveLocation;
      console.log(`[Evidence Capture] Wayback Machine archive: ${waybackUrl}`);
    } else if (waybackResponse.ok) {
      // Sometimes it returns 200 with the archived page directly
      waybackUrl = `https://web.archive.org/web/${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}/${url}`;
      console.log(`[Evidence Capture] Wayback Machine submitted (constructed URL): ${waybackUrl}`);
    } else {
      console.warn(`[Evidence Capture] Wayback Machine returned ${waybackResponse.status}`);
    }
  } catch (err) {
    console.warn('[Evidence Capture] Wayback Machine submission failed:', err);
    // Non-critical - continue without it
  }

  return {
    page_title: pageTitle,
    page_text: pageText,
    page_links: pageLinks,
    page_html_hash: pageHtmlHash,
    html_storage_path: htmlStoragePath,
    wayback_url: waybackUrl,
    captured_at: now,
  };
}
