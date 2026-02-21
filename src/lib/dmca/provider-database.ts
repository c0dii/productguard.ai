/**
 * Expanded DMCA Provider Database
 *
 * Comprehensive database of platform DMCA contacts, including email addresses,
 * web form URLs, and platform-specific requirements.
 *
 * IMPORTANT: Each provider has a `verified` flag:
 *   true  = confirmed from official source (terms of service, copyright policy page, or US Copyright Office)
 *   false = best-guess based on common patterns — verify before relying on it
 *
 * Last audited: 2026-02-20
 */

export interface ProviderInfo {
  name: string;
  dmcaEmail: string | null;
  dmcaFormUrl: string | null;
  agentName: string;
  requirements: string;
  /** Whether this provider prefers web form over email */
  prefersWebForm: boolean;
  /** Whether this contact info has been verified from an official source */
  verified: boolean;
}

export type EnforcementTargetType = 'platform' | 'hosting' | 'registrar' | 'search_engine';

export interface EnforcementTarget {
  type: EnforcementTargetType;
  provider: ProviderInfo;
  step: number; // 1 = first attempt, 2 = escalation, 3 = fallback
  recommended: boolean;
  reason: string; // Why this target is suggested
  deadline_days: number; // Suggested wait time before escalating
}

const PROVIDERS: Record<string, ProviderInfo> = {
  // ── Major Platforms ──────────────────────────────────────────────
  youtube: {
    name: 'YouTube',
    dmcaEmail: 'copyright@youtube.com',
    dmcaFormUrl: 'https://www.youtube.com/copyright_complaint_page',
    agentName: 'YouTube Copyright Team',
    requirements: 'Include video URLs with timestamps for specific content. Web form submission is strongly preferred.',
    prefersWebForm: true,
    verified: true,
  },
  google: {
    name: 'Google',
    dmcaEmail: null, // Google does NOT accept DMCA via email — web form only
    dmcaFormUrl: 'https://support.google.com/legal/troubleshooter/1114905',
    agentName: 'Google DMCA Agent',
    requirements: 'Google only accepts DMCA submissions via their Legal Troubleshooter web form. Include specific URLs to be removed from search results.',
    prefersWebForm: true,
    verified: true,
  },
  telegram: {
    name: 'Telegram',
    dmcaEmail: 'dmca@telegram.org',
    dmcaFormUrl: 'https://telegram.org/dmca',
    agentName: 'Telegram DMCA Agent',
    requirements: 'Email dmca@telegram.org. Include the channel/group username, invite link, or specific message links. Telegram is not US-based — enforcement may differ from US platforms.',
    prefersWebForm: false,
    verified: true, // Confirmed on telegram.org/dmca
  },
  discord: {
    name: 'Discord',
    dmcaEmail: 'copyright@discord.com',
    dmcaFormUrl: 'https://dis.gd/copyright',
    agentName: 'Discord Trust & Safety',
    requirements: 'Use the web form or email copyright@discord.com. Include server ID, channel ID, and specific message links.',
    prefersWebForm: true,
    verified: true, // Listed in Discord Terms of Service
  },

  // ── Cloud Storage / File Hosting ─────────────────────────────────
  mega: {
    name: 'MEGA',
    dmcaEmail: 'copyright@mega.nz',
    dmcaFormUrl: 'https://mega.nz/takedown',
    agentName: 'MEGA Copyright Team',
    requirements: 'Use the web form (preferred). Include exact file/folder links.',
    prefersWebForm: true,
    verified: true,
  },
  mediafire: {
    name: 'MediaFire',
    dmcaEmail: 'dmca@mediafire.com',
    dmcaFormUrl: 'https://www.mediafire.com/policies/dmca.php',
    agentName: 'MediaFire Copyright Agent',
    requirements: 'Email dmca@mediafire.com. Include direct file download links.',
    prefersWebForm: false,
    verified: false,
  },
  dropbox: {
    name: 'Dropbox',
    dmcaEmail: 'copyright@dropbox.com',
    dmcaFormUrl: 'https://www.dropbox.com/copyright/dmca',
    agentName: 'Dropbox Copyright Agent',
    requirements: 'Use web form or email copyright@dropbox.com. Include shared file/folder URLs.',
    prefersWebForm: true,
    verified: false,
  },
  'drive.google': {
    name: 'Google Drive',
    dmcaEmail: null, // Google does NOT accept DMCA via email — web form only
    dmcaFormUrl: 'https://support.google.com/legal/troubleshooter/1114905',
    agentName: 'Google DMCA Agent',
    requirements: 'Google only accepts DMCA submissions via their Legal Troubleshooter web form. Include shared drive file/folder links.',
    prefersWebForm: true,
    verified: true,
  },

  // ── Infrastructure / Hosting ─────────────────────────────────────
  cloudflare: {
    name: 'Cloudflare',
    dmcaEmail: 'dmca@cloudflare.com',
    dmcaFormUrl: 'https://abuse.cloudflare.com',
    agentName: 'Cloudflare Trust & Safety',
    requirements: 'Cloudflare is a CDN — the notice will be forwarded to the actual hosting provider. Use the abuse form (preferred).',
    prefersWebForm: true,
    verified: true,
  },
  namecheap: {
    name: 'Namecheap',
    dmcaEmail: 'abuse@namecheap.com',
    dmcaFormUrl: 'https://www.namecheap.com/support/abuse-form/',
    agentName: 'Namecheap Abuse Team',
    requirements: 'Include domain name and specific infringing URLs. As a registrar, they may forward to the actual host.',
    prefersWebForm: true,
    verified: false,
  },
  godaddy: {
    name: 'GoDaddy',
    dmcaEmail: 'copyright@godaddy.com',
    dmcaFormUrl: 'https://supportcenter.godaddy.com/AbuseReport',
    agentName: 'GoDaddy Abuse Team',
    requirements: 'Include domain name and specific infringing URLs.',
    prefersWebForm: true,
    verified: false,
  },
  digitalocean: {
    name: 'DigitalOcean',
    dmcaEmail: 'abuse@digitalocean.com',
    dmcaFormUrl: null,
    agentName: 'DigitalOcean Abuse Team',
    requirements: 'Include IP address and specific infringing URLs.',
    prefersWebForm: false,
    verified: false,
  },
  hostinger: {
    name: 'Hostinger',
    dmcaEmail: 'abuse@hostinger.com',
    dmcaFormUrl: null,
    agentName: 'Hostinger Abuse Team',
    requirements: 'Include domain name and specific infringing URLs.',
    prefersWebForm: false,
    verified: false,
  },

  // ── Social Media ─────────────────────────────────────────────────
  tiktok: {
    name: 'TikTok',
    dmcaEmail: 'copyright@tiktok.com',
    dmcaFormUrl: 'https://www.tiktok.com/legal/report/Copyright',
    agentName: 'TikTok Copyright Team',
    requirements: 'Use the web form (preferred). Include specific video URLs.',
    prefersWebForm: true,
    verified: true,
  },
  reddit: {
    name: 'Reddit',
    dmcaEmail: 'copyright@reddit.com',
    dmcaFormUrl: 'https://reddit.zendesk.com/hc/en-us/requests/new?ticket_form_id=106573',
    agentName: 'Reddit Copyright Team',
    requirements: 'Email copyright@reddit.com or use the web form. Include specific post/comment URLs.',
    prefersWebForm: false,
    verified: true,
  },
  facebook: {
    name: 'Facebook / Meta',
    dmcaEmail: 'ip@fb.com',
    dmcaFormUrl: 'https://www.facebook.com/help/contact/634636770043571',
    agentName: 'Meta IP Operations',
    requirements: 'Use the web form (strongly preferred). Include specific post/page URLs.',
    prefersWebForm: true,
    verified: true,
  },
  instagram: {
    name: 'Instagram',
    dmcaEmail: 'ip@instagram.com',
    dmcaFormUrl: 'https://help.instagram.com/contact/552695131608132',
    agentName: 'Meta IP Operations',
    requirements: 'Use the web form. Include specific post URLs. Shares Meta IP infrastructure.',
    prefersWebForm: true,
    verified: true,
  },
  twitter: {
    name: 'X (Twitter)',
    dmcaEmail: 'copyright@x.com',
    dmcaFormUrl: 'https://help.x.com/en/forms/ipi/dmca',
    agentName: 'X Copyright Team',
    requirements: 'Use the web form. Include specific tweet/post URLs.',
    prefersWebForm: true,
    verified: true,
  },

  // ── Marketplaces ─────────────────────────────────────────────────
  gumroad: {
    name: 'Gumroad',
    dmcaEmail: 'dmca@gumroad.com',
    dmcaFormUrl: null,
    agentName: 'Gumroad Trust & Safety',
    requirements: 'Email dmca@gumroad.com. Include the product listing URL and proof of original ownership.',
    prefersWebForm: false,
    verified: false,
  },
  etsy: {
    name: 'Etsy',
    dmcaEmail: 'legal@etsy.com',
    dmcaFormUrl: 'https://www.etsy.com/legal/ip/report',
    agentName: 'Etsy IP Team',
    requirements: 'Use the web form (preferred). Include specific listing URLs.',
    prefersWebForm: true,
    verified: true,
  },
  amazon: {
    name: 'Amazon',
    dmcaEmail: 'copyright@amazon.com',
    dmcaFormUrl: 'https://www.amazon.com/report/infringement',
    agentName: 'Amazon Brand Registry',
    requirements: 'Use the Report Infringement form (preferred). Include product listing URLs.',
    prefersWebForm: true,
    verified: true,
  },
  ebay: {
    name: 'eBay',
    dmcaEmail: null, // eBay requires VeRO enrollment
    dmcaFormUrl: 'https://www.ebay.com/help/policies/listing-policies/creating-managing-listings/vero-rights-owner-program?id=4349',
    agentName: 'eBay VeRO Program',
    requirements: 'eBay requires enrollment in their VeRO (Verified Rights Owner) Program before submitting takedowns. No one-off DMCA email.',
    prefersWebForm: true,
    verified: true,
  },

  // ── Trading / Finance Platforms ──────────────────────────────────
  tradingview: {
    name: 'TradingView',
    dmcaEmail: null, // TradingView does NOT publish a DMCA email
    dmcaFormUrl: 'https://www.tradingview.com/support/',
    agentName: 'TradingView Support',
    requirements: 'TradingView has no public DMCA email. Submit a support ticket through their Help Center. Include the script/indicator URL and proof of original ownership.',
    prefersWebForm: true,
    verified: true, // Confirmed: no public DMCA email exists
  },
  mql5: {
    name: 'MQL5 / MetaTrader Market',
    dmcaEmail: null, // No verified DMCA email found
    dmcaFormUrl: 'https://www.mql5.com/en/about/terms',
    agentName: 'MQL5 Support',
    requirements: 'Contact MQL5 through their support system. Include the product listing URL on MQL5 marketplace.',
    prefersWebForm: true,
    verified: false,
  },

  // ── Education / Course Platforms ─────────────────────────────────
  udemy: {
    name: 'Udemy',
    dmcaEmail: 'piracy@udemy.com',
    dmcaFormUrl: 'https://www.udemy.com/terms/ip/',
    agentName: 'Udemy Trust & Safety',
    requirements: 'Email piracy@udemy.com or use the IP policy page. Include the course URL and proof of original content.',
    prefersWebForm: false,
    verified: false,
  },
  teachable: {
    name: 'Teachable',
    dmcaEmail: 'dmca@teachable.com',
    dmcaFormUrl: null,
    agentName: 'Teachable Copyright Team',
    requirements: 'Email dmca@teachable.com. Include the course/school URL and proof of original ownership.',
    prefersWebForm: false,
    verified: false,
  },
  thinkific: {
    name: 'Thinkific',
    dmcaEmail: 'dmca@thinkific.com',
    dmcaFormUrl: null,
    agentName: 'Thinkific Trust & Safety',
    requirements: 'Email dmca@thinkific.com. Include the course URL and proof of original ownership.',
    prefersWebForm: false,
    verified: false,
  },
  skillshare: {
    name: 'Skillshare',
    dmcaEmail: null,
    dmcaFormUrl: 'https://www.skillshare.com/en/terms',
    agentName: 'Skillshare Trust & Safety',
    requirements: 'Check their Terms of Service for current DMCA process. Include the class URL.',
    prefersWebForm: true,
    verified: false,
  },

  // ── Additional Platforms ─────────────────────────────────────────
  scribd: {
    name: 'Scribd',
    dmcaEmail: 'copyright@scribd.com',
    dmcaFormUrl: 'https://support.scribd.com/hc/en-us/articles/210129366-Filing-a-copyright-claim',
    agentName: 'Scribd Copyright Agent',
    requirements: 'Email copyright@scribd.com. Include the document URL and proof of original ownership.',
    prefersWebForm: false,
    verified: false,
  },
  github: {
    name: 'GitHub',
    dmcaEmail: 'copyright@github.com',
    dmcaFormUrl: 'https://support.github.com/contact/dmca-takedown',
    agentName: 'GitHub DMCA Agent',
    requirements: 'Use the DMCA Takedown web form (preferred). GitHub publishes all DMCA notices publicly in their github/dmca repository. Include repo/file URLs.',
    prefersWebForm: true,
    verified: true,
  },
  pastebin: {
    name: 'Pastebin',
    dmcaEmail: 'admin@pastebin.com',
    dmcaFormUrl: 'https://pastebin.com/report',
    agentName: 'Pastebin Admin',
    requirements: 'Email admin@pastebin.com or use the report page. Include the paste URL.',
    prefersWebForm: false,
    verified: false,
  },
  patreon: {
    name: 'Patreon',
    dmcaEmail: 'copyright@patreon.com',
    dmcaFormUrl: null,
    agentName: 'Patreon Copyright Agent',
    requirements: 'Email copyright@patreon.com. Include the creator page URL and proof of ownership.',
    prefersWebForm: false,
    verified: false,
  },
};

/**
 * URL pattern matching for auto-detection
 */
const URL_PATTERNS: Array<{ pattern: RegExp; providerId: string }> = [
  { pattern: /youtube\.com|youtu\.be/i, providerId: 'youtube' },
  { pattern: /drive\.google\.com/i, providerId: 'drive.google' },
  { pattern: /t\.me|telegram\.(org|me)/i, providerId: 'telegram' },
  { pattern: /discord\.(com|gg)/i, providerId: 'discord' },
  { pattern: /mega\.nz/i, providerId: 'mega' },
  { pattern: /mediafire\.com/i, providerId: 'mediafire' },
  { pattern: /dropbox\.com/i, providerId: 'dropbox' },
  { pattern: /tiktok\.com/i, providerId: 'tiktok' },
  { pattern: /reddit\.com/i, providerId: 'reddit' },
  { pattern: /facebook\.com|fb\.com/i, providerId: 'facebook' },
  { pattern: /instagram\.com/i, providerId: 'instagram' },
  { pattern: /twitter\.com|x\.com/i, providerId: 'twitter' },
  { pattern: /gumroad\.com/i, providerId: 'gumroad' },
  { pattern: /etsy\.com/i, providerId: 'etsy' },
  { pattern: /tradingview\.com/i, providerId: 'tradingview' },
  { pattern: /mql5\.com/i, providerId: 'mql5' },
  { pattern: /udemy\.com/i, providerId: 'udemy' },
  { pattern: /teachable\.com/i, providerId: 'teachable' },
  { pattern: /thinkific\.com/i, providerId: 'thinkific' },
  { pattern: /skillshare\.com/i, providerId: 'skillshare' },
  { pattern: /scribd\.com/i, providerId: 'scribd' },
  { pattern: /github\.com/i, providerId: 'github' },
  { pattern: /pastebin\.com/i, providerId: 'pastebin' },
  { pattern: /amazon\.com/i, providerId: 'amazon' },
  { pattern: /ebay\.com/i, providerId: 'ebay' },
  { pattern: /patreon\.com/i, providerId: 'patreon' },
  // Google search results should match last (catch-all for google.* domains)
  { pattern: /google\./i, providerId: 'google' },
];

/**
 * Resolve provider from a URL.
 * Returns the matched provider or a generic fallback.
 */
export function resolveProvider(
  url: string,
  platformHint?: string,
  hostingProvider?: string,
  registrar?: string,
  abuseEmail?: string
): ProviderInfo {
  // 1. Try URL pattern matching
  for (const { pattern, providerId } of URL_PATTERNS) {
    if (pattern.test(url)) {
      return PROVIDERS[providerId]!;
    }
  }

  // 2. Try platform hint from scan data
  if (platformHint) {
    const key = platformHint.toLowerCase();
    if (PROVIDERS[key]) return PROVIDERS[key];
  }

  // 3. Try hosting provider from infrastructure data
  if (hostingProvider) {
    const normalized = hostingProvider.toLowerCase();
    for (const [key, provider] of Object.entries(PROVIDERS)) {
      if (normalized.includes(key)) return provider;
    }
  }

  // 4. Try registrar from WHOIS data
  if (registrar) {
    const normalized = registrar.toLowerCase();
    for (const [key, provider] of Object.entries(PROVIDERS)) {
      if (normalized.includes(key)) return provider;
    }
  }

  // 5. Fallback: use abuse email if we have it, or generic
  const domain = extractDomain(url);
  return {
    name: domain || 'Service Provider',
    dmcaEmail: abuseEmail || null,
    dmcaFormUrl: null,
    agentName: `${domain || 'Service Provider'} DMCA Agent`,
    requirements: 'Contact the hosting provider or domain registrar directly with this notice.',
    prefersWebForm: false,
    verified: false,
  };
}

/**
 * Get a provider by known ID
 */
export function getProviderById(id: string): ProviderInfo | null {
  return PROVIDERS[id.toLowerCase()] || null;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Resolve ALL enforcement targets for an infringement, ordered by recommended priority.
 * Returns an ordered list: Platform → Hosting → Registrar → Google Deindex
 *
 * This enables the "platform-first" enforcement strategy:
 * 1. Contact the platform hosting the content (fastest, highest success rate)
 * 2. If no response, escalate to hosting provider / registrar
 * 3. Submit to Google for search deindexing (parallel or fallback)
 */
export function resolveAllTargets(
  url: string,
  platformHint?: string,
  hostingProvider?: string | null,
  registrar?: string | null,
  abuseEmail?: string | null,
): EnforcementTarget[] {
  const targets: EnforcementTarget[] = [];
  const addedProviders = new Set<string>();

  // ── Step 1: Platform (direct - best success rate) ────────────
  let platformProvider: ProviderInfo | null = null;

  // Try URL pattern first
  for (const { pattern, providerId } of URL_PATTERNS) {
    if (pattern.test(url) && providerId !== 'google') {
      platformProvider = PROVIDERS[providerId] || null;
      if (platformProvider) {
        addedProviders.add(platformProvider.name);
        break;
      }
    }
  }

  // Try platform hint if no URL match
  if (!platformProvider && platformHint) {
    const key = platformHint.toLowerCase();
    if (PROVIDERS[key] && key !== 'google') {
      platformProvider = PROVIDERS[key];
      addedProviders.add(platformProvider.name);
    }
  }

  if (platformProvider) {
    targets.push({
      type: 'platform',
      provider: platformProvider,
      step: 1,
      recommended: true,
      reason: `Send directly to ${platformProvider.name}. Platform takedowns have the highest success rate and fastest response time.`,
      deadline_days: 7,
    });
  }

  // ── Step 2: Hosting Provider (escalation) ────────────────────
  if (hostingProvider) {
    const normalized = hostingProvider.toLowerCase();
    let hostingProviderInfo: ProviderInfo | null = null;

    for (const [key, provider] of Object.entries(PROVIDERS)) {
      if (normalized.includes(key) && !addedProviders.has(provider.name)) {
        hostingProviderInfo = provider;
        addedProviders.add(provider.name);
        break;
      }
    }

    if (hostingProviderInfo) {
      targets.push({
        type: 'hosting',
        provider: hostingProviderInfo,
        step: targets.length + 1,
        recommended: !platformProvider, // Recommended if no platform target
        reason: `Escalate to hosting provider ${hostingProviderInfo.name}. Under DMCA Safe Harbor, they must act or lose protection.`,
        deadline_days: 14,
      });
    }
  }

  // ── Step 3: Domain Registrar (further escalation) ────────────
  if (registrar) {
    const normalized = registrar.toLowerCase();
    let registrarInfo: ProviderInfo | null = null;

    for (const [key, provider] of Object.entries(PROVIDERS)) {
      if (normalized.includes(key) && !addedProviders.has(provider.name)) {
        registrarInfo = provider;
        addedProviders.add(provider.name);
        break;
      }
    }

    if (registrarInfo) {
      targets.push({
        type: 'registrar',
        provider: registrarInfo,
        step: targets.length + 1,
        recommended: false,
        reason: `Contact domain registrar ${registrarInfo.name}. Useful when the hosting provider doesn't respond.`,
        deadline_days: 14,
      });
    } else if (abuseEmail) {
      // Registrar not in our database but we have an abuse email
      const domain = extractDomain(url);
      targets.push({
        type: 'registrar',
        provider: {
          name: registrar,
          dmcaEmail: abuseEmail,
          dmcaFormUrl: null,
          agentName: `${registrar} Abuse Team`,
          requirements: 'Include the domain name and specific infringing URLs.',
          prefersWebForm: false,
          verified: false,
        },
        step: targets.length + 1,
        recommended: false,
        reason: `Contact registrar ${registrar} via their abuse contact.`,
        deadline_days: 14,
      });
      addedProviders.add(registrar);
    }
  }

  // ── Step 4: Google Search Deindex (always available) ──────────
  if (!addedProviders.has('Google')) {
    targets.push({
      type: 'search_engine',
      provider: PROVIDERS['google']!,
      step: targets.length + 1,
      recommended: targets.length === 0, // Only recommended if nothing else available
      reason: 'Request Google to remove the infringing URL from search results. This reduces discoverability even if the content stays up.',
      deadline_days: 0, // Can be done immediately, in parallel
    });
  }

  // If no targets were found at all, add a generic fallback
  if (targets.length === 0) {
    const domain = extractDomain(url);
    targets.push({
      type: 'platform',
      provider: {
        name: domain || 'Service Provider',
        dmcaEmail: abuseEmail || null,
        dmcaFormUrl: null,
        agentName: `${domain || 'Service Provider'} DMCA Agent`,
        requirements: 'Contact the hosting provider or domain registrar directly with this notice.',
        prefersWebForm: false,
        verified: false,
      },
      step: 1,
      recommended: true,
      reason: 'Send directly to the service provider.',
      deadline_days: 14,
    });
  }

  return targets;
}
