// ============================================================
// Discovery Engine — Owner Identifier
// src/lib/discovery-engine/owner-identifier.ts
//
// Multi-strategy lookup to find the legitimate owner of a
// pirated digital product. Cascades through:
//   1. Google search for official product page
//   2. Platform-specific scraping (Udemy, Gumroad, ThemeForest)
//   3. Website scrape + AI contact extraction
//   4. WHOIS lookup
//   5. Social media discovery
// ============================================================

import type { ExtractedProduct, IdentifiedOwner } from './types';
import type { SerpClient } from '@/lib/scan-engine/serp-client';
import { generateCompletion, AI_MODELS } from '@/lib/ai/client';
import { infrastructureProfiler } from '@/lib/enforcement/infrastructure-profiler';

interface OwnerLookupStats {
  serp_calls: number;
  ai_calls: number;
  whois_calls: number;
}

/**
 * Attempt to identify the legitimate owner of an extracted product.
 * Returns null if owner cannot be found with reasonable confidence.
 */
export async function identifyOwner(
  product: ExtractedProduct,
  serpClient: SerpClient,
): Promise<{ owner: IdentifiedOwner | null; stats: OwnerLookupStats }> {
  const stats: OwnerLookupStats = { serp_calls: 0, ai_calls: 0, whois_calls: 0 };

  try {
    // Step 1: Google search for official product page
    const officialResult = await findOfficialPage(product, serpClient);
    stats.serp_calls++;

    if (!officialResult) {
      return { owner: null, stats };
    }

    // Step 2: Extract owner info from official page
    let ownerInfo = await extractOwnerFromPage(officialResult.url, product);
    stats.ai_calls++;

    // Step 3: WHOIS if we have a standalone domain (not a marketplace)
    let whoisEmail: string | null = null;
    let whoisOrg: string | null = null;
    const isStandaloneDomain = !isKnownPlatform(officialResult.url);

    if (isStandaloneDomain) {
      try {
        const infra = await infrastructureProfiler.profile(officialResult.url);
        stats.whois_calls++;

        whoisEmail = infra.admin_email || infra.abuse_contact || null;
        whoisOrg = infra.whois_data?.registrant?.organization
          || infra.whois_data?.registrant?.name
          || null;

        // Fill in gaps from WHOIS
        if (!ownerInfo.owner_email && whoisEmail && !isGenericEmail(whoisEmail)) {
          ownerInfo.owner_email = whoisEmail;
          ownerInfo.contact_source = 'whois';
        }
        if (!ownerInfo.company_name && whoisOrg) {
          ownerInfo.company_name = whoisOrg;
        }
        if (!ownerInfo.company_domain) {
          ownerInfo.company_domain = extractDomain(officialResult.url);
        }
      } catch {
        // WHOIS failure is non-fatal
      }
    }

    // Step 4: Social profile discovery (only if we have a name/company)
    const socialSearchName = ownerInfo.owner_name || ownerInfo.company_name;
    if (socialSearchName) {
      if (serpClient.isAvailable) {
        const socials = await findSocialProfiles(
          socialSearchName,
          serpClient,
        );
        stats.serp_calls++;

        if (socials.twitter) ownerInfo.social_twitter = socials.twitter;
        if (socials.linkedin) ownerInfo.social_linkedin = socials.linkedin;
        if (socials.instagram) ownerInfo.social_instagram = socials.instagram;
        if (socials.facebook) ownerInfo.social_facebook = socials.facebook;
      }
    }

    // Must have at minimum: product name + some way to contact (email or social)
    if (!ownerInfo.owner_email && !ownerInfo.social_twitter && !ownerInfo.social_linkedin) {
      return { owner: null, stats };
    }

    // Calculate identification confidence
    const confidence = calculateIdentificationConfidence(ownerInfo, officialResult, whoisOrg);

    const owner: IdentifiedOwner = {
      extracted: product,
      product_url: officialResult.url,
      product_price: officialResult.price || product.price_hint,
      company_name: ownerInfo.company_name || product.product_name,
      owner_name: ownerInfo.owner_name,
      owner_email: ownerInfo.owner_email,
      company_domain: ownerInfo.company_domain,
      social_twitter: ownerInfo.social_twitter,
      social_instagram: ownerInfo.social_instagram,
      social_facebook: ownerInfo.social_facebook,
      social_linkedin: ownerInfo.social_linkedin,
      contact_source: ownerInfo.contact_source,
      identification_confidence: confidence,
    };

    return { owner, stats };
  } catch (error) {
    console.error(`[OwnerIdentifier] Failed for "${product.product_name}":`, error);
    return { owner: null, stats };
  }
}

// ── Step 1: Find Official Product Page ──────────────────────

interface OfficialPageResult {
  url: string;
  title: string;
  platform: string | null;
  price: string | null;
}

const PIRACY_DOMAINS = new Set([
  'nulled.to', 'cracked.io', 'gpldl.com', 'babiato.co',
  'courseclub.me', 'freecourseweb.com', 'getfreecourses.co',
  'filecr.com', 'getintopc.com', 'pdfdrive.com', 'libgen.is',
  'libgen.rs', 'paidcoursesforfree.com', '1337x.to',
  'thepiratebay.org', 'torrentgalaxy.to',
]);

const SKIP_DOMAINS = new Set([
  'reddit.com', 'quora.com', 'youtube.com', 'facebook.com',
  'twitter.com', 'linkedin.com', 'instagram.com', 'pinterest.com',
  'wikipedia.org',
]);

async function findOfficialPage(
  product: ExtractedProduct,
  serpClient: SerpClient,
): Promise<OfficialPageResult | null> {
  if (!serpClient.isAvailable) return null;

  const query = `"${product.product_name}" official OR buy OR pricing -free -download -crack -torrent -nulled`;
  const response = await serpClient.search({ query, num: 10 });

  for (const result of response.organic_results) {
    const domain = extractDomain(result.link);
    if (!domain) continue;

    // Skip piracy and social media sites
    if (PIRACY_DOMAINS.has(domain) || SKIP_DOMAINS.has(domain)) continue;

    // Prefer known legitimate platforms
    const platform = identifyPlatform(result.link);

    // Extract price hint from snippet
    const priceMatch = result.snippet.match(/\$\d+(?:\.\d{2})?/);
    const price = priceMatch?.[0] || null;

    return {
      url: result.link,
      title: result.title,
      platform,
      price,
    };
  }

  return null;
}

// ── Step 2: Extract Owner from Page ─────────────────────────

interface OwnerInfo {
  owner_name: string | null;
  owner_email: string | null;
  company_name: string | null;
  company_domain: string | null;
  contact_source: string;
  social_twitter: string | null;
  social_instagram: string | null;
  social_facebook: string | null;
  social_linkedin: string | null;
}

interface AIContactExtraction {
  owner_name: string | null;
  company_name: string | null;
  email: string | null;
  twitter: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
}

async function extractOwnerFromPage(
  url: string,
  product: ExtractedProduct,
): Promise<OwnerInfo> {
  const defaultOwner: OwnerInfo = {
    owner_name: null,
    owner_email: null,
    company_name: null,
    company_domain: extractDomain(url),
    contact_source: 'unknown',
    social_twitter: null,
    social_instagram: null,
    social_facebook: null,
    social_linkedin: null,
  };

  try {
    // Fetch page content
    const pageContent = await fetchPageText(url);
    if (!pageContent) return defaultOwner;

    // Use AI to extract contact information
    const response = await generateCompletion<AIContactExtraction>(
      CONTACT_EXTRACTION_PROMPT,
      `Product we're looking for: "${product.product_name}" (type: ${product.product_type})

Page URL: ${url}
Page content (truncated):
${pageContent.substring(0, 4000)}`,
      {
        model: AI_MODELS.MINI,
        temperature: 0.1,
        maxTokens: 500,
        responseFormat: 'json',
      }
    );

    const data = response.data;

    return {
      owner_name: data.owner_name || null,
      owner_email: data.email || null,
      company_name: data.company_name || null,
      company_domain: extractDomain(url),
      contact_source: identifyPlatform(url) ? 'platform_profile' : 'website_scrape',
      social_twitter: data.twitter || null,
      social_instagram: data.instagram || null,
      social_facebook: data.facebook || null,
      social_linkedin: data.linkedin || null,
    };
  } catch (error) {
    console.error(`[OwnerIdentifier] Page extraction failed for ${url}:`, error);
    return defaultOwner;
  }
}

const CONTACT_EXTRACTION_PROMPT = `You are extracting contact information from a web page to identify the creator/owner of a digital product.

Extract ONLY information explicitly found on the page. Do NOT guess or fabricate data.

Return JSON:
{
  "owner_name": "Full name of creator/owner/instructor, or null",
  "company_name": "Company/brand name, or null",
  "email": "Contact email found on page (from mailto:, contact form, footer, etc.), or null",
  "twitter": "Twitter/X profile URL, or null",
  "instagram": "Instagram profile URL, or null",
  "facebook": "Facebook page URL, or null",
  "linkedin": "LinkedIn profile URL, or null"
}

Look for:
- Author/instructor/creator names
- "Contact us" or "About" sections
- mailto: links in page source
- Social media links in headers/footers
- Company name in copyright notices`;

// ── Step 4: Social Profile Discovery ────────────────────────

interface SocialProfiles {
  twitter: string | null;
  linkedin: string | null;
  instagram: string | null;
  facebook: string | null;
}

async function findSocialProfiles(
  nameOrCompany: string,
  serpClient: SerpClient,
): Promise<SocialProfiles> {
  const profiles: SocialProfiles = {
    twitter: null,
    linkedin: null,
    instagram: null,
    facebook: null,
  };

  if (!serpClient.isAvailable) return profiles;

  const query = `"${nameOrCompany}" site:twitter.com OR site:linkedin.com OR site:instagram.com`;
  const response = await serpClient.search({ query, num: 10 });

  for (const result of response.organic_results) {
    const link = result.link.toLowerCase();
    if (link.includes('twitter.com/') || link.includes('x.com/')) {
      if (!profiles.twitter) profiles.twitter = result.link;
    } else if (link.includes('linkedin.com/in/') || link.includes('linkedin.com/company/')) {
      if (!profiles.linkedin) profiles.linkedin = result.link;
    } else if (link.includes('instagram.com/')) {
      if (!profiles.instagram) profiles.instagram = result.link;
    } else if (link.includes('facebook.com/')) {
      if (!profiles.facebook) profiles.facebook = result.link;
    }
  }

  return profiles;
}

// ── Helpers ─────────────────────────────────────────────────

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

const KNOWN_PLATFORMS: Record<string, string> = {
  'udemy.com': 'Udemy',
  'gumroad.com': 'Gumroad',
  'themeforest.net': 'ThemeForest',
  'codecanyon.net': 'CodeCanyon',
  'teachable.com': 'Teachable',
  'kajabi.com': 'Kajabi',
  'podia.com': 'Podia',
  'thinkific.com': 'Thinkific',
  'skillshare.com': 'Skillshare',
  'creativemarket.com': 'Creative Market',
  'envato.com': 'Envato',
  'mql5.com': 'MQL5',
  'tradingview.com': 'TradingView',
  'payhip.com': 'Payhip',
  'stan.store': 'Stan Store',
  'whop.com': 'Whop',
  'leanpub.com': 'Leanpub',
};

function identifyPlatform(url: string): string | null {
  const domain = extractDomain(url);
  if (!domain) return null;

  for (const [platformDomain, platformName] of Object.entries(KNOWN_PLATFORMS)) {
    if (domain.includes(platformDomain)) return platformName;
  }
  return null;
}

function isKnownPlatform(url: string): boolean {
  return identifyPlatform(url) !== null;
}

function isGenericEmail(email: string): boolean {
  const generic = ['info@', 'admin@', 'noreply@', 'no-reply@', 'support@', 'help@', 'webmaster@'];
  return generic.some(prefix => email.toLowerCase().startsWith(prefix));
}

/**
 * Fetch page text content (HTML stripped to text).
 * Uses a 10-second timeout.
 */
async function fetchPageText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProductGuardBot/1.0)',
        Accept: 'text/html',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Strip HTML tags, scripts, styles — crude but sufficient for AI analysis
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000); // Limit size for AI
  } catch {
    return null;
  }
}

/**
 * Calculate identification confidence based on available data.
 */
function calculateIdentificationConfidence(
  info: OwnerInfo,
  officialResult: OfficialPageResult,
  whoisOrg: string | null,
): number {
  let confidence = 0.3; // Base: we found an official page

  if (officialResult.platform) confidence += 0.15; // Known marketplace
  if (info.owner_email && !isGenericEmail(info.owner_email)) confidence += 0.2;
  if (info.owner_email && isGenericEmail(info.owner_email)) confidence += 0.05;
  if (info.owner_name) confidence += 0.1;
  if (info.company_name) confidence += 0.05;
  if (whoisOrg) confidence += 0.05;
  if (info.social_twitter || info.social_linkedin) confidence += 0.05;
  if (officialResult.price) confidence += 0.05;

  return Math.min(1, confidence);
}
