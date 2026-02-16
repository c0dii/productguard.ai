/**
 * Platform-specific DMCA abuse contact information
 * Automatically populated based on detected platform
 */

export interface PlatformContact {
  name: string;
  dmcaEmail?: string;
  abuseEmail?: string;
  formUrl?: string;
  instructions?: string;
  responseTime?: string;
}

export const PLATFORM_ABUSE_CONTACTS: Record<string, PlatformContact> = {
  // Trading/Financial Platforms
  tradingview: {
    name: 'TradingView',
    dmcaEmail: 'copyright@tradingview.com',
    abuseEmail: 'abuse@tradingview.com',
    formUrl: 'https://www.tradingview.com/support/dmca/',
    instructions: 'Use the DMCA form or email copyright@tradingview.com',
    responseTime: '3-5 business days',
  },
  mql5: {
    name: 'MQL5 Market',
    dmcaEmail: 'legal@mql5.com',
    abuseEmail: 'support@mql5.com',
    instructions: 'Email legal@mql5.com with DMCA notice',
    responseTime: '5-7 business days',
  },
  prorealcode: {
    name: 'ProRealCode',
    abuseEmail: 'contact@prorealcode.com',
    instructions: 'Contact via email with detailed infringement notice',
    responseTime: '7-10 business days',
  },

  // Marketplaces
  etsy: {
    name: 'Etsy',
    dmcaEmail: 'ip@etsy.com',
    formUrl: 'https://www.etsy.com/legal/ip/',
    instructions: 'Use Etsy Intellectual Property Policy form',
    responseTime: '1-3 business days',
  },
  ebay: {
    name: 'eBay',
    formUrl: 'https://www.ebay.com/help/policies/reporting-verifying-reporting/reporting-intellectual-property-infringements-vero-program',
    instructions: 'Use VeRO Program reporting form',
    responseTime: '1-2 business days',
  },
  amazon: {
    name: 'Amazon',
    formUrl: 'https://www.amazon.com/report/infringement',
    instructions: 'Use Amazon Brand Registry or Report Infringement form',
    responseTime: '1-3 business days',
  },

  // Social Media & Content Platforms
  facebook: {
    name: 'Facebook/Meta',
    formUrl: 'https://www.facebook.com/help/contact/634636770043106',
    instructions: 'Use Facebook Copyright Report form',
    responseTime: '1-2 business days',
  },
  instagram: {
    name: 'Instagram',
    formUrl: 'https://help.instagram.com/contact/372592039493026',
    instructions: 'Use Instagram Copyright Report form',
    responseTime: '1-2 business days',
  },
  youtube: {
    name: 'YouTube',
    formUrl: 'https://www.youtube.com/copyright_complaint_form',
    instructions: 'Use YouTube Copyright Complaint form',
    responseTime: '1-3 business days',
  },
  twitter: {
    name: 'Twitter/X',
    formUrl: 'https://help.twitter.com/forms/dmca',
    instructions: 'Use Twitter DMCA form',
    responseTime: '2-4 business days',
  },
  reddit: {
    name: 'Reddit',
    dmcaEmail: 'copyright@reddit.com',
    formUrl: 'https://www.reddithelp.com/en/submit-request/copyright-dmca',
    instructions: 'Email copyright@reddit.com or use online form',
    responseTime: '2-5 business days',
  },

  // File Sharing & Download Sites
  mediafire: {
    name: 'MediaFire',
    dmcaEmail: 'copyright@mediafire.com',
    formUrl: 'https://www.mediafire.com/dmca.php',
    instructions: 'Email copyright@mediafire.com',
    responseTime: '3-7 business days',
  },
  mega: {
    name: 'MEGA',
    dmcaEmail: 'copyright@mega.nz',
    formUrl: 'https://mega.nz/copyright',
    instructions: 'Use MEGA copyright form',
    responseTime: '5-10 business days',
  },
  dropbox: {
    name: 'Dropbox',
    dmcaEmail: 'copyright@dropbox.com',
    formUrl: 'https://www.dropbox.com/dmca',
    instructions: 'Email copyright@dropbox.com',
    responseTime: '3-5 business days',
  },

  // Forums & Communities
  'forex-station': {
    name: 'Forex Station',
    abuseEmail: 'admin@forex-station.com',
    instructions: 'Contact forum administrators via email',
    responseTime: '7-14 business days',
  },
  discord: {
    name: 'Discord',
    dmcaEmail: 'copyright@discord.com',
    formUrl: 'https://support.discord.com/hc/en-us/requests/new',
    instructions: 'Email copyright@discord.com',
    responseTime: '2-4 business days',
  },
  telegram: {
    name: 'Telegram',
    dmcaEmail: 'dmca@telegram.org',
    formUrl: 'https://telegram.org/faq#q-there-39s-illegal-content-on-telegram-how-do-i-take-it-down',
    instructions: 'Email dmca@telegram.org with detailed information',
    responseTime: '5-10 business days',
  },

  // General/Others
  github: {
    name: 'GitHub',
    formUrl: 'https://support.github.com/contact/dmca-takedown',
    instructions: 'Use GitHub DMCA Takedown form',
    responseTime: '1-2 business days',
  },
  patreon: {
    name: 'Patreon',
    dmcaEmail: 'copyright@patreon.com',
    instructions: 'Email copyright@patreon.com',
    responseTime: '3-5 business days',
  },
  gumroad: {
    name: 'Gumroad',
    abuseEmail: 'abuse@gumroad.com',
    dmcaEmail: 'legal@gumroad.com',
    instructions: 'Email legal@gumroad.com with DMCA notice',
    responseTime: '3-5 business days',
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
  if (urlLower.includes('facebook.com')) return 'facebook';
  if (urlLower.includes('instagram.com')) return 'instagram';
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
  if (urlLower.includes('reddit.com')) return 'reddit';

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
  instructions?: string;
} {
  const contact = getPlatformContact(url);

  if (!contact) {
    return {
      recipient: 'Website Abuse Team',
      instructions: 'Check the website footer or "Contact" page for abuse/DMCA contact information',
    };
  }

  return {
    recipient: `${contact.name} ${contact.dmcaEmail ? 'DMCA Agent' : 'Abuse Team'}`,
    email: contact.dmcaEmail || contact.abuseEmail,
    instructions: contact.instructions,
  };
}
