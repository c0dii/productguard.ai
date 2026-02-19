import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getProductScanStatus, formatTimeAgo } from '@/lib/scan-history';
import { InfringementTrendChart } from '@/components/dashboard/InfringementTrendChart';
import { PendingVerificationList } from '@/components/dashboard/PendingVerificationList';
import { RunScanButton } from '@/components/dashboard/RunScanButton';
import { ProductWorkflowBar } from '@/components/dashboard/ProductWorkflowBar';
import { ArchiveProductButton } from '@/components/dashboard/ArchiveProductButton';
import type { Product, ProductTimelineData } from '@/types';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch product data
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (productError || !product) {
    redirect('/dashboard/products');
  }

  // Fetch active scan status
  const scanStatus = await getProductScanStatus(id);

  // Fetch pending verifications (initial page of 10, sorted by severity)
  const [{ data: pendingInfringements }, { count: pendingTotal }, { count: activeCount }] = await Promise.all([
    supabase
      .from('infringements')
      .select('*')
      .eq('product_id', id)
      .eq('status', 'pending_verification')
      .order('severity_score', { ascending: false })
      .limit(10),
    supabase
      .from('infringements')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)
      .eq('status', 'pending_verification'),
    supabase
      .from('infringements')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', id)
      .in('status', ['active', 'takedown_sent', 'disputed']),
  ]);

  // Fetch timeline data for the chart (last 30 days of verified infringements)
  let timelineData: ProductTimelineData[] = [];
  try {
    const adminClient = createAdminClient();
    const { data: timeline } = await adminClient
      .from('product_infringement_timeline')
      .select('*')
      .eq('product_id', id)
      .order('date', { ascending: true });
    timelineData = timeline || [];
  } catch {
    // Materialized view may not exist yet - that's ok
    timelineData = [];
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/products"
          className="text-pg-text-muted hover:text-pg-accent mb-3 sm:mb-4 inline-flex items-center gap-1 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Products
        </Link>

        <h1 className="text-xl sm:text-3xl font-bold text-pg-text truncate mt-2">{product.name}</h1>
      </div>

      {/* Workflow Progress Bar */}
      <ProductWorkflowBar
        scanStatus={scanStatus}
        pendingCount={pendingTotal ?? 0}
        activeCount={activeCount ?? 0}
        productId={id}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Product Image & Details */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <div className="bg-pg-surface border border-pg-border rounded-lg p-4 sm:p-6">
            {product.product_image_url ? (
              <div className="w-full aspect-video bg-pg-bg rounded-lg border border-pg-border overflow-hidden flex items-center justify-center">
                <img
                  src={product.product_image_url}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-full aspect-video sm:aspect-square bg-pg-bg flex items-center justify-center rounded-lg border border-pg-border p-4">
                <span className="text-pg-text text-lg sm:text-xl font-bold text-center leading-tight">{product.name}</span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <Link
                href={`/dashboard/products?edit=${product.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-pg-text bg-pg-surface hover:bg-pg-surface-light border border-pg-border rounded-lg transition-all"
              >
                ✏️ Edit Product
              </Link>
              <ArchiveProductButton productId={product.id} />
            </div>

            <div className="space-y-3 mt-4 sm:mt-6">
              <div>
                <dt className="text-xs text-pg-text-muted">Type</dt>
                <dd className="text-sm text-pg-text capitalize mt-1">{product.type}</dd>
              </div>
              <div>
                <dt className="text-xs text-pg-text-muted">Price</dt>
                <dd className="text-sm text-pg-text mt-1">${product.price.toFixed(2)}</dd>
              </div>
              {product.url && (
                <div>
                  <dt className="text-xs text-pg-text-muted">Official URL</dt>
                  <dd className="text-sm text-pg-accent mt-1 truncate">
                    <a href={product.url} target="_blank" rel="noopener noreferrer">
                      {product.url}
                    </a>
                  </dd>
                </div>
              )}
              {product.keywords && product.keywords.length > 0 && (
                <div>
                  <dt className="text-xs text-pg-text-muted mb-2">Keywords</dt>
                  <dd className="flex flex-wrap gap-2">
                    {product.keywords.map((keyword: string) => (
                      <span
                        key={keyword}
                        className="px-2 py-1 bg-pg-bg text-xs rounded border border-pg-border"
                      >
                        {keyword}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Chart, Stats, Verifications */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Infringement Trend Chart */}
          <div className="bg-pg-surface border border-pg-border rounded-lg p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-pg-text">Infringement Trends</h2>
            <InfringementTrendChart data={timelineData} />
          </div>

          {/* Scan Overview */}
          {scanStatus?.scan_id ? (
            <div className="bg-pg-surface border border-pg-border rounded-lg p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg font-semibold">Scan Overview</h2>
                <RunScanButton productId={id} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <div className="bg-pg-surface-light p-3 sm:p-4 rounded-lg border border-pg-border">
                  <dt className="text-[10px] sm:text-xs text-pg-text-muted">Last Scanned</dt>
                  <dd className="text-sm sm:text-lg font-semibold text-pg-text mt-1">
                    {formatTimeAgo(scanStatus.last_run_at)}
                  </dd>
                </div>
                <div className="bg-pg-surface-light p-3 sm:p-4 rounded-lg border border-pg-border">
                  <dt className="text-[10px] sm:text-xs text-pg-text-muted">Total Runs</dt>
                  <dd className="text-sm sm:text-lg font-semibold text-pg-text mt-1">{scanStatus.run_count || 0}</dd>
                </div>
                <div className="bg-pg-surface-light p-3 sm:p-4 rounded-lg border border-pg-border">
                  <dt className="text-[10px] sm:text-xs text-pg-text-muted">Pending Review</dt>
                  <dd className="text-sm sm:text-lg font-semibold text-yellow-400 mt-1">
                    {scanStatus.pending_verification_count}
                  </dd>
                </div>
                <div className="bg-pg-surface-light p-3 sm:p-4 rounded-lg border border-pg-border">
                  <dt className="text-[10px] sm:text-xs text-pg-text-muted">Active Threats</dt>
                  <dd className="text-sm sm:text-lg font-semibold text-red-400 mt-1">{scanStatus.active_count}</dd>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-pg-surface border border-pg-border rounded-lg p-4 sm:p-6 text-center">
              <p className="text-pg-text-muted mb-3">No scans yet for this product</p>
              <RunScanButton productId={id} />
            </div>
          )}
        </div>
      </div>

      {/* Pending Verifications - full width */}
      {(pendingTotal ?? 0) > 0 && (
        <PendingVerificationList
          initialInfringements={pendingInfringements || []}
          initialTotal={pendingTotal ?? 0}
          productId={id}
          product={product}
          userId={user.id}
        />
      )}
    </div>
  );
}
