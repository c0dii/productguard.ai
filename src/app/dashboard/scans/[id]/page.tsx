import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { InfringementList } from '@/components/dashboard/InfringementList';
import { ExportReportButton } from '@/components/dashboard/ExportReportButton';
import { PendingVerificationList } from '@/components/dashboard/PendingVerificationList';
import { ScanProgressTracker } from '@/components/dashboard/ScanProgressTracker';
import { ScanningPlaceholder } from '@/components/dashboard/ScanningPlaceholder';
import type { Infringement, Scan } from '@/types';

export const dynamic = 'force-dynamic';

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

  const productId = scan.products?.id || scan.product_id;
  const isScanning = scan.status === 'running' || scan.status === 'pending';

  // Fetch ALL product infringements (not just this scan's) so we always show historical data
  const [
    { data: pendingInfringements },
    { count: pendingTotal },
    { data: activeInfringements },
    { data: resolvedInfringements },
    { count: totalInfringementCount },
  ] = await Promise.all([
    // Pending verification for this product (paginated, top 10 by severity)
    supabase
      .from('infringements')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'pending_verification')
      .order('severity_score', { ascending: false })
      .limit(10),
    // Total pending count for this product
    supabase
      .from('infringements')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('status', 'pending_verification'),
    // All active infringements for this product
    supabase
      .from('infringements')
      .select('*')
      .eq('product_id', productId)
      .in('status', ['active', 'takedown_sent', 'disputed'])
      .order('severity_score', { ascending: false }),
    // All resolved infringements for this product
    supabase
      .from('infringements')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'removed')
      .order('created_at', { ascending: false }),
    // Total infringement count for this product (all statuses)
    supabase
      .from('infringements')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId),
  ]);

  // How many NEW infringements this specific scan found
  const newThisScan = scan.infringement_count || 0;

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

      {/* Scan Progress Tracker - Only show while scan is running */}
      {isScanning && (
        <div className="mb-6 sm:mb-8">
          <ScanProgressTracker scan={scan as Scan} />
        </div>
      )}

      {/* This Scan summary - show what this specific scan found */}
      {!isScanning && scan.status === 'completed' && (
        <div className={`mb-6 p-4 rounded-xl border ${
          newThisScan > 0
            ? 'bg-yellow-500/5 border-yellow-500/30'
            : 'bg-green-500/5 border-green-500/30'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-lg">{newThisScan > 0 ? '🔍' : '✓'}</span>
            <div>
              <p className="text-sm font-medium text-pg-text">
                {newThisScan > 0
                  ? `This scan found ${newThisScan} new potential infringement${newThisScan !== 1 ? 's' : ''}`
                  : 'This scan did not find any new infringements'
                }
              </p>
              <p className="text-xs text-pg-text-muted mt-0.5">
                {newThisScan > 0
                  ? 'New findings have been added to the pending review queue below.'
                  : 'All previously detected infringements are still shown below for your reference.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats - Product-wide totals */}
      {isScanning ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Total Infringements</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-pg-accent border-t-transparent animate-spin" />
              <p className="text-lg font-medium text-pg-text-muted">Scanning...</p>
            </div>
          </Card>
          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Pending Review</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-pg-warning border-t-transparent animate-spin" />
              <p className="text-lg font-medium text-pg-text-muted">Scanning...</p>
            </div>
          </Card>
          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Active Threats</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-pg-danger border-t-transparent animate-spin" />
              <p className="text-lg font-medium text-pg-text-muted">Scanning...</p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Total Infringements</p>
            <p className="text-3xl font-bold text-pg-accent">{totalInfringementCount ?? 0}</p>
          </Card>
          <Card>
            <p className="text-sm text-pg-text-muted mb-1">Pending Review</p>
            <p className="text-3xl font-bold text-pg-warning">{pendingTotal ?? 0}</p>
          </Card>
          <Link href="/dashboard/infringements">
            <Card className="cursor-pointer hover:border-pg-accent hover:shadow-lg hover:shadow-pg-accent/20 transition-all">
              <p className="text-sm text-pg-text-muted mb-1">Active Threats</p>
              <p className="text-3xl font-bold text-pg-danger">{activeInfringements?.length || 0}</p>
            </Card>
          </Link>
        </div>
      )}

      {/* Scan Status - only show when not scanning (progress tracker replaces this) */}
      {!isScanning && (
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
      )}

      {/* Pending Verification Section - product-wide */}
      {!isScanning && (pendingTotal ?? 0) > 0 && (
        <div className="mb-8">
          <PendingVerificationList
            initialInfringements={(pendingInfringements || []) as Infringement[]}
            initialTotal={pendingTotal ?? 0}
            productId={productId}
            product={scan.products}
            userId={user.id}
          />
        </div>
      )}

      {/* Active Infringements or Scanning Placeholder */}
      {isScanning ? (
        <ScanningPlaceholder productName={scan.products?.name || 'your product'} />
      ) : (
        <InfringementList
          infringements={activeInfringements || []}
          productPrice={scan.products?.price || 0}
          scanId={id}
          title="Active Infringements"
          emptyMessage={
            (pendingTotal ?? 0) > 0
              ? `Review and verify the pending infringements above to activate them.`
              : resolvedInfringements && resolvedInfringements.length > 0
              ? `All infringements have been resolved! Check the "Resolved" section below.`
              : `No active infringements found for this product.`
          }
        />
      )}

      {/* Resolved Infringements Section */}
      {!isScanning && resolvedInfringements && resolvedInfringements.length > 0 && (
        <div className="mt-8">
          <InfringementList
            infringements={resolvedInfringements}
            productPrice={scan.products?.price || 0}
            scanId={id}
            title="Resolved Infringements"
            emptyMessage="No resolved infringements"
          />
        </div>
      )}
    </div>
  );
}
