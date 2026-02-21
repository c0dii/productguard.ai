/**
 * Platform-specific DMCA abuse contact information
 * Automatically populated based on detected platform
 *
 * IMPORTANT: Each contact has a `verified` flag:
 *   true  = confirmed from official source (terms of service, copyright policy page, or US Copyright Office)
 *   false = best-guess based on common patterns — MUST be verified before relying on it
 *
 * Last audited: 2026-02-20
 */

export interface PlatformContact {
  name: string;
  dmcaEmail: string | null;
  abuseEmail?: string;
  formUrl?: string;
  instructions: string;
  responseTime?: string;
  /** Whether this contact info has been verified from an official source */
  verified: boolean;
}

export const PLATFORM_ABUSE_CONTACTS: Record<string, PlatformContact> = {
  // ── Trading / Financial Platforms ─────────────────────────────────

  tradingview: {
    name: 'TradingView',
    dmcaEmail: null, // TradingView does NOT publish a DMCA email — use support ticket
    formUrl: 'https://www.tradingview.com/support/',
    instructions: 'TradingView has no public DMCA email. Submit a support ticket through their Help Center and select the copyright/IP category. Include the script URL and proof of ownership.',
    responseTime: '3-7 business days',
    verified: true, // Confirmed: no public email exists; support ticket is the only channel
  },
  mql5: {
    name: 'MQL5 / MetaTrader Market',
    dmcaEmail: null, // No verified DMCA email found
    formUrl: 'https://www.mql5.com/en/about/terms',
    instructions: 'Contact MQL5 through their support system. Reference their Terms of Use for IP complaints. Include the product listing URL.',
    responseTime: '5-10 business days',
    verified: false,
  },
  prorealcode: {
    name: 'ProRealCode',
    dmcaEmail: null,
    abuseEmail: 'contact@prorealcode.com',
    instructions: 'Contact site administrators via their contact page with a detailed infringement notice.',
    responseTime: '7-14 business days',
    verified: false,
  },

  // ── Marketplaces ─────────────────────────────────────────────────

  etsy: {
    name: 'Etsy',
    dmcaEmail: 'legal@etsy.com',
    formUrl: 'https://www.etsy.com/legal/ip/report',
    instructions: 'Use the Etsy IP Report form (preferred). Include specific listing URLs.',
    responseTime: '1-3 business days',
    verified: true,
  },
  ebay: {
    name: 'eBay',
    dmcaEmail: null, // eBay uses VeRO program only
    formUrl: 'https://www.ebay.com/help/policies/listing-policies/creating-managing-listings/vero-rights-owner-program?id=4349',
    instructions: 'eBay requires enrollment in their VeRO (Verified Rights Owner) Program to submit takedowns. No one-off DMCA email.',
    responseTime: '1-2 business days',
    verified: true,
  },
  amazon: {
    name: 'Amazon',
    dmcaEmail: 'copyright@amazon.com',
    formUrl: 'https://www.amazon.com/report/infringement',
    instructions: 'Use the Amazon Report Infringement form (preferred) or email copyright@amazon.com.',
    responseTime: '1-3 business days',
    verified: true,
  },

  // ── Social Media & Content Platforms ──────────────────────────────

  facebook: {
    name: 'Facebook / Meta',
    dmcaEmail: 'ip@fb.com',
    formUrl: 'https://www.facebook.com/help/contact/634636770043571',
    instructions: 'Use the Facebook Copyright Report web form (preferred). Meta does not process DMCA via email for most cases.',
    responseTime: '1-2 business days',
    verified: true,
  },
  instagram: {
    name: 'Instagram',
    dmcaEmail: 'ip@instagram.com',
    formUrl: 'https://help.instagram.com/contact/552695131608132',
    instructions: 'Use the Instagram Copyright Report web form. Shares Meta IP infrastructure.',
    responseTime: '1-2 business days',
    verified: true,
  },
  youtube: {
    name: 'YouTube',
    dmcaEmail: 'copyright@youtube.com',
    formUrl: 'https://www.youtube.com/copyright_complaint_page',
    instructions: 'Use the YouTube Copyright Complaint web form (strongly preferred). Include video URLs with timestamps.',
    responseTime: '1-3 business days',
    verified: true,
  },
  twitter: {
    name: 'X (Twitter)',
    dmcaEmail: 'copyright@x.com',
    formUrl: 'https://help.x.com/en/forms/ipi/dmca',
    instructions: 'Use the X DMCA web form. Include specific tweet/post URLs.',
    responseTime: '2-4 business days',
    verified: true,
  },
  reddit: {
    name: 'Reddit',
    dmcaEmail: 'copyright@reddit.com',
    formUrl: 'https://reddit.zendesk.com/hc/en-us/requests/new?ticket_form_id=106573',
    instructions: 'Email copyright@reddit.com or use the online form. Include specific post/comment URLs.',
    responseTime: '2-5 business days',
    verified: true,
  },
  tiktok: {
    name: 'TikTok',
    dmcaEmail: 'copyright@tiktok.com',
    formUrl: 'https://www.tiktok.com/legal/report/Copyright',
    instructions: 'Use the TikTok Copyright Report web form (preferred). Include specific video URLs.',
    responseTime: '2-5 business days',
    verified: true,
  },

  // ── File Sharing & Download Sites ────────────────────────────────

  mediafire: {
    name: 'MediaFire',
    dmcaEmail: 'dmca@mediafire.com',
    formUrl: 'https://www.mediafire.com/policies/dmca.php',
    instructions: 'Email dmca@mediafire.com with direct file download links.',
    responseTime: '3-7 business days',
    verified: false,
  },
  mega: {
    name: 'MEGA',
    dmcaEmail: 'copyright@mega.nz',
    formUrl: 'https://mega.nz/takedown',
    instructions: 'Use the MEGA takedown web form (preferred). Include exact file/folder links.',
    responseTime: '5-10 business days',
    verified: true,
  },
  dropbox: {
    name: 'Dropbox',
    dmcaEmail: 'copyright@dropbox.com',
    formUrl: 'https://www.dropbox.com/copyright/dmca',
    instructions: 'Use the Dropbox DMCA web form or email copyright@dropbox.com. Include shared file/folder URLs.',
    responseTime: '3-5 business days',
    verified: false,
  },

  // ── Forums & Communities ─────────────────────────────────────────

  'forex-station': {
    name: 'Forex Station',
    dmcaEmail: null,
    abuseEmail: 'admin@forex-station.com',
    instructions: 'Contact forum administrators via their contact page. Small forum — response times vary.',
    responseTime: '7-14 business days',
    verified: false,
  },
  discord: {
    name: 'Discord',
    dmcaEmail: 'copyright@discord.com',
    formUrl: 'https://dis.gd/copyright',
    instructions: 'Use the Discord copyright web form or email copyright@discord.com. Include server ID, channel ID, and message links.',
    responseTime: '2-4 business days',
    verified: true, // Listed in Discord Terms of Service
  },
  telegram: {
    name: 'Telegram',
    dmcaEmail: 'dmca@telegram.org',
    formUrl: 'https://telegram.org/dmca',
    instructions: 'Email dmca@telegram.org. Include channel/group username, invite link, or specific message links. Telegram is not US-based — enforcement may differ.',
    responseTime: '5-10 business days',
    verified: true, // Confirmed on telegram.org/dmca
  },

  // ── Developer & Other Platforms ──────────────────────────────────

  github: {
    name: 'GitHub',
    dmcaEmail: 'copyright@github.com',
    formUrl: 'https://support.github.com/contact/dmca-takedown',
    instructions: 'Use the GitHub DMCA Takedown web form (preferred). GitHub publishes all DMCA notices publicly. Include repo/file URLs.',
    responseTime: '1-2 business days',
    verified: true,
  },
  patreon: {
    name: 'Patreon',
    dmcaEmail: 'copyright@patreon.com',
    instructions: 'Email copyright@patreon.com with DMCA notice. Include the creator page URL and proof of ownership.',
    responseTime: '3-5 business days',
    verified: false,
  },
  gumroad: {
    name: 'Gumroad',
    dmcaEmail: 'dmca@gumroad.com',
    instructions: 'Email dmca@gumroad.com with DMCA notice. Include the product listing URL and proof of original ownership.',
    responseTime: '3-5 business days',
    verified: false,
  },
  scribd: {
    name: 'Scribd',
    dmcaEmail: 'copyright@scribd.com',
    instructions: 'Email copyright@scribd.com. Include the document URL and proof of ownership.',
    responseTime: '3-5 business days',
    verified: false,
  },
  udemy: {
    name: 'Udemy',
    dmcaEmail: 'piracy@udemy.com',
    formUrl: 'https://www.udemy.com/terms/ip/',
    instructions: 'Email piracy@udemy.com or use their IP policy page. Include the course URL and proof of original content.',
    responseTime: '2-5 business days',
    verified: false,
  },
};

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): string {
  const urlLower = url.toLowerCase();

  // Financial/Trading platforms
  if (urlLower.includes('tradingview.com')) return 'tradingview';
  if (urlLower.includes('mql5.com')) return 'mql5';
  if (urlLower.includes('prorealcode.com')) return 'prorealcode';
  if (urlLower.includes('forex-station.com')) return 'forex-station';

  // Marketplaces
  if (urlLower.includes('etsy.com')) return 'etsy';
  if (urlLower.includes('ebay.com')) return 'ebay';
  if (urlLower.includes('amazon.com')) return 'amazon';

  // Social media
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.com')) return 'facebook';
  if (urlLower.includes('instagram.com')) return 'instagram';
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
  if (urlLower.includes('reddit.com')) return 'reddit';
  if (urlLower.includes('tiktok.com')) return 'tiktok';

  // File sharing
  if (urlLower.includes('mediafire.com')) return 'mediafire';
  if (urlLower.includes('mega.nz')) return 'mega';
  if (urlLower.includes('dropbox.com')) return 'dropbox';

  // Communities
  if (urlLower.includes('discord.com') || urlLower.includes('discord.gg')) return 'discord';
  if (urlLower.includes('t.me') || urlLower.includes('telegram.')) return 'telegram';
  if (urlLower.includes('github.com')) return 'github';
  if (urlLower.includes('patreon.com')) return 'patreon';
  if (urlLower.includes('gumroad.com')) return 'gumroad';
  if (urlLower.includes('scribd.com')) return 'scribd';
  if (urlLower.includes('udemy.com')) return 'udemy';

  return 'unknown';
}

/**
 * Get platform contact info from URL
 */
export function getPlatformContact(url: string): PlatformContact | null {
  const platform = detectPlatform(url);
  return PLATFORM_ABUSE_CONTACTS[platform] || null;
}

/**
 * Get recommended recipient for DMCA notice
 */
export function getRecommendedRecipient(url: string): {
  recipient: string;
  email?: string;
  formUrl?: string;
  instructions?: string;
  verified: boolean;
} {
  const contact = getPlatformContact(url);

  if (!contact) {
    return {
      recipient: 'Website Abuse Team',
      instructions: 'Check the website footer or "Contact" page for abuse/DMCA contact information',
      verified: false,
    };
  }

  return {
    recipient: `${contact.name} ${contact.dmcaEmail ? 'DMCA Agent' : contact.formUrl ? 'Copyright Team' : 'Abuse Team'}`,
    email: contact.dmcaEmail || contact.abuseEmail || undefined,
    formUrl: contact.formUrl,
    instructions: contact.instructions,
    verified: contact.verified,
  };
}
