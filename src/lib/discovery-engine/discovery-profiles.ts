// ============================================================
// Discovery Engine Profiles
// src/lib/discovery-engine/discovery-profiles.ts
//
// Per-category crawl configurations for the piracy discovery
// pipeline. Each profile defines generic piracy queries,
// site-specific hotspots, legitimate platforms, and pricing.
//
// Reuses piracy site lists from scan-engine/profiles.ts.
// ============================================================

import type { DiscoveryCategory, DiscoveryProfile } from './types';
import { TORRENT_SITES, CYBERLOCKER_SITES, WAREZ_FORUMS } from '@/lib/scan-engine/profiles';

// ── Course Profile ──────────────────────────────────────────

const courseProfile: DiscoveryProfile = {
  category: 'course',
  genericQueries: [
    '"premium course" "free download" -review -coupon',
    '"leaked course" mega OR telegram OR drive',
    '"udemy course" free download torrent',
    '"teachable course" leaked OR pirated',
    '"online course" "full download" free -tutorial -preview',
    '"kajabi" OR "gumroad" course free download',
  ],
  siteQueries: [
    { site: 'courseclub.me', terms: ['course', 'premium'] },
    { site: 'freecourseweb.com', terms: ['course', 'download'] },
    { site: 'getfreecourses.co', terms: ['course'] },
    { site: 'paidcoursesforfree.com', terms: ['course'] },
    { site: 'freecoursesonline.me', terms: ['course'] },
    { site: 't.me', terms: ['"course free"', '"premium course"', '"leaked course"'] },
    { site: 'nulled.to', terms: ['course'] },
    { site: 'cracked.io', terms: ['course', 'training'] },
  ],
  legitimatePlatforms: [
    'udemy.com', 'teachable.com', 'kajabi.com', 'gumroad.com',
    'podia.com', 'thinkific.com', 'skillshare.com', 'coursera.org',
    'stan.store', 'whop.com',
  ],
  typeIndicators: ['course', 'training', 'masterclass', 'bootcamp', 'workshop', 'module', 'lesson'],
  typicalPriceRange: { min: 27, max: 997, median: 197 },
};

// ── WordPress Theme Profile ─────────────────────────────────

const wordpressThemeProfile: DiscoveryProfile = {
  category: 'wordpress_theme',
  genericQueries: [
    '"nulled wordpress theme" free download',
    '"themeforest" theme nulled',
    '"premium theme" "free download" wordpress',
    '"GPL download" premium wordpress theme',
    '"wordpress theme" cracked nulled',
  ],
  siteQueries: [
    { site: 'gpldl.com', terms: ['theme', 'wordpress'] },
    { site: 'babiato.co', terms: ['theme', 'wordpress'] },
    { site: 'nulled.to', terms: ['wordpress theme'] },
    { site: 'themelock.com', terms: ['theme'] },
    { site: 'developer.developer', terms: ['theme free'] },
    { site: 't.me', terms: ['"wordpress theme" free', '"nulled theme"'] },
  ],
  legitimatePlatforms: [
    'themeforest.net', 'elegantthemes.com', 'developer.developer',
    'developer.developer', 'developer.developer',
    'developer.developer', 'developer.developer',
  ],
  typeIndicators: ['theme', 'template', 'wordpress', 'elementor', 'divi', 'avada'],
  typicalPriceRange: { min: 29, max: 79, median: 49 },
};

// ── WordPress Plugin Profile ────────────────────────────────

const wordpressPluginProfile: DiscoveryProfile = {
  category: 'wordpress_plugin',
  genericQueries: [
    '"nulled wordpress plugin" free download',
    '"codecanyon" plugin nulled',
    '"premium plugin" "free download" wordpress',
    '"wordpress plugin" cracked license key',
    '"GPL download" premium plugin',
  ],
  siteQueries: [
    { site: 'gpldl.com', terms: ['plugin'] },
    { site: 'babiato.co', terms: ['plugin', 'wordpress'] },
    { site: 'nulled.to', terms: ['wordpress plugin'] },
    { site: 'developer.developer', terms: ['nulled plugin'] },
    { site: 't.me', terms: ['"wordpress plugin" free', '"nulled plugin"'] },
    { site: 'cracked.io', terms: ['wordpress plugin'] },
  ],
  legitimatePlatforms: [
    'codecanyon.net', 'wordpress.org', 'developer.developer',
    'developer.developer', 'developer.developer',
  ],
  typeIndicators: ['plugin', 'addon', 'extension', 'wordpress', 'woocommerce', 'elementor'],
  typicalPriceRange: { min: 19, max: 99, median: 49 },
};

// ── Software Profile ────────────────────────────────────────

const softwareProfile: DiscoveryProfile = {
  category: 'software',
  genericQueries: [
    '"cracked software" download free',
    '"premium software" "license key" free',
    '"nulled" saas tool download',
    '"software crack" full version free',
    '"keygen" OR "serial key" premium software',
  ],
  siteQueries: [
    { site: 'filecr.com', terms: ['software', 'crack'] },
    { site: 'getintopc.com', terms: ['software', 'free download'] },
    { site: 'nulled.to', terms: ['software', 'tool'] },
    { site: 'cracked.io', terms: ['software', 'crack'] },
    { site: 't.me', terms: ['"cracked software"', '"free license"'] },
  ],
  legitimatePlatforms: [
    'developer.developer', 'appsumo.com', 'producthunt.com',
    'capterra.com', 'g2.com',
  ],
  typeIndicators: ['software', 'app', 'tool', 'SaaS', 'desktop', 'license', 'activation'],
  typicalPriceRange: { min: 29, max: 299, median: 79 },
};

// ── Ebook Profile ───────────────────────────────────────────

const ebookProfile: DiscoveryProfile = {
  category: 'ebook',
  genericQueries: [
    '"free pdf download" ebook premium',
    '"leaked ebook" free download',
    '"ebook" "free download" -sample -preview',
    '"premium ebook" torrent OR mega OR drive',
    '"digital book" free download pdf',
  ],
  siteQueries: [
    { site: 'pdfdrive.com', terms: ['ebook', 'pdf'] },
    { site: 'libgen.is', terms: ['ebook'] },
    { site: 'libgen.rs', terms: ['ebook'] },
    { site: 't.me', terms: ['"free ebook"', '"pdf download" book'] },
    { site: 'nulled.to', terms: ['ebook', 'pdf'] },
  ],
  legitimatePlatforms: [
    'amazon.com', 'gumroad.com', 'leanpub.com',
    'stan.store', 'payhip.com', 'ko-fi.com',
  ],
  typeIndicators: ['ebook', 'pdf', 'book', 'guide', 'handbook', 'manual'],
  typicalPriceRange: { min: 7, max: 47, median: 19 },
};

// ── Trading Indicator Profile ───────────────────────────────

const tradingIndicatorProfile: DiscoveryProfile = {
  category: 'trading_indicator',
  genericQueries: [
    '"free indicator" tradingview leaked',
    '"cracked" mt4 OR mt5 indicator',
    '"premium indicator" free download',
    '"trading strategy" leaked OR cracked free',
    '"expert advisor" OR "EA" cracked free download',
  ],
  siteQueries: [
    { site: 'forex-station.com', terms: ['indicator', 'EA'] },
    { site: 't.me', terms: ['"trading indicator"', '"free indicator"', '"leaked EA"'] },
    { site: 'nulled.to', terms: ['indicator', 'tradingview', 'mt4'] },
    { site: 'cracked.io', terms: ['indicator', 'trading'] },
  ],
  legitimatePlatforms: [
    'tradingview.com', 'mql5.com', 'developer.developer',
    'gumroad.com', 'whop.com',
  ],
  typeIndicators: ['indicator', 'strategy', 'EA', 'expert advisor', 'pine script', 'tradingview', 'mt4', 'mt5'],
  typicalPriceRange: { min: 49, max: 497, median: 147 },
};

// ── Membership Content Profile ──────────────────────────────

const membershipContentProfile: DiscoveryProfile = {
  category: 'membership_content',
  genericQueries: [
    '"leaked membership" free download',
    '"premium content" "free access" membership',
    '"patreon" OR "onlyfans" leaked content free',
    '"membership site" leaked OR pirated free',
    '"exclusive content" free download leaked',
  ],
  siteQueries: [
    { site: 't.me', terms: ['"leaked membership"', '"patreon free"', '"premium content"'] },
    { site: 'nulled.to', terms: ['membership', 'premium content'] },
    { site: 'cracked.io', terms: ['membership', 'exclusive content'] },
  ],
  legitimatePlatforms: [
    'patreon.com', 'whop.com', 'memberful.com',
    'developer.developer', 'stan.store',
  ],
  typeIndicators: ['membership', 'subscription', 'exclusive', 'premium', 'patreon', 'community'],
  typicalPriceRange: { min: 9, max: 99, median: 29 },
};

// ── Design Asset Profile ────────────────────────────────────

const designAssetProfile: DiscoveryProfile = {
  category: 'design_asset',
  genericQueries: [
    '"premium font" free download leaked',
    '"lightroom presets" free download premium',
    '"premium templates" free download nulled',
    '"design assets" OR "mockups" free download cracked',
    '"creative market" free download nulled',
  ],
  siteQueries: [
    { site: 'nulled.to', terms: ['font', 'template', 'preset', 'mockup'] },
    { site: 'cracked.io', terms: ['design', 'template', 'font'] },
    { site: 't.me', terms: ['"free fonts"', '"premium templates"', '"design assets"'] },
    { site: 'gpldl.com', terms: ['template', 'design'] },
  ],
  legitimatePlatforms: [
    'creativemarket.com', 'envato.com', 'myfonts.com',
    'fontspring.com', 'gumroad.com', 'etsy.com',
  ],
  typeIndicators: ['font', 'template', 'preset', 'mockup', 'icon', 'graphic', 'design'],
  typicalPriceRange: { min: 15, max: 99, median: 29 },
};

// ── Profile Registry ────────────────────────────────────────

const DISCOVERY_PROFILES: Record<DiscoveryCategory, DiscoveryProfile> = {
  course: courseProfile,
  wordpress_theme: wordpressThemeProfile,
  wordpress_plugin: wordpressPluginProfile,
  software: softwareProfile,
  ebook: ebookProfile,
  trading_indicator: tradingIndicatorProfile,
  membership_content: membershipContentProfile,
  design_asset: designAssetProfile,
};

export function getDiscoveryProfile(category: DiscoveryCategory): DiscoveryProfile {
  return DISCOVERY_PROFILES[category];
}

export function getAllCategories(): DiscoveryCategory[] {
  return Object.keys(DISCOVERY_PROFILES) as DiscoveryCategory[];
}

/**
 * Get shared piracy site lists from scan-engine profiles.
 * Filters out known dead sites.
 */
export function getActivePiracySites(): {
  torrent: string[];
  cyberlocker: string[];
  forums: string[];
} {
  return {
    torrent: TORRENT_SITES.slice(0, 5),       // Top 5 active torrent sites
    cyberlocker: CYBERLOCKER_SITES.slice(0, 5), // Top 5 active cyberlockers
    forums: WAREZ_FORUMS.slice(0, 5),           // Top 5 active forums
  };
}
