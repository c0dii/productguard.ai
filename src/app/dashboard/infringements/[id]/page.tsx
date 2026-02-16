import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InfringementActions } from '@/components/dashboard/InfringementActions';
import { EvidenceDisplay } from '@/components/dashboard/EvidenceDisplay';
import { BlockchainTimestamp } from '@/components/dashboard/BlockchainTimestamp';
import { DMCAGenerateButton } from '@/components/dmca/DMCAGenerateButton';
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

  // Fetch evidence snapshot if infringement is verified
  let evidenceSnapshot = null;
  if (infringement.evidence_snapshot_id) {
    const { data } = await supabase
      .from('evidence_snapshots')
      .select('*')
      .eq('id', infringement.evidence_snapshot_id)
      .eq('user_id', user.id)
      .single();

    evidenceSnapshot = data;
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
                  <dt className="text-sm text-pg-text-muted">Current Status</dt>
                  <dd className="mt-1">
                    <Badge
                      variant={
                        infringement.status === 'active'
                          ? 'critical'
                          : infringement.status === 'takedown_sent'
                          ? 'medium'
                          : 'default'
                      }
                      className="capitalize"
                    >
                      {infringement.status === 'takedown_sent' ? 'Takedown Sent' : infringement.status}
                    </Badge>
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
                  <dt className="text-sm text-pg-text-muted">Platform</dt>
                  <dd className="mt-1">
                    <Badge variant="default" className="capitalize">{infringement.platform}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-pg-text-muted">Priority</dt>
                  <dd className="mt-1">
                    <Badge variant="default" className="capitalize">{infringement.priority}</Badge>
                  </dd>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-pg-text-muted">Severity Score</dt>
                  <dd className="text-pg-text font-semibold mt-1">{infringement.severity_score}/100</dd>
                </div>
                <div>
                  <dt className="text-sm text-pg-text-muted">Audience Size</dt>
                  <dd className="text-pg-text font-semibold mt-1 capitalize">{infringement.audience_size || 'Unknown'}</dd>
                </div>
              </div>

              {/* Temporarily disabled - revenue loss calculations need refinement */}
              {/* <div>
                <dt className="text-sm text-pg-text-muted">Est. Revenue Loss</dt>
                <dd className="text-pg-danger font-bold mt-1 text-lg">${(infringement.est_revenue_loss || 0).toLocaleString()}</dd>
              </div> */}

              {/* Technical Infrastructure Details */}
              {infringement.infrastructure && (
                <div className="p-4 rounded-lg bg-pg-bg border border-pg-border space-y-3">
                  <h3 className="text-sm font-semibold text-pg-text mb-3">🔧 Infrastructure Details</h3>

                  <div className="grid grid-cols-2 gap-4">
                    {infringement.infrastructure.ip_address && (
                      <div>
                        <dt className="text-xs text-pg-text-muted">IP Address</dt>
                        <dd className="text-sm text-pg-text font-mono mt-1">{infringement.infrastructure.ip_address}</dd>
                      </div>
                    )}
                    {infringement.infrastructure.hosting_provider && (
                      <div>
                        <dt className="text-xs text-pg-text-muted">Hosting Provider</dt>
                        <dd className="text-sm text-pg-text font-semibold mt-1">{infringement.infrastructure.hosting_provider}</dd>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {infringement.infrastructure.country && (
                      <div>
                        <dt className="text-xs text-pg-text-muted">Location</dt>
                        <dd className="text-sm text-pg-text font-semibold mt-1">
                          📍 {infringement.infrastructure.city && `${infringement.infrastructure.city}, `}
                          {infringement.infrastructure.region && `${infringement.infrastructure.region}, `}
                          {infringement.infrastructure.country}
                        </dd>
                      </div>
                    )}
                    {infringement.infrastructure.asn && (
                      <div>
                        <dt className="text-xs text-pg-text-muted">ASN</dt>
                        <dd className="text-sm text-pg-text font-mono mt-1">
                          {infringement.infrastructure.asn}
                          {infringement.infrastructure.asn_org && (
                            <span className="block text-xs text-pg-text-muted mt-0.5">{infringement.infrastructure.asn_org}</span>
                          )}
                        </dd>
                      </div>
                    )}
                  </div>

                  {(infringement.infrastructure.registrar || infringement.infrastructure.cdn) && (
                    <div className="grid grid-cols-2 gap-4">
                      {infringement.infrastructure.registrar && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">Domain Registrar</dt>
                          <dd className="text-sm text-pg-text font-semibold mt-1">{infringement.infrastructure.registrar}</dd>
                        </div>
                      )}
                      {infringement.infrastructure.cdn && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">CDN</dt>
                          <dd className="text-sm text-pg-text font-semibold mt-1">{infringement.infrastructure.cdn}</dd>
                        </div>
                      )}
                    </div>
                  )}

                  {(infringement.infrastructure.creation_date || infringement.infrastructure.expiration_date) && (
                    <div className="grid grid-cols-2 gap-4">
                      {infringement.infrastructure.creation_date && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">Domain Created</dt>
                          <dd className="text-sm text-pg-text mt-1">{new Date(infringement.infrastructure.creation_date).toLocaleDateString()}</dd>
                        </div>
                      )}
                      {infringement.infrastructure.expiration_date && (
                        <div>
                          <dt className="text-xs text-pg-text-muted">Domain Expires</dt>
                          <dd className="text-sm text-pg-text mt-1">{new Date(infringement.infrastructure.expiration_date).toLocaleDateString()}</dd>
                        </div>
                      )}
                    </div>
                  )}

                  {infringement.infrastructure.abuse_contact && (
                    <div>
                      <dt className="text-xs text-pg-text-muted">Abuse Contact</dt>
                      <dd className="text-sm text-pg-accent mt-1">
                        <a href={`mailto:${infringement.infrastructure.abuse_contact}`} className="hover:underline">
                          {infringement.infrastructure.abuse_contact}
                        </a>
                      </dd>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-pg-text-muted">First Detected</dt>
                  <dd className="text-pg-text mt-1">
                    <span className="font-semibold">{new Date(infringement.first_seen_at || infringement.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}</span>
                    <span className="block text-xs text-pg-text-muted mt-0.5">
                      {new Date(infringement.first_seen_at || infringement.created_at).toLocaleString('en-US', {
                        timeZoneName: 'short'
                      }).split(', ').pop()}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-pg-text-muted">Last Seen</dt>
                  <dd className="text-pg-text mt-1">
                    <span className="font-semibold">{new Date(infringement.last_seen_at || infringement.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}</span>
                    <span className="block text-xs text-pg-text-muted mt-0.5">
                      {new Date(infringement.last_seen_at || infringement.created_at).toLocaleString('en-US', {
                        timeZoneName: 'short'
                      }).split(', ').pop()}
                    </span>
                  </dd>
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

          {/* Evidence Display */}
          <EvidenceDisplay evidence={infringement.evidence} sourceUrl={infringement.source_url} />

          {/* Blockchain Timestamp (if verified) */}
          {evidenceSnapshot?.timestamp_proof && (
            <BlockchainTimestamp timestampProof={evidenceSnapshot.timestamp_proof} />
          )}
        </div>

        {/* Right Column: Actions */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-6">
            <h2 className="text-xl font-bold mb-4 text-pg-text">Actions</h2>
            <InfringementActions
              infringementId={infringement.id}
              sourceUrl={infringement.source_url}
              isResolved={infringement.status === 'removed'}
              isPending={infringement.status === 'pending_verification'}
              hasInfrastructureData={!!infringement.infrastructure}
            />
          </Card>

          {/* AI DMCA Notice Generation */}
          <Card className="sticky top-6">
            <h2 className="text-xl font-bold mb-4 text-pg-text">🤖 AI DMCA Generator</h2>
            <p className="text-sm text-pg-text-muted mb-4">
              Generate a professional, legally compliant DMCA takedown notice in seconds.
            </p>
            <DMCAGenerateButton
              infringementId={infringement.id}
              productName={infringement.products?.name || 'Product'}
              infringementUrl={infringement.source_url}
              status={infringement.status}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
