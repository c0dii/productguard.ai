import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InfringementActions } from '@/components/dashboard/InfringementActions';
import type { Infringement } from '@/types';

export default async function InfringementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch infringement details
  const { data: infringement, error } = await supabase
    .from('infringements')
    .select('*, products(name, price, type, brand_name)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !infringement) {
    redirect('/dashboard/infringements');
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/infringements" className="text-sm text-pg-accent hover:underline mb-4 inline-block">
          ← Back to Infringements
        </Link>
        <h1 className="text-3xl font-bold mb-2 text-pg-text">Infringement Details</h1>
        <p className="text-sm text-pg-text-muted">Review and take action on this infringement</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Infringement Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info */}
          <Card>
            <h2 className="text-xl font-bold mb-4 text-pg-text">Product Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-pg-text-muted">Product Name</dt>
                <dd className="text-pg-text font-semibold mt-1">
                  <Link href={`/dashboard/products/${infringement.product_id}`} className="text-pg-accent hover:underline">
                    {infringement.products?.name || 'Unknown Product'}
                  </Link>
                </dd>
              </div>
              {infringement.products?.brand_name && (
                <div>
                  <dt className="text-sm text-pg-text-muted">Brand</dt>
                  <dd className="text-pg-text font-semibold mt-1">{infringement.products.brand_name}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-pg-text-muted">Product Type</dt>
                <dd className="text-pg-text font-semibold mt-1 capitalize">{infringement.products?.type}</dd>
              </div>
              <div>
                <dt className="text-sm text-pg-text-muted">Product Price</dt>
                <dd className="text-pg-text font-semibold mt-1">${infringement.products?.price}</dd>
              </div>
            </dl>
          </Card>

          {/* Infringement Details */}
          <Card>
            <h2 className="text-xl font-bold mb-4 text-pg-text">Infringement Details</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-pg-text-muted">Infringing URL</dt>
                <dd className="mt-1">
                  <a
                    href={infringement.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pg-accent hover:underline break-all"
                  >
                    {infringement.source_url}
                  </a>
                </dd>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-pg-text-muted">Platform</dt>
                  <dd className="mt-1">
                    <Badge variant="default" className="capitalize">{infringement.platform}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-pg-text-muted">Risk Level</dt>
                  <dd className="mt-1">
                    <Badge variant={infringement.risk_level as any} className="capitalize">
                      {infringement.risk_level}
                    </Badge>
                  </dd>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-pg-text-muted">Severity Score</dt>
                  <dd className="text-pg-text font-semibold mt-1">{infringement.severity_score}/100</dd>
                </div>
                <div>
                  <dt className="text-sm text-pg-text-muted">Priority</dt>
                  <dd className="mt-1">
                    <Badge variant="warning" className="capitalize">{infringement.priority}</Badge>
                  </dd>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-pg-text-muted">Audience Size</dt>
                  <dd className="text-pg-text font-semibold mt-1 capitalize">{infringement.audience_size || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-pg-text-muted">Est. Revenue Loss</dt>
                  <dd className="text-pg-danger font-bold mt-1 text-lg">${(infringement.est_revenue_loss || 0).toLocaleString()}</dd>
                </div>
              </div>

              {infringement.infrastructure?.country && (
                <div>
                  <dt className="text-sm text-pg-text-muted">Hosting Country</dt>
                  <dd className="text-pg-text font-semibold mt-1">📍 {infringement.infrastructure.country}</dd>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-pg-text-muted">First Detected</dt>
                  <dd className="text-pg-text mt-1">{new Date(infringement.first_seen_at || infringement.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-sm text-pg-text-muted">Last Seen</dt>
                  <dd className="text-pg-text mt-1">{new Date(infringement.last_seen_at || infringement.created_at).toLocaleString()}</dd>
                </div>
              </div>

              {infringement.seen_count > 1 && (
                <div>
                  <dt className="text-sm text-pg-text-muted">Times Detected</dt>
                  <dd className="text-pg-text font-semibold mt-1">{infringement.seen_count}x (across multiple scans)</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Evidence */}
          {infringement.evidence && (
            <Card>
              <h2 className="text-xl font-bold mb-4 text-pg-text">Evidence</h2>
              {infringement.evidence.matched_excerpts && infringement.evidence.matched_excerpts.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-pg-text-muted mb-2">Matched Text Excerpts</h3>
                  <div className="space-y-2">
                    {infringement.evidence.matched_excerpts.map((excerpt: string, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-pg-bg border border-pg-border">
                        <p className="text-sm text-pg-text">&quot;{excerpt}&quot;</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {infringement.evidence.url_chain && infringement.evidence.url_chain.length > 1 && (
                <div>
                  <h3 className="text-sm font-semibold text-pg-text-muted mb-2">URL Redirect Chain</h3>
                  <div className="space-y-1 text-xs text-pg-text-muted">
                    {infringement.evidence.url_chain.map((url: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-pg-accent">{i + 1}.</span>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                          {url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Column: Actions */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <h2 className="text-xl font-bold mb-4 text-pg-text">Actions</h2>
            <InfringementActions
              infringementId={infringement.id}
              sourceUrl={infringement.source_url}
              isResolved={infringement.status === 'removed'}
              hasInfrastructureData={!!infringement.infrastructure}
            />

            {/* Status Badge */}
            <div className="mt-6">
              <p className="text-sm text-pg-text-muted mb-2">Current Status</p>
              <Badge
                variant={
                  infringement.status === 'active'
                    ? 'danger'
                    : infringement.status === 'takedown_sent'
                    ? 'warning'
                    : 'default'
                }
                className="capitalize"
              >
                {infringement.status === 'takedown_sent' ? 'Takedown Sent' : infringement.status}
              </Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
