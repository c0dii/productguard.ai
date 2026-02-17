/**
 * Keyword Quality Utilities
 *
 * Filters out generic, industry-standard terms that would cause false positives
 * when used for infringement detection. Keywords should be brand-specific and
 * product-specific — not generic industry vocabulary.
 *
 * Example: For "10x Bars Indicator by Simpler Trading"
 *   GOOD: "10x Bars", "Simpler Trading", "10x Bars Indicator"
 *   BAD:  "trading", "indicator", "chart", "review"
 */

/**
 * Generic single words that should NEVER be used as standalone keywords
 * for infringement matching. These are common industry terms found on
 * virtually any page in the same vertical.
 */
const GENERIC_STOPWORDS = new Set([
  // Trading / Finance
  'trading', 'trader', 'traders', 'trade', 'trades',
  'indicator', 'indicators', 'strategy', 'strategies',
  'chart', 'charts', 'charting', 'analysis', 'analytics',
  'market', 'markets', 'stock', 'stocks', 'forex', 'crypto',
  'bitcoin', 'currency', 'currencies', 'investment', 'investing',
  'portfolio', 'profit', 'profits', 'loss', 'losses',
  'signal', 'signals', 'alert', 'alerts', 'scanner',
  'broker', 'brokers', 'exchange', 'exchanges',
  'bullish', 'bearish', 'buy', 'sell', 'long', 'short',
  'candlestick', 'candle', 'candles', 'volume', 'price',
  'resistance', 'support', 'breakout', 'momentum', 'trend',
  'swing', 'scalp', 'scalping', 'daytrading', 'options',
  'futures', 'commodities', 'bonds', 'etf', 'etfs',
  'rsi', 'macd', 'ema', 'sma', 'fibonacci', 'bollinger',
  'stochastic', 'atr', 'vwap', 'moving average',

  // Software / Tech
  'software', 'tool', 'tools', 'platform', 'app', 'application',
  'download', 'install', 'setup', 'plugin', 'extension',
  'dashboard', 'settings', 'features', 'feature', 'update',
  'version', 'beta', 'pro', 'premium', 'free', 'trial',
  'api', 'data', 'code', 'script', 'automation',
  'algorithm', 'system', 'systems', 'module', 'template',

  // Digital Products / Courses
  'course', 'courses', 'class', 'classes', 'lesson', 'lessons',
  'tutorial', 'tutorials', 'training', 'webinar', 'workshop',
  'ebook', 'book', 'guide', 'pdf', 'video', 'videos',
  'module', 'modules', 'chapter', 'chapters', 'content',
  'membership', 'subscription', 'access', 'lifetime',
  'beginner', 'beginners', 'advanced', 'intermediate',
  'masterclass', 'bootcamp', 'program', 'programs',

  // Marketing / Sales
  'review', 'reviews', 'testimonial', 'testimonials',
  'discount', 'coupon', 'deal', 'offer', 'sale', 'pricing',
  'bonus', 'bonuses', 'guarantee', 'refund', 'money back',
  'limited', 'exclusive', 'special', 'official', 'legit',
  'scam', 'worth', 'best', 'top', 'results', 'success',

  // Content / Publishing
  'article', 'articles', 'blog', 'post', 'posts', 'page', 'pages',
  'resource', 'resources', 'library', 'archive', 'archives',
  'news', 'report', 'reports', 'research', 'whitepaper',
  'infographic', 'podcast', 'episode', 'episodes', 'series',
  'newsletter', 'publication', 'media', 'press', 'release',
  'faq', 'documentation', 'docs', 'manual', 'reference',
  'link', 'links', 'site', 'website', 'homepage', 'landing',

  // General / Common
  'online', 'digital', 'learn', 'learning', 'education',
  'performance', 'professional', 'expert', 'experts',
  'community', 'group', 'member', 'members', 'join',
  'live', 'real-time', 'realtime', 'automated', 'manual',
  'custom', 'simple', 'easy', 'powerful', 'complete',
  'ultimate', 'comprehensive', 'new', 'latest',
  'method', 'methods', 'technique', 'techniques', 'approach',
  'setup', 'configuration', 'config', 'option', 'options',
  'service', 'services', 'product', 'products', 'item', 'items',
  'account', 'profile', 'user', 'users', 'admin', 'login',
  'password', 'email', 'contact', 'help', 'support', 'about',
  'home', 'search', 'browse', 'category', 'categories', 'tag', 'tags',

  // Platform names (generic, not product-specific)
  'tradingview', 'metatrader', 'mt4', 'mt5', 'thinkorswim',
  'ninjatrader', 'tradestation', 'webull', 'robinhood',
]);

/**
 * Check if a keyword is too generic to be useful for infringement detection.
 * A keyword is considered generic if:
 * 1. It's a single word in the stopwords list
 * 2. It's very short (≤ 2 chars)
 * 3. It's a pure number
 */
export function isGenericKeyword(keyword: string): boolean {
  const normalized = keyword.toLowerCase().trim();

  // Too short
  if (normalized.length <= 2) return true;

  // Pure number
  if (/^\d+$/.test(normalized)) return true;

  // Single word in stopwords
  if (GENERIC_STOPWORDS.has(normalized)) return true;

  // Multi-word: check if ALL words are generic (e.g., "trading indicator" = generic)
  const words = normalized.split(/\s+/);
  if (words.length > 1 && words.every(w => GENERIC_STOPWORDS.has(w) || w.length <= 2)) {
    return true;
  }

  return false;
}

/**
 * Filter a keyword list to only include product-specific terms.
 * Keeps brand names, product names, and distinctive multi-word phrases.
 */
export function filterGenericKeywords(keywords: string[]): string[] {
  return keywords.filter(kw => !isGenericKeyword(kw));
}

/**
 * Score a keyword's specificity (0 = generic, 1 = highly specific).
 * Used to rank keywords for search query prioritization.
 */
export function keywordSpecificityScore(keyword: string): number {
  const normalized = keyword.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  // Single generic word
  if (words.length === 1 && GENERIC_STOPWORDS.has(normalized)) return 0;

  // Multi-word where all words are generic
  if (words.length > 1 && words.every(w => GENERIC_STOPWORDS.has(w) || w.length <= 2)) return 0.1;

  // Single word NOT in stopwords (could be a brand: "Simpler")
  if (words.length === 1) return 0.5;

  // Multi-word with at least one non-generic word
  const specificWordCount = words.filter(w => !GENERIC_STOPWORDS.has(w) && w.length > 2).length;
  const specificity = specificWordCount / words.length;

  // Bonus for longer phrases (more distinctive)
  const lengthBonus = Math.min(words.length * 0.1, 0.3);

  return Math.min(specificity + lengthBonus, 1.0);
}

/**
 * Check if a keyword is suitable for evidence display.
 * Stricter than search query filtering — only show evidence for
 * terms that are clearly product-specific.
 */
export function isEvidenceWorthy(keyword: string, productName: string, brandName?: string | null): boolean {
  const normalized = keyword.toLowerCase().trim();

  // Always allow product name or brand name matches
  if (productName && normalized.includes(productName.toLowerCase())) return true;
  if (brandName && normalized.includes(brandName.toLowerCase())) return true;

  // Reject generic single words
  if (isGenericKeyword(keyword)) return false;

  // Multi-word phrases with at least one specific word are evidence-worthy
  return keywordSpecificityScore(keyword) >= 0.5;
}
