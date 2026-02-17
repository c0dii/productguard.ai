/**
 * Maps URL hostnames to friendly platform display names.
 * Used in infringement cards to show where content is hosted.
 */

const PLATFORM_NAMES: Record<string, string> = {
  'tradingview.com': 'TradingView',
  'etsy.com': 'Etsy',
  'amazon.com': 'Amazon',
  'ebay.com': 'eBay',
  'telegram.org': 'Telegram',
  't.me': 'Telegram',
  'discord.com': 'Discord',
  'discord.gg': 'Discord',
  'reddit.com': 'Reddit',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'facebook.com': 'Facebook',
  'twitter.com': 'Twitter',
  'x.com': 'Twitter',
  'instagram.com': 'Instagram',
  'tiktok.com': 'TikTok',
  'github.com': 'GitHub',
  'scribd.com': 'Scribd',
  'slideshare.net': 'SlideShare',
  'mega.nz': 'MEGA',
  'mediafire.com': 'MediaFire',
  'drive.google.com': 'Google Drive',
  'docs.google.com': 'Google Docs',
  'play.google.com': 'Google Play',
  'shopify.com': 'Shopify',
  'gumroad.com': 'Gumroad',
  'udemy.com': 'Udemy',
  'coursera.org': 'Coursera',
  'fiverr.com': 'Fiverr',
  'alibaba.com': 'Alibaba',
  'aliexpress.com': 'AliExpress',
  'wish.com': 'Wish',
  'pinterest.com': 'Pinterest',
  'tumblr.com': 'Tumblr',
  'wordpress.com': 'WordPress',
  'medium.com': 'Medium',
  'substack.com': 'Substack',
  'patreon.com': 'Patreon',
  'ko-fi.com': 'Ko-fi',
  'teachable.com': 'Teachable',
  'thinkific.com': 'Thinkific',
  'kajabi.com': 'Kajabi',
  'clickbank.com': 'ClickBank',
  'mql5.com': 'MQL5',
  'thepiratebay.org': 'Pirate Bay',
  '1337x.to': '1337x',
  'rarbg.to': 'RARBG',
  'usethinkscript.com': 'useThinkScript',
  'carousell.sg': 'Carousell',
  'ecrater.com': 'eCRATER',
  'hacksnation.com': 'HacksNation',
  'patched.to': 'Patched',
  'libraryoftrader.net': 'Library of Trader',
  'courseavailable.com': 'CourseAvailable',
  'dlsub.com': 'DLSub',
  'trendspider.com': 'TrendSpider',
};

/**
 * Extract a display-friendly platform name from a URL.
 * Returns the mapped name for known platforms, or the cleaned domain for unknown ones.
 */
export function getPlatformDisplayName(sourceUrl: string): string {
  try {
    const url = new URL(sourceUrl);
    let hostname = url.hostname.toLowerCase();

    // Remove www. prefix
    hostname = hostname.replace(/^www\./, '');

    // Check exact match first
    const exactMatch = PLATFORM_NAMES[hostname];
    if (exactMatch) {
      return exactMatch;
    }

    // Check if hostname ends with a known domain (handles subdomains like in.tradingview.com)
    for (const [domain, name] of Object.entries(PLATFORM_NAMES)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return name;
      }
    }

    // Fallback: clean up the domain for display
    // Remove common TLDs and capitalize
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const domainName = parts[parts.length - 2] ?? hostname;
      return domainName.charAt(0).toUpperCase() + domainName.slice(1);
    }

    return hostname;
  } catch {
    return 'Unknown';
  }
}
