/**
 * Expanded DMCA Provider Database
 *
 * Comprehensive database of platform DMCA contacts, including email addresses,
 * web form URLs, and platform-specific requirements.
 */

export interface ProviderInfo {
  name: string;
  dmcaEmail: string | null;
  dmcaFormUrl: string | null;
  agentName: string;
  requirements: string;
  /** Whether this provider prefers web form over email */
  prefersWebForm: boolean;
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
  // Major Platforms
  youtube: {
    name: 'YouTube',
    dmcaEmail: 'copyright@youtube.com',
    dmcaFormUrl: 'https://www.youtube.com/copyright_complaint_form',
    agentName: 'YouTube Copyright Team',
    requirements: 'Include video URLs with timestamps for specific content. Web form submission is preferred.',
    prefersWebForm: true,
  },
  google: {
    name: 'Google',
    dmcaEmail: 'dmca-agent@google.com',
    dmcaFormUrl: 'https://support.google.com/legal/troubleshooter/1114905',
    agentName: 'Google DMCA Agent',
    requirements: 'Include specific URLs to be removed from search results. Use the web form for fastest processing.',
    prefersWebForm: true,
  },
  telegram: {
    name: 'Telegram',
    dmcaEmail: 'dmca@telegram.org',
    dmcaFormUrl: null,
    agentName: 'Telegram DMCA Agent',
    requirements: 'Include the channel/group username, invite link, or specific message links.',
    prefersWebForm: false,
  },
  discord: {
    name: 'Discord',
    dmcaEmail: 'copyright@discord.com',
    dmcaFormUrl: null,
    agentName: 'Discord Trust & Safety',
    requirements: 'Include server ID, channel ID, and specific message links where applicable.',
    prefersWebForm: false,
  },

  // Cloud Storage / File Hosting
  mega: {
    name: 'MEGA',
    dmcaEmail: null,
    dmcaFormUrl: 'https://mega.nz/copyright',
    agentName: 'MEGA Copyright Team',
    requirements: 'Use the web form. Include exact file/folder links.',
    prefersWebForm: true,
  },
  mediafire: {
    name: 'MediaFire',
    dmcaEmail: 'copyright@mediafire.com',
    dmcaFormUrl: null,
    agentName: 'MediaFire Copyright Agent',
    requirements: 'Include direct file download links.',
    prefersWebForm: false,
  },
  dropbox: {
    name: 'Dropbox',
    dmcaEmail: 'copyright@dropbox.com',
    dmcaFormUrl: null,
    agentName: 'Dropbox Copyright Agent',
    requirements: 'Include shared file/folder URLs.',
    prefersWebForm: false,
  },
  'drive.google': {
    name: 'Google Drive',
    dmcaEmail: 'dmca-agent@google.com',
    dmcaFormUrl: 'https://support.google.com/legal/troubleshooter/1114905',
    agentName: 'Google DMCA Agent',
    requirements: 'Include shared drive file/folder links. Use the web form for fastest processing.',
    prefersWebForm: true,
  },

  // Infrastructure / Hosting
  cloudflare: {
    name: 'Cloudflare',
    dmcaEmail: null,
    dmcaFormUrl: 'https://abuse.cloudflare.com',
    agentName: 'Cloudflare Trust & Safety',
    requirements: 'Cloudflare is a CDN — the notice will be forwarded to the hosting provider. Use the abuse form.',
    prefersWebForm: true,
  },
  namecheap: {
    name: 'Namecheap',
    dmcaEmail: 'abuse@namecheap.com',
    dmcaFormUrl: null,
    agentName: 'Namecheap Abuse Team',
    requirements: 'Include domain name and specific infringing URLs.',
    prefersWebForm: false,
  },
  godaddy: {
    name: 'GoDaddy',
    dmcaEmail: 'abuse@godaddy.com',
    dmcaFormUrl: null,
    agentName: 'GoDaddy Abuse Team',
    requirements: 'Include domain name and specific infringing URLs.',
    prefersWebForm: false,
  },
  digitalocean: {
    name: 'DigitalOcean',
    dmcaEmail: 'abuse@digitalocean.com',
    dmcaFormUrl: null,
    agentName: 'DigitalOcean Abuse Team',
    requirements: 'Include IP address and specific infringing URLs.',
    prefersWebForm: false,
  },
  hostinger: {
    name: 'Hostinger',
    dmcaEmail: 'abuse@hostinger.com',
    dmcaFormUrl: null,
    agentName: 'Hostinger Abuse Team',
    requirements: 'Include domain name and specific infringing URLs.',
    prefersWebForm: false,
  },

  // Social Media
  tiktok: {
    name: 'TikTok',
    dmcaEmail: null,
    dmcaFormUrl: 'https://www.tiktok.com/legal/report/Copyright',
    agentName: 'TikTok Copyright Team',
    requirements: 'Use the web form. Include specific video URLs.',
    prefersWebForm: true,
  },
  reddit: {
    name: 'Reddit',
    dmcaEmail: null,
    dmcaFormUrl: 'https://www.reddithelp.com/en/submit-request/copyright-infringement-dmca',
    agentName: 'Reddit Copyright Team',
    requirements: 'Use the web form. Include specific post/comment URLs.',
    prefersWebForm: true,
  },
  facebook: {
    name: 'Facebook / Meta',
    dmcaEmail: null,
    dmcaFormUrl: 'https://www.facebook.com/help/contact/634636770043106',
    agentName: 'Meta IP Operations',
    requirements: 'Use the web form. Include specific post/page URLs.',
    prefersWebForm: true,
  },
  instagram: {
    name: 'Instagram',
    dmcaEmail: null,
    dmcaFormUrl: 'https://help.instagram.com/contact/552695131608132',
    agentName: 'Meta IP Operations',
    requirements: 'Use the web form. Include specific post URLs.',
    prefersWebForm: true,
  },
  twitter: {
    name: 'X (Twitter)',
    dmcaEmail: null,
    dmcaFormUrl: 'https://help.twitter.com/en/forms/ipi',
    agentName: 'X Copyright Team',
    requirements: 'Use the web form. Include specific tweet URLs.',
    prefersWebForm: true,
  },

  // Marketplace
  gumroad: {
    name: 'Gumroad',
    dmcaEmail: 'dmca@gumroad.com',
    dmcaFormUrl: null,
    agentName: 'Gumroad Trust & Safety',
    requirements: 'Include the product listing URL and proof of original ownership.',
    prefersWebForm: false,
  },
  etsy: {
    name: 'Etsy',
    dmcaEmail: null,
    dmcaFormUrl: 'https://www.etsy.com/legal/ip/report',
    agentName: 'Etsy IP Team',
    requirements: 'Use the web form. Include specific listing URLs.',
    prefersWebForm: true,
  },

  // Trading / Finance Platforms
  tradingview: {
    name: 'TradingView',
    dmcaEmail: 'compliance@tradingview.com',
    dmcaFormUrl: 'https://www.tradingview.com/support/',
    agentName: 'TradingView Compliance Team',
    requirements: 'Include the script/indicator URL on TradingView and proof of original ownership. Reference their Terms of Use for published scripts.',
    prefersWebForm: false,
  },
  mql5: {
    name: 'MQL5 / MetaTrader Market',
    dmcaEmail: 'copyright@mql5.com',
    dmcaFormUrl: 'https://www.mql5.com/en/about/terms',
    agentName: 'MQL5 Copyright Team',
    requirements: 'Include the product listing URL on MQL5 marketplace.',
    prefersWebForm: false,
  },

  // Education / Course Platforms
  udemy: {
    name: 'Udemy',
    dmcaEmail: null,
    dmcaFormUrl: 'https://www.udemy.com/terms/dmca/',
    agentName: 'Udemy Trust & Safety',
    requirements: 'Use the DMCA form. Include the course URL and proof of original content.',
    prefersWebForm: true,
  },
  teachable: {
    name: 'Teachable',
    dmcaEmail: 'dmca@teachable.com',
    dmcaFormUrl: null,
    agentName: 'Teachable Copyright Team',
    requirements: 'Include the course/school URL and proof of original ownership.',
    prefersWebForm: false,
  },
  thinkific: {
    name: 'Thinkific',
    dmcaEmail: 'dmca@thinkific.com',
    dmcaFormUrl: null,
    agentName: 'Thinkific Trust & Safety',
    requirements: 'Include the course URL and proof of original ownership.',
    prefersWebForm: false,
  },
  skillshare: {
    name: 'Skillshare',
    dmcaEmail: null,
    dmcaFormUrl: 'https://www.skillshare.com/en/terms',
    agentName: 'Skillshare Trust & Safety',
    requirements: 'Use the DMCA form. Include the class URL.',
    prefersWebForm: true,
  },

  // Additional Platforms
  scribd: {
    name: 'Scribd',
    dmcaEmail: 'copyright@scribd.com',
    dmcaFormUrl: null,
    agentName: 'Scribd Copyright Agent',
    requirements: 'Include the document URL and proof of original ownership.',
    prefersWebForm: false,
  },
  github: {
    name: 'GitHub',
    dmcaEmail: 'copyright@github.com',
    dmcaFormUrl: 'https://support.github.com/contact/dmca-takedown',
    agentName: 'GitHub DMCA Agent',
    requirements: 'Follow GitHub DMCA takedown process. Include repo/file URLs.',
    prefersWebForm: true,
  },
  pastebin: {
    name: 'Pastebin',
    dmcaEmail: 'admin@pastebin.com',
    dmcaFormUrl: null,
    agentName: 'Pastebin Admin',
    requirements: 'Include the paste URL.',
    prefersWebForm: false,
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
      },
      step: 1,
      recommended: true,
      reason: 'Send directly to the service provider.',
      deadline_days: 14,
    });
  }

  return targets;
}
