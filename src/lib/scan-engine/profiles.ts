/**
 * Scan Profiles - Product-type-specific configuration for search queries,
 * scoring, and false positive filtering.
 *
 * Each product type (course, indicator, software, template, ebook, other)
 * has a tailored profile with piracy terms, file extensions, known
 * piracy sites, legitimate sites, and confidence boost/penalty terms.
 */

import type { ProductType } from '@/types';

// ============================================================================
// SHARED SITE LISTS
// ============================================================================

export const TORRENT_SITES = [
  '1337x.to',
  'thepiratebay.org',
  'torrentgalaxy.to',
  'yts.mx',
  'eztv.re',
  'torlock.com',
  'limetorrents.pro',
  'nyaa.si',
  'rutracker.org',
  'btdig.com',
];

export const CYBERLOCKER_SITES = [
  'mega.nz',
  'mediafire.com',
  'drive.google.com',
  'dropbox.com',
  '4shared.com',
  'uploaded.net',
  'rapidgator.net',
  'sendspace.com',
  'fichier.com',
  'uptobox.com',
];

export const WAREZ_FORUMS = [
  'nulled.to',
  'cracked.io',
  'sinisterly.com',
  'hackforums.net',
  'leakforums.co',
  'blackhatworld.com',
  'nsaneforums.com',
];

export const CODE_REPOS = [
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'pastebin.com',
];

/**
 * Sites known to be dead/offline — skip to save API calls.
 */
export const DEAD_SITES = new Set([
  'zippyshare.com', // Shut down 2023
  'anonfiles.com', // Shut down 2023
  'rarbg.to', // Shut down 2023
  'zooqle.com', // Unstable/offline
  'torrentz2.eu', // Often offline
]);

// ============================================================================
// SCAN PROFILE INTERFACE
// ============================================================================

export interface ScanProfile {
  type: ProductType;
  /** Terms that indicate piracy when found alongside the product name */
  piracyTerms: string[];
  /** File extensions commonly associated with this product type */
  fileExtensions: string[];
  /** Known sites that frequently host pirated copies of this product type */
  dedicatedSites: string[];
  /** Legitimate sites that should NOT be flagged */
  legitimateSites: string[];
  /** Terms that increase confidence of a real infringement */
  boostTerms: string[];
  /** Terms that decrease confidence (likely review, tutorial, legit page) */
  penaltyTerms: string[];
  /** Weight (0-1) for each platform type — how relevant it is for this product type */
  platformWeights: Record<string, number>;
}

// ============================================================================
// PRODUCT TYPE PROFILES
// ============================================================================

const courseProfile: ScanProfile = {
  type: 'course',
  piracyTerms: [
    'free download',
    'free course',
    'leaked',
    'torrent',
    'mega link',
    'google drive',
    'telegram group',
    'full course free',
    'premium free',
    'download free',
    'get free',
    'nulled',
    'cracked',
    'course download',
    'free access',
    'drive link',
    'free training',
    'pirated',
    'shared free',
  ],
  fileExtensions: ['.mp4', '.mkv', '.avi', '.zip', '.rar', '.pdf'],
  dedicatedSites: [
    'tradesmint.com',
    'rocket.place',
    'dlsub.com',
    'trading123.net',
    'digitalassistant.academy',
    'courseclub.me',
    'freecourseweb.com',
    'freecoursesonline.me',
    'getfreecourses.co',
    'tutorialsplanet.net',
    'coursedown.com',
    'paidcoursesforfree.com',
    'desirecourse.net',
    'myfreecourses.com',
    'ftuudemy.com',
    'coursesity.com',
  ],
  legitimateSites: [
    'udemy.com',
    'coursera.org',
    'skillshare.com',
    'teachable.com',
    'thinkific.com',
    'kajabi.com',
    'podia.com',
    'gumroad.com',
    'youtube.com',
    'linkedin.com/learning',
    'pluralsight.com',
    'edx.org',
    'masterclass.com',
  ],
  boostTerms: [
    'free download',
    'leaked',
    'pirated',
    'mega.nz',
    'mediafire',
    'telegram',
    'full course',
    'premium free',
    'nulled',
  ],
  penaltyTerms: [
    'review',
    'tutorial',
    'how to',
    'official',
    'buy now',
    'enroll',
    'pricing',
    'coupon',
    'discount',
    'affiliate',
  ],
  platformWeights: {
    google: 1.0,
    telegram: 0.9,
    cyberlocker: 0.8,
    torrent: 0.7,
    forum: 0.6,
    discord: 0.5,
    social: 0.3,
  },
};

const indicatorProfile: ScanProfile = {
  type: 'indicator',
  piracyTerms: [
    'free download',
    'cracked',
    'nulled',
    'leaked',
    'pirated',
    'clone',
    'copy',
    'replica',
    'free indicator',
    'open source version',
    'decompiled',
    'unlocked',
    'premium free',
    'full version free',
    'torrent',
    'mega link',
    'shared',
  ],
  fileExtensions: ['.ex4', '.ex5', '.mq4', '.mq5', '.pine', '.zip', '.rar'],
  dedicatedSites: [
    'tradingview.com/script',
    'mql5.com/market',
    'mql5.com',
    'prorealcode.com',
    'forex-station.com',
    'best-metatrader-indicators.com',
    'wstrades.com',
    'strategyquant.com',
    'tosindicators.com',
    'software.informer.com',
    'etsy.com',
  ],
  legitimateSites: [
    'youtube.com',
    'investopedia.com',
    'babypips.com',
    'tradingview.com/chart',
  ],
  boostTerms: [
    'cracked',
    'nulled',
    'free download',
    'decompiled',
    'clone',
    'leaked',
    'pirated',
    'replica',
    'unlock',
    'keygen',
  ],
  penaltyTerms: [
    'review',
    'tutorial',
    'how to use',
    'backtest',
    'performance',
    'official',
    'documentation',
    'changelog',
    'update notes',
  ],
  platformWeights: {
    google: 1.0,
    telegram: 0.8,
    cyberlocker: 0.7,
    torrent: 0.6,
    forum: 0.7,
    discord: 0.5,
    social: 0.3,
  },
};

const softwareProfile: ScanProfile = {
  type: 'software',
  piracyTerms: [
    'cracked',
    'crack',
    'keygen',
    'serial key',
    'license key',
    'activation code',
    'nulled',
    'warez',
    'pirated',
    'full version free',
    'free download',
    'patch',
    'loader',
    'activator',
    'portable',
    'pre-activated',
    'torrent',
    'mega link',
    'leaked',
  ],
  fileExtensions: ['.exe', '.dmg', '.zip', '.rar', '.iso', '.msi', '.deb', '.apk'],
  dedicatedSites: [
    'filecr.com',
    'getintopc.com',
    'softonic.com',
    'download.cnet.com',
    'crackwatch.com',
    'rlsbb.cc',
    'nsaneforums.com',
    'haxpc.net',
    'crackedpc.org',
    'piratepc.me',
  ],
  legitimateSites: [
    'github.com',
    'gitlab.com',
    'sourceforge.net',
    'producthunt.com',
    'g2.com',
    'capterra.com',
    'alternativeto.net',
    'microsoft.com',
    'apple.com',
  ],
  boostTerms: [
    'crack',
    'keygen',
    'serial',
    'nulled',
    'warez',
    'activator',
    'patch',
    'loader',
    'pre-activated',
    'portable',
  ],
  penaltyTerms: [
    'review',
    'comparison',
    'alternative',
    'vs',
    'pricing',
    'documentation',
    'changelog',
    'release notes',
    'open source',
  ],
  platformWeights: {
    google: 1.0,
    torrent: 0.9,
    cyberlocker: 0.8,
    forum: 0.7,
    telegram: 0.6,
    discord: 0.5,
    social: 0.2,
  },
};

const templateProfile: ScanProfile = {
  type: 'template',
  piracyTerms: [
    'free download',
    'nulled',
    'leaked',
    'premium free',
    'shared',
    'cracked',
    'torrent',
    'mega link',
    'pirated',
    'free template',
    'full version free',
  ],
  fileExtensions: ['.zip', '.rar', '.psd', '.ai', '.fig', '.sketch', '.xd', '.html', '.css'],
  dedicatedSites: [
    'nulled.to',
    'themelock.com',
    'themehits.com',
    'freenulled.top',
    'wpnull.org',
    'gpldl.com',
    'babiato.co',
  ],
  legitimateSites: [
    'themeforest.net',
    'creativemarket.com',
    'dribbble.com',
    'behance.net',
    'figma.com',
    'canva.com',
    'envato.com',
    'templatemonster.com',
  ],
  boostTerms: [
    'nulled',
    'free download',
    'leaked',
    'premium free',
    'cracked',
    'shared',
    'gpl',
    'warez',
  ],
  penaltyTerms: [
    'preview',
    'demo',
    'showcase',
    'portfolio',
    'inspiration',
    'official',
    'documentation',
    'changelog',
  ],
  platformWeights: {
    google: 1.0,
    torrent: 0.7,
    cyberlocker: 0.8,
    forum: 0.6,
    telegram: 0.5,
    discord: 0.4,
    social: 0.2,
  },
};

const ebookProfile: ScanProfile = {
  type: 'ebook',
  piracyTerms: [
    'free pdf',
    'free download',
    'epub free',
    'torrent',
    'leaked',
    'libgen',
    'z-library',
    'sci-hub',
    'pirated',
    'full book free',
    'read online free',
    'download free',
    'mega link',
  ],
  fileExtensions: ['.pdf', '.epub', '.mobi', '.azw3', '.djvu', '.cbr', '.cbz'],
  dedicatedSites: [
    'libgen.is',
    'libgen.rs',
    'z-lib.org',
    'b-ok.cc',
    'pdfdrive.com',
    'archive.org',
    'epublibre.org',
    'mobilism.org',
    'allbooksfree.com',
  ],
  legitimateSites: [
    'amazon.com',
    'amazon.co.uk',
    'barnesandnoble.com',
    'kobo.com',
    'goodreads.com',
    'audible.com',
    'scribd.com',
  ],
  boostTerms: [
    'free pdf',
    'epub free',
    'libgen',
    'z-library',
    'pirated',
    'full book free',
    'read online free',
    'torrent',
  ],
  penaltyTerms: [
    'review',
    'summary',
    'book review',
    'synopsis',
    'author interview',
    'buy',
    'purchase',
    'preorder',
    'kindle',
  ],
  platformWeights: {
    google: 1.0,
    cyberlocker: 0.9,
    torrent: 0.8,
    forum: 0.6,
    telegram: 0.7,
    discord: 0.4,
    social: 0.2,
  },
};

const otherProfile: ScanProfile = {
  type: 'other',
  piracyTerms: [
    'free download',
    'leaked',
    'cracked',
    'nulled',
    'pirated',
    'torrent',
    'mega link',
    'mediafire',
    'premium free',
    'full version free',
    'shared',
    'free access',
  ],
  fileExtensions: ['.zip', '.rar', '.pdf', '.mp4'],
  dedicatedSites: [],
  legitimateSites: [
    'gumroad.com',
    'teachable.com',
    'shopify.com',
    'etsy.com',
    'amazon.com',
    'youtube.com',
  ],
  boostTerms: [
    'free download',
    'leaked',
    'cracked',
    'pirated',
    'nulled',
    'torrent',
    'mega.nz',
    'mediafire',
  ],
  penaltyTerms: [
    'review',
    'official',
    'buy',
    'purchase',
    'pricing',
    'tutorial',
  ],
  platformWeights: {
    google: 1.0,
    telegram: 0.7,
    cyberlocker: 0.7,
    torrent: 0.6,
    forum: 0.5,
    discord: 0.4,
    social: 0.3,
  },
};

// ============================================================================
// PROFILE REGISTRY
// ============================================================================

const PROFILES: Record<ProductType, ScanProfile> = {
  course: courseProfile,
  indicator: indicatorProfile,
  software: softwareProfile,
  template: templateProfile,
  ebook: ebookProfile,
  other: otherProfile,
};

/**
 * Get the scan profile for a product type.
 * Falls back to 'other' if the type is unknown.
 */
export function getProfile(type: ProductType): ScanProfile {
  return PROFILES[type] || PROFILES.other;
}
