/**
 * WHOIS API Client
 *
 * Fetches domain registration and hosting provider information
 * using the WhoisXML API service.
 *
 * Includes in-memory cache with 30-day TTL to avoid redundant API calls
 * on rescans. Cache is keyed by normalized domain name.
 */

// ── In-Memory Cache (30-day TTL) ─────────────────────────────────────
const WHOIS_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEntry {
  record: WhoisRecord;
  fetchedAt: number; // Date.now() timestamp
}

const whoisCache = new Map<string, CacheEntry>();

function getCachedWhois(domain: string): WhoisRecord | null {
  const entry = whoisCache.get(domain);
  if (!entry) return null;

  const age = Date.now() - entry.fetchedAt;
  if (age > WHOIS_CACHE_TTL_MS) {
    whoisCache.delete(domain);
    return null;
  }

  return entry.record;
}

function setCachedWhois(domain: string, record: WhoisRecord): void {
  whoisCache.set(domain, { record, fetchedAt: Date.now() });

  // Evict oldest entries if cache grows too large (>500 domains)
  if (whoisCache.size > 500) {
    const oldest = [...whoisCache.entries()]
      .sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)
      .slice(0, 100);
    for (const [key] of oldest) {
      whoisCache.delete(key);
    }
  }
}

/** Get cache stats for monitoring */
export function getWhoisCacheStats(): { size: number; hitRate: string } {
  return {
    size: whoisCache.size,
    hitRate: _cacheHits + _cacheMisses > 0
      ? `${((_cacheHits / (_cacheHits + _cacheMisses)) * 100).toFixed(1)}%`
      : 'N/A',
  };
}

let _cacheHits = 0;
let _cacheMisses = 0;

export interface WhoisRecord {
  domain: string;
  registrant_organization: string | null;
  registrant_country: string | null;
  registrant_country_code: string | null;
  registrar_name: string | null;
  registrar_abuse_email: string | null;
  registrar_abuse_phone: string | null;
  created_date: string | null;
  updated_date: string | null;
  expires_date: string | null;
  name_servers: string[];
  status: string | null;
  estimated_domain_age_days: number | null;
}

interface WhoisAPIResponse {
  WhoisRecord: {
    domainName: string;
    registrant?: {
      organization?: string;
      country?: string;
      countryCode?: string;
    };
    registrarName?: string;
    contactEmail?: string;
    customField2Value?: string; // Registrar phone
    createdDate?: string;
    updatedDate?: string;
    expiresDate?: string;
    nameServers?: {
      hostNames?: string[];
    };
    status?: string;
    estimatedDomainAge?: number;
  };
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    // Remove protocol if present
    let domain = url.replace(/^https?:\/\//, '');

    // Remove www. if present
    domain = domain.replace(/^www\./, '');

    // Remove path, query, hash
    domain = domain.split('/')[0]!;
    domain = domain.split('?')[0]!;
    domain = domain.split('#')[0]!;

    // Remove port if present
    domain = domain.split(':')[0]!;

    // Validate domain format (basic check)
    if (!domain || !domain.includes('.')) {
      return null;
    }

    return domain.toLowerCase();
  } catch (error) {
    console.error('[WHOIS] Error extracting domain from URL:', url, error);
    return null;
  }
}

/**
 * Lookup WHOIS information for a domain
 */
export async function lookupWhois(url: string): Promise<WhoisRecord | null> {
  const apiKey = process.env.WHOIS_API_KEY;

  if (!apiKey) {
    console.warn('[WHOIS] API key not configured, skipping WHOIS lookup');
    return null;
  }

  const domain = extractDomain(url);

  if (!domain) {
    console.warn('[WHOIS] Could not extract domain from URL:', url);
    return null;
  }

  // Check cache first
  const cached = getCachedWhois(domain);
  if (cached) {
    _cacheHits++;
    console.log(`[WHOIS] Cache HIT for ${domain} (${whoisCache.size} cached, ${getWhoisCacheStats().hitRate} hit rate)`);
    return cached;
  }
  _cacheMisses++;

  try {
    const apiUrl = new URL('https://www.whoisxmlapi.com/whoisserver/WhoisService');
    apiUrl.searchParams.set('apiKey', apiKey);
    apiUrl.searchParams.set('domainName', domain);
    apiUrl.searchParams.set('outputFormat', 'JSON');

    console.log('[WHOIS] Fetching WHOIS data for:', domain);

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[WHOIS] API request failed:', response.status, response.statusText);
      return null;
    }

    const data: WhoisAPIResponse = await response.json();

    if (!data.WhoisRecord) {
      console.warn('[WHOIS] No WHOIS record found for:', domain);
      return null;
    }

    const record = data.WhoisRecord;

    // Extract and normalize the data
    const whoisRecord: WhoisRecord = {
      domain: record.domainName || domain,
      registrant_organization: record.registrant?.organization || null,
      registrant_country: record.registrant?.country || null,
      registrant_country_code: record.registrant?.countryCode || null,
      registrar_name: record.registrarName || null,
      registrar_abuse_email: record.contactEmail || null,
      registrar_abuse_phone: record.customField2Value || null,
      created_date: record.createdDate || null,
      updated_date: record.updatedDate || null,
      expires_date: record.expiresDate || null,
      name_servers: record.nameServers?.hostNames || [],
      status: record.status || null,
      estimated_domain_age_days: record.estimatedDomainAge || null,
    };

    console.log('[WHOIS] Successfully fetched WHOIS data for:', domain);

    // Cache the result
    setCachedWhois(domain, whoisRecord);

    return whoisRecord;
  } catch (error: any) {
    console.error('[WHOIS] Error fetching WHOIS data:', error);
    return null;
  }
}

/**
 * Batch lookup WHOIS information for multiple URLs (sequential with rate limiting)
 * Use this for small batches during scans
 */
export async function batchLookupWhois(
  urls: string[],
  delayMs: number = 1000
): Promise<Map<string, WhoisRecord | null>> {
  const results = new Map<string, WhoisRecord | null>();

  for (const url of urls) {
    const whoisData = await lookupWhois(url);
    results.set(url, whoisData);

    // Rate limiting: wait between requests
    if (delayMs > 0 && urls.indexOf(url) < urls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Bulk WHOIS API - Submit domains for async processing
 * More cost-effective for large batches (100+ domains)
 * Returns requestId to download results later
 */
export async function submitBulkWhoisRequest(urls: string[]): Promise<string | null> {
  const apiKey = process.env.WHOIS_API_KEY;

  if (!apiKey) {
    console.warn('[WHOIS Bulk] API key not configured');
    return null;
  }

  // Extract unique domains from URLs
  const domains = Array.from(
    new Set(urls.map((url) => extractDomain(url)).filter((d): d is string => d !== null))
  );

  if (domains.length === 0) {
    console.warn('[WHOIS Bulk] No valid domains to process');
    return null;
  }

  try {
    console.log(`[WHOIS Bulk] Submitting ${domains.length} domains for processing`);

    const response = await fetch(
      'https://www.whoisxmlapi.com/BulkWhoisLookup/bulkServices/bulkWhois',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          domains,
          outputFormat: 'JSON',
        }),
      }
    );

    if (!response.ok) {
      console.error('[WHOIS Bulk] Submit request failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.requestId) {
      console.log(`[WHOIS Bulk] Request submitted successfully. ID: ${data.requestId}`);
      return data.requestId;
    } else {
      console.error('[WHOIS Bulk] No requestId returned:', data);
      return null;
    }
  } catch (error: any) {
    console.error('[WHOIS Bulk] Error submitting bulk request:', error);
    return null;
  }
}

/**
 * Download results from a bulk WHOIS request
 * Returns CSV data that needs to be parsed
 */
export async function downloadBulkWhoisResults(requestId: string): Promise<string | null> {
  const apiKey = process.env.WHOIS_API_KEY;

  if (!apiKey) {
    console.warn('[WHOIS Bulk] API key not configured');
    return null;
  }

  try {
    console.log(`[WHOIS Bulk] Downloading results for request: ${requestId}`);

    const response = await fetch(
      'https://www.whoisxmlapi.com/BulkWhoisLookup/bulkServices/download',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          requestId,
          searchType: 'all', // or 'noError' to skip domains with errors
        }),
      }
    );

    if (!response.ok) {
      console.error('[WHOIS Bulk] Download failed:', response.status);
      return null;
    }

    const csvData = await response.text();

    console.log('[WHOIS Bulk] Results downloaded successfully');

    return csvData;
  } catch (error: any) {
    console.error('[WHOIS Bulk] Error downloading results:', error);
    return null;
  }
}

/**
 * Parse CSV results from bulk WHOIS API
 * Converts CSV to WhoisRecord objects
 */
export function parseBulkWhoisCSV(csvData: string): Map<string, WhoisRecord> {
  const results = new Map<string, WhoisRecord>();

  try {
    const lines = csvData.split('\r\n');

    // Skip header row
    if (lines.length < 2) {
      console.warn('[WHOIS Bulk] No data rows in CSV');
      return results;
    }

    // Parse each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      // Split CSV (handling quoted values)
      const columns = line.split(',').map((col) => col.replace(/^"|"$/g, ''));

      if (columns.length < 10) continue; // Skip invalid rows

      const domain = columns[0];
      if (!domain) continue;

      const record: WhoisRecord = {
        domain,
        registrant_organization: columns[18] || null,
        registrant_country: columns[27] || null,
        registrant_country_code: columns[27] || null, // CSV uses full country name
        registrar_name: columns[1] || null,
        registrar_abuse_email: columns[2] || null,
        registrar_abuse_phone: null, // Not in basic CSV
        created_date: columns[6] || null,
        updated_date: columns[7] || null,
        expires_date: columns[8] || null,
        name_servers: columns[5] ? columns[5].split('|').filter((ns) => ns) : [],
        status: columns[12] || null,
        estimated_domain_age_days: null, // Calculate if needed
      };

      results.set(domain, record);
    }

    console.log(`[WHOIS Bulk] Parsed ${results.size} records from CSV`);
  } catch (error: any) {
    console.error('[WHOIS Bulk] Error parsing CSV:', error);
  }

  return results;
}
