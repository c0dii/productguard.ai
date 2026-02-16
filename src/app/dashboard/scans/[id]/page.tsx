import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { InfringementList } from '@/components/dashboard/InfringementList';
import { ExportReportButton } from '@/components/dashboard/ExportReportButton';
import { PendingVerificationList } from '@/components/dashboard/PendingVerificationList';
import type { Infringement } from '@/types';

export default async function ScanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch scan details
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('*, products(name, price, type, id)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (scanError || !scan) {
    redirect('/dashboard/scans');
  }

  // Fetch pending verification infringements for this scan
  const { data: pendingInfringements } = await supabase
    .from('infringements')
    .select('*')
    .eq('scan_id', id)
    .eq('status', 'pending_verification')
    .order('severity_score', { ascending: false });

  // Fetch active infringements for this scan
  const { data: activeInfringements } = await supabase
    .from('infringements')
    .select('*')
    .eq('scan_id', id)
    .in('status', ['active', 'takedown_sent', 'disputed'])
    .order('risk_level', { ascending: false });

  // Fetch resolved infringements
  const { data: resolvedInfringements } = await supabase
    .from('infringements')
    .select('*')
    .eq('scan_id', id)
    .eq('status', 'removed')
    .order('created_at', { ascending: false });

  const totalRevenueLoss = activeInfringements?.reduce((sum, inf) => sum + (inf.est_revenue_loss || 0), 0) || 0;

  // Group active infringements by risk level
  const critical = activeInfringements?.filter((i) => i.risk_level === 'critical') || [];
  const high = activeInfringements?.filter((i) => i.risk_level === 'high') || [];
  const medium = activeInfringements?.filter((i) => i.risk_level === 'medium') || [];
  const low = activeInfringements?.filter((i) => i.risk_level === 'low') || [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <Link href="/dashboard/scans" className="text-sm text-pg-accent hover:underline mb-4 inline-block">
          ← Back to Scans
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Scan Results</h1>
        <p className="text-sm sm:text-base text-pg-text-muted">
          {scan.products?.name} - Scanned on {new Date(scan.created_at).toLocaleString()}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Total Found</p>
          <p className="text-3xl font-bold text-pg-accent">{scan.infringement_count || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Pending Verification</p>
          <p className="text-3xl font-bold text-pg-warning">{pendingInfringements?.length || 0}</p>
        </Card>
        <Link href="/dashboard/infringements">
          <Card className="cursor-pointer hover:border-pg-accent hover:shadow-lg hover:shadow-pg-accent/20 transition-all">
            <p className="text-sm text-pg-text-muted mb-1">Active (Verified)</p>
            <p className="text-3xl font-bold text-pg-danger">{activeInfringements?.length || 0}</p>
          </Card>
        </Link>
        <Card>
          <p className="text-sm text-pg-text-muted mb-1">Est. Revenue Loss</p>
          <p className="text-3xl font-bold text-pg-danger">${totalRevenueLoss.toLocaleString()}</p>
        </Card>
      </div>

      {/* Scan Status */}
      <Card className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold mb-2">Scan Status</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-pg-text-muted">Status:</span>
                <Badge
                  variant={
                    scan.status === 'completed'
                      ? ('scout' as any)
                      : scan.status === 'failed'
                      ? ('business' as any)
                      : ('starter' as any)
                  }
                  className="capitalize"
                >
                  {scan.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-pg-text-muted">Product:</span>
                <Badge variant="default" className="capitalize">
                  {scan.products?.type}
                </Badge>
              </div>
            </div>
          </div>
          {scan.status === 'completed' && activeInfringements && activeInfringements.length > 0 && (
            <ExportReportButton scanId={id} productName={scan.products?.name || 'Product'} />
          )}
        </div>
      </Card>

      {/* Pending Verification Section */}
      {pendingInfringements && pendingInfringements.length > 0 && (
        <div className="mb-8">
          <PendingVerificationList
            infringements={pendingInfringements as Infringement[]}
            productId={scan.products?.id || ''}
          />
        </div>
      )}

      {/* Active Infringements List with Country Filter */}
      <InfringementList
        infringements={activeInfringements || []}
        productPrice={scan.products?.price || 0}
        scanId={id}
        title="Active Infringements"
        emptyMessage={
          pendingInfringements && pendingInfringements.length > 0
            ? `Review and verify the pending infringements above to activate them.`
            : resolvedInfringements && resolvedInfringements.length > 0
            ? `All infringements have been resolved! Check the "Resolved" section below.`
            : `Great news! We didn't find any pirated copies of your product.`
        }
      />

      {/* Resolved Infringements Section */}
      {resolvedInfringements && resolvedInfringements.length > 0 && (
        <div className="mt-8">
          <InfringementList
            infringements={resolvedInfringements}
            productPrice={scan.products?.price || 0}
            scanId={id}
            title="✓ Resolved Infringements"
            emptyMessage="No resolved infringements"
          />
        </div>
      )}
    </div>
  );
}
