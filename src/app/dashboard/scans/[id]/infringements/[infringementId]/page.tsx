import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import Link from 'next/link';
import { InfringementActions } from '@/components/dashboard/InfringementActions';

export default async function InfringementDetailPage({
  params,
}: {
  params: Promise<{ id: string; infringementId: string }>;
}) {
  const { id: scanId, infringementId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch infringement details
  const { data: infringement, error: infringementError } = await supabase
    .from('infringements')
    .select('*, scans(*, products(name, price, type))')
    .eq('id', infringementId)
    .eq('scan_id', scanId)
    .eq('user_id', user.id)
    .single();

  if (infringementError || !infringement) {
    redirect(`/dashboard/scans/${scanId}`);
  }

  // Fetch enforcement actions for this infringement
  const { data: enforcementActions } = await supabase
    .from('enforcement_actions')
    .select('*')
    .eq('infringement_id', infringementId)
    .order('created_at', { ascending: false });

  // Fetch status transitions for this infringement
  const { data: statusTransitions } = await supabase
    .from('status_transitions')
    .select('*')
    .eq('infringement_id', infringementId)
    .order('created_at', { ascending: false });

  // Priority badge colors
  const priorityColors = {
    P0: 'bg-pg-danger bg-opacity-20 text-pg-danger border-pg-danger',
    P1: 'bg-pg-warning bg-opacity-20 text-pg-warning border-pg-warning',
    P2: 'bg-blue-500 bg-opacity-20 text-blue-400 border-blue-400',
  };

  const typeLabels = {
    indexed_page: '🔍 Indexed Page',
    direct_download: '📥 Direct Download',
    torrent: '🧲 Torrent',
    post: '💬 Forum/Social Post',
    channel: '📢 Channel',
    group: '👥 Group',
    bot: '🤖 Bot',
    server: '🖥️ Server',
  };

  const isResolved = infringement.status === 'removed';

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link
          href={`/dashboard/scans/${scanId}`}
          className="text-sm text-pg-accent hover:underline mb-4 inline-block"
        >
          ← Back to Scan Results
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Infringement Details</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          {infringement.scans?.products?.name} - Found on {new Date(infringement.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1 flex items-center">
            Priority
            <InfoTooltip
              content={
                <div>
                  <p className="font-semibold mb-2">Priority Assignment</p>
                  <p className="text-xs mb-2">Calculated based on severity and specific conditions:</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>
                      <strong>P0:</strong> Severity ≥75 OR (Monetized + Confidence ≥75%)
                    </li>
                    <li>
                      <strong>P1:</strong> Severity ≥50 OR Monetized OR Audience ≥5,000
                    </li>
                    <li>
                      <strong>P2:</strong> All other cases
                    </li>
                  </ul>
                </div>
              }
            />
          </p>
          <Badge
            variant="default"
            className={`border text-lg ${priorityColors[infringement.priority as keyof typeof priorityColors]}`}
          >
            {infringement.priority}
          </Badge>
        </Card>

        <Card>
          <p className="text-sm text-pg-text-muted mb-1 flex items-center">
            Severity Score
            <InfoTooltip
              content={
                <div>
                  <p className="font-semibold mb-2">Severity Score (0-100)</p>
                  <p className="text-xs mb-2">Calculated from weighted components:</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>
                      <strong>Match Confidence:</strong> 20 points max
                    </li>
                    <li>
                      <strong>Audience Size:</strong> 25 points max (0-5K=5pts, 5K-50K=15pts, 50K+=25pts)
                    </li>
                    <li>
                      <strong>Monetization:</strong> 30 points if detected
                    </li>
                    <li>
                      <strong>Platform Risk:</strong> 15 points max
                    </li>
                    <li>
                      <strong>Revenue Impact:</strong> 10 points max
                    </li>
                  </ul>
                </div>
              }
            />
          </p>
          <p className="text-3xl font-bold">
            {infringement.severity_score}
            <span className="text-lg text-pg-text-muted">/100</span>
          </p>
        </Card>

        <Card>
          <p className="text-sm text-pg-text-muted mb-1 flex items-center">
            Risk Level
            <InfoTooltip
              content={
                <div>
                  <p className="font-semibold mb-2">Risk Level</p>
                  <p className="text-xs mb-2">Categorizes the threat level:</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>
                      <strong>Critical:</strong> Direct piracy with high distribution
                    </li>
                    <li>
                      <strong>High:</strong> Significant unauthorized distribution
                    </li>
                    <li>
                      <strong>Medium:</strong> Moderate infringement potential
                    </li>
                    <li>
                      <strong>Low:</strong> Minor or indirect reference
                    </li>
                  </ul>
                  <p className="text-xs mt-2 text-pg-text-muted">
                    Based on platform type, content analysis, and distribution method.
                  </p>
                </div>
              }
            />
          </p>
          <Badge variant={infringement.risk_level} className="capitalize text-lg">
            {infringement.risk_level}
          </Badge>
        </Card>

        <Card>
          <p className="text-sm text-pg-text-muted mb-1 flex items-center">
            Est. Revenue Loss
            <InfoTooltip
              content={
                <div>
                  <p className="font-semibold mb-2">Estimated Revenue Loss</p>
                  <p className="text-xs mb-2">Calculated based on:</p>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>
                      <strong>Audience Size:</strong> Number of potential downloaders
                    </li>
                    <li>
                      <strong>Product Price:</strong> Your product's listed price
                    </li>
                    <li>
                      <strong>Conversion Rate:</strong> Estimated piracy conversion (1-5%)
                    </li>
                  </ul>
                  <p className="text-xs mt-2 text-pg-text-muted">
                    Formula: Audience × Price × Conversion Rate
                  </p>
                </div>
              }
            />
          </p>
          <p className="text-3xl font-bold text-pg-danger">
            ${(infringement.est_revenue_loss || 0).toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Main Details */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold mb-4">Overview</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-pg-text-muted mb-1">Source URL</p>
            <a
              href={infringement.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pg-accent hover:underline break-all font-medium"
            >
              {infringement.source_url}
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-pg-text-muted mb-1">Platform</p>
              <Badge variant="default" className="capitalize">
                {infringement.platform}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-pg-text-muted mb-1">Type</p>
              <p className="font-semibold">
                {typeLabels[infringement.type as keyof typeof typeLabels] || infringement.type}
              </p>
            </div>
            <div>
              <p className="text-sm text-pg-text-muted mb-1">Status</p>
              <Badge
                variant={isResolved ? 'default' : 'critical'}
                className={isResolved ? 'bg-green-600 bg-opacity-20 text-green-400' : 'capitalize'}
              >
                {infringement.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-pg-text-muted mb-1">Audience Size</p>
              <p className="font-semibold">
                {infringement.audience_count > 0
                  ? infringement.audience_count.toLocaleString()
                  : infringement.audience_size || 'Unknown'}
              </p>
            </div>
            {infringement.monetization_detected && (
              <div>
                <p className="text-sm text-pg-text-muted mb-1">Monetization</p>
                <Badge variant="default" className="bg-pg-danger bg-opacity-20 text-pg-danger">
                  💰 Detected
                </Badge>
              </div>
            )}
            {infringement.next_check_at && (
              <div>
                <p className="text-sm text-pg-text-muted mb-1">Next Check</p>
                <p className="font-semibold">{new Date(infringement.next_check_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Match Quality & Evidence */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold mb-4">Match Quality & Evidence</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-pg-text-muted mb-1">Match Confidence</p>
            <p className="text-2xl font-bold">
              {Math.round((infringement.match_confidence || 0) * 100)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-pg-text-muted mb-1">Match Type</p>
            <p className="font-semibold capitalize">
              {infringement.match_type?.replace('_', ' ') || 'Unknown'}
            </p>
          </div>
          {infringement.match_evidence && infringement.match_evidence.length > 0 && (
            <div>
              <p className="text-sm text-pg-text-muted mb-1">Match Evidence</p>
              <p className="font-semibold">{infringement.match_evidence.length} items</p>
            </div>
          )}
        </div>

        {infringement.evidence && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-pg-surface border border-pg-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-pg-accent">
                  {infringement.evidence.screenshots?.length || 0}
                </p>
                <p className="text-xs text-pg-text-muted mt-1">Screenshots</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-pg-accent">
                  {infringement.evidence.matched_excerpts?.length || 0}
                </p>
                <p className="text-xs text-pg-text-muted mt-1">Text Excerpts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-pg-accent">
                  {infringement.evidence.hash_matches?.length || 0}
                </p>
                <p className="text-xs text-pg-text-muted mt-1">Hash Matches</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-pg-accent">
                  {infringement.evidence.url_chain?.length || 0}
                </p>
                <p className="text-xs text-pg-text-muted mt-1">URL Chain</p>
              </div>
            </div>

            {/* Screenshots */}
            {infringement.evidence.screenshots && infringement.evidence.screenshots.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">📸 Screenshots</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {infringement.evidence.screenshots.map((screenshot: string, index: number) => (
                    <div key={index} className="p-2 rounded bg-pg-surface border border-pg-border text-xs break-all">
                      {screenshot}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matched Excerpts */}
            {infringement.evidence.matched_excerpts && infringement.evidence.matched_excerpts.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">📝 Matched Text Excerpts</p>
                <div className="space-y-2">
                  {infringement.evidence.matched_excerpts.map((excerpt: string, index: number) => (
                    <div
                      key={index}
                      className="p-3 rounded bg-pg-surface border border-pg-border text-sm font-mono"
                    >
                      {excerpt}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* URL Chain */}
            {infringement.evidence.url_chain && infringement.evidence.url_chain.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">🔗 URL Redirect Chain</p>
                <div className="space-y-1">
                  {infringement.evidence.url_chain.map((url: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="text-pg-text-muted">{index + 1}.</span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pg-accent hover:underline break-all"
                      >
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Infrastructure Profile */}
      {infringement.infrastructure && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold mb-4">Infrastructure Profile</h2>

          {/* Location & Network */}
          {(infringement.infrastructure.country ||
            infringement.infrastructure.ip_address ||
            infringement.infrastructure.asn) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-pg-text-muted mb-3">Location & Network</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {infringement.infrastructure.country && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">Country</p>
                    <p className="font-semibold">{infringement.infrastructure.country}</p>
                  </div>
                )}
                {infringement.infrastructure.region && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">Region</p>
                    <p className="font-semibold">{infringement.infrastructure.region}</p>
                  </div>
                )}
                {infringement.infrastructure.city && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">City</p>
                    <p className="font-semibold">{infringement.infrastructure.city}</p>
                  </div>
                )}
                {infringement.infrastructure.ip_address && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">IP Address</p>
                    <p className="font-semibold font-mono text-xs">{infringement.infrastructure.ip_address}</p>
                  </div>
                )}
                {infringement.infrastructure.asn && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">ASN</p>
                    <p className="font-semibold">AS{infringement.infrastructure.asn}</p>
                  </div>
                )}
                {infringement.infrastructure.asn_org && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-pg-text-muted mb-1">Network</p>
                    <p className="font-semibold">{infringement.infrastructure.asn_org}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hosting & CDN */}
          {(infringement.infrastructure.hosting_provider || infringement.infrastructure.cdn) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-pg-text-muted mb-3">Hosting & CDN</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {infringement.infrastructure.hosting_provider && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">Hosting Provider</p>
                    <p className="font-semibold">{infringement.infrastructure.hosting_provider}</p>
                  </div>
                )}
                {infringement.infrastructure.cdn && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">CDN</p>
                    <p className="font-semibold">{infringement.infrastructure.cdn}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Domain Registration */}
          {(infringement.infrastructure.registrar ||
            infringement.infrastructure.creation_date ||
            infringement.infrastructure.expiration_date) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-pg-text-muted mb-3">Domain Registration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {infringement.infrastructure.registrar && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">Registrar</p>
                    <p className="font-semibold">{infringement.infrastructure.registrar}</p>
                  </div>
                )}
                {infringement.infrastructure.registrar_url && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">Registrar Website</p>
                    <a
                      href={infringement.infrastructure.registrar_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pg-accent hover:underline text-sm"
                    >
                      Visit
                    </a>
                  </div>
                )}
                {infringement.infrastructure.creation_date && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">Created</p>
                    <p className="font-semibold text-sm">
                      {new Date(infringement.infrastructure.creation_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {infringement.infrastructure.expiration_date && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">Expires</p>
                    <p className="font-semibold text-sm">
                      {new Date(infringement.infrastructure.expiration_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contacts */}
          {(infringement.infrastructure.abuse_contact ||
            infringement.infrastructure.admin_email ||
            infringement.infrastructure.tech_email) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-pg-text-muted mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {infringement.infrastructure.abuse_contact && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">Abuse Contact</p>
                    <a
                      href={`mailto:${infringement.infrastructure.abuse_contact}`}
                      className="font-semibold text-pg-accent hover:underline break-all text-sm"
                    >
                      {infringement.infrastructure.abuse_contact}
                    </a>
                  </div>
                )}
                {infringement.infrastructure.admin_email && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">Admin Email</p>
                    <a
                      href={`mailto:${infringement.infrastructure.admin_email}`}
                      className="font-semibold text-pg-accent hover:underline break-all text-sm"
                    >
                      {infringement.infrastructure.admin_email}
                    </a>
                  </div>
                )}
                {infringement.infrastructure.tech_email && (
                  <div>
                    <p className="text-sm text-pg-text-muted mb-1">Tech Email</p>
                    <a
                      href={`mailto:${infringement.infrastructure.tech_email}`}
                      className="font-semibold text-pg-accent hover:underline break-all text-sm"
                    >
                      {infringement.infrastructure.tech_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DNS */}
          {infringement.infrastructure.nameservers && infringement.infrastructure.nameservers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-pg-text-muted mb-3">DNS Configuration</h3>
              <div>
                <p className="text-sm text-pg-text-muted mb-1">Nameservers</p>
                <div className="flex flex-wrap gap-2">
                  {infringement.infrastructure.nameservers.map((ns: string, index: number) => (
                    <Badge key={index} variant="default" className="font-mono text-xs">
                      {ns}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!infringement.infrastructure.hosting_provider &&
            !infringement.infrastructure.registrar &&
            !infringement.infrastructure.cdn &&
            !infringement.infrastructure.country &&
            !infringement.infrastructure.ip_address && (
              <p className="text-sm text-pg-text-muted italic">
                Infrastructure data not yet collected. Click "Get Infrastructure Data" below to populate this information.
              </p>
            )}
        </Card>
      )}

      {/* Enforcement Actions */}
      {enforcementActions && enforcementActions.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold mb-4">Enforcement Actions ({enforcementActions.length})</h2>
          <div className="space-y-3">
            {enforcementActions.map((action) => (
              <div key={action.id} className="p-4 rounded-lg bg-pg-surface border border-pg-border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold capitalize">{action.action_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-pg-text-muted">
                      Step {action.escalation_step} - {action.notice_tone} tone
                    </p>
                  </div>
                  <Badge
                    variant={
                      action.status === 'removed'
                        ? 'default'
                        : action.status === 'sent'
                        ? ('scout' as any)
                        : ('starter' as any)
                    }
                    className={
                      action.status === 'removed'
                        ? 'bg-green-600 bg-opacity-20 text-green-400'
                        : 'capitalize'
                    }
                  >
                    {action.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                  <div>
                    <p className="text-pg-text-muted text-xs">Target</p>
                    <p className="font-medium">{action.target_entity || 'N/A'}</p>
                  </div>
                  {action.sent_at && (
                    <div>
                      <p className="text-pg-text-muted text-xs">Sent</p>
                      <p className="font-medium">{new Date(action.sent_at).toLocaleDateString()}</p>
                    </div>
                  )}
                  {action.deadline_at && (
                    <div>
                      <p className="text-pg-text-muted text-xs">Deadline</p>
                      <p className="font-medium">{new Date(action.deadline_at).toLocaleDateString()}</p>
                    </div>
                  )}
                  {action.resolved_at && (
                    <div>
                      <p className="text-pg-text-muted text-xs">Resolved</p>
                      <p className="font-medium">{new Date(action.resolved_at).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                {action.target_contact && (
                  <p className="text-xs text-pg-text-muted mt-2">Contact: {action.target_contact}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Status Transitions Timeline */}
      {statusTransitions && statusTransitions.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold mb-4">Status History</h2>
          <div className="space-y-2">
            {statusTransitions.map((transition) => (
              <div key={transition.id} className="flex items-center gap-3 text-sm">
                <span className="text-pg-text-muted min-w-[140px]">
                  {new Date(transition.created_at).toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  {transition.from_status && (
                    <>
                      <Badge variant="default" className="capitalize text-xs">
                        {transition.from_status}
                      </Badge>
                      <span className="text-pg-text-muted">→</span>
                    </>
                  )}
                  <Badge variant="default" className="capitalize text-xs">
                    {transition.to_status}
                  </Badge>
                </div>
                {transition.triggered_by && (
                  <span className="text-pg-text-muted text-xs">({transition.triggered_by})</span>
                )}
                {transition.reason && <span className="text-pg-text-muted text-xs">- {transition.reason}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Actions</h2>
        <InfringementActions
          infringementId={infringement.id}
          sourceUrl={infringement.source_url}
          isResolved={isResolved}
          hasInfrastructureData={
            !!(
              infringement.infrastructure?.hosting_provider ||
              infringement.infrastructure?.registrar ||
              infringement.infrastructure?.cdn
            )
          }
        />
      </Card>
    </div>
  );
}
