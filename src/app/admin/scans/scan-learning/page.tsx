import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import type { CategoryPrecisionStats, TierPrecisionStats } from '@/types';

// Human-readable tier names
const TIER_NAMES: Record<number, { label: string; description: string }> = {
  1: { label: 'Broad Discovery', description: 'Wide-net queries: product name + piracy terms, AI-generated terms, alternative names' },
  2: { label: 'Targeted Platforms', description: 'Site-specific searches: torrent sites, cyberlockers, forums, Telegram, platform scanners' },
  3: { label: 'Signal Deep Dive', description: 'Follow-up queries: copyrighted terms, hot domains, brand identifiers' },
};

// Human-readable category names
const CATEGORY_LABELS: Record<string, string> = {
  'name-only': 'Name-Only Search',
  'ai-piracy': 'AI Piracy Terms',
  'piracy-core': 'Core Piracy Terms',
  'piracy-short': 'Short Name + Piracy',
  'alt-name': 'Alternative Names',
  'user-keyword': 'User Keywords',
  'brand': 'Brand Search',
  'ai-phrase': 'AI Unique Phrases',
  'platform-google': 'Google Platform Terms',
  'discovery-supplement': 'Discovery Supplement',
  'intelligence': 'Intelligence-Enhanced',
  'dedicated-site': 'Dedicated Piracy Sites',
  'telegram-ai': 'Telegram (AI Terms)',
  'telegram': 'Telegram Search',
  'torrent': 'Torrent Sites',
  'cyberlocker': 'Cyberlocker Sites',
  'warez-forum': 'Warez Forums',
  'code-repo': 'Code Repositories',
  'file-ext': 'File Extension Search',
  'auto-identifier': 'Auto Identifiers',
  'ai-copyright': 'AI Copyrighted Terms',
  'ai-brand': 'AI Brand Identifiers',
  'unique-id': 'Unique Identifiers',
  'hot-domain': 'Hot Domain Deep-Dive',
  'platform-telegram': 'Telegram Bot API',
  'platform-cyberlocker': 'Cyberlocker Scanner',
  'platform-torrent': 'Torrent Scanner',
  'platform-forum': 'Forum Scanner',
  'platform-discord': 'Discord Scanner',
};

function getPrecisionColor(pct: number | null): string {
  if (pct === null) return 'text-pg-text-muted';
  if (pct >= 70) return 'text-green-400';
  if (pct >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

function getPrecisionBg(pct: number | null): string {
  if (pct === null) return 'bg-pg-surface-light';
  if (pct >= 70) return 'bg-green-500/10 border-green-500/20';
  if (pct >= 40) return 'bg-yellow-500/10 border-yellow-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

export default async function ScanLearningPage() {
  const supabase = await createClient();

  // Fetch tier-level stats
  const { data: tierRows } = await supabase
    .from('admin_tier_precision')
    .select('*')
    .order('query_tier');
  const tierStats = (tierRows || []) as TierPrecisionStats[];

  // Fetch category-level stats
  const { data: categoryRows } = await supabase
    .from('admin_category_precision')
    .select('*')
    .order('query_tier')
    .order('total_results', { ascending: false });
  const categoryStats = (categoryRows || []) as CategoryPrecisionStats[];

  // Group categories by tier
  const categoriesByTier = new Map<number, CategoryPrecisionStats[]>();
  for (const cat of categoryStats) {
    const existing = categoriesByTier.get(cat.query_tier) || [];
    existing.push(cat);
    categoriesByTier.set(cat.query_tier, existing);
  }

  // Overall stats
  const totalResults = tierStats.reduce((sum, t) => sum + t.total_results, 0);
  const totalVerified = tierStats.reduce((sum, t) => sum + t.verified_count, 0);
  const totalRejected = tierStats.reduce((sum, t) => sum + t.rejected_count, 0);
  const totalPending = tierStats.reduce((sum, t) => sum + t.pending_count, 0);
  const totalReviewed = totalVerified + totalRejected;
  const overallPrecision = totalReviewed > 0
    ? Math.round((totalVerified / totalReviewed) * 100 * 10) / 10
    : null;

  // Learning status
  const hasData = totalResults > 0;
  const hasReviews = totalReviewed > 0;
  const reviewProgress = totalResults > 0 ? Math.round((totalReviewed / totalResults) * 100) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Scan Learning System</h1>
        <p className="text-pg-text-muted">
          Track precision per query category. User verification (confirm/reject) trains
          the system to learn which search strategies find real infringements.
        </p>
      </div>

      {/* Status Banner */}
      {!hasData && (
        <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <p className="text-sm text-blue-300">
            No scan data with query categories yet. Run a scan after deploying the
            migration to start collecting data. Categories are tracked automatically.
          </p>
        </div>
      )}

      {hasData && !hasReviews && (
        <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-sm text-yellow-300">
            {totalResults} results found but none reviewed yet. Precision scores appear
            after users verify or reject infringements.
          </p>
        </div>
      )}

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{totalResults}</p>
          <p className="text-xs text-pg-text-muted">Total Results</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{totalVerified}</p>
          <p className="text-xs text-pg-text-muted">Verified</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{totalRejected}</p>
          <p className="text-xs text-pg-text-muted">Rejected</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{totalPending}</p>
          <p className="text-xs text-pg-text-muted">Pending Review</p>
        </Card>
        <Card className={`p-4 text-center border ${getPrecisionBg(overallPrecision)}`}>
          <p className={`text-2xl font-bold ${getPrecisionColor(overallPrecision)}`}>
            {overallPrecision !== null ? `${overallPrecision}%` : '--'}
          </p>
          <p className="text-xs text-pg-text-muted">Overall Precision</p>
        </Card>
      </div>

      {/* Review Progress Bar */}
      {hasData && (
        <div className="mb-8">
          <div className="flex justify-between text-xs text-pg-text-muted mb-1">
            <span>Review Progress</span>
            <span>{totalReviewed}/{totalResults} reviewed ({reviewProgress}%)</span>
          </div>
          <div className="w-full bg-pg-surface-light rounded-full h-2">
            <div
              className="bg-pg-accent h-2 rounded-full transition-all"
              style={{ width: `${reviewProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tier Cards */}
      {[1, 2, 3].map((tier) => {
        const tierInfo = TIER_NAMES[tier];
        const tierStat = tierStats.find((t) => t.query_tier === tier);
        const categories = categoriesByTier.get(tier) || [];
        const tierPrecision = tierStat?.precision_pct ?? null;

        return (
          <div key={tier} className="mb-8">
            {/* Tier Header */}
            <div className={`flex items-center justify-between p-4 rounded-xl border mb-3 ${getPrecisionBg(tierPrecision)}`}>
              <div>
                <h2 className="text-lg font-bold">
                  Tier {tier}: {tierInfo?.label || 'Unknown'}
                </h2>
                <p className="text-xs text-pg-text-muted mt-0.5">
                  {tierInfo?.description || ''}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${getPrecisionColor(tierPrecision)}`}>
                  {tierPrecision !== null ? `${tierPrecision}%` : '--'}
                </p>
                <p className="text-xs text-pg-text-muted">
                  {tierStat ? `${tierStat.total_results} results` : 'No data'}
                </p>
              </div>
            </div>

            {/* Category Breakdown */}
            {categories.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-pg-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-pg-surface-light text-pg-text-muted text-xs">
                      <th className="text-left px-4 py-2 font-medium">Category</th>
                      <th className="text-center px-3 py-2 font-medium">Results</th>
                      <th className="text-center px-3 py-2 font-medium">Verified</th>
                      <th className="text-center px-3 py-2 font-medium">Rejected</th>
                      <th className="text-center px-3 py-2 font-medium">Pending</th>
                      <th className="text-center px-3 py-2 font-medium">Precision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pg-border">
                    {categories.map((cat, i) => (
                      <tr key={`${cat.query_category}-${cat.product_type}-${i}`} className="hover:bg-pg-surface-light/50">
                        <td className="px-4 py-2.5">
                          <span className="font-medium">
                            {CATEGORY_LABELS[cat.query_category] || cat.query_category}
                          </span>
                          {cat.product_type && (
                            <span className="ml-2 text-xs text-pg-text-muted bg-pg-surface-light px-1.5 py-0.5 rounded">
                              {cat.product_type}
                            </span>
                          )}
                        </td>
                        <td className="text-center px-3 py-2.5">{cat.total_results}</td>
                        <td className="text-center px-3 py-2.5 text-green-400">{cat.verified_count}</td>
                        <td className="text-center px-3 py-2.5 text-red-400">{cat.rejected_count}</td>
                        <td className="text-center px-3 py-2.5 text-yellow-400">{cat.pending_count}</td>
                        <td className={`text-center px-3 py-2.5 font-bold ${getPrecisionColor(cat.precision_pct)}`}>
                          {cat.precision_pct !== null ? `${cat.precision_pct}%` : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Card className="p-4">
                <p className="text-sm text-pg-text-muted text-center">
                  No results from Tier {tier} queries yet
                </p>
              </Card>
            )}
          </div>
        );
      })}

      {/* Learning System Status */}
      <Card className="p-6 mt-4">
        <h3 className="text-lg font-bold mb-3">Learning System Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-pg-text-muted">Bayesian Weight Computation</span>
            <span className="text-yellow-400 font-medium">Scaffolded (Inactive)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-pg-text-muted">Auto Budget Reallocation</span>
            <span className="text-yellow-400 font-medium">Scaffolded (Inactive)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-pg-text-muted">Health Canary / Auto-Revert</span>
            <span className="text-yellow-400 font-medium">Scaffolded (Inactive)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-pg-text-muted">AI Filter Context Injection</span>
            <span className="text-green-400 font-medium">Active</span>
          </div>
          <div className="flex justify-between">
            <span className="text-pg-text-muted">Query Category Tracking</span>
            <span className="text-green-400 font-medium">Active</span>
          </div>
        </div>
        <p className="text-xs text-pg-text-muted mt-4 border-t border-pg-border pt-3">
          Steps 4-5 (Bayesian weights, health canary, auto-revert) are database-ready but
          dormant. They will be activated when 200+ results have been reviewed, providing
          enough statistical signal for reliable weight computation.
        </p>
      </Card>
    </div>
  );
}
