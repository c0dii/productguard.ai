import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import Image from 'next/image';
import { InfringementTrendChart } from '@/components/dashboard/InfringementTrendChart';
import { PendingVerificationList } from '@/components/dashboard/PendingVerificationList';
import { ProductActions } from '@/components/dashboard/ProductActions';
import type { Product, ProductStats, ProductTimelineData, Infringement, Scan } from '@/types';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (productError || !product) {
    redirect('/dashboard/products');
  }

  // Fetch product stats
  const stats = await fetchProductStats(supabase, id);

  // Fetch timeline data (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: timelineData } = await supabase
    .from('product_infringement_timeline')
    .select('*')
    .eq('product_id', id)
    .gte('date', thirtyDaysAgo.toISOString())
    .order('date', { ascending: true });

  // Fetch pending verifications (top 10 by severity)
  const { data: pendingInfringements } = await supabase
    .from('infringements')
    .select('*')
    .eq('product_id', id)
    .eq('status', 'pending_verification')
    .order('severity_score', { ascending: false })
    .limit(10);

  // Fetch recent scans (last 5)
  const { data: recentScans } = await supabase
    .from('scans')
    .select('*')
    .eq('product_id', id)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div>
      {/* Header with Back Button */}
      <div className="mb-6">
        <Link href="/dashboard/products" className="text-sm text-pg-accent hover:underline mb-4 inline-block">
          ← Back to Products
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2 text-pg-text">{product.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="default" className="capitalize">
                {product.type}
              </Badge>
              <span className="text-lg font-bold text-gradient">${product.price}</span>
              {product.brand_name && <span className="text-pg-text-muted text-sm">by {product.brand_name}</span>}
            </div>
          </div>
          <ProductActions product={product} />
        </div>
      </div>

      {/* Top Row: Product Image + Infringement Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left: Product Image */}
        <Card>
          <h2 className="text-xl font-bold mb-4 text-pg-text">Product Image</h2>
          {product.product_image_url ? (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-pg-border">
              <Image
                src={product.product_image_url}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ) : (
            <div className="w-full aspect-video rounded-lg bg-pg-surface border border-pg-border border-dashed flex flex-col items-center justify-center text-pg-text-muted">
              <svg className="w-16 h-16 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm">No image uploaded</p>
            </div>
          )}
        </Card>

        {/* Right: Infringement Trend Chart */}
        <Card>
          <h2 className="text-xl font-bold mb-4 text-pg-text">
            Verified Infringements{' '}
            <span className="text-sm font-normal text-pg-text-muted">(Last 30 Days)</span>
          </h2>
          <InfringementTrendChart data={(timelineData as ProductTimelineData[]) || []} />
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Pending Verification</p>
          <p className="text-3xl font-bold text-pg-warning">{stats.pending_verification}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Active Verified</p>
          <p className="text-3xl font-bold text-pg-danger">{stats.active_verified}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Resolved</p>
          <p className="text-3xl font-bold text-green-500">{stats.resolved}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Est. Revenue Loss</p>
          <p className="text-2xl font-bold text-pg-danger">${stats.total_est_loss.toLocaleString()}</p>
        </Card>
      </div>

      {/* Pending Verifications Section */}
      {pendingInfringements && pendingInfringements.length > 0 && (
        <div className="mb-8">
          <PendingVerificationList
            infringements={pendingInfringements as Infringement[]}
            productId={id}
          />
        </div>
      )}

      {/* Bottom Row: Product Details + Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Info */}
        <Card>
          <h2 className="text-xl font-bold mb-4 text-pg-text">Product Details</h2>
          <dl className="space-y-3 text-sm">
            {product.brand_name && (
              <div>
                <dt className="text-pg-text-muted font-medium">Brand</dt>
                <dd className="font-semibold text-pg-text mt-1">{product.brand_name}</dd>
              </div>
            )}
            {product.description && (
              <div>
                <dt className="text-pg-text-muted font-medium">Description</dt>
                <dd className="text-pg-text mt-1">{product.description}</dd>
              </div>
            )}
            {product.url && (
              <div>
                <dt className="text-pg-text-muted font-medium">Product URL</dt>
                <dd className="mt-1">
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pg-accent hover:underline break-all"
                  >
                    {product.url}
                  </a>
                </dd>
              </div>
            )}
            {product.keywords && product.keywords.length > 0 && (
              <div>
                <dt className="text-pg-text-muted font-medium mb-2">Keywords</dt>
                <dd className="flex flex-wrap gap-2">
                  {product.keywords.map((kw: string, i: number) => (
                    <Badge key={i} variant="default" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
            {product.release_date && (
              <div>
                <dt className="text-pg-text-muted font-medium">Release Date</dt>
                <dd className="text-pg-text mt-1">{new Date(product.release_date).toLocaleDateString()}</dd>
              </div>
            )}
            {product.language && (
              <div>
                <dt className="text-pg-text-muted font-medium">Language</dt>
                <dd className="text-pg-text mt-1">{product.language}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Recent Scans */}
        <Card>
          <h2 className="text-xl font-bold mb-4 text-pg-text">Recent Scans</h2>
          {recentScans && recentScans.length > 0 ? (
            <div className="space-y-3">
              {recentScans.map((scan) => (
                <Link
                  key={scan.id}
                  href={`/dashboard/scans/${scan.id}`}
                  className="block p-3 rounded-lg bg-pg-bg hover:bg-pg-surface border border-pg-border hover:border-pg-accent transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-pg-text">
                        {new Date(scan.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-pg-text-muted mt-1">
                        {scan.infringement_count || 0} infringement{scan.infringement_count !== 1 ? 's' : ''} found
                      </p>
                    </div>
                    <Badge
                      variant={
                        scan.status === 'completed'
                          ? 'default'
                          : scan.status === 'failed'
                          ? 'danger'
                          : 'warning'
                      }
                      className="capitalize"
                    >
                      {scan.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-pg-text-muted mb-3">No scans yet</p>
              <p className="text-xs text-pg-text-muted">Click "Run Scan" to start monitoring for infringements</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

async function fetchProductStats(supabase: any, productId: string): Promise<ProductStats> {
  // Fetch counts by status
  const { data: infringements } = await supabase
    .from('infringements')
    .select('status, est_revenue_loss')
    .eq('product_id', productId);

  const stats: ProductStats = {
    total_infringements: infringements?.length || 0,
    pending_verification: infringements?.filter((i: any) => i.status === 'pending_verification').length || 0,
    active_verified: infringements?.filter((i: any) => i.status === 'active').length || 0,
    resolved: infringements?.filter((i: any) => i.status === 'removed').length || 0,
    false_positives: infringements?.filter((i: any) => i.status === 'false_positive').length || 0,
    total_est_loss: infringements?.reduce((sum: number, i: any) => sum + (i.est_revenue_loss || 0), 0) || 0,
    recent_scans_count: 0,
    last_scan_at: null,
  };

  // Fetch scan info
  const { data: scans } = await supabase
    .from('scans')
    .select('created_at')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (scans && scans.length > 0) {
    stats.recent_scans_count = scans.length;
    stats.last_scan_at = scans[0].created_at;
  }

  return stats;
}
